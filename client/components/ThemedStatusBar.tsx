import { StatusBar } from "expo-status-bar";
import { useThemeContext } from "@/contexts/ThemeContext";

export function ThemedStatusBar() {
  const { isDark, themeMode } = useThemeContext();
  
  const style = themeMode === "auto" ? "auto" : isDark ? "light" : "dark";
  
  return <StatusBar style={style} />;
}
