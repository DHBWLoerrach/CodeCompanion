import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AppIcon } from "@/components/AppIcon";
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
type TopicVisualState = "new" | "started" | "due" | "mastered";

interface TopicTileProps {
  progress?: TopicProgress;
  onPress: () => void;
  topicName: string;
  testID?: string;
  position?: number;
  total?: number;
  isCurrent?: boolean;
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

function capitalizeLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getTopicVisualState(
  progress: TopicProgress | undefined,
): TopicVisualState {
  const hasStarted = Boolean(progress && progress.questionsAnswered > 0);

  if (progress?.skillLevel === 5) {
    return "mastered";
  }

  if (hasStarted && isTopicDue(progress)) {
    return "due";
  }

  if (hasStarted) {
    return "started";
  }

  return "new";
}

function getTopicStateMeta(
  progress: TopicProgress | undefined,
  t: TranslateFn,
) {
  const state = getTopicVisualState(progress);

  switch (state) {
    case "mastered":
      return { state, label: t("mastered"), iconName: "award" as const };
    case "due":
      return { state, label: t("reviewLabel"), iconName: "clock" as const };
    case "started":
      return {
        state,
        label: t("inProgressLabel"),
        iconName: "play" as const,
      };
    case "new":
    default:
      return { state: "new" as const, label: t("newLabel"), iconName: null };
  }
}

function getTopicPositionLabel(
  position: number | undefined,
  total: number | undefined,
  t: TranslateFn,
) {
  if (!position || !total) {
    return undefined;
  }

  return `${capitalizeLabel(t("topic"))} ${position} ${t("of")} ${total}`;
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
  const topicLabel = totalTopics === 1 ? t("topic") : t("topics");

  if (startedCount === 0) {
    return {
      primaryLabel: t("notStartedYet"),
      secondaryLabel: undefined,
      topicCountLabel: getTopicCountLabel(totalTopics, t),
    };
  }

  const primaryLabel =
    masteredCount === totalTopics
      ? `${masteredCount} ${t("of")} ${totalTopics} ${topicLabel} ${t(
          "mastered",
        ).toLowerCase()}`
      : `${startedCount} ${t("of")} ${totalTopics} ${topicLabel} ${t(
          "started",
        )}`;

  return {
    primaryLabel,
    secondaryLabel:
      dueCount > 0
        ? `${dueCount} ${t("dueLabel")}`
        : masteredCount > 0
          ? `${masteredCount} ${t("mastered").toLowerCase()}`
          : undefined,
    topicCountLabel: getTopicCountLabel(totalTopics, t),
  };
}

function getStateAccentColor(
  state: TopicVisualState,
  theme: ReturnType<typeof useTheme>["theme"],
) {
  switch (state) {
    case "mastered":
      return theme.success;
    case "due":
      return theme.accent;
    case "started":
      return theme.secondary;
    case "new":
    default:
      return theme.tabIconDefault;
  }
}

function TopicTile({
  progress,
  onPress,
  topicName,
  testID,
  position,
  total,
  isCurrent,
}: TopicTileProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { animatedStyle, handlePressIn, handlePressOut } =
    usePressAnimation(0.98);
  const { state, label, iconName } = getTopicStateMeta(progress, t);
  const accentColor = getStateAccentColor(state, theme);
  const positionLabel = getTopicPositionLabel(position, total, t);
  const borderColor = isCurrent
    ? `${accentColor}5C`
    : state === "new"
      ? theme.cardBorder
      : `${accentColor}33`;
  const backgroundColor = isCurrent ? `${accentColor}0D` : theme.backgroundRoot;
  const metaTextColor = state === "new" ? theme.tabIconDefault : accentColor;

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.topicTile,
        {
          backgroundColor,
          borderColor,
        },
        animatedStyle,
      ]}
    >
      {isCurrent ? (
        <View
          style={[
            styles.currentBadge,
            {
              backgroundColor: `${accentColor}16`,
              borderColor: `${accentColor}2E`,
            },
          ]}
        >
          <ThemedText
            type="caption"
            style={[styles.currentBadgeText, { color: accentColor }]}
          >
            {t("currentLabel")}
          </ThemedText>
        </View>
      ) : null}
      <ThemedText type="label" style={styles.topicTileTitle} numberOfLines={2}>
        {topicName}
      </ThemedText>
      <View style={styles.topicMetaRow}>
        {positionLabel ? (
          <ThemedText
            type="caption"
            style={[styles.topicMetaText, { color: theme.tabIconDefault }]}
            numberOfLines={1}
          >
            {positionLabel}
          </ThemedText>
        ) : null}
        {positionLabel ? <View style={styles.topicMetaDot} /> : null}
        {iconName ? (
          <AppIcon
            name={iconName}
            size={12}
            color={metaTextColor}
            style={styles.topicMetaIcon}
          />
        ) : null}
        <ThemedText
          type="caption"
          style={[styles.topicMetaText, { color: metaTextColor }]}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

interface NextStepCardProps {
  topicName: string;
  progress?: TopicProgress;
  onPress: () => void;
  testID?: string;
  position: number;
  total: number;
}

