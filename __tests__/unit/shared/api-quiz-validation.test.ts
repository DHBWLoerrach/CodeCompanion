import { isQuizValidationErrorBody } from '@shared/api-quiz-validation';

describe('isQuizValidationErrorBody', () => {
  it('returns true for a valid quiz validation error body', () => {
    expect(
      isQuizValidationErrorBody({
        error: 'quiz_validation_failed',
      })
    ).toBe(true);
  });

  it('returns false for nullish and non-object values', () => {
    expect(isQuizValidationErrorBody(null)).toBe(false);
    expect(isQuizValidationErrorBody(undefined)).toBe(false);
    expect(isQuizValidationErrorBody('quiz_validation_failed')).toBe(false);
  });

  it('returns false when the error code does not match', () => {
    expect(
      isQuizValidationErrorBody({
        error: 'rate_limited',
      })
    ).toBe(false);
  });
});
