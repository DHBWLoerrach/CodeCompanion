import type { ComponentProps } from 'react';
import { Stack } from 'expo-router';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

import { useTheme } from '@/contexts/ThemeContext';

interface UseScreenOptionsParams {
  transparent?: boolean;
}

type ScreenOptions = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): ScreenOptions {
  const { theme, isDark } = useTheme();
  const isIOS = process.env.EXPO_OS === 'ios';
  const useTransparentHeader = transparent && isIOS;
  const usesNativeScrollEdgeMaterial = isIOS && isLiquidGlassAvailable();

  return {
    headerTitleAlign: 'center',
    headerTransparent: useTransparentHeader,
    // Avoid stacking the legacy blur effect on top of iOS scroll-edge material.
    headerBlurEffect:
      useTransparentHeader && !usesNativeScrollEdgeMaterial
        ? isDark
          ? 'dark'
          : 'light'
        : undefined,
    headerTintColor: theme.text,
    headerBackTitle: '',
    headerBackButtonDisplayMode: 'minimal',
    headerStyle: {
      backgroundColor: useTransparentHeader
        ? undefined
        : transparent
          ? theme.backgroundRoot
          : theme.backgroundDefault,
    },
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };
}
