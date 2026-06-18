import React, {
  createContext,
  use,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { storage, type ThemeMode } from '@/lib/storage';
import { Colors } from '@/constants/theme';

interface ThemeContextType {
  theme: typeof Colors.light;
  isDark: boolean;
  themeMode: ThemeMode;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
  const [isLoaded, setIsLoaded] = useState(false);

  const loadTheme = useCallback(async () => {
    try {
      const settings = await storage.getSettings();
      setThemeMode(settings.themeMode);
    } catch {
      setThemeMode('auto');
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

  const effectiveColorScheme = useMemo<'light' | 'dark'>(() => {
    const resolvedSystemScheme =
      systemColorScheme === 'dark' ? 'dark' : 'light';

    if (!isLoaded) {
      return resolvedSystemScheme;
    }
    if (themeMode === 'auto') {
      return resolvedSystemScheme;
    }
    return themeMode;
  }, [isLoaded, themeMode, systemColorScheme]);

  const isDark = effectiveColorScheme === 'dark';
  const theme = Colors[effectiveColorScheme];

  const value = useMemo(
    () => ({ theme, isDark, themeMode, refreshTheme }),
    [theme, isDark, themeMode, refreshTheme]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const context = use(ThemeContext);
  if (!context) {
    return {
      theme: Colors.light,
      isDark: false,
      themeMode: 'auto' as ThemeMode,
      refreshTheme: async () => {},
    };
  }
  return context;
}

export const useThemeContext = useTheme;
