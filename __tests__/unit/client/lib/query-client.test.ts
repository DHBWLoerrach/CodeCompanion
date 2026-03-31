import Constants from 'expo-constants';
import {
  ApiRequestError,
  apiRequest,
  getApiUrl,
  getQueryFn,
  isApiRequestError,
} from '@/lib/query-client';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {},
  },
}));
jest.mock('expo/virtual/env', () => ({
  env: {},
}));
jest.mock('@/lib/device-id', () => ({
  getOrCreateDeviceId: jest.fn(async () => 'device-uuid-v4'),
}));

const originalEnv = process.env;
const globalWithDevFlag = global as typeof globalThis & { __DEV__?: boolean };
const originalDev = globalWithDevFlag.__DEV__;
const expoEnv = (
  jest.requireMock('expo/virtual/env') as {
    env: { EXPO_PUBLIC_API_URL?: string };
  }
).env;
const fetchMock = jest.fn();
const getOrCreateDeviceIdMock = jest.mocked(
  (
    jest.requireMock('@/lib/device-id') as {
      getOrCreateDeviceId: () => Promise<string>;
    }
  ).getOrCreateDeviceId
);

beforeEach(() => {
  globalWithDevFlag.__DEV__ = true;
});

afterAll(() => {
  if (originalDev === undefined) {
    delete globalWithDevFlag.__DEV__;
    return;
  }

  globalWithDevFlag.__DEV__ = originalDev;
});

describe('getApiUrl', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete expoEnv.EXPO_PUBLIC_API_URL;
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

  it('uses EXPO_PUBLIC_API_URL when set to HTTPS', () => {
    expoEnv.EXPO_PUBLIC_API_URL = 'https://api.example.com';

    expect(getApiUrl()).toBe('https://api.example.com/');
  });

  it('throws when EXPO_PUBLIC_API_URL uses insecure HTTP for non-local hosts in dev', () => {
    expoEnv.EXPO_PUBLIC_API_URL = 'http://api.example.com';

    expect(() => getApiUrl()).toThrow(
      'HTTPS is required for API URL outside local development'
    );
  });

  it('throws when EXPO_PUBLIC_API_URL uses insecure HTTP for non-local hosts outside dev', () => {
    globalWithDevFlag.__DEV__ = false;
    expoEnv.EXPO_PUBLIC_API_URL = 'http://api.example.com';

    expect(() => getApiUrl()).toThrow(
      'HTTPS is required for API URL outside local development'
    );
  });

  it('allows local EXPO_PUBLIC_API_URL over HTTP in dev', () => {
    expoEnv.EXPO_PUBLIC_API_URL = 'http://localhost:8081';

    expect(getApiUrl()).toBe('http://localhost:8081/');
  });

  it('allows private-network EXPO_PUBLIC_API_URL over HTTP in dev', () => {
    expoEnv.EXPO_PUBLIC_API_URL = 'http://192.168.1.10:8081';

    expect(getApiUrl()).toBe('http://192.168.1.10:8081/');
  });

  it('allows 10.x EXPO_PUBLIC_API_URL over HTTP in dev', () => {
    expoEnv.EXPO_PUBLIC_API_URL = 'http://10.0.0.42:8081';

    expect(getApiUrl()).toBe('http://10.0.0.42:8081/');
  });

  it('allows 172.16-31.x EXPO_PUBLIC_API_URL over HTTP in dev', () => {
    expoEnv.EXPO_PUBLIC_API_URL = 'http://172.31.5.20:8081';

    expect(getApiUrl()).toBe('http://172.31.5.20:8081/');
  });

  it('throws when local EXPO_PUBLIC_API_URL uses HTTP outside dev', () => {
    globalWithDevFlag.__DEV__ = false;
    expoEnv.EXPO_PUBLIC_API_URL = 'http://localhost:8081';

    expect(() => getApiUrl()).toThrow(
      'HTTPS is required for API URL outside local development'
    );
  });

  it('keeps protocol when hostUri already has one', () => {
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = {
      hostUri: 'https://my-preview.example.com',
    };

    expect(getApiUrl()).toBe('https://my-preview.example.com/');
  });

  it('throws when hostUri uses insecure HTTP outside local development', () => {
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = {
      hostUri: 'http://api.example.com',
    };

    expect(() => getApiUrl()).toThrow(
      'HTTPS is required for API URL outside local development'
    );
  });

  it('throws when hostUri uses local HTTP outside dev', () => {
    globalWithDevFlag.__DEV__ = false;
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = {
      hostUri: 'http://localhost:8081',
    };

    expect(() => getApiUrl()).toThrow(
      'HTTPS is required for API URL outside local development'
    );
  });

  it('defaults to HTTPS for non-local hostUri without protocol', () => {
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = {
      hostUri: 'api.example.com',
    };

    expect(getApiUrl()).toBe('https://api.example.com/');
  });

  it('throws when hostUri without protocol points to localhost outside dev', () => {
    globalWithDevFlag.__DEV__ = false;
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = {
      hostUri: 'localhost:8081',
    };

    expect(() => getApiUrl()).toThrow(
      'HTTPS is required for API URL outside local development'
    );
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
    getOrCreateDeviceIdMock.mockClear();
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
      'http://localhost:8081/api/quiz/generate'
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': 'device-uuid-v4',
      },
      body: JSON.stringify({ topicId: 'variables', count: 5 }),
      credentials: 'include',
    });
    expect(getOrCreateDeviceIdMock).toHaveBeenCalledTimes(1);
  });

  it('omits JSON headers when no payload is provided', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({}),
    } as Response);

    await apiRequest('GET', '/api/quiz/generate');

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      headers: {},
      body: undefined,
      credentials: 'include',
    });
    expect(getOrCreateDeviceIdMock).not.toHaveBeenCalled();
  });

  it('does not attach a device header to non-quiz POST requests', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({ ok: true }),
    } as Response);

    await apiRequest('POST', '/api/other', { ok: true });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: { 'Content-Type': 'application/json' },
    });
    expect(getOrCreateDeviceIdMock).not.toHaveBeenCalled();
  });

  it('throws a structured error when response is not ok', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => '',
      json: async () => ({
        error: 'rate_limited',
        scope: 'device',
        reason: 'device_total',
        resetAtUtc: '2026-03-25T00:00:00.000Z',
      }),
    } as Response);

    await expect(apiRequest('GET', '/api/fail')).rejects.toMatchObject({
      name: 'ApiRequestError',
      message: 'Request failed (429)',
      status: 429,
      body: {
        error: 'rate_limited',
        scope: 'device',
        reason: 'device_total',
        resetAtUtc: '2026-03-25T00:00:00.000Z',
      },
    });
  });

  it('falls back to the text body when error JSON cannot be parsed', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('invalid json');
      },
      text: async () => 'backend failed',
    } as unknown as Response);

    await expect(apiRequest('GET', '/api/fail')).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 500,
      body: 'backend failed',
    });
  });

  it('falls back to null when neither JSON nor text can be parsed', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new Error('invalid json');
      },
      text: async () => {
        throw new Error('stream failed');
      },
    } as unknown as Response);

    await expect(apiRequest('GET', '/api/fail')).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 502,
      body: null,
    });
  });

  it('detects only ApiRequestError instances', () => {
    expect(isApiRequestError(new ApiRequestError(400, {}))).toBe(true);
    expect(
      isApiRequestError({
        name: 'ApiRequestError',
        status: 400,
        body: {},
      })
    ).toBe(false);
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
      'Request failed (401)'
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
      'http://localhost:8081/api/profile'
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
    });
  });
});