function NextStepCard({
  topicName,
  progress,
  onPress,
  testID,
  position,
  total,
}: NextStepCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { animatedStyle, handlePressIn, handlePressOut } =
    usePressAnimation(0.98);
  const { state, label, iconName } = getTopicStateMeta(progress, t);
  const accentColor =
    state === "due"
      ? theme.accent
      : state === "mastered"
        ? theme.success
        : theme.secondary;
  const topicIndexLabel = getTopicPositionLabel(position, total, t);

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.nextStepCard,
        {
          backgroundColor: `${accentColor}12`,
          borderColor: `${accentColor}30`,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.nextStepBody}>
        <ThemedText
          type="caption"
          style={[styles.nextStepEyebrow, { color: accentColor }]}
        >
          {t("nextStep")}
        </ThemedText>
        <ThemedText type="h4" style={styles.nextStepTitle} numberOfLines={2}>
          {topicName}
        </ThemedText>
        <View style={styles.nextStepMeta}>
          {topicIndexLabel ? (
            <ThemedText
              type="caption"
              style={[styles.nextStepMetaText, { color: theme.tabIconDefault }]}
            >
              {topicIndexLabel}
            </ThemedText>
          ) : null}
          {topicIndexLabel ? <View style={styles.nextStepMetaDot} /> : null}
          <View style={styles.nextStepMetaStatus}>
            {iconName ? (
              <AppIcon
                name={iconName}
                size={12}
                color={accentColor}
                style={styles.nextStepMetaIcon}
              />
            ) : null}
            <ThemedText
              type="caption"
              style={[styles.nextStepMetaText, { color: accentColor }]}
              numberOfLines={1}
            >
              {label}
            </ThemedText>
          </View>
        </View>
      </View>
      <AppIcon
        name="chevron-right"
        size={18}
        color={accentColor}
        style={styles.nextStepChevron}
      />
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
  const recommendedTopicPosition = recommendedTopic
    ? category.topics.findIndex((topic) => topic.id === recommendedTopic.id) + 1
    : 0;
  const visibleTopics = category.topics;

  return (
    <View
      style={[
        styles.categoryCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.cardBorder,
        },
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

      <View style={styles.categoryProgressGroup}>
        <View style={styles.categorySegments}>
          {category.topics.map((topic) => {
            const state = getTopicVisualState(topicProgress[topic.id]);
            const accentColor = getStateAccentColor(state, theme);

            return (
              <View
                key={topic.id}
                style={[
                  styles.categorySegment,
                  {
                    backgroundColor:
                      state === "new" ? theme.backgroundRoot : accentColor,
                    borderColor:
                      state === "new" ? theme.cardBorder : `${accentColor}33`,
                  },
                ]}
              />
            );
          })}
        </View>
        <ThemedText
          type="small"
          style={[styles.categoryStatus, { color: theme.tabIconDefault }]}
        >
          {primaryLabel}
        </ThemedText>
        {secondaryLabel ? (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: theme.backgroundRoot,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <ThemedText
              type="caption"
              style={[styles.statusPillText, { color: theme.text }]}
            >
              {secondaryLabel}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {recommendedTopic ? (
        <View style={styles.recommendedSection}>
          <NextStepCard
            topicName={getTopicDisplayName(recommendedTopic)}
            progress={topicProgress[recommendedTopic.id]}
            testID={getTopicTestId(recommendedTopic)}
            onPress={() => onTopicPress(recommendedTopic)}
            position={recommendedTopicPosition}
            total={category.topics.length}
          />
        </View>
      ) : null}

      {visibleTopics.length > 0 ? (
        <View style={styles.topicsGrid}>
          {visibleTopics.map((topic, index) => {
            const topicDisplayName = getTopicDisplayName(topic);
            return (
              <TopicTile
                key={topic.id}
                topicName={topicDisplayName}
                progress={topicProgress[topic.id]}
                testID={getTopicTestId(topic)}
                onPress={() => onTopicPress(topic)}
                position={index + 1}
                total={category.topics.length}
                isCurrent={topic.id === recommendedTopicId}
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
              {
                backgroundColor: theme.accent + "10",
                borderColor: theme.accent + "2A",
              },
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
            <View style={styles.topicsGrid}>
              {dueTopics.map((topic) => (
                <TopicTile
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
    borderWidth: 1,
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
  categoryProgressGroup: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categorySegments: {
    flexDirection: "row",
    gap: 6,
  },
  categorySegment: {
    flex: 1,
    height: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryStatus: {
    fontWeight: "500",
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
    marginBottom: Spacing.md,
  },
  nextStepCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 104,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  nextStepBody: {
    flex: 1,
  },
  nextStepEyebrow: {
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
  },
  nextStepTitle: {
    marginBottom: Spacing.xs,
  },
  nextStepMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  nextStepMetaDot: {
    width: 4,
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: "#9BA1A6",
  },
  nextStepMetaStatus: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  nextStepMetaIcon: {
    marginRight: Spacing.xs,
  },
  nextStepMetaText: {
    fontWeight: "600",
  },
  nextStepChevron: {
    opacity: 0.72,
  },
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  topicTile: {
    width: "48%",
    minHeight: 92,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexShrink: 1,
    justifyContent: "space-between",
  },
  currentBadge: {
    alignSelf: "flex-start",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: Spacing.sm,
  },
  currentBadgeText: {
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  topicTileTitle: {
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  topicMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  topicMetaDot: {
    width: 4,
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: "#9BA1A6",
  },
  topicMetaIcon: {
    marginRight: Spacing.xs,
  },
  topicMetaText: {
    fontWeight: "600",
  },
  dueSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
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
