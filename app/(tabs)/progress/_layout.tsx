import React, { useCallback } from "react";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { HeaderIconButton } from "@/components/HeaderIconButton";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";

export default function ProgressStack() {
  const { theme } = useTheme();
  const { t, refreshLanguage } = useTranslation();
  const router = useRouter();

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
          title: t("yourProgress"),
          headerRight: () => (
            <HeaderIconButton
              icon="settings"
              testID="open-settings-button"
              onPress={() => router.push("/settings")}
              hitSlop={8}
              color={theme.tabIconDefault}
            />
          ),
        }}
      />
    </Stack>
  );
}
