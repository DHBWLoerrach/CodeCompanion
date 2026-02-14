import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { HeaderIconButton } from "@/components/HeaderIconButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AppIcon } from "@/components/AppIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useCloseHandler } from "@/hooks/useCloseHandler";
import { usePressAnimation } from "@/hooks/usePressAnimation";
import { Spacing, BorderRadius, Shadows, Fonts } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { getParam, getParamWithDefault } from "@/lib/router-utils";
import { storage, type ProgressData } from "@/lib/storage";
import type { QuizQuestion } from "@shared/quiz-question";
import {
  averageMasteryToQuizDifficulty,
  type QuizDifficultyLevel,
} from "@shared/skill-level";

interface QuizAnswerResult {
  questionId: string;
  correct: boolean;
  correctAnswer: string;
}

function resolveMixedQuizDifficulty(
  progress: ProgressData,
  programmingLanguage: string,
  selectedTopicIds?: string[],
): QuizDifficultyLevel {
  const topicProgress = storage.getTopicProgressForLanguage(
    progress.topicProgress,
    programmingLanguage,
  );
  const levels =
    selectedTopicIds && selectedTopicIds.length > 0
      ? selectedTopicIds.map((id) => topicProgress[id]?.skillLevel ?? 1)
      : Object.values(topicProgress).map((item) => item.skillLevel);

  return averageMasteryToQuizDifficulty(levels, 1);
}

function shuffleOptionsForQuestion(question: QuizQuestion): QuizQuestion {
  const indexedOptions = question.options.map((option, index) => ({
    option,
    originalIndex: index,
  }));

  for (let i = indexedOptions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexedOptions[i], indexedOptions[j]] = [
      indexedOptions[j],
      indexedOptions[i],
    ];
  }

  const shuffledCorrectIndex = indexedOptions.findIndex(
    (entry) => entry.originalIndex === question.correctIndex,
  );

  if (shuffledCorrectIndex < 0) {
    return question;
  }

  return {
    ...question,
    options: indexedOptions.map((entry) => entry.option),
    correctIndex: shuffledCorrectIndex,
  };
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnswerButtonProps {
  text: string;
  index: number;
  selected: boolean;
  showResult: boolean;
  isCorrect: boolean;
  isCorrectAnswer: boolean;
  onPress: () => void;
  disabled: boolean;
  testID?: string;
}

function AnswerButton({
  text,
  index,
  selected,
  showResult,
  isCorrect,
  isCorrectAnswer,
  onPress,
  disabled,
  testID,
}: AnswerButtonProps) {
  const { theme } = useTheme();
  const {
    animatedStyle,
    handlePressIn: pressIn,
    handlePressOut,
  } = usePressAnimation(0.98);

  const handlePressIn = () => {
    if (!disabled) pressIn();
  };

  const getBackgroundColor = () => {
    if (showResult) {
      if (isCorrectAnswer) return theme.success;
      if (selected && !isCorrect) return theme.error;
    }
    if (selected) return theme.secondary;
    return theme.backgroundDefault;
  };

  const getTextColor = () => {
    if (showResult && (isCorrectAnswer || (selected && !isCorrect))) {
      return "#FFFFFF";
    }
    if (selected) return "#FFFFFF";
    return theme.text;
  };

  const getBorderColor = () => {
    if (showResult) {
      if (isCorrectAnswer) return theme.success;
      if (selected && !isCorrect) return theme.error;
    }
    if (selected) return theme.secondary;
    return theme.cardBorder;
  };

  const optionLabel = String.fromCharCode(65 + index);

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.answerButton,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.optionLabel,
          {
            backgroundColor:
              selected || showResult
                ? "rgba(255,255,255,0.2)"
                : theme.backgroundSecondary,
          },
        ]}
      >
        <ThemedText type="label" style={{ color: getTextColor() }}>
          {optionLabel}
        </ThemedText>
      </View>
      <ThemedText
        type="body"
        style={[styles.answerText, { color: getTextColor() }]}
      >
        {text}
      </ThemedText>
      {showResult && isCorrectAnswer ? (
        <AppIcon name="check-circle" size={20} color="#FFFFFF" />
      ) : null}
      {showResult && selected && !isCorrect ? (
        <AppIcon name="x-circle" size={20} color="#FFFFFF" />
      ) : null}
    </AnimatedPressable>
  );
}

function CodeBlock({ code }: { code: string }) {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={true}
      style={[styles.codeBlock, { backgroundColor: theme.codeBackground }]}
    >
      <ThemedText
        type="code"
        style={[styles.codeText, { fontFamily: Fonts?.mono || "monospace" }]}
      >
        {code}
      </ThemedText>
    </ScrollView>
  );
}

