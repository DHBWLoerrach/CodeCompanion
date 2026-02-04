import type { ComponentProps } from "react";
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
  const isIOS = process.env.EXPO_OS === "ios";

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
        ? isIOS
          ? undefined
          : theme.backgroundRoot
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
