import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { EaseView } from 'react-native-ease';
import * as Haptics from 'expo-haptics';
import { hasTopicExplanation } from '@shared/explanations';

import { BottomActionBar } from '@/components/BottomActionBar';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { ExplanationCard } from '@/components/ExplanationCard';
import { InlineCodeText } from '@/components/InlineCodeText';
import { PrimaryButton, SecondaryButton } from '@/components/ActionButton';
import { StatusBadge } from '@/components/StatusBadge';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AppIcon } from '@/components/AppIcon';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useCloseHandler } from '@/hooks/useCloseHandler';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import {
  DEFAULT_QUIZ_QUESTION_COUNT,
  EXPLORE_QUIZ_MODE,
  MIXED_QUIZ_MODE,
} from '@/constants/quiz';
import {
  Spacing,
  BorderRadius,
  Fonts,
  getBottomActionBarScrollPadding,
  withOpacity,
} from '@/constants/theme';
import { getLanguageById, getLanguageDisplayName } from '@/lib/languages';
import { apiRequest, isApiRequestError } from '@/lib/query-client';
import { resolveMultiTopicQuizTopicIds } from '@/lib/quiz-topic-pools';
import { getParam, getParamWithDefault } from '@/lib/router-utils';
import { storage, type ProgressData } from '@/lib/storage';
import { getCategoryName, getTopicById, getTopicName } from '@/lib/topics';
import { isRateLimitedErrorBody } from '@shared/api-quota';
import { isQuizValidationErrorBody } from '@shared/api-quiz-validation';
import type { QuizQuestion } from '@shared/quiz-question';
import {
  averageMasteryToQuizDifficulty,
  type QuizDifficultyLevel,
} from '@shared/skill-level';

interface QuizAnswerResult {
  questionId: string;
  correct: boolean;
  correctAnswer: string;
}

interface TopicQuizResult {
  topicId: string;
  questionsAnswered: number;
  correctAnswers: number;
}

type QuizLoadError =
  | { kind: 'generic' }
  | { kind: 'validation' }
  | { kind: 'quota'; scope: 'global' | 'device' };

const EXPLANATION_REVEAL_DELAY_MS = 300;
const EXPLANATION_FADE_DURATION_MS = 300;
const EXPLANATION_SCROLL_DELAY_MS = Math.round(
  EXPLANATION_FADE_DURATION_MS * 0.25
);