export default function QuizSessionScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { topicId, topicIds, count, programmingLanguage } =
    useLocalSearchParams<{
      topicId?: string;
      topicIds?: string;
      count?: string;
      programmingLanguage?: string;
    }>();
  const resolvedTopicId = getParam(topicId);
  const resolvedProgrammingLanguage = getParamWithDefault(
    programmingLanguage,
    "javascript",
  );

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const nextInFlightRef = useRef(false);
  const unableToLoadQuizText = t("unableToLoadQuiz");

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const settings = await storage.getSettings();
      const questionCount = count ? parseInt(count as string, 10) || 10 : 10;
      const rawTopicIds = getParam(topicIds);
      const resolvedTopicIds =
        typeof rawTopicIds === "string"
          ? rawTopicIds
              .split(",")
              .map((id: string) => id.trim())
              .filter((id: string) => id.length > 0)
          : [];
      const skillLevel = resolvedTopicId
        ? await storage.getTopicSkillLevel(
            resolvedProgrammingLanguage,
            resolvedTopicId,
          )
        : 1;

      let endpoint: string;
      let body: Record<string, unknown>;

      if (resolvedTopicId) {
        endpoint = "/api/quiz/generate";
        body = {
          topicId: resolvedTopicId,
          count: questionCount,
          language: settings.language,
          skillLevel,
          programmingLanguage: resolvedProgrammingLanguage,
        };
      } else {
        const progress = await storage.getProgress();
        const mixedQuizDifficulty = resolveMixedQuizDifficulty(
          progress,
          resolvedProgrammingLanguage,
          resolvedTopicIds.length > 0 ? resolvedTopicIds : undefined,
        );
        endpoint = "/api/quiz/generate-mixed";
        body = {
          count: questionCount,
          language: settings.language,
          skillLevel: mixedQuizDifficulty,
          programmingLanguage: resolvedProgrammingLanguage,
        };
        if (resolvedTopicIds.length > 0) {
          body.topicIds = resolvedTopicIds;
        }
      }

      const response = await apiRequest("POST", endpoint, body);
      const data = await response.json();

      if (data.questions && data.questions.length > 0) {
        setQuestions(
          (data.questions as QuizQuestion[]).map(shuffleOptionsForQuestion),
        );
      } else {
        setError(unableToLoadQuizText);
      }
    } catch (err) {
      console.error("Error loading questions:", err);
      setError(unableToLoadQuizText);
    } finally {
      setLoading(false);
    }
  }, [
    count,
    resolvedTopicId,
    topicIds,
    unableToLoadQuizText,
    resolvedProgrammingLanguage,
  ]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const currentQuestion = questions[currentIndex];

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (selectedAnswer === null || showResult) return;

    const isCorrect = selectedAnswer === currentQuestion.correctIndex;
    setShowResult(true);

    Haptics.notificationAsync(
      isCorrect
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  };

  const handleNext = async () => {
    if (selectedAnswer === null || nextInFlightRef.current) return;
    nextInFlightRef.current = true;
    setIsAdvancing(true);

    const currentAnswer: QuizAnswerResult = {
      questionId: currentQuestion.id,
      correct: selectedAnswer === currentQuestion.correctIndex,
      correctAnswer: currentQuestion.options[currentQuestion.correctIndex],
    };
    const nextAnswers = [...answers, currentAnswer];

    try {
      if (currentIndex < questions.length - 1) {
        setAnswers(nextAnswers);
        setCurrentIndex((prevIndex) => prevIndex + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        return;
      }

      const correctCount = nextAnswers.filter(
        (answer) => answer.correct,
      ).length;
      await storage.recordPractice();
      if (resolvedTopicId) {
        await storage.updateTopicProgress(
          resolvedProgrammingLanguage,
          resolvedTopicId,
          questions.length,
          correctCount,
        );
      }

      const params: Record<string, string> = {
        score: String(correctCount),
        total: String(questions.length),
        answers: JSON.stringify(nextAnswers),
        programmingLanguage: resolvedProgrammingLanguage,
      };
      if (resolvedTopicId) {
        params.topicId = resolvedTopicId;
      }

      router.replace({
        pathname: "/session-summary",
        params,
      });
    } finally {
      nextInFlightRef.current = false;
      setIsAdvancing(false);
    }
  };

  const handleClose = useCloseHandler();

  const headerTitle =
    questions.length > 0 ? `${currentIndex + 1}/${questions.length}` : "";

  const renderCloseButton = () => (
    <HeaderIconButton icon="x" onPress={handleClose} />
  );

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: headerTitle,
            headerLeft: renderCloseButton,
            headerBackVisible: false,
          }}
        />
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="body" style={styles.loadingText}>
            {t("generatingQuiz")}
          </ThemedText>
          <Pressable
            style={[styles.cancelButton, { borderColor: theme.tabIconDefault }]}
            onPress={handleClose}
          >
            <ThemedText type="body" style={{ color: theme.tabIconDefault }}>
              {t("cancel")}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </>
    );
  }

  if (error || !currentQuestion) {
    return (
      <>
        <Stack.Screen
          options={{
            title: headerTitle,
            headerLeft: renderCloseButton,
            headerBackVisible: false,
          }}
        />
        <ThemedView style={styles.errorContainer}>
          <AppIcon name="alert-circle" size={48} color={theme.error} />
          <ThemedText type="h4" style={styles.errorTitle}>
            {t("unableToLoadQuiz")}
          </ThemedText>
          <ThemedText type="body" style={styles.errorText}>
            {error || t("unableToLoadQuiz")}
          </ThemedText>
          <Pressable
            testID="quiz-retry-button"
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadQuestions}
          >
            <AppIcon
              name="refresh-cw"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: Spacing.sm }}
            />
            <ThemedText
              type="body"
              style={{ color: "#FFFFFF", fontWeight: "600" }}
            >
              {t("tryAgain")}
            </ThemedText>
          </Pressable>
          <Pressable
            testID="quiz-cancel-button"
            style={[styles.cancelButton, { borderColor: theme.tabIconDefault }]}
            onPress={handleClose}
          >
            <ThemedText type="body" style={{ color: theme.tabIconDefault }}>
              {t("cancel")}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerLeft: renderCloseButton,
          headerBackVisible: false,
        }}
      />
      <ThemedView style={styles.container}>
        <View
          style={[styles.progressBar, { backgroundColor: theme.cardBorder }]}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: theme.secondary },
            ]}
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.xl + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.questionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText type="h4" style={styles.questionText}>
              {currentQuestion.question}
            </ThemedText>

            {currentQuestion.code ? (
              <CodeBlock code={currentQuestion.code} />
            ) : null}
          </View>

          <View style={styles.answersContainer}>
            {currentQuestion.options.map((option, index) => (
              <AnswerButton
                key={index}
                text={option}
                index={index}
                selected={selectedAnswer === index}
                showResult={showResult}
                isCorrect={selectedAnswer === currentQuestion.correctIndex}
                isCorrectAnswer={index === currentQuestion.correctIndex}
                testID={`quiz-answer-${index}`}
                onPress={() => handleSelectAnswer(index)}
                disabled={showResult}
              />
            ))}
          </View>

          {showResult ? (
            <View
              style={[
                styles.explanationCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <ThemedText
                type="label"
                style={{ color: theme.secondary, marginBottom: Spacing.sm }}
              >
                {t("explanation")}
              </ThemedText>
              <ThemedText type="body">{currentQuestion.explanation}</ThemedText>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + Spacing.lg,
              backgroundColor: theme.backgroundRoot,
            },
          ]}
        >
          {showResult ? (
            <Pressable
              testID="quiz-next-button"
              style={[
                styles.submitButton,
                {
                  backgroundColor: isAdvancing ? theme.disabled : theme.primary,
                },
              ]}
              onPress={handleNext}
              disabled={isAdvancing}
            >
              <ThemedText
                type="body"
                style={{ color: "#FFFFFF", fontWeight: "600" }}
              >
                {currentIndex < questions.length - 1
                  ? t("nextQuestion")
                  : t("viewResults")}
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              testID="quiz-submit-button"
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    selectedAnswer !== null ? theme.primary : theme.disabled,
                },
              ]}
              onPress={handleSubmit}
              disabled={selectedAnswer === null}
            >
              <ThemedText
                type="body"
                style={{ color: "#FFFFFF", fontWeight: "600" }}
              >
                {t("submitAnswer")}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </ThemedView>
    </>
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
    gap: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  errorTitle: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
  errorText: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: Spacing.md,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  cancelButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  progressBar: {
    height: 4,
    marginHorizontal: Spacing.lg,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  questionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  questionText: {
    marginBottom: Spacing.md,
  },
  codeBlock: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  codeText: {
    fontSize: 14,
  },
  answersContainer: {
    gap: Spacing.md,
  },
  answerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    gap: Spacing.md,
  },
  optionLabel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  answerText: {
    flex: 1,
  },
  explanationCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  submitButton: {
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
