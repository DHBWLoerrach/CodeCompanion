import { useCallback } from "react";
import { translations, type TranslationKey } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export function useTranslation() {
  const { language, isLoading, refreshLanguage } = useLanguage();

  const t = useCallback(
    (key: TranslationKey): string => {
      const localizedTranslations = translations[language] as Record<
        TranslationKey,
        string
      >;
      const englishTranslations = translations.en as Record<
        TranslationKey,
        string
      >;
      return localizedTranslations[key] || englishTranslations[key] || key;
    },
    [language],
  );

  return { t, language, isLoading, refreshLanguage };
}
