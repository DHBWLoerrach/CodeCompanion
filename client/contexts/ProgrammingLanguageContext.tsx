import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { storage } from "@/lib/storage";
import {
  getLanguageById,
  type ProgrammingLanguage,
} from "@/lib/languages";

interface ProgrammingLanguageContextType {
  selectedLanguageId: string | null;
  selectedLanguage: ProgrammingLanguage | null;
  setSelectedLanguage: (id: string) => Promise<void>;
  isLoading: boolean;
  isLanguageSelected: boolean;
}

const ProgrammingLanguageContext =
  createContext<ProgrammingLanguageContextType | null>(null);

export function ProgrammingLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        await storage.migrateProgressToCompositeKeys();
        const id = await storage.getSelectedLanguage();
        if (id && getLanguageById(id)) {
          setSelectedLanguageId(id);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const setSelectedLanguage = useCallback(async (id: string) => {
    await storage.setSelectedLanguage(id);
    setSelectedLanguageId(id);
  }, []);

  const selectedLanguage = useMemo(
    () =>
      selectedLanguageId ? (getLanguageById(selectedLanguageId) ?? null) : null,
    [selectedLanguageId],
  );

  const isLanguageSelected = selectedLanguage !== null;

  const value = useMemo(
    () => ({
      selectedLanguageId,
      selectedLanguage,
      setSelectedLanguage,
      isLoading,
      isLanguageSelected,
    }),
    [
      selectedLanguageId,
      selectedLanguage,
      setSelectedLanguage,
      isLoading,
      isLanguageSelected,
    ],
  );

  return (
    <ProgrammingLanguageContext.Provider value={value}>
      {children}
    </ProgrammingLanguageContext.Provider>
  );
}

export function useProgrammingLanguage(): ProgrammingLanguageContextType {
  const context = useContext(ProgrammingLanguageContext);
  if (!context) {
    throw new Error(
      "useProgrammingLanguage must be used within ProgrammingLanguageProvider",
    );
  }
  return context;
}
