import React, { useRef } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { EaseView } from "react-native-ease";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { AppIcon } from "@/components/AppIcon";
import { PrimaryButton } from "@/components/ActionButton";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SkillLevelDots } from "@/components/SkillLevelDots";
import { StatusBadge } from "@/components/StatusBadge";
import { SurfaceCard } from "@/components/SurfaceCard";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { usePressAnimation } from "@/hooks/usePressAnimation";
import {
  useTopicProgress,
  getCategoryProgress,
} from "@/hooks/useTopicProgress";
import {
  QUICK_QUIZ_MODE,
  QUICK_QUIZ_QUESTION_COUNT,
  QUICK_QUIZ_TOPIC_LIMIT,
} from "@/constants/quiz";
import { Spacing, BorderRadius, withOpacity } from "@/constants/theme";
import {
  type Topic,
  type Category,
  getTopicName,
  getCategoryName,
} from "@/lib/topics";
import { type TopicProgress } from "@/lib/storage";
import { useProgrammingLanguage } from "@/contexts/ProgrammingLanguageContext";

function pickRandomTopicIds(categories: Category[], limit: number): string[] {
  const topicIds = categories.flatMap((category) =>
    category.topics.map((topic) => topic.id),
  );
  const shuffled = [...topicIds];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(limit, shuffled.length));
}

interface QuizModeCardProps {
  icon: string;
  color: string;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  emphasized?: boolean;
  testID?: string;
}

interface QuizModeConfig extends QuizModeCardProps {
  key: string;
}

