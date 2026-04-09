export const DEFAULT_QUIZ_QUESTION_COUNT = 5;
export const MULTI_TOPIC_QUIZ_TOPIC_LIMIT = 3;
export const MIXED_QUIZ_MODE = 'mixed';
export const EXPLORE_QUIZ_MODE = 'explore';
export const LEARN_QUIZ_RETURN_TARGET = 'learn';
export const PRACTICE_QUIZ_RETURN_TARGET = 'practice';

export type QuizReturnTarget =
  | typeof LEARN_QUIZ_RETURN_TARGET
  | typeof PRACTICE_QUIZ_RETURN_TARGET;

export type QuizReturnPath = '/learn' | '/practice';

export function resolveQuizReturnTarget(
  value: string | null | undefined
): QuizReturnTarget {
  return value === PRACTICE_QUIZ_RETURN_TARGET
    ? PRACTICE_QUIZ_RETURN_TARGET
    : LEARN_QUIZ_RETURN_TARGET;
}

export function getQuizReturnPath(target: QuizReturnTarget): QuizReturnPath {
  return target === PRACTICE_QUIZ_RETURN_TARGET ? '/practice' : '/learn';
}
