import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AppIcon } from "@/components/AppIcon";
import { SkillLevelDots } from "@/components/SkillLevelDots";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { usePressAnimation } from "@/hooks/usePressAnimation";
import { useTopicProgress } from "@/hooks/useTopicProgress";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import {
  type Topic,
  type Category,
  getTopicName,
  getCategoryName,
} from "@/lib/topics";
import { type TopicProgress, isTopicDue } from "@/lib/storage";
import { useProgrammingLanguage } from "@/contexts/ProgrammingLanguageContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TranslateFn = ReturnType<typeof useTranslation>["t"];

interface TopicChipProps {
  progress?: TopicProgress;
  onPress: () => void;
  topicName: string;
  isRecommended?: boolean;
  testID?: string;
  fullWidth?: boolean;
}

function getLastPracticedTime(progress: TopicProgress | undefined) {
  if (!progress?.lastPracticed) return 0;
  const timestamp = new Date(progress.lastPracticed).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getRecommendedTopicId(
  category: Category,
  topicProgress: Record<string, TopicProgress>,
): string {
  const startedTopics = category.topics.filter((topic) => {
    const progress = topicProgress[topic.id];
    return progress && progress.questionsAnswered > 0;
  });

  const dueStartedTopics = startedTopics.filter((topic) =>
    isTopicDue(topicProgress[topic.id]),
  );

  const candidates =
    dueStartedTopics.length > 0 ? dueStartedTopics : startedTopics;

  if (candidates.length === 0) {
    return category.topics[0]?.id ?? category.id;
  }

  const [selected] = [...candidates].sort((a, b) => {
    const progressA = topicProgress[a.id];
    const progressB = topicProgress[b.id];
    const levelA = progressA?.skillLevel ?? 1;
    const levelB = progressB?.skillLevel ?? 1;

    if (levelA !== levelB) {
      return levelA - levelB;
    }

    return getLastPracticedTime(progressA) - getLastPracticedTime(progressB);
  });

  return selected.id;
}

function getTopicCountLabel(topicCount: number, t: TranslateFn) {
  return `${topicCount} ${topicCount === 1 ? t("topic") : t("topics")}`;
}

function getCategoryStatus(
  category: Category,
  topicProgress: Record<string, TopicProgress>,
  t: TranslateFn,
) {
  const totalTopics = category.topics.length;
  const startedTopics = category.topics.filter((topic) => {
    const progress = topicProgress[topic.id];
    return progress && progress.questionsAnswered > 0;
  });
  const startedCount = startedTopics.length;
  const masteredCount = startedTopics.filter(
    (topic) => topicProgress[topic.id]?.skillLevel === 5,
  ).length;
  const dueCount = startedTopics.filter((topic) =>
    isTopicDue(topicProgress[topic.id]),
  ).length;

  if (startedCount === 0) {
    return {
      primaryLabel: t("notStartedYet"),
      secondaryLabel: undefined,
      topicCountLabel: getTopicCountLabel(totalTopics, t),
    };
  }

  const primaryLabel =
    masteredCount === totalTopics
      ? `${masteredCount}/${totalTopics} ${t("mastered").toLowerCase()}`
      : `${startedCount}/${totalTopics} ${t("started")}`;

  return {
    primaryLabel,
    secondaryLabel: dueCount > 0 ? `${dueCount} ${t("dueLabel")}` : undefined,
    topicCountLabel: getTopicCountLabel(totalTopics, t),
  };
}

function TopicChip({
  progress,
  onPress,
  topicName,
  isRecommended,
  testID,
  fullWidth,
}: TopicChipProps) {
  const { theme } = useTheme();
  const { animatedStyle, handlePressIn, handlePressOut } =
    usePressAnimation(0.95);

  const isMastered = progress?.skillLevel === 5;
  const isDue = isTopicDue(progress);
  const hasStarted = progress && progress.questionsAnswered > 0;
  const skillLevel = progress?.skillLevel ?? 1;

  const chipStyle = isMastered
    ? { backgroundColor: theme.success, borderColor: theme.success }
    : isRecommended
      ? {
          backgroundColor: "transparent",
          borderColor: theme.secondary,
          borderWidth: 1,
        }
      : isDue && hasStarted
        ? { backgroundColor: "transparent", borderColor: theme.accent }
        : hasStarted
          ? { backgroundColor: "transparent", borderColor: theme.secondary }
          : { backgroundColor: "transparent", borderColor: theme.cardBorder };

  const textColor = isMastered
    ? "#FFFFFF"
    : isRecommended
      ? theme.secondary
      : theme.text;
  const levelColor = isMastered
    ? "#FFFFFF"
    : isRecommended
      ? theme.secondary
      : theme.accent;

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.topicChip,
        fullWidth && styles.topicChipFullWidth,
        chipStyle,
        animatedStyle,
      ]}
    >
      {isMastered ? (
        <AppIcon
          name="award"
          size={14}
          color="#FFFFFF"
          style={styles.chipIcon}
        />
      ) : isRecommended ? (
        <AppIcon
          name="star"
          size={14}
          color={theme.secondary}
          style={styles.chipIcon}
        />
      ) : isDue && hasStarted ? (
        <AppIcon
          name="clock"
          size={14}
          color={theme.accent}
          style={styles.chipIcon}
        />
      ) : null}
      <ThemedText
        type="label"
        style={[styles.chipText, { color: textColor }]}
        numberOfLines={1}
      >
        {topicName}
      </ThemedText>
      {hasStarted ? (
        <SkillLevelDots level={skillLevel} color={levelColor} />
      ) : null}
    </AnimatedPressable>
  );
}

