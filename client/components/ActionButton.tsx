import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { EaseView } from "react-native-ease";

import { AppIcon } from "@/components/AppIcon";
import { ThemedText } from "@/components/ThemedText";
import {
  BorderRadius,
  Shadows,
  Spacing,
  getButtonHeight,
  type ButtonSize,
  withOpacity,
} from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { usePressAnimation } from "@/hooks/usePressAnimation";

type SharedButtonProps = Omit<PressableProps, "style" | "children"> & {
  color?: string;
  icon?: string;
  label: string;
  loading?: boolean;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

function ButtonContent({
  label,
  icon,
  iconColor,
  labelColor,
  loading,
  textStyle,
}: {
  icon?: string;
  iconColor: string;
  label: string;
  labelColor: string;
  loading?: boolean;
  textStyle?: StyleProp<TextStyle>;
}) {
  if (loading) {
    return <ActivityIndicator color={labelColor} />;
  }

  return (
    <View style={styles.content}>
      {icon ? <AppIcon name={icon} size={18} color={iconColor} /> : null}
      <ThemedText
        type="body"
        numberOfLines={1}
        style={[styles.label, textStyle, { color: labelColor }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

export function PrimaryButton({
  color,
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
  onPressIn,
  onPressOut,
  size = "default",
  style,
  textStyle,
  ...props
}: SharedButtonProps) {
  const { theme } = useTheme();
  const resolvedColor = color ?? theme.secondary;
  const { animate, transition, handlePressIn, handlePressOut } =
    usePressAnimation(0.98);

  const isDisabled = disabled || loading;

  return (
    <EaseView animate={animate} transition={transition}>
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={(event) => {
          if (!isDisabled) {
            handlePressIn();
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          handlePressOut();
          onPressOut?.(event);
        }}
        style={[
          styles.base,
          styles.primary,
          {
            backgroundColor: isDisabled ? theme.disabled : resolvedColor,
            height: getButtonHeight(size),
          },
          style,
        ]}
        {...props}
      >
        <ButtonContent
          icon={icon}
          iconColor={theme.onColor}
          label={label}
          labelColor={theme.onColor}
          loading={loading}
          textStyle={textStyle}
        />
      </Pressable>
    </EaseView>
  );
}

export function SecondaryButton({
  color,
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
  onPressIn,
  onPressOut,
  size = "default",
  style,
  textStyle,
  ...props
}: SharedButtonProps) {
  const { theme } = useTheme();
  const resolvedColor = color ?? theme.secondary;
  const { animate, transition, handlePressIn, handlePressOut } =
    usePressAnimation(0.99);
  const isDisabled = disabled || loading;
  const labelColor = isDisabled ? theme.tabIconDefault : resolvedColor;

  return (
    <EaseView animate={animate} transition={transition}>
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={(event) => {
          if (!isDisabled) {
            handlePressIn();
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          handlePressOut();
          onPressOut?.(event);
        }}
        style={[
          styles.base,
          styles.secondary,
          {
            backgroundColor: withOpacity(resolvedColor, 0.05),
            borderColor: isDisabled ? theme.separator : resolvedColor,
            height: getButtonHeight(size),
          },
          style,
        ]}
        {...props}
      >
        <ButtonContent
          icon={icon}
          iconColor={labelColor}
          label={label}
          labelColor={labelColor}
          loading={loading}
          textStyle={textStyle}
        />
      </Pressable>
    </EaseView>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  label: {
    fontWeight: "600",
  },
  primary: {
    ...Shadows.floatingButton,
  },
  secondary: {
    borderWidth: 1.5,
  },
});
