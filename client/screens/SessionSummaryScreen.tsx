import React, { useEffect, useMemo } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";

import { BottomActionBar } from "@/components/BottomActionBar";
import { InlineCodeText } from "@/components/InlineCodeText";
import { PrimaryButton, SecondaryButton } from "@/components/ActionButton";
import { StatusBadge } from "@/components/StatusBadge";
import { SurfaceCard } from "@/components/SurfaceCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AppIcon } from "@/components/AppIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { QUICK_QUIZ_MODE } from "@/constants/quiz";
import {
  Spacing,
  getBottomActionBarScrollPadding,
  withOpacity,
} from "@/constants/theme";
import { getTopicById, getTopicName } from "@/lib/topics";
import { getParam, getParamWithDefault } from "@/lib/router-utils";
import { storage } from "@/lib/storage";
import { getLanguageById, getLanguageDisplayName } from "@/lib/languages";

interface ScoreCircleProps {
  score: number;
  total: number;
}

function ScoreCircle({ score, total }: ScoreCircleProps) {
  const { theme } = useTheme();
  const percentage = total > 0 ? (score / total) * 100 : 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 70) return theme.success;
    if (percentage >= 50) return theme.accent;
    return theme.error;
  };

  return (
    <View style={styles.scoreCircleContainer}>
      <Svg width={180} height={180} viewBox="0 0 180 180">
        <Circle
          cx="90"
          cy="90"
          r={radius}
          stroke={theme.cardBorder}
          strokeWidth="12"
          fill="transparent"
        />
        <Circle
          cx="90"
          cy="90"
          r={radius}
          stroke={getColor()}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
        />
      </Svg>
      <View style={styles.scoreTextContainer}>
        <ThemedText type="h1" style={{ color: getColor() }}>
          {score}/{total}
        </ThemedText>
        <ThemedText type="body" style={{ color: theme.tabIconDefault }}>
          {Math.round(percentage)}%
        </ThemedText>
      </View>
    </View>
  );
}

interface AnswerItemProps {
  index: number;
  correct: boolean;
  correctAnswer: string;
  questionLabel: string;
}

function AnswerItem({
  index,
  correct,
  correctAnswer,
  questionLabel,
}: AnswerItemProps) {
  const { theme } = useTheme();

  return (
    <SurfaceCard style={styles.answerItem}>
      <View style={styles.answerLeft}>
        <View
          style={[
            styles.answerIcon,
            {
              backgroundColor: correct
                ? withOpacity(theme.success, 0.14)
                : withOpacity(theme.error, 0.14),
            },
          ]}
        >
          <AppIcon
            name={correct ? "check" : "x"}
            size={16}
            color={correct ? theme.success : theme.error}
          />
        </View>
        <ThemedText type="body">
          {questionLabel} {index + 1}
        </ThemedText>
      </View>
      {!correct ? (
        <InlineCodeText
          text={correctAnswer}
          type="small"
          style={[styles.correctAnswerText, { color: theme.tabIconDefault }]}
        />
      ) : null}
    </SurfaceCard>
  );
}

