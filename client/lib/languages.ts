import { getAllCurricula, getLocalizedText } from "@shared/curriculum";
import type { LocalizedText } from "@shared/curriculum/types";
import type { ProgrammingLanguageId } from "@shared/programming-language";
import type { Language } from "./i18n";
import { getCategoriesByLanguage, type Category } from "./topics";

export interface ProgrammingLanguage {
  id: ProgrammingLanguageId;
  name: LocalizedText;
  shortName: string;
  color: string;
  categories: Category[];
}

export const LANGUAGES: ProgrammingLanguage[] = getAllCurricula().map(
  (curriculum) => ({
    id: curriculum.languageId,
    name: curriculum.languageName,
    shortName: curriculum.shortName ?? "",
    color: curriculum.color ?? "#000000",
    categories: getCategoriesByLanguage(curriculum.languageId),
  }),
);

export function getLanguageById(
  languageId: string | null | undefined,
): ProgrammingLanguage | undefined {
  if (!languageId) return undefined;
  return LANGUAGES.find((language) => language.id === languageId);
}

export function getLanguageDisplayName(
  language: ProgrammingLanguage,
  appLanguage: Language,
): string {
  const localized = getLocalizedText(language.name, appLanguage).trim();
  if (localized) return localized;

  return language.id;
}
