import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AppIcon } from "@/components/AppIcon";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, Shadows, Fonts } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { storage } from "@/lib/storage";

interface Question {
  id: string;
  question: string;
  code?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
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
}: AnswerButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
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
            backgroundColor: selected || showResult ? "rgba(255,255,255,0.2)" : theme.backgroundSecondary,
          },
        ]}
      >
        <ThemedText
          type="label"
          style={{ color: getTextColor() }}
        >
          {optionLabel}
        </ThemedText>
      </View>
      <ThemedText type="body" style={[styles.answerText, { color: getTextColor() }]}>
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
  const { topicId } = useLocalSearchParams<{ topicId?: string }>();
  const resolvedTopicId = Array.isArray(topicId) ? topicId[0] : topicId;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; correct: boolean; correctAnswer: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const settings = await storage.getSettings();
      const skillLevel = resolvedTopicId ? await storage.getTopicSkillLevel(resolvedTopicId) : 1;
      const endpoint = resolvedTopicId ? "/api/quiz/generate" : "/api/quiz/generate-mixed";
      const body = resolvedTopicId
        ? { topicId: resolvedTopicId, count: 10, language: settings.language, skillLevel }
        : { count: 10, language: settings.language };

      const response = await apiRequest("POST", endpoint, body);
      const data = await response.json();

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        setError(t("unableToLoadQuiz"));
      }
    } catch (err) {
      console.error("Error loading questions:", err);
      setError(t("unableToLoadQuiz"));
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === currentQuestion.correctIndex;
    setShowResult(true);

    Haptics.notificationAsync(
      isCorrect
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );

    const newAnswer = {
      questionId: currentQuestion.id,
      correct: isCorrect,
      correctAnswer: currentQuestion.options[currentQuestion.correctIndex],
    };
    setAnswers([...answers, newAnswer]);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      const correctCount = answers.filter((a) => a.correct).length + (showResult && selectedAnswer === currentQuestion.correctIndex ? 1 : 0);
      const finalAnswers = [
        ...answers,
        {
          questionId: currentQuestion.id,
          correct: selectedAnswer === currentQuestion.correctIndex,
          correctAnswer: currentQuestion.options[currentQuestion.correctIndex],
        },
      ];

      await storage.recordPractice();
      if (resolvedTopicId) {
        await storage.updateTopicProgress(
          resolvedTopicId,
          questions.length,
          finalAnswers.filter((a) => a.correct).length
        );
      }

      const params: Record<string, string> = {
        score: String(finalAnswers.filter((a) => a.correct).length),
        total: String(questions.length),
        answers: JSON.stringify(finalAnswers),
      };
      if (resolvedTopicId) {
        params.topicId = resolvedTopicId;
      }

      router.replace({
        pathname: "/session-summary",
        params,
      });
    }
  };

  const handleClose = () => {
    router.back();
  };

  const headerTitle = questions.length > 0 ? `${currentIndex + 1}/${questions.length}` : "";

  const renderCloseButton = () => (
    <Pressable style={styles.headerButton} onPress={handleClose}>
      <AppIcon name="x" size={22} color={theme.text} />
    </Pressable>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: headerTitle,
            headerLeft: renderCloseButton,
            headerRight: () => <View style={styles.headerPlaceholder} />,
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
            headerRight: () => <View style={styles.headerPlaceholder} />,
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
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadQuestions}
          >
            <AppIcon name="refresh-cw" size={18} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {t("tryAgain")}
            </ThemedText>
          </Pressable>
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

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerLeft: renderCloseButton,
          headerRight: () => <View style={styles.headerPlaceholder} />,
          headerBackVisible: false,
        }}
      />
      <ThemedView style={styles.container}>
        <View style={[styles.progressBar, { backgroundColor: theme.cardBorder }]}>
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
        <View style={[styles.questionCard, { backgroundColor: theme.backgroundDefault }]}>
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
              onPress={() => handleSelectAnswer(index)}
              disabled={showResult}
            />
          ))}
        </View>

        {showResult ? (
          <View style={[styles.explanationCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="label" style={{ color: theme.secondary, marginBottom: Spacing.sm }}>
              {t("explanation")}
            </ThemedText>
            <ThemedText type="body">{currentQuestion.explanation}</ThemedText>
          </View>
        ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.backgroundRoot },
          ]}
        >
          {showResult ? (
            <Pressable
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={handleNext}
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {currentIndex < questions.length - 1 ? t("nextQuestion") : t("viewResults")}
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.submitButton,
                {
                  backgroundColor: selectedAnswer !== null ? theme.primary : theme.disabled,
                },
              ]}
              onPress={handleSubmit}
              disabled={selectedAnswer === null}
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
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
  headerButton: {
    padding: Spacing.sm,
  },
  headerPlaceholder: {
    width: 40,
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
