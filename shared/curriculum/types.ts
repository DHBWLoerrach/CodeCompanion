import type { ProgrammingLanguageId } from "@shared/programming-language";

export interface LocalizedText {
  en: string;
  de: string;
}

export interface CurriculumTopic {
  order: number;
  id: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  prerequisites: string[];
  optional?: boolean;
  legacyNameKey?: string;
  legacyDescKey?: string;
}

export interface CurriculumCategory {
  order: number;
  id: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  topics: CurriculumTopic[];
  legacyNameKey?: string;
}

export interface CurriculumLanguage {
  languageId: ProgrammingLanguageId;
  languageName: LocalizedText;
  languageNameKey?: string;
  shortName?: string;
  color?: string;
  contextExclusion?: string;
  categories: CurriculumCategory[];
}
