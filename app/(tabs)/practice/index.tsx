import React, { useState, useCallback, useRef } from "react";
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

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { AppIcon } from "@/components/AppIcon";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import {
  CATEGORIES,
  type Topic,
  type Category,
  getTopicName,
  getCategoryName,
} from "@/lib/topics";
import {
  storage,
  type TopicProgress,
  type SkillLevel,
  isTopicDue,
} from "@/lib/storage";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SkillLevelDots({ level, color }: { level: SkillLevel; color: string }) {
  return (
    <View style={styles.levelDots}>
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

interface QuizModeCardProps {
  icon: string;
  color: string;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}

function QuizModeCard({ icon, color, title, description, onPress, disabled }: QuizModeCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.modeCard,
        { backgroundColor: theme.backgroundDefault, opacity: disabled ? 0.5 : 1 },
        animatedStyle,
      ]}
    >
      <View style={[styles.modeIconBubble, { backgroundColor: color + "15" }]}>
        <AppIcon name={icon} size={24} color={color} />
      </View>
      <ThemedText type="h4" numberOfLines={1} style={styles.modeTitle}>
        {title}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.tabIconDefault }} numberOfLines={2}>
        {description}
      </ThemedText>
    </AnimatedPressable>
  );
}

interface CategoryRowProps {
  category: Category;
  categoryName: string;
  topicProgress: Record<string, TopicProgress>;
  onPress: () => void;
}

function CategoryRow({ category, categoryName, topicProgress, onPress }: CategoryRowProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const avgSkillLevel =
    category.topics.reduce((sum, topic) => {
      return sum + (topicProgress[topic.id]?.skillLevel ?? 0);
    }, 0) / category.topics.length;

  const progressPercent = (avgSkillLevel / 5) * 100;
  const topicCount = category.topics.length;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.categoryRow,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={styles.categoryRowContent}>
        <View style={styles.categoryRowLeft}>
          <ThemedText type="h4">{categoryName}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.tabIconDefault }}>
            {topicCount} {topicCount === 1 ? t("topic") : t("topics")}
          </ThemedText>
        </View>
        <View style={styles.categoryRowRight}>
          <View style={[styles.categoryProgressBar, { backgroundColor: theme.cardBorder }]}>
            <View
              style={[
                styles.categoryProgressFill,
                { width: `${progressPercent}%`, backgroundColor: theme.secondary },
              ]}
            />
          </View>
          <AppIcon name="chevron-right" size={18} color={theme.tabIconDefault} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function PracticeScreen() {
  const { theme } = useTheme();
  const { t, language, refreshLanguage } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [topicProgress, setTopicProgress] = useState<Record<string, TopicProgress>>({});
  const [loading, setLoading] = useState(true);
  const categorySectionRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const categorySectionY = useRef(0);

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

  const allTopics = CATEGORIES.flatMap((cat) => cat.topics);
  const dueTopics = allTopics.filter((topic) => {
    const progress = topicProgress[topic.id];
    return progress && progress.questionsAnswered > 0 && isTopicDue(progress);
  });

  const dueTopicIds = dueTopics.map((t) => t.id).join(",");

  const handleStartReview = () => {
    router.push({ pathname: "/quiz-session", params: { topicIds: dueTopicIds } });
  };

  const handleTopicQuiz = (topic: Topic) => {
    router.push({ pathname: "/quiz-session", params: { topicId: topic.id } });
  };

  const handleScrollToCategories = () => {
    scrollViewRef.current?.scrollTo({ y: categorySectionY.current, animated: true });
  };

  const handleCategoryPress = (category: Category) => {
    const ids = category.topics.map((t) => t.id).join(",");
    router.push({ pathname: "/quiz-session", params: { topicIds: ids } });
  };

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
        ref={scrollViewRef}
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Due for Review */}
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

            <View style={styles.dueTopicsList}>
              {dueTopics.map((topic) => {
                const progress = topicProgress[topic.id];
                const skillLevel = progress?.skillLevel ?? 1;

                return (
                  <Pressable
                    key={topic.id}
                    style={styles.dueTopicRow}
                    onPress={() => handleTopicQuiz(topic)}
                  >
                    <ThemedText type="body" style={{ flex: 1 }}>
                      {getTopicName(topic, language)}
                    </ThemedText>
                    <SkillLevelDots level={skillLevel} color={theme.accent} />
                    <AppIcon
                      name="play-circle"
                      size={22}
                      color={theme.accent}
                      style={{ marginLeft: Spacing.md }}
                    />
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.reviewButton, { backgroundColor: theme.accent }]}
              onPress={handleStartReview}
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {t("startReview")}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <AppIcon name="check-circle" size={40} color={theme.success} />
            <ThemedText type="h4" style={{ marginTop: Spacing.md }}>
              {t("noDueTopics")}
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.tabIconDefault, textAlign: "center" }}
            >
              {t("noDueTopicsDesc")}
            </ThemedText>
          </View>
        )}

        {/* Section 2: Quiz Modes */}
        <ThemedText type="h4" style={styles.sectionHeader}>
          {t("quizModes")}
        </ThemedText>
        <View style={styles.modesGrid}>
          <QuizModeCard
            icon="edit-3"
            color={theme.secondary}
            title={t("mixedQuiz")}
            description={t("mixedQuizDesc")}
            onPress={() => router.push("/quiz-session")}
          />
          <QuizModeCard
            icon="clock"
            color={theme.accent}
            title={t("dueTopicsQuiz")}
            description={t("dueTopicsQuizDesc")}
            onPress={handleStartReview}
            disabled={dueTopics.length === 0}
          />
          <QuizModeCard
            icon="zap"
            color={theme.success}
            title={t("quickQuiz")}
            description={t("quickQuizDesc")}
            onPress={() =>
              router.push({ pathname: "/quiz-session", params: { count: "5" } })
            }
          />
          <QuizModeCard
            icon="book-open"
            color={theme.primary}
            title={t("byCategoryQuiz")}
            description={t("byCategoryQuizDesc")}
            onPress={handleScrollToCategories}
          />
        </View>

        {/* Section 3: Categories */}
        <View
          ref={categorySectionRef}
          onLayout={(e) => {
            categorySectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <ThemedText type="h4" style={styles.sectionHeader}>
            {t("selectCategory")}
          </ThemedText>
        </View>
        <View style={styles.categoriesList}>
          {CATEGORIES.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              categoryName={getCategoryName(category, language)}
              topicProgress={topicProgress}
              onPress={() => handleCategoryPress(category)}
            />
          ))}
        </View>
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
  sectionHeader: {
    marginTop: Spacing.sm,
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
  dueTopicsList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dueTopicRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  levelDots: {
    flexDirection: "row",
    gap: 2,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  reviewButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
    ...Shadows.card,
  },
  modesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  modeCard: {
    width: "47.5%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  modeIconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTitle: {
    marginTop: Spacing.xs,
  },
  categoriesList: {
    gap: Spacing.md,
  },
  categoryRow: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  categoryRowContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryRowLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  categoryRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  categoryProgressBar: {
    width: 80,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  categoryProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
});
