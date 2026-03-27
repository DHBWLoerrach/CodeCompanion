import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { storage } from "@/lib/storage";
import { getDeviceLocale } from "@/lib/device-locale";
import { resolveLanguageFromLocale, type Language } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  isLoading: boolean;
  refreshLanguage: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function getInitialLanguage(): Language {
  return resolveLanguageFromLocale(getDeviceLocale());
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [isLoading, setIsLoading] = useState(true);

  const loadLanguage = useCallback(async () => {
    try {
      const hasStoredSettings = await storage.hasStoredSettings();
      if (!hasStoredSettings) {
        const initialLanguage = getInitialLanguage();
        await storage.setSettings({
          language: initialLanguage,
          themeMode: "auto",
        });
        setLanguage(initialLanguage);
        return;
      }

      const settings = await storage.getSettings();
      setLanguage(settings.language);
    } catch {
      setLanguage(getInitialLanguage());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLanguage();
  }, [loadLanguage]);

  const refreshLanguage = useCallback(async () => {
    await loadLanguage();
  }, [loadLanguage]);

  const value = useMemo(
    () => ({ language, isLoading, refreshLanguage }),
    [language, isLoading, refreshLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: getInitialLanguage(),
      isLoading: false,
      refreshLanguage: async () => {},
    };
  }
  return context;
}
