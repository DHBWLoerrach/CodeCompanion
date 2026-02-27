import React, { useCallback } from "react";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useFocusEffect } from "expo-router";
import Feather from "@expo/vector-icons/Feather";

import { useTheme } from "@/contexts/ThemeContext";
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
        <NativeTabs.Trigger.Label>{t("learn")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="book"
          src={
            <NativeTabs.Trigger.VectorIcon family={Feather} name="book-open" />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="practice">
        <NativeTabs.Trigger.Label>{t("practice")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="questionmark.circle"
          src={
            <NativeTabs.Trigger.VectorIcon
              family={Feather}
              name="help-circle"
            />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>{t("progress")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="chart.bar"
          src={
            <NativeTabs.Trigger.VectorIcon
              family={Feather}
              name="bar-chart-2"
            />
          }
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
