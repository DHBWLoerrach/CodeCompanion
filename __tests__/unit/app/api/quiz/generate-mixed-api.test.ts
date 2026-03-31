import { generateMixedQuizQuestions } from '@server/quiz';
import { enforceQuizQuota } from '@server/quota';
import { POST } from '../../../../../app/api/quiz/generate-mixed+api';

jest.mock('@server/quiz', () => ({
  generateMixedQuizQuestions: jest.fn(),
}));
jest.mock('@server/quota', () => ({
  enforceQuizQuota: jest.fn(async () => ({
    deviceIdHash: null,
    response: null,
  })),
  quotaUnavailableResponse: jest.fn(() =>
    Response.json({ error: 'Quota service unavailable' }, { status: 503 })
  ),
}));

jest.mock('@shared/curriculum', () => ({
  ...jest.requireActual('@shared/curriculum'),
  getTopicIdsByLanguage: jest.fn(() => ['variables', 'loops', 'promises']),
}));

const mockGenerateMixedQuizQuestions = jest.mocked(generateMixedQuizQuestions);
const mockEnforceQuizQuota = jest.mocked(enforceQuizQuota);
let infoSpy: jest.SpiedFunction<typeof console.info>;

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/quiz/generate-mixed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createInvalidJsonRequest(): Request {
  return new Request('http://localhost/api/quiz/generate-mixed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
}

function buildQuestions(topicId: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${topicId}-${index + 1}`,
    question: `${topicId} question ${index + 1}`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanation: 'Because',
    resultSentence: 'Result: A',
    takeaway: 'Remember A',
  }));
}

describe('POST /api/quiz/generate-mixed', () => {
  beforeEach(() => {
    process.env = { ...process.env, API_QUOTA_ENABLED: 'false' };
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    mockGenerateMixedQuizQuestions.mockReset();
    mockEnforceQuizQuota.mockReset();
    mockEnforceQuizQuota.mockResolvedValue({
      deviceIdHash: null,
      response: null,
    });
    mockGenerateMixedQuizQuestions.mockImplementation(
      async (_lang, topicPlan) =>
        topicPlan.flatMap(({ topicId, questionCount }) =>
          buildQuestions(topicId, questionCount)
        )
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 when request body is invalid JSON', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(createInvalidJsonRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Request body must be valid JSON' });
    expect(mockGenerateMixedQuizQuestions).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('returns 400 when provided topic IDs contain invalid entries', async () => {
    const response = await POST(
      createRequest({ topicIds: ['loops', 'invalid-b'] })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'topicIds contains invalid entries for programmingLanguage',
    });
    expect(mockGenerateMixedQuizQuestions).not.toHaveBeenCalled();
  });

  it('returns 400 when topicIds exceeds maximum size', async () => {
    const topicIds = Array.from({ length: 21 }, () => 'variables');
    const response = await POST(createRequest({ topicIds }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'topicIds cannot contain more than 20 entries',
    });
    expect(mockGenerateMixedQuizQuestions).not.toHaveBeenCalled();
  });

  it('returns 400 when language is invalid', async () => {
    const response = await POST(
      createRequest({
        topicIds: ['variables'],
        language: 'fr',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "language must be 'en' or 'de'" });
    expect(mockGenerateMixedQuizQuestions).not.toHaveBeenCalled();
  });

  it('returns 400 when programmingLanguage is invalid', async () => {
    const response = await POST(
      createRequest({
        topicIds: ['variables'],
        programmingLanguage: 'rust',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'programmingLanguage must be one of: javascript, python, java',
    });
    expect(mockGenerateMixedQuizQuestions).not.toHaveBeenCalled();
  });

  it('uses provided topicIds when all are valid and generates requested count', async () => {
    const response = await POST(
      createRequest({
        topicIds: ['loops', 'variables'],
        count: 5,
        language: 'de',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledTimes(1);
    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      [
        { topicId: 'loops', questionCount: 3 },
        { topicId: 'variables', questionCount: 2 },
      ],
      'de',
      1
    );
    expect(data.questions).toHaveLength(5);
  });

  it('limits explicit topicIds to the requested question count', async () => {
    const response = await POST(
      createRequest({
        topicIds: ['loops', 'variables', 'promises'],
        count: 2,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledTimes(1);
    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      [
        { topicId: 'loops', questionCount: 1 },
        { topicId: 'variables', questionCount: 1 },
      ],
      'en',
      1
    );
    expect(data.questions).toHaveLength(2);
  });

  it('returns 400 when topicIds are invalid for the selected programming language', async () => {
    const response = await POST(
      createRequest({
        topicIds: ['variables'],
        programmingLanguage: 'python',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'topicIds contains invalid entries for programmingLanguage',
    });
    expect(mockGenerateMixedQuizQuestions).not.toHaveBeenCalled();
  });

  it('uses default topics/count/language when omitted', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    const response = await POST(createRequest({}));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledTimes(1);
    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      [
        { topicId: 'loops', questionCount: 2 },
        { topicId: 'promises', questionCount: 2 },
        { topicId: 'variables', questionCount: 1 },
      ],
      'en',
      1
    );
    expect(data.questions).toHaveLength(5);

    randomSpy.mockRestore();
  });

  it('limits auto-selected topics to the requested question count', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    const response = await POST(
      createRequest({
        count: 2,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledTimes(1);
    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      [
        { topicId: 'loops', questionCount: 1 },
        { topicId: 'promises', questionCount: 1 },
      ],
      'en',
      1
    );
    expect(data.questions).toHaveLength(2);

    randomSpy.mockRestore();
  });

  it('caps count to maximum to avoid oversized mixed quiz generation', async () => {
    const response = await POST(
      createRequest({
        topicIds: ['loops', 'variables'],
        count: 100000,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledTimes(1);
    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      [
        { topicId: 'loops', questionCount: 10 },
        { topicId: 'variables', questionCount: 10 },
      ],
      'en',
      1
    );
    expect(data.questions).toHaveLength(20);
  });

  it('uses explicit skillLevel when provided', async () => {
    const response = await POST(
      createRequest({
        topicIds: ['variables'],
        skillLevel: 2,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      [{ topicId: 'variables', questionCount: 5 }],
      'en',
      2
    );
    expect(data.questions).toHaveLength(5);
  });

  it('truncates decimal count and skillLevel', async () => {
    const response = await POST(
      createRequest({
        topicIds: ['variables'],
        count: 3.9,
        skillLevel: 2.7,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      [{ topicId: 'variables', questionCount: 3 }],
      'en',
      2
    );
    expect(data.questions).toHaveLength(3);
  });

  it('clamps skillLevel to maximum', async () => {
    await POST(
      createRequest({
        topicIds: ['variables'],
        skillLevel: 99,
      })
    );

    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      [{ topicId: 'variables', questionCount: 5 }],
      'en',
      3
    );
  });

  it('clamps skillLevel to minimum', async () => {
    await POST(
      createRequest({
        topicIds: ['variables'],
        skillLevel: -8,
      })
    );

    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      [{ topicId: 'variables', questionCount: 5 }],
      'en',
      1
    );
  });

  it('uses fallback skillLevel when invalid', async () => {
    await POST(
      createRequest({
        topicIds: ['variables'],
        skillLevel: 'abc',
      })
    );

    expect(mockGenerateMixedQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      [{ topicId: 'variables', questionCount: 5 }],
      'en',
      1
    );
  });

  it('returns 500 when generation fails', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env = { ...process.env, NODE_ENV: 'production' };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGenerateMixedQuizQuestions.mockRejectedValueOnce(
      new Error('upstream error')
    );

    const response = await POST(createRequest({ topicIds: ['variables'] }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to generate quiz questions' });
    expect(errorSpy).toHaveBeenCalledWith(
      'Mixed quiz generation error: upstream error'
    );
    process.env = { ...process.env, NODE_ENV: originalEnv };
  });

  it('returns 429 when quota rejects the request', async () => {
    process.env = { ...process.env, API_QUOTA_ENABLED: 'true' };
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(3000)
      .mockReturnValueOnce(3010)
      .mockReturnValueOnce(3050)
      .mockReturnValueOnce(3080);
    mockEnforceQuizQuota.mockResolvedValueOnce({
      deviceIdHash: 'hash-456',
      reason: 'device_endpoint',
      response: Response.json(
        {
          error: 'rate_limited',
          scope: 'device',
          reason: 'device_endpoint',
          resetAtUtc: '2026-03-25T00:00:00.000Z',
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '6',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '1742860800',
          },
        }
      ),
    });

    const response = await POST(createRequest({ topicIds: ['variables'] }));
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(data).toEqual({
      error: 'rate_limited',
      scope: 'device',
      reason: 'device_endpoint',
      resetAtUtc: '2026-03-25T00:00:00.000Z',
    });
    expect(mockGenerateMixedQuizQuestions).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      'API request outcome:',
      expect.objectContaining({
        endpoint: 'quiz/generate-mixed',
        status: 429,
        deviceIdHash: 'hash-456',
        reason: 'device_endpoint',
        requestDurationMs: 80,
        quotaDurationMs: 40,
      })
    );

    nowSpy.mockRestore();
  });

  it('returns 503 when quota enforcement fails closed', async () => {
    process.env = { ...process.env, API_QUOTA_ENABLED: 'true' };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockEnforceQuizQuota.mockRejectedValueOnce(new Error('supabase down'));

    const response = await POST(createRequest({ topicIds: ['variables'] }));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({ error: 'Quota service unavailable' });
    expect(mockGenerateMixedQuizQuestions).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
