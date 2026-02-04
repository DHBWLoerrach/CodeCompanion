import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";

import { AppIcon } from "@/components/AppIcon";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing } from "@/constants/theme";

export default function ProgressStack() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

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
            <Pressable
              style={styles.headerButton}
              onPress={() => router.push("/settings")}
            >
              <AppIcon name="settings" size={20} color={theme.tabIconDefault} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
});
