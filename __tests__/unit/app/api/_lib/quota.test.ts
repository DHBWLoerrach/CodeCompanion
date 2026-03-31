import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEVICE_ID_HEADER,
  QUIZ_GENERATE_MIXED_QUOTA_ENDPOINT,
  QUIZ_GENERATE_QUOTA_ENDPOINT,
} from '@shared/api-quota';
import {
  checkAndConsumeQuota,
  createRateLimitResponse,
  enforceQuizQuota,
  type QuotaServiceError,
} from '@server/quota';

type ApiUsageRow = {
  device_id_hash: string;
  endpoint: string;
  usage_date: string;
};

type FakeSupabaseOptions = {
  countError?: string;
  insertError?: string;
};

function createFakeSupabase(
  initialRows: ApiUsageRow[],
  options: FakeSupabaseOptions = {}
): {
  rows: ApiUsageRow[];
  client: SupabaseClient;
} {
  const rows = [...initialRows];

  class CountQuery {
    private filters: Array<[string, string]> = [];

    eq(column: string, value: string) {
      this.filters.push([column, value]);
      return this;
    }

    then(
      resolve: (value: {
        count: number | null;
        error: { message: string } | null;
      }) => unknown
    ) {
      if (options.countError) {
        return Promise.resolve(
          resolve({
            count: null,
            error: { message: options.countError },
          })
        );
      }

      const filteredRows = rows.filter((row) =>
        this.filters.every(
          ([column, value]) => row[column as keyof ApiUsageRow] === value
        )
      );

      return Promise.resolve(
        resolve({
          count: filteredRows.length,
          error: null,
        })
      );
    }
  }

  const client = {
    from: () => ({
      select: () => new CountQuery(),
      insert: async (row: ApiUsageRow) => {
        if (options.insertError) {
          return {
            error: { message: options.insertError },
          };
        }

        rows.push(row);
        return { error: null };
      },
    }),
  } as unknown as SupabaseClient;

  return { rows, client };
}

