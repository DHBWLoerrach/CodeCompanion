import React from "react";
import {
  Pressable,
  StyleSheet,
  type Insets,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { EaseView } from "react-native-ease";

import { AppIcon } from "@/components/AppIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { usePressAnimation } from "@/hooks/usePressAnimation";

const HEADER_ICON_BUTTON_SIZE = 36;

interface HeaderIconButtonProps {
  icon: string;
  onPress: () => void;
  color?: string;
  iconSize?: number;
  testID?: string;
  hitSlop?: number | Insets;
  style?: StyleProp<ViewStyle>;
}

export function HeaderIconButton({
  icon,
  onPress,
  color,
  iconSize = 19,
  testID,
  hitSlop = 12,
  style,
}: HeaderIconButtonProps) {
  const { theme } = useTheme();
  const { animate, transition, handlePressIn, handlePressOut } =
    usePressAnimation(0.96);

  return (
    <EaseView animate={animate} transition={transition}>
      <Pressable
        testID={testID}
        style={[styles.button, style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={hitSlop}
      >
        <AppIcon name={icon} size={iconSize} color={color ?? theme.text} />
      </Pressable>
    </EaseView>
  );
}

const styles = StyleSheet.create({
  button: {
    width: HEADER_ICON_BUTTON_SIZE,
    height: HEADER_ICON_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
