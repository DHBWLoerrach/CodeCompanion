import React, { useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AppIcon } from "@/components/AppIcon";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getTopicById, getTopicName } from "@/lib/topics";
import { storage } from "@/lib/storage";

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

function AnswerItem({ index, correct, correctAnswer, questionLabel }: AnswerItemProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.answerItem, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.answerLeft}>
        <View
          style={[
            styles.answerIcon,
            { backgroundColor: correct ? theme.success + "20" : theme.error + "20" },
          ]}
        >
          <AppIcon
            name={correct ? "check" : "x"}
            size={16}
            color={correct ? theme.success : theme.error}
          />
        </View>
        <ThemedText type="body">{questionLabel} {index + 1}</ThemedText>
      </View>
      {!correct ? (
        <ThemedText type="small" style={{ color: theme.tabIconDefault }}>
          {correctAnswer}
        </ThemedText>
      ) : null}
    </View>
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
    answers?: string;
  }>();

  const getParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  const scoreParam = getParam(params.score);
  const totalParam = getParam(params.total);
  const topicIdParam = getParam(params.topicId);
  const answersParam = getParam(params.answers);

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
  const topic = topicIdParam ? getTopicById(topicIdParam) : null;

  useEffect(() => {
    if (topicIdParam) {
      storage.updateTopicSkillLevel(topicIdParam, percentage);
    }
  }, [topicIdParam, percentage]);

  const getFeedbackMessage = (pct: number): string => {
    if (pct === 100) return t("excellentWork");
    if (pct >= 80) return t("excellentWork");
    if (pct >= 70) return t("greatJob");
    if (pct >= 50) return t("goodStart");
    return t("keepLearning");
  };

  const handlePracticeAgain = () => {
    const nextParams = topicIdParam ? { topicId: topicIdParam } : undefined;
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
            { paddingTop: Spacing.xl, paddingBottom: 160 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <AppIcon name="award" size={32} color={theme.accent} />
            {topic ? (
              <ThemedText type="body" style={{ color: theme.tabIconDefault }}>
                {getTopicName(topic, language)}
              </ThemedText>
            ) : null}
          </View>

        <View style={[styles.scoreCard, { backgroundColor: theme.backgroundDefault }]}>
          <ScoreCircle score={score} total={total} />
          <ThemedText type="body" style={styles.feedbackText}>
            {getFeedbackMessage(percentage)}
          </ThemedText>
        </View>

        <View style={styles.breakdownSection}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            {t("questionBreakdown")}
          </ThemedText>
          <View style={styles.answersList}>
            {answers.map((answer, index) => (
              <AnswerItem
                key={answer.questionId}
                index={index}
                correct={answer.correct}
                correctAnswer={answer.correctAnswer}
                questionLabel={t("question")}
              />
            ))}
          </View>
        </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.backgroundRoot },
          ]}
        >
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handlePracticeAgain}
          >
            <AppIcon name="refresh-cw" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {t("practiceAgain")}
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.secondaryButton,
              { borderColor: theme.secondary },
            ]}
            onPress={handleBackToTopics}
          >
            <ThemedText type="body" style={{ color: theme.secondary, fontWeight: "600" }}>
              {t("backToTopics")}
            </ThemedText>
          </Pressable>
        </View>
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    ...Shadows.card,
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
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    ...Shadows.card,
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
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  primaryButton: {
    height: 56,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  secondaryButton: {
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
});
