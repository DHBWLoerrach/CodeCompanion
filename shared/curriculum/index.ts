import javaCurriculumJson from "./java.json";
import javascriptCurriculumJson from "./javascript.json";
import pythonCurriculumJson from "./python.json";
import type {
  CurriculumCategory,
  CurriculumLanguage,
  CurriculumTopic,
  LocalizedText,
} from "./types";
import {
  SUPPORTED_PROGRAMMING_LANGUAGE_IDS,
  type ProgrammingLanguageId,
} from "@shared/programming-language";

const DEFAULT_LANGUAGE_METADATA: Record<
  ProgrammingLanguageId,
  { shortName: string; color: string }
> = {
  javascript: { shortName: "JS", color: "#F7DF1E" },
  python: { shortName: "PY", color: "#3776AB" },
  java: { shortName: "JV", color: "#F89820" },
};

const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const SHORT_NAME_PATTERN = /^[A-Z]{2}$/;

function assertValid(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Invalid curriculum: ${message}`);
  }
}

function isProgrammingLanguageId(
  value: string,
): value is ProgrammingLanguageId {
  return SUPPORTED_PROGRAMMING_LANGUAGE_IDS.includes(
    value as ProgrammingLanguageId,
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isLocalizedText(value: unknown): value is LocalizedText {
  if (!value || typeof value !== "object") return false;
  const localized = value as Record<string, unknown>;
  return isNonEmptyString(localized.en) && isNonEmptyString(localized.de);
}

function stableSortByOrder<T extends { order: number }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.order - b.item.order || a.index - b.index)
    .map((entry) => entry.item);
}

function normalizeLocalizedText(
  value: LocalizedText,
  path: string,
): LocalizedText {
  assertValid(
    isLocalizedText(value),
    `${path} must provide non-empty en/de text`,
  );
  return {
    en: value.en.trim(),
    de: value.de.trim(),
  };
}

function normalizeTopic(topic: CurriculumTopic, path: string): CurriculumTopic {
  assertValid(
    isNonEmptyString(topic.id),
    `${path}.id must be a non-empty string`,
  );
  assertValid(
    typeof topic.order === "number" && Number.isFinite(topic.order),
    `${path}.order must be a finite number`,
  );
  assertValid(
    Array.isArray(topic.prerequisites),
    `${path}.prerequisites must be an array`,
  );

  for (const [index, prerequisite] of topic.prerequisites.entries()) {
    assertValid(
      isNonEmptyString(prerequisite),
      `${path}.prerequisites[${index}] must be a non-empty string`,
    );
  }

  return {
    ...topic,
    id: topic.id.trim(),
    name: normalizeLocalizedText(topic.name, `${path}.name`),
    shortDescription: normalizeLocalizedText(
      topic.shortDescription,
      `${path}.shortDescription`,
    ),
    prerequisites: topic.prerequisites.map((value) => value.trim()),
    optional: topic.optional ?? false,
    legacyNameKey: topic.legacyNameKey?.trim() || undefined,
    legacyDescKey: topic.legacyDescKey?.trim() || undefined,
  };
}

function normalizeCategory(
  category: CurriculumCategory,
  path: string,
): CurriculumCategory {
  assertValid(
    isNonEmptyString(category.id),
    `${path}.id must be a non-empty string`,
  );
  assertValid(
    typeof category.order === "number" && Number.isFinite(category.order),
    `${path}.order must be a finite number`,
  );
  assertValid(
    Array.isArray(category.topics),
    `${path}.topics must be an array`,
  );

  const normalizedTopics = stableSortByOrder(
    category.topics.map((topic, index) =>
      normalizeTopic(topic, `${path}.topics[${index}]`),
    ),
  );

  return {
    ...category,
    id: category.id.trim(),
    name: normalizeLocalizedText(category.name, `${path}.name`),
    shortDescription: normalizeLocalizedText(
      category.shortDescription,
      `${path}.shortDescription`,
    ),
    topics: normalizedTopics,
    legacyNameKey: category.legacyNameKey?.trim() || undefined,
  };
}

function validateUniqueIds(language: CurriculumLanguage): void {
  const categoryIds = new Set<string>();
  const topicIds = new Set<string>();

  for (const category of language.categories) {
    assertValid(
      !categoryIds.has(category.id),
      `${language.languageId}: duplicate category id '${category.id}'`,
    );
    categoryIds.add(category.id);

    for (const topic of category.topics) {
      assertValid(
        !topicIds.has(topic.id),
        `${language.languageId}: duplicate topic id '${topic.id}'`,
      );
      topicIds.add(topic.id);
    }
  }
}

function validateTopicPrerequisites(language: CurriculumLanguage): void {
  const topicIds = new Set<string>();
  for (const category of language.categories) {
    for (const topic of category.topics) {
      topicIds.add(topic.id);
    }
  }

  for (const category of language.categories) {
    for (const topic of category.topics) {
      for (const prerequisite of topic.prerequisites) {
        assertValid(
          prerequisite !== topic.id,
          `${language.languageId}:${topic.id} must not reference itself as prerequisite`,
        );
        assertValid(
          topicIds.has(prerequisite),
          `${language.languageId}:${topic.id} has unknown prerequisite '${prerequisite}'`,
        );
      }
    }
  }
}

function normalizeLanguage(language: CurriculumLanguage): CurriculumLanguage {
  assertValid(
    isProgrammingLanguageId(language.languageId),
    `languageId '${String(language.languageId)}' is not supported`,
  );
  assertValid(
    Array.isArray(language.categories),
    `${language.languageId}.categories must be an array`,
  );

  const normalizedCategories = stableSortByOrder(
    language.categories.map((category, index) =>
      normalizeCategory(
        category,
        `${language.languageId}.categories[${index}]`,
      ),
    ),
  );

  const defaults = DEFAULT_LANGUAGE_METADATA[language.languageId];
  const shortNameCandidate = isNonEmptyString(language.shortName)
    ? language.shortName.trim()
    : "";
  const shortName = SHORT_NAME_PATTERN.test(shortNameCandidate)
    ? shortNameCandidate
    : defaults.shortName;
  const color =
    typeof language.color === "string" && COLOR_PATTERN.test(language.color)
      ? language.color
      : defaults.color;

  const normalizedLanguage: CurriculumLanguage = {
    ...language,
    languageId: language.languageId,
    languageName: normalizeLocalizedText(
      language.languageName,
      `${language.languageId}.languageName`,
    ),
    languageNameKey: language.languageNameKey?.trim() || undefined,
    shortName,
    color,
    contextExclusion: language.contextExclusion?.trim() || "",
    categories: normalizedCategories,
  };

  validateUniqueIds(normalizedLanguage);
  validateTopicPrerequisites(normalizedLanguage);

  return normalizedLanguage;
}

function buildCurriculumRegistry(): Record<
  ProgrammingLanguageId,
  CurriculumLanguage
> {
  const rawCurricula = [
    javascriptCurriculumJson,
    pythonCurriculumJson,
    javaCurriculumJson,
  ] as CurriculumLanguage[];

  const registry = {} as Record<ProgrammingLanguageId, CurriculumLanguage>;

  for (const rawCurriculum of rawCurricula) {
    const normalized = normalizeLanguage(rawCurriculum);
    assertValid(
      !(normalized.languageId in registry),
      `duplicate language '${normalized.languageId}'`,
    );
    registry[normalized.languageId] = normalized;
  }

  for (const languageId of SUPPORTED_PROGRAMMING_LANGUAGE_IDS) {
    assertValid(
      languageId in registry,
      `missing curriculum for supported language '${languageId}'`,
    );
  }

  return registry;
}

const CURRICULA_BY_LANGUAGE = buildCurriculumRegistry();

export function getAllCurricula(): CurriculumLanguage[] {
  return SUPPORTED_PROGRAMMING_LANGUAGE_IDS.map(
    (languageId) => CURRICULA_BY_LANGUAGE[languageId],
  );
}

export function getCurriculumByLanguage(
  languageId: ProgrammingLanguageId,
): CurriculumLanguage {
  return CURRICULA_BY_LANGUAGE[languageId];
}

export function getTopicIdsByLanguage(
  languageId: ProgrammingLanguageId,
): string[] {
  return CURRICULA_BY_LANGUAGE[languageId].categories.flatMap((category) =>
    category.topics.map((topic) => topic.id),
  );
}

export function getTopicById(
  languageId: ProgrammingLanguageId,
  topicId: string,
): CurriculumTopic | undefined {
  for (const category of CURRICULA_BY_LANGUAGE[languageId].categories) {
    const topic = category.topics.find((item) => item.id === topicId);
    if (topic) return topic;
  }
  return undefined;
}

export function isValidTopicId(
  languageId: ProgrammingLanguageId,
  topicId: string,
): boolean {
  return getTopicById(languageId, topicId) !== undefined;
}

export function getLocalizedText(
  text: LocalizedText,
  language: "en" | "de",
): string {
  return text[language] || text.en;
}
