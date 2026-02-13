import { useState, useEffect, useCallback } from "react";
import { storage } from "@/lib/storage";
import { translations, type Language, type TranslationKey } from "@/lib/i18n";

export function useTranslation() {
  const [language, setLanguage] = useState<Language>("de");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const settings = await storage.getSettings();
      setLanguage(settings.language);
    } catch {
      setLanguage("de");
    } finally {
      setIsLoading(false);
    }
  };

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

  const refreshLanguage = useCallback(async () => {
    const settings = await storage.getSettings();
    setLanguage(settings.language);
  }, []);

  return { t, language, isLoading, refreshLanguage };
}
