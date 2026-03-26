import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { HeaderIconButton } from "@/components/HeaderIconButton";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useProgrammingLanguage } from "@/contexts/ProgrammingLanguageContext";
import { BorderRadius, withOpacity } from "@/constants/theme";
import { getLanguageDisplayName } from "@/lib/languages";

function HeaderBrand() {
  const { theme } = useTheme();
  const { selectedLanguage } = useProgrammingLanguage();
  const badgeColor = selectedLanguage?.color ?? theme.primary;
  const shortName = selectedLanguage?.shortName ?? "JS";

  return (
    <View style={styles.headerBrand}>
      <View
        style={[
          styles.headerBadge,
          {
            backgroundColor: withOpacity(badgeColor, 0.1),
            borderColor: withOpacity(badgeColor, 0.18),
          },
        ]}
      >
        <ThemedText
          type="label"
          style={[styles.headerBadgeText, { color: badgeColor }]}
        >
          {shortName}
        </ThemedText>
      </View>
    </View>
  );
}

export default function LearnStack() {
  const { theme } = useTheme();
  const { t, language, refreshLanguage } = useTranslation();
  const { selectedLanguage } = useProgrammingLanguage();
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
          title: selectedLanguage
            ? t("learnTechnology").replace(
                "{name}",
                getLanguageDisplayName(selectedLanguage, language),
              )
            : t("learn"),
          headerLeft: () => <HeaderBrand />,
          headerRight: () => (
            <HeaderIconButton
              icon="settings"
              testID="open-settings-button"
              onPress={() => router.push("/settings")}
              hitSlop={8}
              color={theme.tabIconDefault}
              iconSize={17}
            />
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerBrand: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
    borderWidth: 1,
  },
  headerBadgeText: {
    fontWeight: "700",
    fontSize: 13,
  },
});
