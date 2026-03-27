import React, { useMemo } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { AppIcon } from "@/components/AppIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/contexts/ThemeContext";
import { usePressAnimation } from "@/hooks/usePressAnimation";
import { useTranslation } from "@/hooks/useTranslation";
import { getParam } from "@/lib/router-utils";
import { useProgrammingLanguage } from "@/contexts/ProgrammingLanguageContext";
import {
  LANGUAGES,
  getLanguageDisplayName,
  type ProgrammingLanguage,
} from "@/lib/languages";
import { Spacing, BorderRadius, Shadows, withOpacity } from "@/constants/theme";

interface LanguageCardProps {
  language: ProgrammingLanguage;
  languageName: string;
  index: number;
  onPress: () => void;
  topicCount: number;
  topicLabel: string;
}

function LanguageCard({
  language,
  languageName,
  index,
  onPress,
  topicCount,
  topicLabel,
}: LanguageCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { animatedStyle, handlePressIn, handlePressOut } =
    usePressAnimation(0.985);
  const chevronTint = useMemo(
    () => withOpacity(theme.primary, 0.1),
    [theme.primary],
  );
  const pressedOverlay = useMemo(
    () => withOpacity(theme.primary, 0.03),
    [theme.primary],
  );
  const pressedBorderColor = useMemo(
    () => withOpacity(theme.primary, 0.2),
    [theme.primary],
  );
  const accessibilityHint = t("selectFocusHint").replace(
    "{name}",
    languageName,
  );

  return (
    <Animated.View entering={FadeInUp.delay(index * 80)}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={languageName}
          accessibilityHint={accessibilityHint}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.lg,
            padding: Spacing.lg,
            backgroundColor: pressed ? pressedOverlay : theme.backgroundDefault,
            borderRadius: BorderRadius.lg,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: pressed ? pressedBorderColor : theme.cardBorder,
            ...Shadows.card,
          })}
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
            <ThemedText type="h4">{languageName}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.tabIconDefault }}>
              {topicCount} {topicLabel}
            </ThemedText>
          </View>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: BorderRadius.full,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: chevronTint,
            }}
          >
            <AppIcon
              name="chevron-right"
              size={18}
              color={theme.primary}
              weight="semibold"
            />
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function LanguageSelectScreen() {
  const { theme } = useTheme();
  const { t, language: appLanguage } = useTranslation();
  const router = useRouter();
  const { allowBack } = useLocalSearchParams<{ allowBack?: string }>();
  const { setSelectedLanguage } = useProgrammingLanguage();
  const canReturnToPreviousScreen = getParam(allowBack) === "1";

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
        {t("chooseTechnology")}
      </ThemedText>
      {LANGUAGES.map((programmingLanguage, index) => {
        const topicCount = programmingLanguage.categories.reduce(
          (sum, cat) => sum + cat.topics.length,
          0,
        );
        return (
          <LanguageCard
            key={programmingLanguage.id}
            language={programmingLanguage}
            languageName={getLanguageDisplayName(
              programmingLanguage,
              appLanguage,
            )}
            index={index}
            topicCount={topicCount}
            topicLabel={topicCount === 1 ? t("topic") : t("topics")}
            onPress={() => handleSelectLanguage(programmingLanguage)}
          />
        );
      })}
    </ScrollView>
  );
}
