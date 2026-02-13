export const DEFAULT_PROGRAMMING_LANGUAGE_ID = "javascript" as const;

export const SUPPORTED_PROGRAMMING_LANGUAGE_IDS = [
  DEFAULT_PROGRAMMING_LANGUAGE_ID,
] as const;

export type ProgrammingLanguageId =
  (typeof SUPPORTED_PROGRAMMING_LANGUAGE_IDS)[number];
