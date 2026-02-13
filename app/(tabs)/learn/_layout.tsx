import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { HeaderIconButton } from "@/components/HeaderIconButton";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useProgrammingLanguage } from "@/contexts/ProgrammingLanguageContext";
import { BorderRadius } from "@/constants/theme";
import { getLanguageDisplayName } from "@/lib/languages";

function HeaderBrand() {
  const { theme } = useTheme();
  const { selectedLanguage } = useProgrammingLanguage();
  const badgeColor = selectedLanguage?.color ?? theme.primary;
  const shortName = selectedLanguage?.shortName ?? "JS";

  return (
    <View style={styles.headerBrand}>
      <View style={[styles.headerBadge, { backgroundColor: badgeColor }]}>
        <ThemedText
          type="label"
          style={styles.headerBadgeText}
          lightColor="#000000"
          darkColor="#000000"
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
