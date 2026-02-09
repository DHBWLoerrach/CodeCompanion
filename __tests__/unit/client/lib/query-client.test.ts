import Constants from 'expo-constants';
import { apiRequest, getApiUrl, getQueryFn } from '@/lib/query-client';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {},
  },
}));

const originalEnv = process.env;
const fetchMock = jest.fn();

describe('getApiUrl', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_API_URL;
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = {};
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses hostUri from expo constants when available', () => {
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = {
      hostUri: 'localhost:8081',
    };

    expect(getApiUrl()).toBe('http://localhost:8081/');
  });

  it('keeps protocol when hostUri already has one', () => {
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = {
      hostUri: 'https://my-preview.example.com',
    };

    expect(getApiUrl()).toBe('https://my-preview.example.com/');
  });

  it('throws if neither API URL nor domain is set', () => {
    expect(() => getApiUrl()).toThrow('EXPO_PUBLIC_API_URL is not set');
  });
});

describe('apiRequest', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = {
      hostUri: 'localhost:8081',
    };
    fetchMock.mockReset();
    (global as { fetch: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sends JSON payload when data is provided', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({ ok: true }),
    } as Response);

    await apiRequest('POST', '/api/quiz/generate', {
      topicId: 'variables',
      count: 5,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      'http://localhost:8081/api/quiz/generate',
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId: 'variables', count: 5 }),
      credentials: 'include',
    });
  });

  it('omits JSON headers when no payload is provided', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({}),
    } as Response);

    await apiRequest('GET', '/api/topic/explain');

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      headers: {},
      body: undefined,
      credentials: 'include',
    });
  });

  it('throws a detailed error when response is not ok', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'backend failed',
      json: async () => ({}),
    } as Response);

    await expect(apiRequest('GET', '/api/fail')).rejects.toThrow(
      '500: backend failed',
    );
  });
});

describe('getQueryFn', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = {
      hostUri: 'localhost:8081',
    };
    fetchMock.mockReset();
    (global as { fetch: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null on 401 when on401 is returnNull', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => '',
      json: async () => ({}),
    } as Response);

    const queryFn = getQueryFn<unknown>({ on401: 'returnNull' });
    const result = await queryFn({ queryKey: ['api', 'me'] } as never);

    expect(result).toBeNull();
  });

  it('throws on 401 when on401 is throw', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => '',
      json: async () => ({}),
    } as Response);

    const queryFn = getQueryFn<unknown>({ on401: 'throw' });
    await expect(queryFn({ queryKey: ['api', 'me'] } as never)).rejects.toThrow(
      '401: Unauthorized',
    );
  });

  it('returns parsed json on success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({ id: 'u1', name: 'Erik' }),
    } as Response);

    const queryFn = getQueryFn<{ id: string; name: string }>({
      on401: 'throw',
    });
    const result = await queryFn({ queryKey: ['api', 'profile'] } as never);

    expect(result).toEqual({ id: 'u1', name: 'Erik' });
    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      'http://localhost:8081/api/profile',
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
    });
  });
});
