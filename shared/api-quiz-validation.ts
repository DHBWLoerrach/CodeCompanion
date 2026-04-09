export const QUIZ_VALIDATION_ERROR = 'quiz_validation_failed';

export type QuizValidationErrorBody = {
  error: typeof QUIZ_VALIDATION_ERROR;
};

export function isQuizValidationErrorBody(
  value: unknown
): value is QuizValidationErrorBody {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    (value as Partial<QuizValidationErrorBody>).error === QUIZ_VALIDATION_ERROR
  );
}
