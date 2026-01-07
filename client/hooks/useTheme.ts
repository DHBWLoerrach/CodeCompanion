import { useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const { theme, isDark, refreshTheme } = useThemeContext();
  return { theme, isDark, refreshTheme };
}
