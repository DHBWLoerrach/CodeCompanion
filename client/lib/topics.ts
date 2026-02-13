import { getAllCurricula, getLocalizedText } from "@shared/curriculum";
import type {
  CurriculumCategory,
  CurriculumTopic,
  LocalizedText,
} from "@shared/curriculum/types";
import {
  DEFAULT_PROGRAMMING_LANGUAGE_ID,
  type ProgrammingLanguageId,
} from "@shared/programming-language";
import { type Language, type TranslationKey, translations } from "./i18n";

export interface Topic {
  id: string;
  category: string;
  order: number;
  prerequisites: string[];
  optional: boolean;
  name: LocalizedText;
  shortDescription: LocalizedText;
  legacyNameKey?: TranslationKey;
  legacyDescKey?: TranslationKey;
  // Legacy aliases for older callers.
  nameKey?: TranslationKey;
  descKey?: TranslationKey;
}

export interface Category {
  id: string;
  order: number;
  name: LocalizedText;
  shortDescription: LocalizedText;
  topics: Topic[];
  legacyNameKey?: TranslationKey;
  // Legacy alias for older callers.
  nameKey?: TranslationKey;
}

function isTranslationKey(value: string): value is TranslationKey {
  return Object.prototype.hasOwnProperty.call(translations.en, value);
}

function toTranslationKey(
  value: string | undefined,
): TranslationKey | undefined {
  if (!value || !isTranslationKey(value)) return undefined;
  return value;
}

function mapTopic(topic: CurriculumTopic, categoryId: string): Topic {
  const legacyNameKey = toTranslationKey(topic.legacyNameKey);
  const legacyDescKey = toTranslationKey(topic.legacyDescKey);

  return {
    id: topic.id,
    category: categoryId,
    order: topic.order,
    prerequisites: topic.prerequisites,
    optional: topic.optional ?? false,
    name: topic.name,
    shortDescription: topic.shortDescription,
    legacyNameKey,
    legacyDescKey,
    nameKey: legacyNameKey,
    descKey: legacyDescKey,
  };
}

function mapCategory(category: CurriculumCategory): Category {
  const legacyNameKey = toTranslationKey(category.legacyNameKey);

  return {
    id: category.id,
    order: category.order,
    name: category.name,
    shortDescription: category.shortDescription,
    topics: category.topics.map((topic) => mapTopic(topic, category.id)),
    legacyNameKey,
    nameKey: legacyNameKey,
  };
}

const CATEGORIES_BY_LANGUAGE = Object.fromEntries(
  getAllCurricula().map((curriculum) => [
    curriculum.languageId,
    curriculum.categories.map(mapCategory),
  ]),
) as Record<ProgrammingLanguageId, Category[]>;

export const JAVASCRIPT_CATEGORIES =
  CATEGORIES_BY_LANGUAGE[DEFAULT_PROGRAMMING_LANGUAGE_ID];

export function getCategoriesByLanguage(
  languageId: ProgrammingLanguageId,
): Category[] {
  return CATEGORIES_BY_LANGUAGE[languageId] ?? JAVASCRIPT_CATEGORIES;
}

export function getTopicById(
  topicId: string,
  categories: Category[] = JAVASCRIPT_CATEGORIES,
): Topic | undefined {
  for (const category of categories) {
    const topic = category.topics.find((candidate) => candidate.id === topicId);
    if (topic) return topic;
  }
  return undefined;
}

function resolveLegacyTranslation(
  key: TranslationKey | undefined,
  language: Language,
): string | undefined {
  if (!key) return undefined;
  return translations[language][key] || translations.en[key];
}

export function getTopicName(topic: Topic, language: Language): string {
  const localized = getLocalizedText(topic.name, language).trim();
  if (localized) return localized;

  const legacy = resolveLegacyTranslation(topic.legacyNameKey, language);
  if (legacy) return legacy;

  return topic.id;
}

export function getTopicDescription(topic: Topic, language: Language): string {
  const localized = getLocalizedText(topic.shortDescription, language).trim();
  if (localized) return localized;

  const legacy = resolveLegacyTranslation(topic.legacyDescKey, language);
  if (legacy) return legacy;

  return "";
}

export function getCategoryName(
  category: Category,
  language: Language,
): string {
  const localized = getLocalizedText(category.name, language).trim();
  if (localized) return localized;

  const legacy = resolveLegacyTranslation(category.legacyNameKey, language);
  if (legacy) return legacy;

  return category.id;
}