describe('quota helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.useFakeTimers().setSystemTime(new Date('2026-03-24T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  it('consumes quota and records a row when under all limits', async () => {
    const { client, rows } = createFakeSupabase([
      {
        device_id_hash: 'device-a',
        endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
        usage_date: '2026-03-24',
      },
      {
        device_id_hash: 'device-b',
        endpoint: QUIZ_GENERATE_MIXED_QUOTA_ENDPOINT,
        usage_date: '2026-03-24',
      },
    ]);

    const result = await checkAndConsumeQuota(
      'device-a',
      QUIZ_GENERATE_QUOTA_ENDPOINT,
      client
    );

    expect(result).toEqual({
      allowed: true,
      remainingDevice: 13,
      remainingGlobal: 397,
      resetAtUtc: '2026-03-25T00:00:00.000Z',
    });
    expect(rows).toContainEqual({
      device_id_hash: 'device-a',
      endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
      usage_date: '2026-03-24',
    });
  });

  it('rejects when the endpoint daily limit is reached', async () => {
    const { client } = createFakeSupabase(
      Array.from({ length: 12 }, () => ({
        device_id_hash: 'device-a',
        endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
        usage_date: '2026-03-24',
      }))
    );

    const result = await checkAndConsumeQuota(
      'device-a',
      QUIZ_GENERATE_QUOTA_ENDPOINT,
      client
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'device_endpoint',
      scope: 'device',
      retryAfterSeconds: 43200,
      resetAtUtc: '2026-03-25T00:00:00.000Z',
    });
  });

  it('rejects when the device total daily limit is reached', async () => {
    const { client } = createFakeSupabase([
      ...Array.from({ length: 12 }, () => ({
        device_id_hash: 'device-a',
        endpoint: QUIZ_GENERATE_QUOTA_ENDPOINT,
        usage_date: '2026-03-24',
      })),
      ...Array.from({ length: 3 }, () => ({
        device_id_hash: 'device-a',
        endpoint: QUIZ_GENERATE_MIXED_QUOTA_ENDPOINT,
        usage_date: '2026-03-24',
      })),
    ]);

    const result = await checkAndConsumeQuota(
      'device-a',
      QUIZ_GENERATE_MIXED_QUOTA_ENDPOINT,
      client
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'device_total',
      scope: 'device',
      retryAfterSeconds: 43200,
      resetAtUtc: '2026-03-25T00:00:00.000Z',
    });
  });

  it('rejects when the global daily limit is reached', async () => {
    const { client } = createFakeSupabase(
      Array.from({ length: 400 }, (_, index) => ({
        device_id_hash: `device-${index}`,
        endpoint:
          index % 2 === 0
            ? QUIZ_GENERATE_QUOTA_ENDPOINT
            : QUIZ_GENERATE_MIXED_QUOTA_ENDPOINT,
        usage_date: '2026-03-24',
      }))
    );

    const result = await checkAndConsumeQuota(
      'device-a',
      QUIZ_GENERATE_QUOTA_ENDPOINT,
      client
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'global_day',
      scope: 'global',
      retryAfterSeconds: 43200,
      resetAtUtc: '2026-03-25T00:00:00.000Z',
    });
  });

  it('throws a quota service error when the insert fails', async () => {
    const { client } = createFakeSupabase([], {
      insertError: 'insert failed',
    });

    await expect(
      checkAndConsumeQuota('device-a', QUIZ_GENERATE_QUOTA_ENDPOINT, client)
    ).rejects.toMatchObject<Partial<QuotaServiceError>>({
      name: 'QuotaServiceError',
      message: 'api_usage insert failed: insert failed',
    });
  });

  it('throws a quota service error when a count query fails', async () => {
    const { client } = createFakeSupabase([], {
      countError: 'count failed',
    });

    await expect(
      checkAndConsumeQuota('device-a', QUIZ_GENERATE_QUOTA_ENDPOINT, client)
    ).rejects.toMatchObject<Partial<QuotaServiceError>>({
      name: 'QuotaServiceError',
      message: 'Global quota count failed: count failed',
    });
  });

  it('builds the expected 429 headers and body', async () => {
    const response = createRateLimitResponse(
      {
        allowed: false,
        reason: 'device_endpoint',
        scope: 'device',
        retryAfterSeconds: 43200,
        resetAtUtc: '2026-03-25T00:00:00.000Z',
      },
      QUIZ_GENERATE_MIXED_QUOTA_ENDPOINT
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('43200');
    expect(response.headers.get('X-RateLimit-Limit')).toBe('6');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Reset')).toBe('1774396800');
    await expect(response.json()).resolves.toEqual({
      error: 'rate_limited',
      reason: 'device_endpoint',
      scope: 'device',
      resetAtUtc: '2026-03-25T00:00:00.000Z',
    });
  });

  it('returns 400 when quota mode is active and the device header is missing', async () => {
    process.env.API_QUOTA_ENABLED = 'true';

    const result = await enforceQuizQuota(
      new Request('http://localhost/api/quiz/generate', {
        method: 'POST',
      }),
      QUIZ_GENERATE_QUOTA_ENDPOINT
    );

    expect(result.deviceIdHash).toBeNull();
    expect(result.response?.status).toBe(400);
    await expect(result.response?.json()).resolves.toEqual({
      error: `${DEVICE_ID_HEADER} must be a valid UUID v4`,
    });
  });

  it('skips the quota path entirely when the feature flag is disabled', async () => {
    process.env.API_QUOTA_ENABLED = 'false';

    const result = await enforceQuizQuota(
      new Request('http://localhost/api/quiz/generate', {
        method: 'POST',
      }),
      QUIZ_GENERATE_QUOTA_ENDPOINT
    );

    expect(result).toEqual({
      deviceIdHash: null,
      response: null,
    });
  });
});
