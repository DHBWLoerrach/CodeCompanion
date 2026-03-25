import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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

import { BottomActionBar } from "@/components/BottomActionBar";
import { HeaderIconButton } from "@/components/HeaderIconButton";
import { InlineCodeText } from "@/components/InlineCodeText";
import { PrimaryButton, SecondaryButton } from "@/components/ActionButton";
import { StatusBadge } from "@/components/StatusBadge";
import { SurfaceCard } from "@/components/SurfaceCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AppIcon } from "@/components/AppIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useCloseHandler } from "@/hooks/useCloseHandler";
import { usePressAnimation } from "@/hooks/usePressAnimation";
import {
  DEFAULT_QUIZ_QUESTION_COUNT,
  QUICK_QUIZ_MAX_DIFFICULTY,
  QUICK_QUIZ_MODE,
  QUICK_QUIZ_QUESTION_COUNT,
} from "@/constants/quiz";
import {
  Spacing,
  BorderRadius,
  Fonts,
  getBottomActionBarScrollPadding,
  withOpacity,
} from "@/constants/theme";
import { getLanguageById, getLanguageDisplayName } from "@/lib/languages";
import { apiRequest, isApiRequestError } from "@/lib/query-client";
import { getParam, getParamWithDefault } from "@/lib/router-utils";
import { storage, type ProgressData } from "@/lib/storage";
import { getCategoryName, getTopicById, getTopicName } from "@/lib/topics";
import { isRateLimitedErrorBody } from "@shared/api-quota";
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
      return theme.onColor;
    }
    if (selected) return theme.onColor;
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
  const hasHighlightedAnswerState = selected || (showResult && isCorrectAnswer);

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
                ? withOpacity(theme.onColor, 0.18)
                : theme.backgroundSecondary,
          },
        ]}
      >
        <ThemedText type="label" style={{ color: getTextColor() }}>
          {optionLabel}
        </ThemedText>
      </View>
      <InlineCodeText
        type="body"
        style={[styles.answerText, { color: getTextColor() }]}
        text={text}
        codeStyle={{
          color: getTextColor(),
          backgroundColor: hasHighlightedAnswerState
            ? withOpacity(theme.onColor, 0.18)
            : theme.codeBackground,
        }}
      />
      {showResult && isCorrectAnswer ? (
        <AppIcon name="check-circle" size={20} color={theme.onColor} />
      ) : null}
      {showResult && selected && !isCorrect ? (
        <AppIcon name="x-circle" size={20} color={theme.onColor} />
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
        {code.replace(/\\n/g, "\n")}
      </ThemedText>
    </ScrollView>
  );
}

