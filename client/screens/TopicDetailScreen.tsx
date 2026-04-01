import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { EaseView } from 'react-native-ease';
import { hasTopicExplanation, getTopicExplanation } from '@shared/explanations';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AppIcon } from '@/components/AppIcon';
import { BottomActionBar } from '@/components/BottomActionBar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PrimaryButton } from '@/components/ActionButton';
import { SkillLevelDots } from '@/components/SkillLevelDots';
import { StatusBadge } from '@/components/StatusBadge';
import { SurfaceCard } from '@/components/SurfaceCard';
import { DEFAULT_QUIZ_QUESTION_COUNT } from '@/constants/quiz';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import {
  Spacing,
  BorderRadius,
  getBottomActionBarScrollPadding,
  withOpacity,
} from '@/constants/theme';
import {
  getCategoryName,
  getTopicById,
  getTopicName,
  getTopicDescription,
  type Topic,
} from '@/lib/topics';
import { getParam } from '@/lib/router-utils';
import { storage, type TopicProgress, isTopicDue } from '@/lib/storage';
import { useProgrammingLanguage } from '@/contexts/ProgrammingLanguageContext';

export default function TopicDetailScreen() {
  const { theme } = useTheme();
  const { t, language, refreshLanguage } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const { selectedLanguage } = useProgrammingLanguage();
  const languageId = selectedLanguage?.id ?? 'javascript';
  const categories = selectedLanguage?.categories ?? [];
  const { topicId } = useLocalSearchParams<{ topicId?: string }>();
  const resolvedTopicId = getParam(topicId);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [progress, setProgress] = useState<TopicProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelHintSeen, setLevelHintSeen] = useState<boolean | null>(null);
  const [isLevelInfoVisible, setIsLevelInfoVisible] = useState(false);
  const [isLevelInfoMounted, setIsLevelInfoMounted] = useState(false);
  const [hasAutoExpandedLevelHint, setHasAutoExpandedLevelHint] =
    useState(false);
  const {
    animate: explainAnimate,
    transition: explainTransition,
    handlePressIn: handleExplainPressIn,
    handlePressOut: handleExplainPressOut,
  } = usePressAnimation(0.98);

  const loadData = useCallback(
    async (activeLanguage: 'en' | 'de' = language) => {
      try {
        setLevelHintSeen(null);
        setIsLevelInfoVisible(false);
        setIsLevelInfoMounted(false);
        setHasAutoExpandedLevelHint(false);

        if (!resolvedTopicId) {
          setTopic(null);
          setProgress(null);
          navigation.setOptions({ headerTitle: '' });
          return;
        }

        const topicData = getTopicById(resolvedTopicId, categories);
        setTopic(topicData || null);
        const parentCategory = categories.find(
          (c) => c.id === topicData?.category
        );
        navigation.setOptions({
          headerTitle: parentCategory
            ? getCategoryName(parentCategory, activeLanguage)
            : '',
        });

        const progressData = await storage.getProgress();
        const seenLevelHint = await storage.hasSeenLevelHint();
        const compositeKey = `${languageId}:${resolvedTopicId}`;
        setProgress(progressData.topicProgress[compositeKey] || null);
        setLevelHintSeen(seenLevelHint);
      } catch (error) {
        console.error('Error loading topic:', error);
      } finally {
        setLoading(false);
      }
    },
    [resolvedTopicId, navigation, language, categories, languageId]
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshAndLoad = async () => {
        let resolvedLanguage = language;

        try {
          const settings = await storage.getSettings();
          resolvedLanguage = settings.language;
        } catch {
          resolvedLanguage = language;
        }

        try {
          await refreshLanguage();
        } catch (error) {
          console.error('Error refreshing language:', error);
        }
        if (!isActive) return;
        await loadData(resolvedLanguage);
      };

      refreshAndLoad();

      return () => {
        isActive = false;
      };
    }, [refreshLanguage, loadData, language])
  );

  useEffect(() => {
    if (loading || levelHintSeen !== false || hasAutoExpandedLevelHint) {
      return;
    }

    const hasProgress = (progress?.questionsAnswered ?? 0) > 0;
    if (hasProgress) {
      return;
    }

    setIsLevelInfoMounted(true);
    setIsLevelInfoVisible(true);
    setHasAutoExpandedLevelHint(true);

    void storage.markLevelHintSeen().then(
      () => {
        setLevelHintSeen(true);
      },
      (error) => {
        console.error('Error marking level hint as seen:', error);
      }
    );
  }, [loading, levelHintSeen, hasAutoExpandedLevelHint, progress]);

  const handleStartQuiz = () => {
    if (!resolvedTopicId) return;
    router.push({
      pathname: '/quiz-session',
      params: { topicId: resolvedTopicId, programmingLanguage: languageId },
    });
  };

  const handleExplainTopic = () => {
    if (!resolvedTopicId) return;
    router.push({
      pathname: '/topic-explanation',
      params: { topicId: resolvedTopicId, programmingLanguage: languageId },
    });
  };

  const handleToggleLevelInfo = () => {
    if (isLevelInfoVisible) {
      setIsLevelInfoVisible(false);
    } else {
      setIsLevelInfoMounted(true);
      setIsLevelInfoVisible(true);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!topic) {
    return (
      <ThemedView style={styles.errorContainer}>
        <AppIcon name="alert-circle" size={48} color={theme.error} />
        <ThemedText type="body">{t('topicNotFound')}</ThemedText>
      </ThemedView>
    );
  }

  const questionsAnswered = progress?.questionsAnswered ?? 0;
  const correctAnswers = progress?.correctAnswers ?? 0;
  const accuracy =
    questionsAnswered > 0
      ? Math.round((correctAnswers / questionsAnswered) * 100)
      : 0;
  const hasProgress = questionsAnswered > 0;
  const displayName = getTopicName(topic, language);
  const displayDescription = getTopicDescription(topic, language);
  const dateLocale = language === 'de' ? 'de-DE' : 'en-US';
  const canExplainTopic = hasTopicExplanation(languageId, topic.id, language);
  const explanationPreview = (() => {
    if (!canExplainTopic) return undefined;
    const full = getTopicExplanation(languageId, topic.id, language);
    if (!full) return undefined;
    const withoutHeading = full.replace(/^#[^\n]*\n+/, '');
    const firstParagraph = withoutHeading.split(/\n\n/)[0] ?? '';
    const plain = firstParagraph.replace(/[*`#_~\[\]]/g, '').trim();
    if (plain.length <= 120) return plain;
    const truncated = plain.slice(0, 120);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
  })();
  const currentCategory = categories.find(
    (category) => category.id === topic.category
  );
  const categoryLabel = currentCategory
    ? getCategoryName(currentCategory, language)
    : t('topic');
  const quizQuestionCount = DEFAULT_QUIZ_QUESTION_COUNT;
  const currentSkillLevel = progress?.skillLevel ?? 1;
  const skillProgress = (currentSkillLevel / 5) * 100;
  const usesFloatingActionBar = hasProgress;
  const lastActivityLabel = progress?.lastPracticed
    ? new Intl.DateTimeFormat(dateLocale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(progress.lastPracticed))
    : t('notStartedYet');
  const topicStatus = !hasProgress
    ? { label: t('newLabel'), icon: 'zap', color: theme.secondary }
    : progress?.skillLevel === 5
      ? { label: t('mastered'), icon: 'award', color: theme.success }
      : isTopicDue(progress ?? undefined)
        ? { label: t('reviewLabel'), icon: 'clock', color: theme.accent }
        : {
            label: t('inProgressLabel'),
            icon: 'trending-up',
            color: theme.secondary,
          };
  const heroAccent = selectedLanguage?.color ?? theme.primary;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.sm,
            paddingBottom: usesFloatingActionBar
              ? getBottomActionBarScrollPadding({
                  safeAreaBottom: insets.bottom,
                })
              : Spacing['2xl'],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SurfaceCard
          style={styles.heroCard}
          borderColor={theme.cardBorderSubtle}
          topAccentColor={heroAccent}
        >
          <View style={styles.heroTopRow}>
            <StatusBadge
              color={topicStatus.color}
              icon={topicStatus.icon}
              label={topicStatus.label}
            />
          </View>

          <View style={styles.heroBody}>
            <View
              style={[
                styles.topicIconCompact,
                { backgroundColor: withOpacity(heroAccent, 0.125) },
              ]}
            >
              <AppIcon name="code" size={28} color={heroAccent} />
            </View>
            <View style={styles.heroTextColumn}>
              <ThemedText
                type="small"
                numberOfLines={1}
                style={{ color: theme.tabIconDefault, fontWeight: '600' }}
              >
                {categoryLabel}
              </ThemedText>
              <ThemedText type="h2" style={styles.heroTitle}>
                {displayName}
              </ThemedText>
              <ThemedText
                type="body"
                numberOfLines={3}
                ellipsizeMode="tail"
                style={[
                  styles.heroDescription,
                  { color: theme.tabIconDefault },
                ]}
              >
                {displayDescription}
              </ThemedText>
            </View>
          </View>

          {!hasProgress ? (
            <View style={styles.metaGrid}>
              <View
                style={[
                  styles.metaCard,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText
                  type="h4"
                  style={[styles.metaValue, { color: theme.text }]}
                >
                  {quizQuestionCount}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={[styles.metaLabel, { color: theme.tabIconDefault }]}
                >
                  {t('questionsShort')}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.metaCard,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText
                  type="h4"
                  style={[styles.metaValue, { color: theme.text }]}
                >
                  {currentSkillLevel}/5
                </ThemedText>
                <SkillLevelDots
                  level={currentSkillLevel as 1 | 2 | 3 | 4 | 5}
                  color={topicStatus.color}
                />
                <View style={styles.levelLabelRow}>
                  <ThemedText
                    type="small"
                    style={[styles.metaLabel, { color: theme.tabIconDefault }]}
                  >
                    {t('level')}
                  </ThemedText>
                  <Pressable
                    testID="topic-level-info-button"
                    accessibilityRole="button"
                    accessibilityLabel={t('levelInfoButtonLabel')}
                    hitSlop={8}
                    onPress={handleToggleLevelInfo}
                    style={styles.levelInfoButton}
                  >
                    <AppIcon
                      name="info"
                      size={14}
                      color={theme.tabIconDefault}
                    />
                  </Pressable>
                </View>
                {isLevelInfoMounted ? (
                  <EaseView
                    initialAnimate={{ opacity: 0 }}
                    animate={{ opacity: isLevelInfoVisible ? 1 : 0 }}
                    transition={{
                      type: 'timing',
                      duration: isLevelInfoVisible ? 160 : 140,
                      easing: [0.455, 0.03, 0.515, 0.955],
                    }}
                    onTransitionEnd={({ finished }: { finished: boolean }) => {
                      if (finished && !isLevelInfoVisible) {
                        setIsLevelInfoMounted(false);
                      }
                    }}
                  >
                    <ThemedText
                      testID="topic-level-info-text"
                      type="caption"
                      style={[
                        styles.levelInfoText,
                        { color: theme.tabIconDefault },
                      ]}
                    >
                      {t('levelInfoText')}
                    </ThemedText>
                  </EaseView>
                ) : null}
              </View>
            </View>
          ) : null}
        </SurfaceCard>

        <EaseView
          animate={canExplainTopic ? explainAnimate : undefined}
          transition={canExplainTopic ? explainTransition : undefined}
        >
          <SurfaceCard
            style={styles.explanationCard}
            borderColor={theme.cardBorderSubtle}
          >
            <Pressable
              testID="topic-explain-button"
              accessibilityState={{ disabled: !canExplainTopic }}
              disabled={!canExplainTopic}
              onPress={canExplainTopic ? handleExplainTopic : undefined}
              onPressIn={canExplainTopic ? handleExplainPressIn : undefined}
              onPressOut={canExplainTopic ? handleExplainPressOut : undefined}
              style={styles.explanationAction}
            >
              <View style={styles.secondaryActionContent}>
                <View
                  style={[
                    styles.secondaryActionIconWrap,
                    {
                      backgroundColor: canExplainTopic
                        ? withOpacity(theme.secondary, 0.12)
                        : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <AppIcon
                    name="book-open"
                    size={18}
                    color={
                      canExplainTopic ? theme.secondary : theme.tabIconDefault
                    }
                  />
                </View>
                <View style={styles.secondaryActionText}>
                  <ThemedText
                    type="label"
                    style={{
                      color: canExplainTopic
                        ? theme.text
                        : theme.tabIconDefault,
                    }}
                  >
                    {t('topicExplanation')}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    numberOfLines={5}
                    style={{ color: theme.tabIconDefault }}
                  >
                    {explanationPreview ?? t('explanationUnavailable')}
                  </ThemedText>
                </View>
              </View>
              <AppIcon
                name={canExplainTopic ? 'chevron-right' : 'lock'}
                size={16}
                color={canExplainTopic ? theme.secondary : theme.tabIconDefault}
              />
            </Pressable>
          </SurfaceCard>
        </EaseView>

        {hasProgress ? (
          <SurfaceCard
            style={styles.stateCard}
            borderColor={theme.cardBorderSubtle}
          >
            <View style={styles.stateHeader}>
              <View style={styles.stateHeaderText}>
                <ThemedText type="label">{t('yourProgress')}</ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: theme.tabIconDefault }}
                >
                  {t('lastActivity')}: {lastActivityLabel}
                </ThemedText>
              </View>
            </View>

            <View style={styles.progressHeroRow}>
              <View style={styles.progressMetricBlock}>
                <ThemedText
                  type="h1"
                  style={[styles.progressMetricValue, { color: theme.accent }]}
                >
                  {accuracy}%
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: theme.tabIconDefault }}
                >
                  {t('accuracy')}
                </ThemedText>
              </View>
              <View style={styles.progressLevelBlock}>
                <ThemedText
                  type="h3"
                  style={{ color: theme.text, fontWeight: '700' }}
                >
                  {currentSkillLevel}/5
                </ThemedText>
                <View style={styles.levelLabelRow}>
                  <ThemedText
                    type="small"
                    style={{ color: theme.tabIconDefault }}
                  >
                    {t('level')}
                  </ThemedText>
                  <Pressable
                    testID="topic-level-info-button"
                    accessibilityRole="button"
                    accessibilityLabel={t('levelInfoButtonLabel')}
                    hitSlop={8}
                    onPress={handleToggleLevelInfo}
                    style={styles.levelInfoButton}
                  >
                    <AppIcon
                      name="info"
                      size={14}
                      color={theme.tabIconDefault}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            {isLevelInfoMounted ? (
              <EaseView
                initialAnimate={{ opacity: 0 }}
                animate={{ opacity: isLevelInfoVisible ? 1 : 0 }}
                transition={{
                  type: 'timing',
                  duration: isLevelInfoVisible ? 160 : 140,
                  easing: [0.455, 0.03, 0.515, 0.955],
                }}
                onTransitionEnd={({ finished }: { finished: boolean }) => {
                  if (finished && !isLevelInfoVisible) {
                    setIsLevelInfoMounted(false);
                  }
                }}
              >
                <ThemedText
                  testID="topic-level-info-text"
                  type="caption"
                  style={[
                    styles.levelInfoText,
                    { color: theme.tabIconDefault },
                  ]}
                >
                  {t('levelInfoText')}
                </ThemedText>
              </EaseView>
            ) : null}

            <View
              style={[
                styles.skillTrack,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View
                style={[
                  styles.skillFill,
                  {
                    backgroundColor: topicStatus.color,
                    width: `${skillProgress}%`,
                  },
                ]}
              />
            </View>

            <View testID="topic-progress-stats" style={styles.statStrip}>
              <View
                style={[
                  styles.statSegment,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText
                  type="h3"
                  style={[styles.segmentValue, { color: theme.secondary }]}
                >
                  {questionsAnswered}
                </ThemedText>
                <ThemedText
                  type="small"
                  numberOfLines={1}
                  style={[styles.segmentLabel, { color: theme.tabIconDefault }]}
                >
                  {t('questionsShort')}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statSegment,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText
                  type="h3"
                  style={[styles.segmentValue, { color: theme.success }]}
                >
                  {correctAnswers}
                </ThemedText>
                <ThemedText
                  type="small"
                  numberOfLines={1}
                  style={[styles.segmentLabel, { color: theme.tabIconDefault }]}
                >
                  {t('correctShort')}
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        ) : null}

        {!usesFloatingActionBar ? (
          <View style={styles.inlineActionWrap}>
            <PrimaryButton
              testID="topic-start-quiz-button"
              color={theme.secondary}
              icon="play"
              label={t('startQuiz')}
              onPress={handleStartQuiz}
            />
          </View>
        ) : null}
      </ScrollView>

      {usesFloatingActionBar ? (
        <BottomActionBar>
          <PrimaryButton
            testID="topic-start-quiz-button"
            color={theme.secondary}
            icon="play"
            label={t('startQuiz')}
            onPress={handleStartQuiz}
          />
        </BottomActionBar>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing['xl'],
  },
  heroCard: {
    gap: Spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  topicIconCompact: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  heroTextColumn: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 31,
  },
  heroDescription: {
    fontSize: 15,
    lineHeight: 21,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metaCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 2,
  },
  metaValue: {
    fontWeight: '700',
    lineHeight: 24,
  },
  metaLabel: {
    lineHeight: 16,
  },
  levelLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  levelInfoButton: {
    padding: 2,
  },
  levelInfoText: {
    lineHeight: 18,
  },
  explanationCard: {
    padding: 0,
  },
  explanationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    padding: 14,
  },
  secondaryActionContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  secondaryActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  stateCard: {
    gap: Spacing.lg,
  },
  inlineActionWrap: {
    marginTop: Spacing.xs,
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  stateHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  progressHeroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  progressMetricBlock: {
    flex: 1,
    gap: 4,
  },
  progressMetricValue: {
    lineHeight: 46,
  },
  progressLevelBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  skillTrack: {
    height: 10,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  skillFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  statStrip: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statSegment: {
    flex: 1,
    minWidth: 0,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  segmentValue: {
    lineHeight: 30,
  },
  segmentLabel: {
    textAlign: 'center',
    lineHeight: 16,
  },
});
