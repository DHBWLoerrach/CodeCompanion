import React, { useCallback } from "react";
import { Stack, useFocusEffect } from "expo-router";

import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";

export default function PracticeStack() {
  const { theme } = useTheme();
  const { t, refreshLanguage } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      refreshLanguage();
    }, [refreshLanguage]),
  );

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleAlign: "left",
        headerTitleStyle: { color: theme.text },
        headerStyle: { backgroundColor: theme.backgroundRoot },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t("practice"),
        }}
      />
    </Stack>
  );
}