export default function QuizSessionScreen() {
  const { theme } = useTheme();
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { topicId, topicIds, count, programmingLanguage, quizMode } =
    useLocalSearchParams<{
      topicId?: string;
      topicIds?: string;
      count?: string;
      programmingLanguage?: string;
      quizMode?: string;
    }>();
  const resolvedTopicId = getParam(topicId);
  const resolvedProgrammingLanguage = getParamWithDefault(
    programmingLanguage,
    "javascript",
  );
  const isQuickQuiz = getParam(quizMode) === QUICK_QUIZ_MODE;
  const resolvedTopicIds = useMemo(() => {
    const rawTopicIds = getParam(topicIds);

    return typeof rawTopicIds === "string"
      ? rawTopicIds
          .split(",")
          .map((id: string) => id.trim())
          .filter((id: string) => id.length > 0)
      : [];
  }, [topicIds]);
  const requestedQuestionCount = useMemo(() => {
    const parsedCount = count ? Number.parseInt(count, 10) : Number.NaN;

    if (Number.isFinite(parsedCount) && parsedCount > 0) {
      return parsedCount;
    }

    return isQuickQuiz
      ? QUICK_QUIZ_QUESTION_COUNT
      : DEFAULT_QUIZ_QUESTION_COUNT;
  }, [count, isQuickQuiz]);
  const currentLanguage = getLanguageById(resolvedProgrammingLanguage);
  const currentTopic = resolvedTopicId
    ? getTopicById(resolvedTopicId, currentLanguage?.categories)
    : null;
  const currentCategory = currentTopic
    ? currentLanguage?.categories.find(
        (category) => category.id === currentTopic.category,
      )
    : undefined;
  const contextBadgeLabel = isQuickQuiz
    ? t("quickQuiz")
    : currentTopic
      ? getTopicName(currentTopic, language)
      : t("mixedQuiz");
  const contextBadgeIcon = isQuickQuiz
    ? "zap"
    : currentTopic
      ? "book-open"
      : "edit-3";
  const contextColor = theme.secondary;
  const contextDescription = currentTopic
    ? currentCategory
      ? getCategoryName(currentCategory, language)
      : currentLanguage
        ? getLanguageDisplayName(currentLanguage, language)
        : resolvedProgrammingLanguage
    : resolvedTopicIds.length > 0
      ? `${resolvedTopicIds.length} ${
          resolvedTopicIds.length === 1 ? t("topic") : t("topics")
        }`
      : currentLanguage
        ? getLanguageDisplayName(currentLanguage, language)
        : resolvedProgrammingLanguage;

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
  const quizRateLimitDeviceText = t("quizRateLimitDevice");
  const quizRateLimitGlobalText = t("quizRateLimitGlobal");

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const settings = await storage.getSettings();
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
          count: requestedQuestionCount,
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
        const effectiveSkillLevel = isQuickQuiz
          ? Math.min(mixedQuizDifficulty, QUICK_QUIZ_MAX_DIFFICULTY)
          : mixedQuizDifficulty;
        endpoint = "/api/quiz/generate-mixed";
        body = {
          count: requestedQuestionCount,
          language: settings.language,
          skillLevel: effectiveSkillLevel,
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
      if (
        isApiRequestError(err) &&
        err.status === 429 &&
        isRateLimitedErrorBody(err.body)
      ) {
        setError(
          err.body.scope === "global"
            ? quizRateLimitGlobalText
            : quizRateLimitDeviceText,
        );
      } else {
        console.error("Error loading questions:", err);
        setError(unableToLoadQuizText);
      }
    } finally {
      setLoading(false);
    }
  }, [
    isQuickQuiz,
    quizRateLimitDeviceText,
    quizRateLimitGlobalText,
    requestedQuestionCount,
    resolvedTopicId,
    resolvedTopicIds,
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
        count: String(requestedQuestionCount),
      };
      if (resolvedTopicId) {
        params.topicId = resolvedTopicId;
      }
      if (!resolvedTopicId && resolvedTopicIds.length > 0) {
        params.topicIds = resolvedTopicIds.join(",");
      }
      if (isQuickQuiz) {
        params.quizMode = QUICK_QUIZ_MODE;
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
          <ActivityIndicator size="large" color={theme.secondary} />
          <ThemedText type="body" style={styles.loadingText}>
            {t("generatingQuiz")}
          </ThemedText>
          <SecondaryButton
            color={theme.tabIconDefault}
            label={t("cancel")}
            onPress={handleClose}
          />
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
          <PrimaryButton
            testID="quiz-retry-button"
            color={theme.secondary}
            icon="refresh-cw"
            label={t("tryAgain")}
            onPress={loadQuestions}
          />
          <SecondaryButton
            testID="quiz-cancel-button"
            color={theme.tabIconDefault}
            label={t("cancel")}
            onPress={handleClose}
          />
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
            {
              paddingBottom: getBottomActionBarScrollPadding({
                safeAreaBottom: insets.bottom,
              }),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <SurfaceCard
            style={styles.contextCard}
            borderColor={theme.cardBorderSubtle}
            topAccentColor={contextColor}
          >
            <StatusBadge
              color={contextColor}
              icon={contextBadgeIcon}
              label={contextBadgeLabel}
            />
            <View style={styles.contextMetaRow}>
              <ThemedText type="small" style={{ color: theme.tabIconDefault }}>
                {contextDescription}
              </ThemedText>
              <View
                style={[
                  styles.contextMetaDot,
                  { backgroundColor: theme.tabIconDefault },
                ]}
              />
              <ThemedText type="small" style={{ color: theme.tabIconDefault }}>
                {requestedQuestionCount} {t("questionsShort")}
              </ThemedText>
              <View
                style={[
                  styles.contextMetaDot,
                  { backgroundColor: theme.tabIconDefault },
                ]}
              />
              <ThemedText type="small" style={{ color: theme.tabIconDefault }}>
                {headerTitle}
              </ThemedText>
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.questionCard}>
            <InlineCodeText
              type="h4"
              style={styles.questionText}
              text={currentQuestion.question}
            />

            {currentQuestion.code ? (
              <CodeBlock code={currentQuestion.code} />
            ) : null}
          </SurfaceCard>

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
            <SurfaceCard style={styles.explanationCard}>
              <ThemedText
                type="label"
                style={{ color: theme.secondary, marginBottom: Spacing.sm }}
              >
                {t("explanation")}
              </ThemedText>
              <InlineCodeText type="body" text={currentQuestion.explanation} />
            </SurfaceCard>
          ) : null}
        </ScrollView>

        <BottomActionBar>
          {showResult ? (
            <PrimaryButton
              testID="quiz-next-button"
              color={theme.secondary}
              label={
                currentIndex < questions.length - 1
                  ? t("nextQuestion")
                  : t("viewResults")
              }
              onPress={handleNext}
              disabled={isAdvancing}
              loading={isAdvancing}
            />
          ) : (
            <PrimaryButton
              testID="quiz-submit-button"
              color={theme.secondary}
              label={t("submitAnswer")}
              onPress={handleSubmit}
              disabled={selectedAnswer === null}
            />
          )}
        </BottomActionBar>
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
  contextCard: {
    gap: Spacing.sm,
  },
  contextMetaDot: {
    width: 4,
    height: 4,
    borderRadius: BorderRadius.full,
  },
  contextMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  questionCard: {
    gap: Spacing.sm,
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
    gap: Spacing.xs,
  },
});
