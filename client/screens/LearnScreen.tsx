import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AppIcon } from "@/components/AppIcon";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { CATEGORIES, type Topic, type Category, getTopicName, getCategoryName } from "@/lib/topics";
import { storage, type TopicProgress, type SkillLevel, isTopicDue, SKILL_LEVEL_INTERVALS } from "@/lib/storage";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TopicChipProps {
  topic: Topic;
  progress?: TopicProgress;
  onPress: () => void;
  topicName: string;
  isRecommended?: boolean;
  testID?: string;
}

function SkillLevelIndicator({ level, color }: { level: SkillLevel; color: string }) {
  return (
    <View style={styles.levelIndicator}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.levelDot,
            { backgroundColor: i <= level ? color : color + "40" },
          ]}
        />
      ))}
    </View>
  );
}

function getLastPracticedTime(progress: TopicProgress | undefined) {
  if (!progress?.lastPracticed) return 0;
  const timestamp = new Date(progress.lastPracticed).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getRecommendedTopicId(
  category: Category,
  topicProgress: Record<string, TopicProgress>
): string {
  const startedTopics = category.topics.filter((topic) => {
    const progress = topicProgress[topic.id];
    return progress && progress.questionsAnswered > 0;
  });

  const dueStartedTopics = startedTopics.filter((topic) =>
    isTopicDue(topicProgress[topic.id])
  );

  const candidates = dueStartedTopics.length > 0 ? dueStartedTopics : startedTopics;

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

function TopicChip({
  topic,
  progress,
  onPress,
  topicName,
  isRecommended,
  testID,
}: TopicChipProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const isMastered = progress?.skillLevel === 5;
  const isDue = isTopicDue(progress);
  const hasStarted = progress && progress.questionsAnswered > 0;
  const skillLevel = progress?.skillLevel ?? 1;

  const chipStyle = isMastered
    ? { backgroundColor: theme.success, borderColor: theme.success }
    : isRecommended
    ? { backgroundColor: "transparent", borderColor: theme.secondary, borderWidth: 1 }
    : isDue && hasStarted
    ? { backgroundColor: "transparent", borderColor: theme.accent }
    : hasStarted
    ? { backgroundColor: "transparent", borderColor: theme.secondary }
    : { backgroundColor: "transparent", borderColor: theme.cardBorder };

  const textColor = isMastered ? "#FFFFFF" : isRecommended ? theme.secondary : theme.text;
  const levelColor = isMastered ? "#FFFFFF" : isRecommended ? theme.secondary : theme.accent;

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.topicChip, chipStyle, animatedStyle]}
    >
      {isMastered ? (
        <AppIcon name="award" size={14} color="#FFFFFF" style={styles.chipIcon} />
      ) : isRecommended ? (
        <AppIcon name="star" size={14} color={theme.secondary} style={styles.chipIcon} />
      ) : isDue && hasStarted ? (
        <AppIcon name="clock" size={14} color={theme.accent} style={styles.chipIcon} />
      ) : null}
      <ThemedText
        type="label"
        style={[styles.chipText, { color: textColor }]}
        numberOfLines={1}
      >
        {topicName}
      </ThemedText>
      {hasStarted ? (
        <SkillLevelIndicator level={skillLevel} color={levelColor} />
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
}

function CategoryCard({
  category,
  categoryName,
  topicProgress,
  onTopicPress,
  getTopicDisplayName,
  getTopicTestId,
  recommendedTopicId,
}: CategoryCardProps) {
  const { theme } = useTheme();
  
  const avgSkillLevel = category.topics.reduce((sum, topic) => {
    return sum + (topicProgress[topic.id]?.skillLevel ?? 0);
  }, 0) / category.topics.length;
  
  const progressPercent = (avgSkillLevel / 5) * 100;

  return (
    <View style={[styles.categoryCard, { backgroundColor: theme.backgroundDefault }]}>
      <ThemedText type="h4" style={styles.categoryName}>{categoryName}</ThemedText>

      <View style={[styles.progressBar, { backgroundColor: theme.cardBorder }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progressPercent}%`, backgroundColor: theme.secondary },
          ]}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topicsContainer}
      >
        {category.topics.map((topic) => {
          const topicDisplayName = getTopicDisplayName(topic);
          return (
            <TopicChip
              key={topic.id}
              topic={topic}
              topicName={topicDisplayName}
              progress={topicProgress[topic.id]}
              isRecommended={topic.id === recommendedTopicId}
              testID={getTopicTestId(topic)}
              onPress={() => onTopicPress(topic)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function LearnScreen() {
  const { theme } = useTheme();
  const { t, language, refreshLanguage } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [topicProgress, setTopicProgress] = useState<Record<string, TopicProgress>>({});
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    try {
      const progress = await storage.getProgress();
      setTopicProgress(progress.topicProgress);
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
      refreshLanguage();
    }, [loadProgress, refreshLanguage])
  );

  const handleTopicPress = (topic: Topic) => {
    router.push({ pathname: "/topic/[topicId]", params: { topicId: topic.id } });
  };

  const allTopics = CATEGORIES.flatMap((cat) => cat.topics);
  const dueTopics = allTopics.filter((topic) => {
    const progress = topicProgress[topic.id];
    return progress && progress.questionsAnswered > 0 && isTopicDue(progress);
  });

  const showRecommendations = dueTopics.length === 0;

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
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
          <View style={[styles.dueSection, { backgroundColor: theme.accent + "15" }]}>
            <View style={styles.dueSectionHeader}>
              <View style={styles.dueSectionTitleRow}>
                <AppIcon name="clock" size={20} color={theme.accent} />
                <ThemedText type="h4" style={{ color: theme.accent }}>
                  {t("dueForReview")}
                </ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.accent }}>
                {dueTopics.length} {dueTopics.length === 1 ? t("topic") : t("topics")}
              </ThemedText>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topicsContainer}
            >
              {dueTopics.map((topic) => (
                <TopicChip
                  key={topic.id}
                  topic={topic}
                  topicName={getTopicName(topic, language)}
                  progress={topicProgress[topic.id]}
                  testID={`learn-due-topic-${topic.id}`}
                  onPress={() => handleTopicPress(topic)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {CATEGORIES.map((category) => (
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  categoryName: {
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  topicsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
  },
  chipIcon: {
    marginRight: Spacing.xs,
  },
  chipText: {
    fontWeight: "500",
  },
  levelIndicator: {
    flexDirection: "row",
    marginLeft: Spacing.xs,
    gap: 2,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dueSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  dueSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  dueSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