interface CategoryCardProps {
  category: Category;
  categoryName: string;
  topicProgress: Record<string, TopicProgress>;
  onTopicPress: (topic: Topic) => void;
  getTopicDisplayName: (topic: Topic) => string;
  getTopicTestId: (topic: Topic) => string;
  recommendedTopicId?: string;
  t: TranslateFn;
}

function CategoryCard({
  category,
  categoryName,
  topicProgress,
  onTopicPress,
  getTopicDisplayName,
  getTopicTestId,
  recommendedTopicId,
  t,
}: CategoryCardProps) {
  const { theme } = useTheme();
  const { primaryLabel, secondaryLabel, topicCountLabel } = getCategoryStatus(
    category,
    topicProgress,
    t,
  );
  const recommendedTopic = recommendedTopicId
    ? category.topics.find((topic) => topic.id === recommendedTopicId)
    : undefined;
  const visibleTopics = recommendedTopic
    ? category.topics.filter((topic) => topic.id !== recommendedTopic.id)
    : category.topics;

  return (
    <View
      style={[
        styles.categoryCard,
        { backgroundColor: theme.backgroundDefault },
      ]}
    >
      <View style={styles.categoryHeader}>
        <ThemedText type="h4" style={styles.categoryName}>
          {categoryName}
        </ThemedText>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText
            type="caption"
            style={[styles.categoryBadgeText, { color: theme.tabIconDefault }]}
          >
            {topicCountLabel}
          </ThemedText>
        </View>
      </View>

      <View style={styles.categoryMeta}>
        <ThemedText
          type="label"
          style={[styles.categoryStatus, { color: theme.text }]}
        >
          {primaryLabel}
        </ThemedText>
        {secondaryLabel ? (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: theme.accent + "18",
                borderColor: theme.accent + "2E",
              },
            ]}
          >
            <ThemedText
              type="caption"
              style={[styles.statusPillText, { color: theme.accent }]}
            >
              {secondaryLabel}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {recommendedTopic ? (
        <View
          style={[
            styles.recommendedSection,
            {
              backgroundColor: theme.secondary + "10",
              borderColor: theme.secondary + "24",
            },
          ]}
        >
          <ThemedText
            type="caption"
            style={[styles.recommendedLabel, { color: theme.secondary }]}
          >
            {t("nextStep")}
          </ThemedText>
          <TopicChip
            topicName={getTopicDisplayName(recommendedTopic)}
            progress={topicProgress[recommendedTopic.id]}
            isRecommended
            testID={getTopicTestId(recommendedTopic)}
            onPress={() => onTopicPress(recommendedTopic)}
            fullWidth
          />
        </View>
      ) : null}

      {visibleTopics.length > 0 ? (
        <View style={styles.topicsWrap}>
          {visibleTopics.map((topic) => {
            const topicDisplayName = getTopicDisplayName(topic);
            return (
              <TopicChip
                key={topic.id}
                topicName={topicDisplayName}
                progress={topicProgress[topic.id]}
                testID={getTopicTestId(topic)}
                onPress={() => onTopicPress(topic)}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default function LearnScreen() {
  const { theme } = useTheme();
  const { t, language, refreshLanguage } = useTranslation();
  const { selectedLanguage } = useProgrammingLanguage();
  const categories = selectedLanguage?.categories ?? [];
  const languageId = selectedLanguage?.id ?? "javascript";
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { topicProgress, loading, dueTopics } = useTopicProgress({
    languageId,
    categories,
    refreshLanguage,
  });

  const handleTopicPress = (topic: Topic) => {
    router.push({
      pathname: "/topic/[topicId]",
      params: { topicId: topic.id },
    });
  };

  const showRecommendations = dueTopics.length === 0;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {dueTopics.length > 0 ? (
          <View
            style={[
              styles.dueSection,
              { backgroundColor: theme.accent + "15" },
            ]}
          >
            <View style={styles.dueSectionHeader}>
              <View style={styles.dueSectionTitleRow}>
                <AppIcon name="clock" size={20} color={theme.accent} />
                <ThemedText type="h4" style={{ color: theme.accent }}>
                  {t("dueForReview")}
                </ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.accent }}>
                {getTopicCountLabel(dueTopics.length, t)}
              </ThemedText>
            </View>
            <View style={styles.topicsWrap}>
              {dueTopics.map((topic) => (
                <TopicChip
                  key={topic.id}
                  topicName={getTopicName(topic, language)}
                  progress={topicProgress[topic.id]}
                  testID={`learn-due-topic-${topic.id}`}
                  onPress={() => handleTopicPress(topic)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            categoryName={getCategoryName(category, language)}
            topicProgress={topicProgress}
            onTopicPress={handleTopicPress}
            getTopicDisplayName={(topic) => getTopicName(topic, language)}
            getTopicTestId={(topic) => `learn-topic-${topic.id}`}
            recommendedTopicId={
              showRecommendations
                ? getRecommendedTopicId(category, topicProgress)
                : undefined
            }
            t={t}
          />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  categoryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  categoryName: {
    flex: 1,
  },
  categoryBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryBadgeText: {
    fontWeight: "600",
  },
  categoryMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  categoryStatus: {
    fontWeight: "600",
  },
  statusPill: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusPillText: {
    fontWeight: "600",
  },
  recommendedSection: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  recommendedLabel: {
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  topicsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  topicChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    maxWidth: "100%",
    minHeight: 44,
    flexShrink: 1,
  },
  topicChipFullWidth: {
    width: "100%",
  },
  chipIcon: {
    marginRight: Spacing.xs,
  },
  chipText: {
    fontWeight: "500",
    flexShrink: 1,
    marginRight: Spacing.xs,
  },
  dueSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  dueSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  dueSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
