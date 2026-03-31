import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEVICE_ID_HEADER,
  type ApiQuotaEndpoint,
  type ApiQuotaReason,
  type ApiQuotaScope,
  QUIZ_GENERATE_QUOTA_ENDPOINT,
  type RateLimitedErrorBody,
} from '@shared/api-quota';
import { sha256Hex } from '@server/crypto';
import { getSupabaseAdminClient } from '@server/supabase';

const DEVICE_TOTAL_LIMIT_PER_DAY = 15;
const DEVICE_GENERATE_LIMIT_PER_DAY = 12;
const DEVICE_MIXED_LIMIT_PER_DAY = 6;
const GLOBAL_LIMIT_PER_DAY = 400;

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type QuotaResult =
  | {
      allowed: true;
      remainingDevice: number;
      remainingGlobal: number;
      resetAtUtc: string;
    }
  | {
      allowed: false;
      reason: ApiQuotaReason;
      scope: ApiQuotaScope;
      retryAfterSeconds: number;
      resetAtUtc: string;
    };

export type QuotaEnforcementResult = {
  deviceIdHash: string | null;
  response: Response | null;
  reason?: ApiQuotaReason;
};

export class QuotaServiceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'QuotaServiceError';
  }
}

function getEndpointLimit(endpoint: ApiQuotaEndpoint): number {
  return endpoint === QUIZ_GENERATE_QUOTA_ENDPOINT
    ? DEVICE_GENERATE_LIMIT_PER_DAY
    : DEVICE_MIXED_LIMIT_PER_DAY;
}

function getUsageDateUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function getNextUtcMidnight(now: Date): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
}

function getRetryAfterSeconds(now: Date): number {
  return Math.max(
    1,
    Math.ceil((getNextUtcMidnight(now).getTime() - now.getTime()) / 1000)
  );
}

function getResetAtUtc(now: Date): string {
  return getNextUtcMidnight(now).toISOString();
}

function getRateLimitWindow(
  reason: ApiQuotaReason,
  endpoint: ApiQuotaEndpoint
) {
  if (reason === 'global_day') {
    return GLOBAL_LIMIT_PER_DAY;
  }

  if (reason === 'device_total') {
    return DEVICE_TOTAL_LIMIT_PER_DAY;
  }

  return getEndpointLimit(endpoint);
}

async function countApiUsage(
  query: PromiseLike<{
    count: number | null;
    error: { message?: string } | null;
  }>,
  context: string
): Promise<number> {
  const { count, error } = await query;

  if (error) {
    throw new QuotaServiceError(
      `${context} failed: ${error.message ?? 'Unknown Supabase error'}`
    );
  }

  return count ?? 0;
}

async function insertApiUsage(
  supabase: SupabaseClient,
  {
    deviceIdHash,
    endpoint,
    usageDate,
  }: {
    deviceIdHash: string;
    endpoint: ApiQuotaEndpoint;
    usageDate: string;
  }
): Promise<void> {
  const { error } = await supabase.from('api_usage').insert({
    device_id_hash: deviceIdHash,
    endpoint,
    usage_date: usageDate,
  });

  if (error) {
    throw new QuotaServiceError(
      `api_usage insert failed: ${error.message ?? 'Unknown Supabase error'}`
    );
  }
}

export function isQuotaEnabled(): boolean {
  return process.env.API_QUOTA_ENABLED === 'true';
}

export function isValidDeviceId(deviceId: string | null): deviceId is string {
  return typeof deviceId === 'string' && UUID_V4_PATTERN.test(deviceId);
}

export async function hashDeviceId(deviceId: string): Promise<string> {
  try {
    return await sha256Hex(deviceId);
  } catch (error) {
    throw new QuotaServiceError(
      error instanceof Error ? error.message : 'Device ID hashing failed',
      { cause: error }
    );
  }
}

export async function checkAndConsumeQuota(
  deviceIdHash: string,
  endpoint: ApiQuotaEndpoint,
  supabase: SupabaseClient = getSupabaseAdminClient()
): Promise<QuotaResult> {
  const now = new Date();
  const usageDate = getUsageDateUtc(now);
  const resetAtUtc = getResetAtUtc(now);
  const retryAfterSeconds = getRetryAfterSeconds(now);

  const [globalCount, deviceTotalCount, endpointCount] = await Promise.all([
    countApiUsage(
      supabase
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('usage_date', usageDate),
      'Global quota count'
    ),
    countApiUsage(
      supabase
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('device_id_hash', deviceIdHash)
        .eq('usage_date', usageDate),
      'Device daily quota count'
    ),
    countApiUsage(
      supabase
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('device_id_hash', deviceIdHash)
        .eq('usage_date', usageDate)
        .eq('endpoint', endpoint),
      'Device endpoint quota count'
    ),
  ]);

  if (globalCount >= GLOBAL_LIMIT_PER_DAY) {
    return {
      allowed: false,
      reason: 'global_day',
      scope: 'global',
      retryAfterSeconds,
      resetAtUtc,
    };
  }

  if (deviceTotalCount >= DEVICE_TOTAL_LIMIT_PER_DAY) {
    return {
      allowed: false,
      reason: 'device_total',
      scope: 'device',
      retryAfterSeconds,
      resetAtUtc,
    };
  }

  if (endpointCount >= getEndpointLimit(endpoint)) {
    return {
      allowed: false,
      reason: 'device_endpoint',
      scope: 'device',
      retryAfterSeconds,
      resetAtUtc,
    };
  }

  await insertApiUsage(supabase, {
    deviceIdHash,
    endpoint,
    usageDate,
  });

  return {
    allowed: true,
    remainingDevice: Math.max(
      0,
      DEVICE_TOTAL_LIMIT_PER_DAY - (deviceTotalCount + 1)
    ),
    remainingGlobal: Math.max(0, GLOBAL_LIMIT_PER_DAY - (globalCount + 1)),
    resetAtUtc,
  };
}

export function quotaUnavailableResponse(): Response {
  return Response.json({ error: 'Quota service unavailable' }, { status: 503 });
}

export function createRateLimitResponse(
  result: Extract<QuotaResult, { allowed: false }>,
  endpoint: ApiQuotaEndpoint
): Response {
  const responseBody: RateLimitedErrorBody = {
    error: 'rate_limited',
    reason: result.reason,
    scope: result.scope,
    resetAtUtc: result.resetAtUtc,
  };

  return Response.json(responseBody, {
    status: 429,
    headers: {
      'Retry-After': String(result.retryAfterSeconds),
      'X-RateLimit-Limit': String(getRateLimitWindow(result.reason, endpoint)),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(
        Math.floor(new Date(result.resetAtUtc).getTime() / 1000)
      ),
    },
  });
}

export async function enforceQuizQuota(
  request: Request,
  endpoint: ApiQuotaEndpoint
): Promise<QuotaEnforcementResult> {
  if (!isQuotaEnabled()) {
    return { deviceIdHash: null, response: null };
  }

  const deviceId = request.headers.get(DEVICE_ID_HEADER);
  if (!isValidDeviceId(deviceId)) {
    return {
      deviceIdHash: null,
      response: Response.json(
        { error: `${DEVICE_ID_HEADER} must be a valid UUID v4` },
        { status: 400 }
      ),
    };
  }

  const deviceIdHash = await hashDeviceId(deviceId);
  const quotaResult = await checkAndConsumeQuota(deviceIdHash, endpoint);

  return quotaResult.allowed
    ? { deviceIdHash, response: null }
    : {
        deviceIdHash,
        reason: quotaResult.reason,
        response: createRateLimitResponse(quotaResult, endpoint),
      };
}
