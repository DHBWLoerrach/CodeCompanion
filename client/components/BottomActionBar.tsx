import React, { type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { BottomActionBarLayout, Spacing, withOpacity } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useHighTextContrast,
  useReducedTransparency,
} from '@/hooks/useReducedMotion';

type BottomActionBarProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function BottomActionBar({ children, style }: BottomActionBarProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isReducedTransparencyEnabled = useReducedTransparency();
  const isHighTextContrastEnabled = useHighTextContrast();
  const useSolidMaterial =
    isReducedTransparencyEnabled || isHighTextContrastEnabled;
  const showTopSeparator =
    isHighTextContrastEnabled || Platform.OS === 'android';
  const containerStyle = [
    styles.container,
    {
      backgroundColor: useSolidMaterial
        ? theme.backgroundRoot
        : withOpacity(theme.backgroundRoot, isDark ? 0.78 : 0.72),
      borderTopColor: isHighTextContrastEnabled
        ? theme.tabIconDefault
        : theme.separator,
      borderTopWidth: showTopSeparator ? StyleSheet.hairlineWidth : 0,
      paddingBottom: insets.bottom + BottomActionBarLayout.paddingBottom,
    },
    style,
  ];

  if (useSolidMaterial) {
    return (
      <View testID="bottom-action-bar" style={containerStyle}>
        {children}
      </View>
    );
  }

  return (
    <BlurView
      blurMethod="none"
      intensity={70}
      testID="bottom-action-bar"
      tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      style={containerStyle}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    gap: BottomActionBarLayout.gap,
    left: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: BottomActionBarLayout.paddingTop,
    position: 'absolute',
    right: 0,
  },
});
