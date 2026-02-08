import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { AppIcon } from "@/components/AppIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { BorderRadius, Spacing } from "@/constants/theme";

function HeaderBrand() {
  const { theme } = useTheme();

  return (
    <View style={styles.headerBrand}>
      <View style={[styles.headerBadge, { backgroundColor: theme.primary }]}>
        <ThemedText
          type="label"
          style={styles.headerBadgeText}
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
        >
          JS
        </ThemedText>
      </View>
    </View>
  );
}

export default function LearnStack() {
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
          title: t("learnJavaScript"),
          headerLeft: () => <HeaderBrand />,
          headerRight: () => (
            <Pressable
              testID="open-settings-button"
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
  headerBrand: {
    paddingLeft: Spacing.lg,
  },
  headerBadge: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeText: {
    fontWeight: "700",
  },
  headerButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
});
