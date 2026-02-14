import {
  clampQuizDifficultyLevel,
  type QuizDifficultyLevel,
} from "@shared/skill-level";
import { isValidTopicId } from "@shared/curriculum";
import {
  DEFAULT_PROGRAMMING_LANGUAGE_ID,
  SUPPORTED_PROGRAMMING_LANGUAGE_IDS,
  type ProgrammingLanguageId,
} from "@shared/programming-language";

type SupportedLanguage = "en" | "de";

// @visibleForTesting
export function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toQuestionCount(value: unknown, fallback: number): number {
  const parsed = toNumber(value, fallback);
  return Math.min(20, Math.max(1, parsed));
}

export function toLanguage(value: unknown): SupportedLanguage | null {
  if (value === undefined || value === null) return "en";
  return value === "en" || value === "de" ? value : null;
}

export function requireTopicId(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value;
}

export function toProgrammingLanguage(value: unknown): ProgrammingLanguageId {
  if (
    typeof value === "string" &&
    SUPPORTED_PROGRAMMING_LANGUAGE_IDS.includes(value as ProgrammingLanguageId)
  ) {
    return value as ProgrammingLanguageId;
  }
  return DEFAULT_PROGRAMMING_LANGUAGE_ID;
}

export function toQuizDifficultyLevel(
  value: unknown,
  fallback: QuizDifficultyLevel = 1,
): QuizDifficultyLevel {
  return clampQuizDifficultyLevel(value, fallback);
}

export function validateTopicIdForLanguage(
  topicId: string,
  languageId: ProgrammingLanguageId,
): boolean {
  if (typeof topicId !== "string" || topicId.length === 0) {
    return false;
  }

  return isValidTopicId(languageId, topicId);
}

export function validateTopicIdsForLanguage(
  topicIds: string[],
  languageId: ProgrammingLanguageId,
): boolean {
  if (!Array.isArray(topicIds)) {
    return false;
  }

  return topicIds.every((topicId) =>
    validateTopicIdForLanguage(topicId, languageId),
  );
}
