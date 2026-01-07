import { useState, useEffect, useCallback } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { storage, type ThemeMode } from "@/lib/storage";

export function useColorScheme() {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [isLoaded, setIsLoaded] = useState(false);

  const loadThemeMode = useCallback(async () => {
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
    loadThemeMode();
  }, [loadThemeMode]);

  const refreshThemeMode = useCallback(async () => {
    await loadThemeMode();
  }, [loadThemeMode]);

  if (!isLoaded) {
    return systemColorScheme ?? "light";
  }

  if (themeMode === "auto") {
    return systemColorScheme ?? "light";
  }

  return themeMode;
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");

  const loadThemeMode = useCallback(async () => {
    try {
      const settings = await storage.getSettings();
      setThemeMode(settings.themeMode);
    } catch {
      setThemeMode("auto");
    }
  }, []);

  useEffect(() => {
    loadThemeMode();
  }, [loadThemeMode]);

  const refreshThemeMode = useCallback(async () => {
    await loadThemeMode();
  }, [loadThemeMode]);

  return { themeMode, refreshThemeMode };
}
