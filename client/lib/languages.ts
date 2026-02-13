import type { TranslationKey } from "./i18n";
import type { Category } from "./topics";
import { JAVASCRIPT_CATEGORIES } from "./topics";
import {
  DEFAULT_PROGRAMMING_LANGUAGE_ID,
  type ProgrammingLanguageId,
} from "@shared/programming-language";

export interface ProgrammingLanguage {
  id: ProgrammingLanguageId;
  nameKey: TranslationKey;
  shortName: string;
  color: string;
  categories: Category[];
}

export const LANGUAGES: ProgrammingLanguage[] = [
  {
    id: DEFAULT_PROGRAMMING_LANGUAGE_ID,
    nameKey: "javascript",
    shortName: "JS",
    color: "#F7DF1E",
    categories: JAVASCRIPT_CATEGORIES,
  },
];

export function getLanguageById(
  languageId: string | null | undefined,
): ProgrammingLanguage | undefined {
  if (!languageId) return undefined;
  return LANGUAGES.find((lang) => lang.id === languageId);
}
