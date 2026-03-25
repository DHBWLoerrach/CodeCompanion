import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppIcon } from "@/components/AppIcon";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing, withOpacity } from "@/constants/theme";

type StatusBadgeProps = {
  color: string;
  icon?: string;
  label: string;
  size?: "default" | "compact";
  style?: StyleProp<ViewStyle>;
};

export function StatusBadge({
  color,
  icon,
  label,
  size = "default",
  style,
}: StatusBadgeProps) {
  const isCompact = size === "compact";

  return (
    <View
      style={[
        styles.container,
        isCompact ? styles.compact : styles.default,
        { backgroundColor: withOpacity(color, isCompact ? 0.14 : 0.12) },
        style,
      ]}
    >
      {icon ? (
        <AppIcon name={icon} size={isCompact ? 14 : 16} color={color} />
      ) : null}
      <ThemedText
        type={isCompact ? "small" : "label"}
        numberOfLines={1}
        style={[styles.label, { color }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  container: {
    alignSelf: "flex-start",
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    gap: 6,
    maxWidth: "100%",
  },
  default: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  label: {
    fontWeight: "600",
  },
});