function QuizModeCard({
  icon,
  color,
  title,
  description,
  onPress,
  disabled,
  emphasized = false,
  testID,
}: QuizModeCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const {
    animate,
    transition,
    handlePressIn: pressIn,
    handlePressOut,
  } = usePressAnimation(0.95);

  const handlePressIn = () => {
    if (!disabled) pressIn();
  };
  const toneColor = disabled ? theme.tabIconDefault : color;
  const bubbleColor = disabled
    ? theme.backgroundSecondary
    : withOpacity(color, emphasized ? 0.16 : 0.12);
  const titleColor = disabled ? theme.tabIconDefault : theme.text;
  const descriptionColor = disabled
    ? withOpacity(theme.tabIconDefault, 0.9)
    : theme.tabIconDefault;
  const cardBackgroundColor = theme.backgroundDefault;
  const cardBorderColor = disabled
    ? theme.cardBorder
    : emphasized
      ? withOpacity(color, 0.32)
      : theme.cardBorderSubtle;

  return (
    <EaseView
      animate={animate}
      transition={transition}
      style={styles.modeCardWrapper}
    >
      <SurfaceCard
        padding={0}
        style={styles.modeCard}
        backgroundColor={cardBackgroundColor}
        borderColor={cardBorderColor}
      >
        <Pressable
          testID={testID}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={styles.modeCardAction}
        >
          <View style={styles.modeCardMain}>
            <View style={styles.modeCardTopRow}>
              <View
                style={[
                  styles.modeIconBubble,
                  { backgroundColor: bubbleColor },
                ]}
              >
                <AppIcon name={icon} size={22} color={toneColor} />
              </View>
              {emphasized && !disabled ? (
                <StatusBadge
                  color={color}
                  label={t("recommendedLabel")}
                  size="compact"
                />
              ) : null}
            </View>
            <ThemedText
              type="h4"
              numberOfLines={2}
              style={[styles.modeTitle, { color: titleColor }]}
            >
              {title}
            </ThemedText>
          </View>
          <ThemedText
            type="caption"
            style={[styles.modeDescription, { color: descriptionColor }]}
            numberOfLines={2}
          >
            {description}
          </ThemedText>
        </Pressable>
      </SurfaceCard>
    </EaseView>
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
  const { animate, transition, handlePressIn, handlePressOut } =
    usePressAnimation(0.98);

  const { progressPercent } = getCategoryProgress(category, topicProgress);
  const topicCount = category.topics.length;

  return (
    <EaseView
      animate={animate}
      transition={transition}
      style={styles.categoryRowWrapper}
    >
      <SurfaceCard
        padding={0}
        style={styles.categoryRow}
        borderColor={theme.cardBorderSubtle}
      >
        <Pressable
          testID={testID}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.categoryAction}
        >
          <View style={styles.categoryRowContent}>
            <View style={styles.categoryRowLeft}>
              <ThemedText type="h4">{categoryName}</ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.tabIconDefault }}
              >
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
        </Pressable>
      </SurfaceCard>
    </EaseView>
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

  const { topicProgress, loading, dueTopics, hasQuizHistory } =
    useTopicProgress({
      languageId,
      categories,
      refreshLanguage,
    });

  const hasDueTopics = dueTopics.length > 0;
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

  const handleQuickQuiz = () => {
    const quickTopicIds = pickRandomTopicIds(
      categories,
      QUICK_QUIZ_TOPIC_LIMIT,
    );

    router.push({
      pathname: "/quiz-session",
      params: {
        count: String(QUICK_QUIZ_QUESTION_COUNT),
        programmingLanguage: languageId,
        quizMode: QUICK_QUIZ_MODE,
        ...(quickTopicIds.length > 0
          ? { topicIds: quickTopicIds.join(",") }
          : {}),
      },
    });
  };

  const quizModes: QuizModeConfig[] = hasDueTopics
    ? [
        {
          key: "due",
          icon: "clock",
          color: theme.accent,
          title: t("dueTopicsQuiz"),
          description: t("dueTopicsQuizDesc"),
          emphasized: true,
          testID: "practice-mode-due",
          onPress: handleStartReview,
        },
        {
          key: "mixed",
          icon: "edit-3",
          color: theme.secondary,
          title: t("mixedQuiz"),
          description: t("mixedQuizDesc"),
          testID: "practice-mode-mixed",
          onPress: () =>
            router.push({
              pathname: "/quiz-session",
              params: { programmingLanguage: languageId },
            }),
        },
        {
          key: "quick",
          icon: "zap",
          color: theme.secondary,
          title: t("quickQuiz"),
          description: t("quickQuizDesc"),
          testID: "practice-mode-quick",
          onPress: handleQuickQuiz,
        },
        {
          key: "category",
          icon: "book-open",
          color: theme.secondary,
          title: t("byCategoryQuiz"),
          description: t("byCategoryQuizDesc"),
          testID: "practice-mode-category",
          onPress: handleScrollToCategories,
        },
      ]
    : [
        {
          key: "mixed",
          icon: "edit-3",
          color: theme.secondary,
          title: t("mixedQuiz"),
          description: t("mixedQuizDesc"),
          emphasized: true,
          testID: "practice-mode-mixed",
          onPress: () =>
            router.push({
              pathname: "/quiz-session",
              params: { programmingLanguage: languageId },
            }),
        },
        {
          key: "due",
          icon: "clock",
          color: theme.accent,
          title: t("dueTopicsQuiz"),
          description: t("dueTopicsQuizDesc"),
          testID: "practice-mode-due",
          onPress: handleStartReview,
          disabled: true,
        },
        {
          key: "quick",
          icon: "zap",
          color: theme.secondary,
          title: t("quickQuiz"),
          description: t("quickQuizDesc"),
          testID: "practice-mode-quick",
          onPress: handleQuickQuiz,
        },
        {
          key: "category",
          icon: "book-open",
          color: theme.secondary,
          title: t("byCategoryQuiz"),
          description: t("byCategoryQuizDesc"),
          testID: "practice-mode-category",
          onPress: handleScrollToCategories,
        },
      ];

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
          { paddingBottom: Spacing["4xl"] + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText
          type="body"
          style={[styles.screenSubtitle, { color: theme.tabIconDefault }]}
        >
          {t("practiceScreenSubtitle")}
        </ThemedText>

        {/* Section 1: Due for Review */}
        {hasDueTopics ? (
          <SurfaceCard
            style={styles.dueSection}
            backgroundColor={withOpacity(theme.accent, 0.1)}
            borderColor={withOpacity(theme.accent, 0.22)}
            topAccentColor={theme.accent}
          >
            <View style={styles.dueSectionHeader}>
              <StatusBadge
                color={theme.accent}
                icon="clock"
                label={t("dueForReview")}
              />
              <ThemedText
                type="caption"
                style={[styles.dueCount, { color: theme.accent }]}
              >
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
                    style={[
                      styles.dueTopicRow,
                      {
                        backgroundColor: theme.backgroundDefault,
                        borderColor: theme.cardBorderSubtle,
                      },
                    ]}
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

            <PrimaryButton
              testID="practice-start-review-button"
              color={theme.accent}
              label={t("startReview")}
              onPress={handleStartReview}
              size="compact"
            />
          </SurfaceCard>
        ) : (
          <SurfaceCard
            style={styles.emptyState}
            borderColor={theme.cardBorderSubtle}
          >
            <AppIcon
              name={hasQuizHistory ? "check-circle" : "info"}
              size={36}
              color={hasQuizHistory ? theme.success : theme.secondary}
            />
            <ThemedText type="h4">
              {t(hasQuizHistory ? "noDueTopics" : "noPracticeYet")}
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.tabIconDefault, textAlign: "center" }}
            >
              {t(hasQuizHistory ? "noDueTopicsDesc" : "noPracticeYetDesc")}
            </ThemedText>
          </SurfaceCard>
        )}

        {/* Section 2: Quiz Modes */}
        <ThemedText type="h4" style={styles.sectionHeader}>
          {t("quizModes")}
        </ThemedText>
        <View style={styles.modesGrid}>
          {quizModes.map(({ key, ...quizMode }) => (
            <QuizModeCard key={key} {...quizMode} />
          ))}
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
  screenSubtitle: {
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    marginTop: 0,
  },
  dueSection: {
    gap: Spacing.md,
  },
  dueSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
  },
  dueCount: {
    fontWeight: "600",
  },
  dueTopicsList: {
    gap: Spacing.sm,
  },
  dueTopicRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  modesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  modeCardWrapper: {
    width: "47.5%",
  },
  modeCard: {
    width: "100%",
  },
  modeCardAction: {
    justifyContent: "space-between",
    minHeight: 156,
    padding: Spacing.md,
  },
  modeCardMain: {
    gap: Spacing.xs,
  },
  modeCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  modeIconBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTitle: {
    fontSize: 15,
    lineHeight: 19,
    minHeight: 36,
  },
  modeDescription: {
    lineHeight: 17,
    minHeight: 32,
  },
  categoriesList: {
    gap: Spacing.md,
  },
  categoryRowWrapper: {
    width: "100%",
  },
  categoryRow: {
    width: "100%",
  },
  categoryAction: {
    justifyContent: "center",
    minHeight: 76,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
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
