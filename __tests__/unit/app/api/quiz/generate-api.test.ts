import { generateQuizQuestions } from '@server/quiz';
import { enforceQuizQuota } from '@server/quota';
import { POST } from '../../../../../app/api/quiz/generate+api';

jest.mock('@server/quiz', () => ({
  generateQuizQuestions: jest.fn(),
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

const mockGenerateQuizQuestions = jest.mocked(generateQuizQuestions);
const mockEnforceQuizQuota = jest.mocked(enforceQuizQuota);
let infoSpy: jest.SpiedFunction<typeof console.info>;

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/quiz/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createInvalidJsonRequest(): Request {
  return new Request('http://localhost/api/quiz/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
}

describe('POST /api/quiz/generate', () => {
  beforeEach(() => {
    process.env = { ...process.env, API_QUOTA_ENABLED: 'false' };
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    mockGenerateQuizQuestions.mockReset();
    mockEnforceQuizQuota.mockReset();
    mockEnforceQuizQuota.mockResolvedValue({
      deviceIdHash: null,
      response: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 when topicId is missing', async () => {
    const response = await POST(createRequest({ count: 5 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'topicId is required' });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
  });

  it('returns 400 when request body is invalid JSON', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(createInvalidJsonRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Request body must be valid JSON' });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('returns 400 when language is invalid', async () => {
    const response = await POST(
      createRequest({ topicId: 'variables', language: 'fr' })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "language must be 'en' or 'de'" });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
  });

  it('returns 400 when programmingLanguage is invalid', async () => {
    const response = await POST(
      createRequest({
        topicId: 'variables',
        programmingLanguage: 'rust',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'programmingLanguage must be one of: javascript, python, java',
    });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
  });

  it('returns 400 when topicId is invalid for programmingLanguage', async () => {
    const response = await POST(
      createRequest({
        topicId: 'variables',
        programmingLanguage: 'python',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'Invalid topicId for programmingLanguage',
    });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
  });

  it('uses defaults and clamps skill level', async () => {
    mockGenerateQuizQuestions.mockResolvedValueOnce([
      {
        id: 'q1',
        question: 'Q?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        explanation: 'Because',
        resultSentence: 'Result: A',
        takeaway: 'Remember A',
      },
    ]);

    const response = await POST(
      createRequest({
        topicId: 'variables',
        count: '7',
        skillLevel: 99,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      'variables',
      7,
      'en',
      3
    );
    expect(data.questions).toHaveLength(1);
  });

  it('logs request, quota, and upstream durations for successful requests', async () => {
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1010)
      .mockReturnValueOnce(1030)
      .mockReturnValueOnce(1040)
      .mockReturnValueOnce(1200);
    mockGenerateQuizQuestions.mockResolvedValueOnce([]);

    const response = await POST(createRequest({ topicId: 'variables' }));

    expect(response.status).toBe(200);
    expect(infoSpy).toHaveBeenCalledWith(
      'API request outcome:',
      expect.objectContaining({
        endpoint: 'quiz/generate',
        status: 200,
        requestDurationMs: 200,
        quotaDurationMs: 20,
        upstreamDurationMs: 160,
      })
    );

    nowSpy.mockRestore();
  });

  it('truncates decimal count and skill level', async () => {
    mockGenerateQuizQuestions.mockResolvedValueOnce([]);

    await POST(
      createRequest({
        topicId: 'variables',
        count: 2.9,
        skillLevel: 2.8,
      })
    );

    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      'variables',
      2,
      'en',
      2
    );
  });

  it('uses fallback count when count is invalid', async () => {
    mockGenerateQuizQuestions.mockResolvedValueOnce([]);

    await POST(
      createRequest({
        topicId: 'loops',
        count: 'abc',
        language: 'de',
        skillLevel: -3,
      })
    );

    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      'loops',
      5,
      'de',
      1
    );
  });

  it('uses fallback count when count is null', async () => {
    mockGenerateQuizQuestions.mockResolvedValueOnce([]);

    await POST(
      createRequest({
        topicId: 'loops',
        count: null,
      })
    );

    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      'loops',
      5,
      'en',
      1
    );
  });

  it('caps count to maximum to avoid oversized generation', async () => {
    mockGenerateQuizQuestions.mockResolvedValueOnce([]);

    await POST(
      createRequest({
        topicId: 'variables',
        count: 100000,
      })
    );

    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith(
      'javascript',
      'variables',
      20,
      'en',
      1
    );
  });

  it('returns 500 when generator fails', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env = { ...process.env, NODE_ENV: 'production' };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGenerateQuizQuestions.mockRejectedValueOnce(new Error('network down'));

    const response = await POST(createRequest({ topicId: 'variables' }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to generate quiz questions' });
    expect(errorSpy).toHaveBeenCalledWith(
      'Quiz generation error: network down'
    );
    process.env = { ...process.env, NODE_ENV: originalEnv };
  });

  it('returns 429 when quota rejects the request', async () => {
    process.env = { ...process.env, API_QUOTA_ENABLED: 'true' };
    mockEnforceQuizQuota.mockResolvedValueOnce({
      deviceIdHash: 'hash-123',
      reason: 'device_total',
      response: Response.json(
        {
          error: 'rate_limited',
          scope: 'device',
          reason: 'device_total',
          resetAtUtc: '2026-03-25T00:00:00.000Z',
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '15',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '1742860800',
          },
        }
      ),
    });

    const response = await POST(createRequest({ topicId: 'variables' }));
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(data).toEqual({
      error: 'rate_limited',
      scope: 'device',
      reason: 'device_total',
      resetAtUtc: '2026-03-25T00:00:00.000Z',
    });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
  });

  it('logs quota response timings even when quota returns a 400 response', async () => {
    process.env = { ...process.env, API_QUOTA_ENABLED: 'true' };
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(2000)
      .mockReturnValueOnce(2010)
      .mockReturnValueOnce(2040)
      .mockReturnValueOnce(2070);
    mockEnforceQuizQuota.mockResolvedValueOnce({
      deviceIdHash: null,
      response: Response.json(
        { error: 'X-Device-Id must be a valid UUID v4' },
        { status: 400 }
      ),
    });

    const response = await POST(createRequest({ topicId: 'variables' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'X-Device-Id must be a valid UUID v4' });
    expect(infoSpy).toHaveBeenCalledWith(
      'API request outcome:',
      expect.objectContaining({
        endpoint: 'quiz/generate',
        status: 400,
        requestDurationMs: 70,
        quotaDurationMs: 30,
      })
    );

    nowSpy.mockRestore();
  });

  it('returns 503 when quota enforcement fails closed', async () => {
    process.env = { ...process.env, API_QUOTA_ENABLED: 'true' };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockEnforceQuizQuota.mockRejectedValueOnce(new Error('supabase down'));

    const response = await POST(createRequest({ topicId: 'variables' }));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({ error: 'Quota service unavailable' });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