export default function SessionSummaryScreen() {
  const { theme } = useTheme();
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    score?: string;
    total?: string;
    topicId?: string;
    topicIds?: string;
    answers?: string;
    count?: string;
    quizMode?: string;
    programmingLanguage?: string;
  }>();

  const scoreParam = getParam(params.score);
  const totalParam = getParam(params.total);
  const topicIdParam = getParam(params.topicId);
  const topicIdsParam = getParam(params.topicIds);
  const answersParam = getParam(params.answers);
  const countParam = getParam(params.count);
  const quizModeParam = getParam(params.quizMode);
  const programmingLanguageParam = getParamWithDefault(
    params.programmingLanguage,
    "javascript",
  );

  const score = Number(scoreParam ?? 0);
  const total = Number(totalParam ?? 0);
  const answers = useMemo(() => {
    if (!answersParam) return [];
    try {
      const parsed = JSON.parse(answersParam);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [answersParam]);

  const percentage = total > 0 ? (score / total) * 100 : 0;
  const selectedLanguage = getLanguageById(programmingLanguageParam);
  const langCategories = selectedLanguage?.categories;
  const topic = topicIdParam
    ? getTopicById(topicIdParam, langCategories)
    : null;
  const selectedTopicCount = topicIdsParam
    ? topicIdsParam.split(",").filter(Boolean).length
    : 0;
  const summaryBadgeLabel =
    quizModeParam === QUICK_QUIZ_MODE
      ? t("quickQuiz")
      : topic
        ? t("topic")
        : t("mixedQuiz");
  const summaryBadgeIcon =
    quizModeParam === QUICK_QUIZ_MODE ? "zap" : topic ? "book-open" : "edit-3";
  const summaryTitle = topic
    ? getTopicName(topic, language)
    : quizModeParam === QUICK_QUIZ_MODE
      ? t("quickQuiz")
      : t("mixedQuiz");
  const summarySubtitle =
    selectedTopicCount > 0
      ? `${selectedTopicCount} ${
          selectedTopicCount === 1 ? t("topic") : t("topics")
        }`
      : selectedLanguage
        ? getLanguageDisplayName(selectedLanguage, language)
        : programmingLanguageParam;

  useEffect(() => {
    if (topicIdParam) {
      storage.updateTopicSkillLevel(
        programmingLanguageParam,
        topicIdParam,
        percentage,
      );
    }
  }, [topicIdParam, percentage, programmingLanguageParam]);

  const getFeedbackMessage = (pct: number): string => {
    if (pct >= 80) return t("excellentWork");
    if (pct >= 70) return t("greatJob");
    if (pct >= 50) return t("goodStart");
    return t("keepLearning");
  };

  const handlePracticeAgain = () => {
    const nextParams: Record<string, string> = {
      programmingLanguage: programmingLanguageParam,
    };
    if (countParam) {
      nextParams.count = countParam;
    }
    if (topicIdParam) {
      nextParams.topicId = topicIdParam;
    }
    if (topicIdsParam) {
      nextParams.topicIds = topicIdsParam;
    }
    if (quizModeParam) {
      nextParams.quizMode = quizModeParam;
    }
    router.replace({ pathname: "/quiz-session", params: nextParams });
  };

  const handleBackToTopics = () => {
    router.dismissAll();
  };

  return (
    <>
      <Stack.Screen options={{ title: t("sessionComplete") }} />
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Spacing.xl,
              paddingBottom: getBottomActionBarScrollPadding({
                buttonCount: 2,
                safeAreaBottom: insets.bottom,
              }),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <StatusBadge
              color={theme.secondary}
              icon={summaryBadgeIcon}
              label={summaryBadgeLabel}
            />
            <AppIcon name="award" size={32} color={theme.accent} />
            <ThemedText type="body">{summaryTitle}</ThemedText>
            <ThemedText type="small" style={{ color: theme.tabIconDefault }}>
              {summarySubtitle}
            </ThemedText>
          </View>

          <SurfaceCard style={styles.scoreCard}>
            <ScoreCircle score={score} total={total} />
            <ThemedText type="body" style={styles.feedbackText}>
              {getFeedbackMessage(percentage)}
            </ThemedText>
          </SurfaceCard>

          <View style={styles.breakdownSection}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              {t("questionBreakdown")}
            </ThemedText>
            <View style={styles.answersList}>
              {answers.map((answer, index) => (
                <AnswerItem
                  key={`${answer.questionId}-${index}`}
                  index={index}
                  correct={answer.correct}
                  correctAnswer={answer.correctAnswer}
                  questionLabel={t("question")}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        <BottomActionBar>
          <PrimaryButton
            testID="summary-practice-again-button"
            color={theme.secondary}
            icon="refresh-cw"
            label={t("practiceAgain")}
            onPress={handlePracticeAgain}
          />
          <SecondaryButton
            testID="summary-back-to-topics-button"
            color={theme.secondary}
            label={t("backToTopics")}
            onPress={handleBackToTopics}
          />
        </BottomActionBar>
      </ThemedView>
    </>
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
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  header: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  scoreCard: {
    alignItems: "center",
  },
  scoreCircleContainer: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreTextContainer: {
    position: "absolute",
    alignItems: "center",
  },
  feedbackText: {
    textAlign: "center",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  breakdownSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  answersList: {
    gap: Spacing.sm,
  },
  answerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  answerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  answerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  correctAnswerText: {
    flexShrink: 1,
    textAlign: "right",
  },
});
