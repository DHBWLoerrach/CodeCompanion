import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { storage } from "@/lib/storage";
import { type Language } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  isLoading: boolean;
  refreshLanguage: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | null>(null);
const fallbackLanguageContext: LanguageContextType = {
  language: "de",
  isLoading: false,
  refreshLanguage: async () => {},
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("de");
  const [isLoading, setIsLoading] = useState(true);

  const loadLanguage = useCallback(async () => {
    try {
      const settings = await storage.getSettings();
      setLanguage(settings.language);
    } catch {
      setLanguage("de");
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
  if (!context) return fallbackLanguageContext;
  return context;
}