function resolveMixedQuizDifficulty(
  progress: ProgressData,
  programmingLanguage: string,
  selectedTopicIds?: string[]
): QuizDifficultyLevel {
  const topicProgress = storage.getTopicProgressForLanguage(
    progress.topicProgress,
    programmingLanguage
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
    (entry) => entry.originalIndex === question.correctIndex
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

function buildTopicQuizResults(
  questions: QuizQuestion[],
  answers: QuizAnswerResult[],
  fallbackTopicId?: string
): TopicQuizResult[] {
  const questionsById = new Map(
    questions.map((question) => [question.id, question] as const)
  );
  const resultsByTopic = new Map<string, TopicQuizResult>();

  for (const answer of answers) {
    const topicId =
      questionsById.get(answer.questionId)?.topicId ?? fallbackTopicId;
    if (!topicId) {
      continue;
    }

    const existing = resultsByTopic.get(topicId) ?? {
      topicId,
      questionsAnswered: 0,
      correctAnswers: 0,
    };

    existing.questionsAnswered += 1;
    if (answer.correct) {
      existing.correctAnswers += 1;
    }

    resultsByTopic.set(topicId, existing);
  }

  return Array.from(resultsByTopic.values());
}

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
    animate,
    transition,
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
    <EaseView animate={animate} transition={transition}>
      <Pressable
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
      </Pressable>
    </EaseView>
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
        style={[styles.codeText, { fontFamily: Fonts?.mono || 'monospace' }]}
      >
        {code.replace(/\\n/g, '\n')}
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
    'javascript'
  );
  const quizModeParam = getParam(quizMode);
  const resolvedTopicIds = useMemo(() => {
    const rawTopicIds = getParam(topicIds);

    return typeof rawTopicIds === 'string'
      ? rawTopicIds
          .split(',')
          .map((id: string) => id.trim())
          .filter((id: string) => id.length > 0)
      : [];
  }, [topicIds]);
  const isExploreQuiz = quizModeParam === EXPLORE_QUIZ_MODE;
  const needsResolvedMultiTopicPool =
    !resolvedTopicId && resolvedTopicIds.length === 0;
  const isMixedQuiz =
    quizModeParam === MIXED_QUIZ_MODE ||
    (!resolvedTopicId && !isExploreQuiz && needsResolvedMultiTopicPool);
  const sessionQuizMode = isExploreQuiz
    ? EXPLORE_QUIZ_MODE
    : isMixedQuiz
      ? MIXED_QUIZ_MODE
      : null;
  const requestedQuestionCount = useMemo(() => {
    const parsedCount = count ? Number.parseInt(count, 10) : Number.NaN;

    if (Number.isFinite(parsedCount) && parsedCount > 0) {
      return parsedCount;
    }

    return DEFAULT_QUIZ_QUESTION_COUNT;
  }, [count]);
  const currentLanguage = getLanguageById(resolvedProgrammingLanguage);
  const currentProgrammingLanguageId = currentLanguage?.id ?? 'javascript';
  const currentTopic = resolvedTopicId
    ? getTopicById(resolvedTopicId, currentLanguage?.categories)
    : null;
  const [sessionTopicIds, setSessionTopicIds] = useState<string[]>([]);
  const effectiveTopicIds =
    sessionTopicIds.length > 0 ? sessionTopicIds : resolvedTopicIds;
  const currentCategory = useMemo(() => {
    if (currentTopic) {
      return currentLanguage?.categories.find(
        (category) => category.id === currentTopic.category
      );
    }
    if (effectiveTopicIds.length > 0 && currentLanguage?.categories) {
      const topics = effectiveTopicIds
        .map((id) => getTopicById(id, currentLanguage.categories))
        .filter(Boolean);
      if (topics.length > 0) {
        const firstCategory = topics[0]!.category;
        const allSame = topics.every((tp) => tp!.category === firstCategory);
        if (allSame) {
          return currentLanguage.categories.find(
            (category) => category.id === firstCategory
          );
        }
      }
    }
    return undefined;
  }, [currentTopic, currentLanguage, effectiveTopicIds]);
  const isCategoryQuiz =
    !currentTopic && !isMixedQuiz && !isExploreQuiz && !!currentCategory;
  const contextBadgeLabel = currentTopic
    ? getTopicName(currentTopic, language)
    : isCategoryQuiz
      ? getCategoryName(currentCategory!, language)
      : isExploreQuiz
        ? t('exploreQuiz')
        : t('mixedQuiz');
  const contextBadgeIcon =
    currentTopic || isCategoryQuiz
      ? 'book-open'
      : isExploreQuiz
        ? 'compass'
        : 'edit-3';
  const contextColor = theme.secondary;
  const contextDescription = currentTopic
    ? currentCategory
      ? getCategoryName(currentCategory, language)
      : currentLanguage
        ? getLanguageDisplayName(currentLanguage, language)
        : resolvedProgrammingLanguage
    : isCategoryQuiz
      ? `${effectiveTopicIds.length} ${
          effectiveTopicIds.length === 1 ? t('topic') : t('topics')
        }`
      : effectiveTopicIds.length > 0
        ? `${effectiveTopicIds.length} ${
            effectiveTopicIds.length === 1 ? t('topic') : t('topics')
          }`
        : currentLanguage
          ? getLanguageDisplayName(currentLanguage, language)
          : resolvedProgrammingLanguage;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<QuizLoadError | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const nextInFlightRef = useRef(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const explanationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const explanationScrollTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const explanationLayoutRef = useRef<{ y: number; height: number } | null>(
    null
  );
  const scrollOffsetYRef = useRef(0);
  const scrollViewportHeightRef = useRef(0);
  const quizValidationFailedTitle = t('quizValidationFailedTitle');
  const quizValidationFailedMessage = t('quizValidationFailedMessage');
  const quizRateLimitDeviceText = t('quizRateLimitDevice');
  const quizRateLimitGlobalText = t('quizRateLimitGlobal');

  const clearExplanationTimeout = useCallback(() => {
    if (explanationTimeoutRef.current !== null) {
      clearTimeout(explanationTimeoutRef.current);
      explanationTimeoutRef.current = null;
    }
  }, []);

  const clearExplanationScrollTimeout = useCallback(() => {
    if (explanationScrollTimeoutRef.current !== null) {
      clearTimeout(explanationScrollTimeoutRef.current);
      explanationScrollTimeoutRef.current = null;
    }
  }, []);

  const scrollToExplanationIfNeeded = useCallback(() => {
    const scrollView = scrollViewRef.current;
    const explanationLayout = explanationLayoutRef.current;
    const viewportHeight = scrollViewportHeightRef.current;

    if (!scrollView || !explanationLayout || viewportHeight <= 0) {
      return;
    }

    const visibleTop = scrollOffsetYRef.current;
    const unobscuredBottom =
      visibleTop +
      viewportHeight -
      getBottomActionBarScrollPadding({
        safeAreaBottom: insets.bottom,
        extraScrollPadding: 0,
      });
    const explanationTop = explanationLayout.y;
    const explanationBottom = explanationTop + explanationLayout.height;
    const topMargin = Spacing.lg;
    const bottomMargin = Spacing.md;
    const isExplanationVisible =
      explanationTop >= visibleTop + topMargin &&
      explanationBottom <= unobscuredBottom - bottomMargin;

    if (isExplanationVisible) {
      return;
    }

    scrollView.scrollTo({
      y: Math.max(0, explanationTop - topMargin),
      animated: true,
    });
  }, [insets.bottom]);

  const scheduleExplanationScroll = useCallback(() => {
    clearExplanationScrollTimeout();
    explanationScrollTimeoutRef.current = setTimeout(() => {
      explanationScrollTimeoutRef.current = null;
      scrollToExplanationIfNeeded();
    }, EXPLANATION_SCROLL_DELAY_MS);
  }, [clearExplanationScrollTimeout, scrollToExplanationIfNeeded]);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const settings = await storage.getSettings();
      const skillLevel = resolvedTopicId
        ? await storage.getTopicSkillLevel(
            resolvedProgrammingLanguage,
            resolvedTopicId
          )
        : 1;

      let endpoint: string;
      let body: Record<string, unknown>;

      if (resolvedTopicId) {
        setSessionTopicIds([]);
        endpoint = '/api/quiz/generate';
        body = {
          topicId: resolvedTopicId,
          count: requestedQuestionCount,
          language: settings.language,
          skillLevel,
          programmingLanguage: resolvedProgrammingLanguage,
        };
      } else {
        const progress = await storage.getProgress();
        const topicProgress = storage.getTopicProgressForLanguage(
          progress.topicProgress,
          resolvedProgrammingLanguage
        );
        const selectedTopicIds =
          resolvedTopicIds.length > 0
            ? resolvedTopicIds
            : resolveMultiTopicQuizTopicIds(
                currentLanguage?.categories ?? [],
                topicProgress,
                isExploreQuiz ? 'explore' : 'mixed'
              );
        setSessionTopicIds(selectedTopicIds);
        const mixedQuizDifficulty = resolveMixedQuizDifficulty(
          progress,
          resolvedProgrammingLanguage,
          selectedTopicIds.length > 0 ? selectedTopicIds : undefined
        );
        endpoint = '/api/quiz/generate-mixed';
        body = {
          count: requestedQuestionCount,
          language: settings.language,
          skillLevel: mixedQuizDifficulty,
          programmingLanguage: resolvedProgrammingLanguage,
        };
        if (selectedTopicIds.length > 0) {
          body.topicIds = selectedTopicIds;
        }
      }

      const response = await apiRequest('POST', endpoint, body);
      const data = await response.json();

      if (data.questions && data.questions.length > 0) {
        setQuestions(
          (data.questions as QuizQuestion[]).map(shuffleOptionsForQuestion)
        );
      } else {
        setError({ kind: 'generic' });
      }
    } catch (err) {
      if (
        isApiRequestError(err) &&
        err.status === 429 &&
        isRateLimitedErrorBody(err.body)
      ) {
        setError({ kind: 'quota', scope: err.body.scope });
      } else if (
        isApiRequestError(err) &&
        err.status === 422 &&
        isQuizValidationErrorBody(err.body)
      ) {
        setError({ kind: 'validation' });
      } else {
        console.error('Error loading questions:', err);
        setError({ kind: 'generic' });
      }
    } finally {
      setLoading(false);
    }
  }, [
    currentLanguage?.categories,
    isExploreQuiz,
    requestedQuestionCount,
    resolvedTopicId,
    resolvedTopicIds,
    resolvedProgrammingLanguage,
  ]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(
    () => () => {
      clearExplanationTimeout();
      clearExplanationScrollTimeout();
    },
    [clearExplanationScrollTimeout, clearExplanationTimeout]
  );

  useEffect(() => {
    if (!showExplanation) {
      return;
    }

    scheduleExplanationScroll();
  }, [scheduleExplanationScroll, showExplanation]);

  const currentQuestion = questions[currentIndex];
  const explanationTopicId = currentQuestion?.topicId ?? resolvedTopicId;
  const canOpenTopicExplanation = explanationTopicId
    ? hasTopicExplanation(
        currentProgrammingLanguageId,
        explanationTopicId,
        language
      )
    : false;

  const handleOpenTopicExplanation = useCallback(() => {
    if (!explanationTopicId) {
      return;
    }

    router.push({
      pathname: '/topic-explanation',
      params: {
        topicId: explanationTopicId,
        programmingLanguage: currentProgrammingLanguageId,
      },
    });
  }, [currentProgrammingLanguageId, explanationTopicId, router]);

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
    },
    []
  );

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    scrollViewportHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  const handleExplanationLayout = useCallback(
    (event: LayoutChangeEvent) => {
      explanationLayoutRef.current = event.nativeEvent.layout;
      if (showExplanation) {
        scheduleExplanationScroll();
      }
    },
    [scheduleExplanationScroll, showExplanation]
  );

  const handleSubmit = async () => {
    if (selectedAnswer === null || showResult) return;

    const isCorrect = selectedAnswer === currentQuestion.correctIndex;
    setShowResult(true);
    setShowExplanation(false);
    clearExplanationTimeout();
    clearExplanationScrollTimeout();
    explanationTimeoutRef.current = setTimeout(() => {
      setShowExplanation(true);
      explanationTimeoutRef.current = null;
    }, EXPLANATION_REVEAL_DELAY_MS);

    Haptics.notificationAsync(
      isCorrect
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );
  };

  const handleNext = async () => {
    if (selectedAnswer === null || nextInFlightRef.current) return;
    nextInFlightRef.current = true;
    setIsAdvancing(true);
    clearExplanationTimeout();
    clearExplanationScrollTimeout();
    explanationLayoutRef.current = null;

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
        setShowExplanation(false);
        return;
      }

      const correctCount = nextAnswers.filter(
        (answer) => answer.correct
      ).length;
      const topicQuizResults = buildTopicQuizResults(
        questions,
        nextAnswers,
        resolvedTopicId ?? undefined
      );
      await storage.recordPractice();
      if (topicQuizResults.length > 0) {
        for (const topicResult of topicQuizResults) {
          const scorePercent =
            topicResult.questionsAnswered > 0
              ? (topicResult.correctAnswers / topicResult.questionsAnswered) *
                100
              : 0;

          await storage.updateTopicProgress(
            resolvedProgrammingLanguage,
            topicResult.topicId,
            topicResult.questionsAnswered,
            topicResult.correctAnswers
          );
          await storage.updateTopicSkillLevel(
            resolvedProgrammingLanguage,
            topicResult.topicId,
            scorePercent
          );
        }
      } else if (resolvedTopicId) {
        await storage.updateTopicProgress(
          resolvedProgrammingLanguage,
          resolvedTopicId,
          questions.length,
          correctCount
        );
        await storage.updateTopicSkillLevel(
          resolvedProgrammingLanguage,
          resolvedTopicId,
          questions.length > 0 ? (correctCount / questions.length) * 100 : 0
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
      if (!resolvedTopicId && sessionTopicIds.length > 0) {
        params.topicIds = sessionTopicIds.join(',');
      }
      if (sessionQuizMode) {
        params.quizMode = sessionQuizMode;
      }

      router.replace({
        pathname: '/session-summary',
        params,
      });
    } finally {
      nextInFlightRef.current = false;
      setIsAdvancing(false);
    }
  };

  const handleClose = useCloseHandler();
  const hasUnsavedQuizProgress =
    currentIndex > 0 ||
    answers.length > 0 ||
    selectedAnswer !== null ||
    showResult;
  const handleRequestClose = useCallback(() => {
    if (!hasUnsavedQuizProgress) {
      handleClose();
      return;
    }

    Alert.alert(t('quitQuizTitle'), t('quitQuizMessage'), [
      {
        text: t('cancel'),
        style: 'cancel',
      },
      {
        text: t('quitQuizConfirm'),
        style: 'destructive',
        onPress: handleClose,
      },
    ]);
  }, [handleClose, hasUnsavedQuizProgress, t]);

  const headerTitle =
    questions.length > 0
      ? `${t('question')} ${currentIndex + 1} ${t('of')} ${questions.length}`
      : '';

  const renderCloseButton = () => (
    <HeaderIconButton
      testID="quiz-close-button"
      icon="x"
      onPress={handleRequestClose}
    />
  );
  const screenHeader = (
    <>
      <Stack.Screen
        options={{
          headerLeft: renderCloseButton,
        }}
      />
      <Stack.Screen.Title>{headerTitle}</Stack.Screen.Title>
      <Stack.Screen.BackButton hidden />
    </>
  );

  if (loading) {
    return (
      <>
        {screenHeader}
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.secondary} />
          <ThemedText type="body" style={styles.loadingText}>
            {t('generatingQuiz')}
          </ThemedText>
          <SecondaryButton
            color={theme.tabIconDefault}
            label={t('cancel')}
            onPress={handleClose}
          />
        </ThemedView>
      </>
    );
  }

  const errorTitle =
    error?.kind === 'validation'
      ? quizValidationFailedTitle
      : t('unableToLoadQuiz');
  const errorMessage =
    error?.kind === 'validation'
      ? quizValidationFailedMessage
      : error?.kind === 'quota'
        ? error.scope === 'global'
          ? quizRateLimitGlobalText
          : quizRateLimitDeviceText
        : t('unableToLoadQuiz');

  if (error || !currentQuestion) {
    return (
      <>
        {screenHeader}
        <ThemedView style={styles.errorContainer}>
          <AppIcon name="alert-circle" size={48} color={theme.error} />
          <ThemedText type="h4" style={styles.errorTitle}>
            {errorTitle}
          </ThemedText>
          <ThemedText type="body" style={styles.errorText}>
            {errorMessage}
          </ThemedText>
          <PrimaryButton
            testID="quiz-retry-button"
            color={theme.secondary}
            icon="refresh-cw"
            label={t('tryAgain')}
            onPress={loadQuestions}
          />
          <SecondaryButton
            testID="quiz-cancel-button"
            color={theme.tabIconDefault}
            label={t('cancel')}
            onPress={handleClose}
          />
        </ThemedView>
      </>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <>
      {screenHeader}
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
          ref={scrollViewRef}
          onLayout={handleScrollViewLayout}
          onScroll={handleScroll}
          scrollEventThrottle={16}
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
              <ThemedText
                type="small"
                numberOfLines={1}
                style={[
                  styles.contextMetaLabel,
                  { color: theme.tabIconDefault },
                ]}
              >
                {contextDescription}
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
            <View
              onLayout={handleExplanationLayout}
              style={styles.explanationContainer}
            >
              <EaseView
                animate={{
                  opacity: showExplanation ? 1 : 0,
                  translateY: showExplanation ? 0 : 8,
                }}
                transition={{
                  type: 'timing',
                  duration: EXPLANATION_FADE_DURATION_MS,
                }}
              >
                <ExplanationCard
                  isCorrect={selectedAnswer === currentQuestion.correctIndex}
                  correctAnswer={
                    currentQuestion.options[currentQuestion.correctIndex]
                  }
                  resultSentence={currentQuestion.resultSentence}
                  explanation={currentQuestion.explanation}
                  takeaway={currentQuestion.takeaway}
                  commonMistake={currentQuestion.commonMistake}
                  topicId={
                    canOpenTopicExplanation ? explanationTopicId : undefined
                  }
                  onPressTopic={
                    canOpenTopicExplanation
                      ? handleOpenTopicExplanation
                      : undefined
                  }
                />
              </EaseView>
            </View>
          ) : null}
        </ScrollView>

        <BottomActionBar>
          {showResult ? (
            <PrimaryButton
              testID="quiz-next-button"
              color={theme.secondary}
              label={
                currentIndex < questions.length - 1
                  ? t('nextQuestion')
                  : t('viewResults')
              }
              onPress={handleNext}
              disabled={isAdvancing}
              loading={isAdvancing}
            />
          ) : (
            <PrimaryButton
              testID="quiz-submit-button"
              color={theme.secondary}
              label={t('submitAnswer')}
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  errorTitle: {
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  errorText: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 4,
    marginHorizontal: Spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
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
  contextMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextMetaLabel: {
    flex: 1,
    flexShrink: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    gap: Spacing.md,
  },
  optionLabel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerText: {
    flex: 1,
  },
  explanationContainer: {
    marginTop: Spacing.sm,
  },
});
