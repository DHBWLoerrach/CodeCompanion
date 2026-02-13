import React from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useProgrammingLanguage } from "@/contexts/ProgrammingLanguageContext";
import { LANGUAGES, type ProgrammingLanguage } from "@/lib/languages";
import { Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface LanguageCardProps {
  language: ProgrammingLanguage;
  index: number;
  onPress: () => void;
  topicCount: number;
  topicLabel: string;
}

function LanguageCard({
  language,
  index,
  onPress,
  topicCount,
  topicLabel,
}: LanguageCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <AnimatedPressable
      entering={FadeInUp.delay(index * 80)}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.lg,
        padding: Spacing.lg,
        backgroundColor: theme.backgroundDefault,
        borderRadius: BorderRadius.lg,
        borderCurve: "continuous",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: BorderRadius.md,
          borderCurve: "continuous",
          backgroundColor: language.color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ThemedText
          type="h3"
          lightColor="#000000"
          darkColor="#000000"
          style={{ fontWeight: "800" }}
        >
          {language.shortName}
        </ThemedText>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText type="h4">{t(language.nameKey)}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.tabIconDefault }}>
          {topicCount} {topicLabel}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

export default function LanguageSelectScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { allowBack } = useLocalSearchParams<{ allowBack?: string }>();
  const { setSelectedLanguage } = useProgrammingLanguage();
  const canReturnToPreviousScreen =
    (Array.isArray(allowBack) ? allowBack[0] : allowBack) === "1";

  const handleSelectLanguage = async (language: ProgrammingLanguage) => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await setSelectedLanguage(language.id);
    if (canReturnToPreviousScreen && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/learn");
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        padding: Spacing.lg,
        gap: Spacing.md,
      }}
    >
      <ThemedText
        type="body"
        style={{
          color: theme.tabIconDefault,
          marginBottom: Spacing.sm,
        }}
      >
        {t("chooseLanguage")}
      </ThemedText>
      {LANGUAGES.map((language, index) => {
        const topicCount = language.categories.reduce(
          (sum, cat) => sum + cat.topics.length,
          0,
        );
        return (
          <LanguageCard
            key={language.id}
            language={language}
            index={index}
            topicCount={topicCount}
            topicLabel={topicCount === 1 ? t("topic") : t("topics")}
            onPress={() => handleSelectLanguage(language)}
          />
        );
      })}
    </ScrollView>
  );
}
