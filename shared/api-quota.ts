export const DEVICE_ID_HEADER = "X-Device-Id";

export const QUIZ_GENERATE_QUOTA_ENDPOINT = "quiz/generate";
export const QUIZ_GENERATE_MIXED_QUOTA_ENDPOINT = "quiz/generate-mixed";

export type ApiQuotaEndpoint =
  | typeof QUIZ_GENERATE_QUOTA_ENDPOINT
  | typeof QUIZ_GENERATE_MIXED_QUOTA_ENDPOINT;

export type ApiQuotaReason = "global_day" | "device_total" | "device_endpoint";

export type ApiQuotaScope = "global" | "device";

export type RateLimitedErrorBody = {
  error: "rate_limited";
  reason: ApiQuotaReason;
  scope: ApiQuotaScope;
  resetAtUtc: string;
};

export function isRateLimitedErrorBody(
  value: unknown,
): value is RateLimitedErrorBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RateLimitedErrorBody>;
  return (
    candidate.error === "rate_limited" &&
    (candidate.reason === "global_day" ||
      candidate.reason === "device_total" ||
      candidate.reason === "device_endpoint") &&
    (candidate.scope === "global" || candidate.scope === "device") &&
    typeof candidate.resetAtUtc === "string"
  );
}
