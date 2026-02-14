import React, { useRef } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { AppIcon } from "@/components/AppIcon";
import { SkillLevelDots } from "@/components/SkillLevelDots";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { usePressAnimation } from "@/hooks/usePressAnimation";
import {
  useTopicProgress,
  getCategoryProgress,
} from "@/hooks/useTopicProgress";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import {
  type Topic,
  type Category,
  getTopicName,
  getCategoryName,
} from "@/lib/topics";
import { type TopicProgress } from "@/lib/storage";
import { useProgrammingLanguage } from "@/contexts/ProgrammingLanguageContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface QuizModeCardProps {
  icon: string;
  color: string;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

function QuizModeCard({
  icon,
  color,
  title,
  description,
  onPress,
  disabled,
  testID,
}: QuizModeCardProps) {
  const { theme } = useTheme();
  const {
    animatedStyle,
    handlePressIn: pressIn,
    handlePressOut,
  } = usePressAnimation(0.95);

  const handlePressIn = () => {
    if (!disabled) pressIn();
  };

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.modeCard,
        {
          backgroundColor: theme.backgroundDefault,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.modeIconBubble, { backgroundColor: color + "15" }]}>
        <AppIcon name={icon} size={24} color={color} />
      </View>
      <ThemedText type="h4" numberOfLines={1} style={styles.modeTitle}>
        {title}
      </ThemedText>
      <ThemedText
        type="caption"
        style={{ color: theme.tabIconDefault }}
        numberOfLines={2}
      >
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
  testID?: string;
}

function CategoryRow({
  category,
  categoryName,
  topicProgress,
  onPress,
  testID,
}: CategoryRowProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { animatedStyle, handlePressIn, handlePressOut } =
    usePressAnimation(0.98);

  const { progressPercent } = getCategoryProgress(category, topicProgress);
  const topicCount = category.topics.length;

  return (
    <AnimatedPressable
      testID={testID}
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
          <View
            style={[
              styles.categoryProgressBar,
              { backgroundColor: theme.cardBorder },
            ]}
          >
            <View
              style={[
                styles.categoryProgressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: theme.secondary,
                },
              ]}
            />
          </View>
          <AppIcon
            name="chevron-right"
            size={18}
            color={theme.tabIconDefault}
          />
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function PracticeScreen() {
  const { theme } = useTheme();
  const { t, language, refreshLanguage } = useTranslation();
  const { selectedLanguage } = useProgrammingLanguage();
  const categories = selectedLanguage?.categories ?? [];
  const languageId = selectedLanguage?.id ?? "javascript";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const categorySectionRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const categorySectionY = useRef(0);

  const { topicProgress, loading, dueTopics } = useTopicProgress({
    languageId,
    categories,
    refreshLanguage,
  });

  const dueTopicIds = dueTopics.map((t) => t.id).join(",");

  const handleStartReview = () => {
    router.push({
      pathname: "/quiz-session",
      params: { topicIds: dueTopicIds, programmingLanguage: languageId },
    });
  };

  const handleTopicQuiz = (topic: Topic) => {
    router.push({
      pathname: "/quiz-session",
      params: { topicId: topic.id, programmingLanguage: languageId },
    });
  };

  const handleScrollToCategories = () => {
    scrollViewRef.current?.scrollTo({
      y: categorySectionY.current,
      animated: true,
    });
  };

  const handleCategoryPress = (category: Category) => {
    const ids = category.topics.map((t) => t.id).join(",");
    router.push({
      pathname: "/quiz-session",
      params: { topicIds: ids, programmingLanguage: languageId },
    });
  };

  if (loading) {
    return <LoadingScreen />;
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
                {dueTopics.length}{" "}
                {dueTopics.length === 1 ? t("topic") : t("topics")}
              </ThemedText>
            </View>

            <View style={styles.dueTopicsList}>
              {dueTopics.map((topic) => {
                const progress = topicProgress[topic.id];
                const skillLevel = progress?.skillLevel ?? 1;

                return (
                  <Pressable
                    key={topic.id}
                    testID={`practice-due-topic-${topic.id}`}
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
              testID="practice-start-review-button"
              style={[styles.reviewButton, { backgroundColor: theme.accent }]}
              onPress={handleStartReview}
            >
              <ThemedText
                type="body"
                style={{ color: "#FFFFFF", fontWeight: "600" }}
              >
                {t("startReview")}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
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
            testID="practice-mode-mixed"
            onPress={() =>
              router.push({
                pathname: "/quiz-session",
                params: { programmingLanguage: languageId },
              })
            }
          />
          <QuizModeCard
            icon="clock"
            color={theme.accent}
            title={t("dueTopicsQuiz")}
            description={t("dueTopicsQuizDesc")}
            testID="practice-mode-due"
            onPress={handleStartReview}
            disabled={dueTopics.length === 0}
          />
          <QuizModeCard
            icon="zap"
            color={theme.success}
            title={t("quickQuiz")}
            description={t("quickQuizDesc")}
            testID="practice-mode-quick"
            onPress={() =>
              router.push({
                pathname: "/quiz-session",
                params: { count: "5", programmingLanguage: languageId },
              })
            }
          />
          <QuizModeCard
            icon="book-open"
            color={theme.primary}
            title={t("byCategoryQuiz")}
            description={t("byCategoryQuizDesc")}
            testID="practice-mode-category"
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
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              categoryName={getCategoryName(category, language)}
              topicProgress={topicProgress}
              testID={`practice-category-${category.id}`}
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
