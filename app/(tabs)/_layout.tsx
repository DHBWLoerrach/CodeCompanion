import React from "react";
import { NativeTabs, Icon, Label, VectorIcon } from "expo-router/unstable-native-tabs";
import Feather from "@expo/vector-icons/Feather";

import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";

export default function TabsLayout() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isIOS = process.env.EXPO_OS === "ios";

  return (
    <NativeTabs tintColor={theme.primary}>
      <NativeTabs.Trigger name="learn">
        <Label>{t("learn")}</Label>
        {isIOS ? <Icon sf="book" /> : <VectorIcon vector={Feather} name="book-open" />}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="practice">
        <Label>{t("practice")}</Label>
        {isIOS ? (
          <Icon sf="questionmark.circle" />
        ) : (
          <VectorIcon vector={Feather} name="help-circle" />
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <Label>{t("progress")}</Label>
        {isIOS ? <Icon sf="chart.bar" /> : <VectorIcon vector={Feather} name="bar-chart-2" />}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
