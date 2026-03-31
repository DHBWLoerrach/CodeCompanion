import { isRateLimitedErrorBody } from '@shared/api-quota';

describe('isRateLimitedErrorBody', () => {
  it('returns true for a valid rate-limited response body', () => {
    expect(
      isRateLimitedErrorBody({
        error: 'rate_limited',
        reason: 'device_total',
        scope: 'device',
        resetAtUtc: '2026-03-25T00:00:00.000Z',
      })
    ).toBe(true);
  });

  it('returns false for nullish and non-object values', () => {
    expect(isRateLimitedErrorBody(null)).toBe(false);
    expect(isRateLimitedErrorBody(undefined)).toBe(false);
    expect(isRateLimitedErrorBody('rate_limited')).toBe(false);
  });

  it('returns false when required fields are missing or invalid', () => {
    expect(
      isRateLimitedErrorBody({
        error: 'rate_limited',
        scope: 'device',
        resetAtUtc: '2026-03-25T00:00:00.000Z',
      })
    ).toBe(false);
    expect(
      isRateLimitedErrorBody({
        error: 'rate_limited',
        reason: 'device_total',
        scope: 'tenant',
        resetAtUtc: '2026-03-25T00:00:00.000Z',
      })
    ).toBe(false);
    expect(
      isRateLimitedErrorBody({
        error: 'nope',
        reason: 'device_total',
        scope: 'device',
        resetAtUtc: '2026-03-25T00:00:00.000Z',
      })
    ).toBe(false);
  });
});
