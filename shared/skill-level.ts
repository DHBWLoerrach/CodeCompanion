export type MasteryLevel = 1 | 2 | 3 | 4 | 5;
export type QuizDifficultyLevel = 1 | 2 | 3;

function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// @visibleForTesting
export function clampMasteryLevel(
  value: unknown,
  fallback: MasteryLevel = 1,
): MasteryLevel {
  const parsed = toFiniteNumber(value, fallback);
  return Math.min(5, Math.max(1, parsed)) as MasteryLevel;
}

export function clampQuizDifficultyLevel(
  value: unknown,
  fallback: QuizDifficultyLevel = 1,
): QuizDifficultyLevel {
  const parsed = toFiniteNumber(value, fallback);
  return Math.min(3, Math.max(1, parsed)) as QuizDifficultyLevel;
}

// @visibleForTesting
export function masteryToQuizDifficulty(level: number): QuizDifficultyLevel {
  if (level <= 2) return 1;
  if (level <= 3) return 2;
  return 3;
}

export function averageMasteryToQuizDifficulty(
  levels: number[],
  fallback: QuizDifficultyLevel = 1,
): QuizDifficultyLevel {
  if (levels.length === 0) {
    return fallback;
  }

  const total = levels.reduce((sum, level) => sum + level, 0);
  const average = total / levels.length;
  return masteryToQuizDifficulty(average);
}
