import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { storage, type ThemeMode } from "@/lib/storage";
import { Colors } from "@/constants/theme";

interface ThemeContextType {
  theme: typeof Colors.light;
  isDark: boolean;
  themeMode: ThemeMode;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [isLoaded, setIsLoaded] = useState(false);

  const loadTheme = useCallback(async () => {
    try {
      const settings = await storage.getSettings();
      setThemeMode(settings.themeMode);
    } catch {
      setThemeMode("auto");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const refreshTheme = useCallback(async () => {
    await loadTheme();
  }, [loadTheme]);

  const effectiveColorScheme = useMemo(() => {
    if (!isLoaded) {
      return systemColorScheme ?? "light";
    }
    if (themeMode === "auto") {
      return systemColorScheme ?? "light";
    }
    return themeMode;
  }, [isLoaded, themeMode, systemColorScheme]);

  const isDark = effectiveColorScheme === "dark";
  const theme = Colors[effectiveColorScheme];

  const value = useMemo(
    () => ({ theme, isDark, themeMode, refreshTheme }),
    [theme, isDark, themeMode, refreshTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
