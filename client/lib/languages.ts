import { getAllCurricula, getLocalizedText } from "@shared/curriculum";
import type { LocalizedText } from "@shared/curriculum/types";
import type { ProgrammingLanguageId } from "@shared/programming-language";
import { type Language, type TranslationKey, translations } from "./i18n";
import { getCategoriesByLanguage, type Category } from "./topics";

export interface ProgrammingLanguage {
  id: ProgrammingLanguageId;
  name: LocalizedText;
  shortName: string;
  color: string;
  categories: Category[];
  // Legacy compatibility for callers still using i18n keys.
  nameKey?: TranslationKey;
}

function isTranslationKey(value: string): value is TranslationKey {
  return Object.prototype.hasOwnProperty.call(translations.en, value);
}

export const LANGUAGES: ProgrammingLanguage[] = getAllCurricula().map(
  (curriculum) => {
    const legacyNameKey =
      curriculum.languageNameKey && isTranslationKey(curriculum.languageNameKey)
        ? curriculum.languageNameKey
        : undefined;

    return {
      id: curriculum.languageId,
      name: curriculum.languageName,
      shortName: curriculum.shortName ?? "",
      color: curriculum.color ?? "#000000",
      categories: getCategoriesByLanguage(curriculum.languageId),
      nameKey: legacyNameKey,
    };
  },
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
  if (
    language.name &&
    typeof language.name.en === "string" &&
    typeof language.name.de === "string"
  ) {
    const localized = getLocalizedText(language.name, appLanguage).trim();
    if (localized) return localized;
  }

  if (language.nameKey) {
    return (
      translations[appLanguage][language.nameKey] ||
      translations.en[language.nameKey]
    );
  }

  return language.id;
}
