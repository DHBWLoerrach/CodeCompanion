export type SupportedLanguage = "en" | "de";
export type ApiSkillLevel = 1 | 2 | 3;

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

export function toSkillLevel(
  value: unknown,
  fallback: ApiSkillLevel = 1,
): ApiSkillLevel {
  const parsed = toNumber(value, fallback);
  return Math.min(3, Math.max(1, parsed)) as ApiSkillLevel;
}
