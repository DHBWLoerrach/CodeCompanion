import React, { useCallback } from "react";
import {
  NativeTabs,
  Icon,
  Label,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import { useFocusEffect } from "expo-router";
import Feather from "@expo/vector-icons/Feather";

import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";

export default function TabsLayout() {
  const { theme, isDark } = useTheme();
  const { t, refreshLanguage } = useTranslation();
  const activeIndicatorColor = isDark
    ? `${theme.primary}4D`
    : `${theme.primary}1A`;

  useFocusEffect(
    useCallback(() => {
      refreshLanguage();
    }, [refreshLanguage]),
  );

  return (
    <NativeTabs
      tintColor={theme.primary}
      backgroundColor={theme.backgroundRoot}
      indicatorColor={activeIndicatorColor}
      iconColor={{ default: theme.tabIconDefault, selected: theme.primary }}
      labelStyle={{
        default: { color: theme.tabIconDefault },
        selected: { color: theme.primary },
      }}
    >
      <NativeTabs.Trigger name="learn">
        <Label>{t("learn")}</Label>
        <Icon
          sf="book"
          androidSrc={<VectorIcon family={Feather} name="book-open" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="practice">
        <Label>{t("practice")}</Label>
        <Icon
          sf="questionmark.circle"
          androidSrc={<VectorIcon family={Feather} name="help-circle" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <Label>{t("progress")}</Label>
        <Icon
          sf="chart.bar"
          androidSrc={<VectorIcon family={Feather} name="bar-chart-2" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
