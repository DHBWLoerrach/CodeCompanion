import { useState, useEffect, useCallback } from "react";
import { storage } from "@/lib/storage";
import {
  getDeviceLanguage,
  translations,
  type Language,
  type TranslationKey,
} from "@/lib/i18n";

export function useTranslation() {
  const [language, setLanguage] = useState<Language>(getDeviceLanguage());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const settings = await storage.getSettings();
      setLanguage(settings.language);
    } catch {
      setLanguage(getDeviceLanguage());
    } finally {
      setIsLoading(false);
    }
  };

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] || translations.en[key] || key;
    },
    [language],
  );

  const refreshLanguage = useCallback(async () => {
    const settings = await storage.getSettings();
    setLanguage(settings.language);
  }, []);

  return { t, language, isLoading, refreshLanguage };
}
