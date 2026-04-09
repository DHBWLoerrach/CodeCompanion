import {
  QUIZ_VALIDATION_ERROR,
  type QuizValidationErrorBody,
} from '@shared/api-quiz-validation';

export class QuizValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuizValidationError';
  }
}

export function isQuizValidationError(
  error: unknown
): error is QuizValidationError {
  return error instanceof QuizValidationError;
}

export function quizValidationErrorResponse(): Response {
  const body: QuizValidationErrorBody = {
    error: QUIZ_VALIDATION_ERROR,
  };

  return Response.json(body, { status: 422 });
}
