import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { HeaderIconButton } from "@/components/HeaderIconButton";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { BorderRadius } from "@/constants/theme";

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
          title: t("learnJavaScript"),
          headerLeft: () => <HeaderBrand />,
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

const styles = StyleSheet.create({
  headerBrand: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  headerBadgeText: {
    fontWeight: "700",
  },
});
