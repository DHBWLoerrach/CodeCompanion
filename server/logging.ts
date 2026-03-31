import type { ApiQuotaReason } from '@shared/api-quota';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error === null || error === undefined) return 'Unknown error';

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function logApiError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    console.error(`${context}: ${toErrorMessage(error)}`);
    return;
  }

  console.error(`${context}:`, error);
}

type ApiRequestOutcome = {
  endpoint: string;
  status: number;
  deviceIdHash?: string | null;
  reason?: ApiQuotaReason;
  requestDurationMs?: number;
  quotaDurationMs?: number;
  upstreamDurationMs?: number;
};

export function logApiRequestOutcome({
  endpoint,
  status,
  deviceIdHash,
  reason,
  requestDurationMs,
  quotaDurationMs,
  upstreamDurationMs,
}: ApiRequestOutcome): void {
  const payload = {
    endpoint,
    status,
    ...(deviceIdHash ? { deviceIdHash } : {}),
    ...(reason ? { reason } : {}),
    ...(requestDurationMs !== undefined ? { requestDurationMs } : {}),
    ...(quotaDurationMs !== undefined ? { quotaDurationMs } : {}),
    ...(upstreamDurationMs !== undefined ? { upstreamDurationMs } : {}),
  };

  if (process.env.NODE_ENV === 'production') {
    console.info(JSON.stringify(payload));
    return;
  }

  console.info('API request outcome:', payload);
}

export function buildApiRequestTimingFields({
  requestStartedAt,
  quotaDurationMs,
  upstreamStartedAt,
}: {
  requestStartedAt: number;
  quotaDurationMs?: number | null;
  upstreamStartedAt?: number | null;
}): Pick<
  ApiRequestOutcome,
  'requestDurationMs' | 'quotaDurationMs' | 'upstreamDurationMs'
> {
  const finishedAt = Date.now();

  return {
    requestDurationMs: finishedAt - requestStartedAt,
    ...(quotaDurationMs !== undefined && quotaDurationMs !== null
      ? { quotaDurationMs }
      : {}),
    ...(upstreamStartedAt !== undefined && upstreamStartedAt !== null
      ? { upstreamDurationMs: finishedAt - upstreamStartedAt }
      : {}),
  };
}
