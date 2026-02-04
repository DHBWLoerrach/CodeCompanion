import type { ComponentProps } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { useTheme } from "@/hooks/useTheme";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

type ScreenOptions = NonNullable<ComponentProps<typeof Stack>["screenOptions"]>;

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): ScreenOptions {
  const { theme, isDark } = useTheme();

  return {
    headerTitleAlign: "center",
    headerTransparent: transparent,
    headerBlurEffect: isDark ? "dark" : "light",
    headerTintColor: theme.text,
    headerBackTitle: "",
    headerBackTitleVisible: false,
    headerBackButtonDisplayMode: "minimal",
    headerStyle: {
      backgroundColor: transparent
        ? Platform.select({
            ios: undefined,
            android: theme.backgroundRoot,
            web: theme.backgroundRoot,
          })
        : theme.backgroundDefault,
    },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };
}
