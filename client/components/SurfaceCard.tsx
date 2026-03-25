import React, { type ReactNode } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";

type SurfaceCardProps = ViewProps & {
  backgroundColor?: string;
  borderColor?: string;
  children: ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  topAccentColor?: string;
};

export function SurfaceCard({
  backgroundColor,
  borderColor,
  children,
  padding = Spacing.lg,
  style,
  topAccentColor,
  ...props
}: SurfaceCardProps) {
  const { theme } = useTheme();
  const resolvedBorderColor =
    borderColor ?? (topAccentColor ? theme.cardBorderSubtle : undefined);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: backgroundColor ?? theme.backgroundDefault,
          padding,
        },
        resolvedBorderColor
          ? {
              borderColor: resolvedBorderColor,
              borderWidth: StyleSheet.hairlineWidth,
            }
          : null,
        topAccentColor
          ? {
              borderTopColor: topAccentColor,
              borderTopWidth: 2,
            }
          : null,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderCurve: "continuous",
    borderRadius: BorderRadius.lg,
    ...Shadows.card,
  },
});
