import React, { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomActionBarLayout, Spacing } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";

type BottomActionBarProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function BottomActionBar({ children, style }: BottomActionBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          borderTopColor: theme.separator,
          paddingBottom: insets.bottom + BottomActionBarLayout.paddingBottom,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    gap: BottomActionBarLayout.gap,
    left: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: BottomActionBarLayout.paddingTop,
    position: "absolute",
    right: 0,
  },
});
