import React from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { EaseView } from 'react-native-ease';

import { ProgrammingLanguageHeaderBadge } from '@/components/ProgrammingLanguageHeaderBadge';
import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AppIcon } from '@/components/AppIcon';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SkillLevelDots } from '@/components/SkillLevelDots';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useAccessibilityLayout } from '@/hooks/useAccessibilityLayout';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { useTopicProgress } from '@/hooks/useTopicProgress';
import { getDenseControlTextCap } from '@/lib/accessibility';
import {
  getRecommendedTopicId,
  hasStartedTopic,
  isTopicMastered,
} from '@/lib/topic-recommendations';
import { Spacing, BorderRadius, Shadows, withOpacity } from '@/constants/theme';
import {
  type Topic,
  type Category,
  getTopicName,
  getCategoryName,
} from '@/lib/topics';
import { getLanguageDisplayName } from '@/lib/languages';
import { type TopicProgress, isTopicDue } from '@/lib/storage';
import { useProgrammingLanguage } from '@/contexts/ProgrammingLanguageContext';

type TranslateFn = ReturnType<typeof useTranslation>['t'];
type TopicVisualState = 'new' | 'started' | 'due' | 'mastered';

interface TopicTileProps {
  progress?: TopicProgress;
  onPress: () => void;
  topicName: string;
  testID?: string;
  usesLargeLayout?: boolean;
}

function getTopicCountLabel(topicCount: number, t: TranslateFn) {
  return `${topicCount} ${topicCount === 1 ? t('topic') : t('topics')}`;
}

function capitalizeLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getTopicVisualState(
  progress: TopicProgress | undefined
): TopicVisualState {
  const hasStarted = hasStartedTopic(progress);

  if (isTopicMastered(progress)) {
    return 'mastered';
  }

  if (hasStarted && isTopicDue(progress)) {
    return 'due';
  }

  if (hasStarted) {
    return 'started';
  }

  return 'new';
}

function getTopicStateMeta(
  progress: TopicProgress | undefined,
  t: TranslateFn
) {
  const state = getTopicVisualState(progress);

  switch (state) {
    case 'mastered':
      return { state, label: t('mastered'), iconName: 'award' as const };
    case 'due':
      return { state, label: t('reviewLabel'), iconName: 'clock' as const };
    case 'started':
      return {
        state,
        label: t('inProgressLabel'),
        iconName: 'play' as const,
      };
    case 'new':
    default:
      return { state: 'new' as const, label: t('newLabel'), iconName: null };
  }
}

function getTopicPositionLabel(
  position: number | undefined,
  total: number | undefined,
  t: TranslateFn
) {
  if (!position || !total) {
    return undefined;
  }

  return `${capitalizeLabel(t('topic'))} ${position} ${t('of')} ${total}`;
}

function shouldUseWideTopicTile(topicName: string) {
  return (
    topicName.length > 22 ||
    ((topicName.includes(',') || topicName.includes('(')) &&
      topicName.length > 18)
  );
}

function getWideTileIndexes(topicNames: string[]) {
  const wideIndexes = new Set<number>();
  let rowFill = 0;

  for (let index = 0; index < topicNames.length; index += 1) {
    const isLongTitle = shouldUseWideTopicTile(topicNames[index]);
    const isLastItem = index === topicNames.length - 1;

    if (isLongTitle || (isLastItem && rowFill === 0)) {
      wideIndexes.add(index);
      rowFill = 0;
      continue;
    }

    rowFill = rowFill === 0 ? 1 : 0;
  }

  return wideIndexes;
}

function getTopicRows<T extends { id: string }>(
  topics: T[],
  wideTileIndexes: Set<number>
) {
  const rows: T[][] = [];
  let currentRow: T[] = [];

  for (let index = 0; index < topics.length; index += 1) {
    const topic = topics[index];

    if (wideTileIndexes.has(index)) {
      if (currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }

      rows.push([topic]);
      continue;
    }

    currentRow.push(topic);

    if (currentRow.length === 2) {
      rows.push(currentRow);
      currentRow = [];
    }
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

function getCategoryVisualProgress(
  category: Category,
  topicProgress: Record<string, TopicProgress>
) {
  const totalTopics = category.topics.length;
  const weightedProgress = category.topics.reduce((sum, topic) => {
    const state = getTopicVisualState(topicProgress[topic.id]);

    switch (state) {
      case 'mastered':
        return sum + 1;
      case 'started':
      case 'due':
        return sum + 0.55;
      case 'new':
      default:
        return sum;
    }
  }, 0);

  return totalTopics === 0 ? 0 : (weightedProgress / totalTopics) * 100;
}

function getCategoryStatus(
  category: Category,
  topicProgress: Record<string, TopicProgress>,
  t: TranslateFn
) {
  const totalTopics = category.topics.length;
  const startedTopics = category.topics.filter((topic) => {
    const progress = topicProgress[topic.id];
    return hasStartedTopic(progress);
  });
  const startedCount = startedTopics.length;
  const masteredCount = startedTopics.filter((topic) =>
    isTopicMastered(topicProgress[topic.id])
  ).length;
  const dueCount = startedTopics.filter((topic) =>
    isTopicDue(topicProgress[topic.id])
  ).length;
  const topicLabel = totalTopics === 1 ? t('topic') : t('topics');

  if (startedCount === 0) {
    return {
      primaryLabel: t('notStartedYet'),
      secondaryLabel: undefined,
      topicCountLabel: getTopicCountLabel(totalTopics, t),
    };
  }

  const primaryLabel =
    masteredCount === totalTopics
      ? `${masteredCount} ${t('of')} ${totalTopics} ${topicLabel} ${t(
          'mastered'
        ).toLowerCase()}`
      : `${startedCount} ${t('of')} ${totalTopics} ${topicLabel} ${t(
          'started'
        )}`;

  return {
    primaryLabel,
    secondaryLabel:
      dueCount > 0
        ? `${dueCount} ${t('dueLabel')}`
        : masteredCount > 0
          ? `${masteredCount} ${t('mastered').toLowerCase()}`
          : undefined,
    topicCountLabel: getTopicCountLabel(totalTopics, t),
  };
}

function getStateAccentColor(
  state: TopicVisualState,
  theme: ReturnType<typeof useTheme>['theme']
) {
  switch (state) {
    case 'mastered':
      return theme.success;
    case 'due':
      return theme.accent;
    case 'started':
      return theme.secondary;
    case 'new':
    default:
      return theme.tabIconDefault;
  }
}

function getTopicSkillLevel(
  progress: TopicProgress | undefined
): TopicProgress['skillLevel'] {
  return progress?.skillLevel ?? 1;
}

function getStartedStatusAccessibilityLabel(
  t: TranslateFn,
  topicName: string,
  statusLabel: string,
  skillLevel: TopicProgress['skillLevel'],
  options?: {
    prefix?: string;
    detail?: string;
  }
) {
  return [
    options?.prefix,
    topicName,
    options?.detail,
    statusLabel,
    `${capitalizeLabel(t('level'))} ${skillLevel} ${t('of')} 5`,
  ]
    .filter(Boolean)
    .join(', ');
}

function TopicTile({
  progress,
  onPress,
  topicName,
  testID,
  usesLargeLayout = false,
}: TopicTileProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { animate, transition, handlePressIn, handlePressOut } =
    usePressAnimation(0.97);
  const { state, label, iconName } = getTopicStateMeta(progress, t);
  const skillLevel = getTopicSkillLevel(progress);
  const accentColor = getStateAccentColor(state, theme);
  const borderColor =
    state === 'new' ? theme.backgroundTertiary : withOpacity(accentColor, 0.25);
  const backgroundColor =
    state === 'new' ? theme.backgroundRoot : withOpacity(accentColor, 0.04);
  const metaTextColor = state === 'new' ? theme.tabIconDefault : accentColor;
  const shouldShowMeta = state !== 'new';
  const accessibilityLabel =
    state === 'started'
      ? getStartedStatusAccessibilityLabel(t, topicName, label, skillLevel)
      : undefined;

  return (
    <EaseView
      animate={animate}
      transition={transition}
      style={styles.topicTileWrapper}
    >
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.topicTile,
          {
            backgroundColor,
            borderColor,
          },
        ]}
      >
        <ThemedText
          type="label"
          style={styles.topicTileTitle}
          numberOfLines={usesLargeLayout ? 3 : 2}
          ellipsizeMode="tail"
        >
          {topicName}
        </ThemedText>
        {shouldShowMeta ? (
          <View style={styles.topicMetaRow}>
            <View style={styles.topicMetaStatus}>
              {iconName ? (
                <AppIcon
                  name={iconName}
                  size={12}
                  color={metaTextColor}
                  style={styles.topicMetaIcon}
                />
              ) : null}
              <ThemedText
                type="caption"
                maxFontSizeMultiplier={getDenseControlTextCap()}
                style={[
                  styles.topicMetaText,
                  state === 'started' && styles.statusMetaTextTight,
                  { color: metaTextColor },
                ]}
                numberOfLines={usesLargeLayout ? 2 : 1}
              >
                {label}
              </ThemedText>
              {state === 'started' ? (
                <SkillLevelDots
                  level={skillLevel}
                  color={accentColor}
                  size={5}
                  gap={3}
                  inactiveOpacity={0.4}
                  style={styles.topicMetaLevelDots}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </Pressable>
    </EaseView>
  );
}

interface NextStepCardProps {
  topicName: string;
  progress?: TopicProgress;
  onPress: () => void;
  testID?: string;
  position: number;
  total: number;
  usesLargeLayout: boolean;
}

function NextStepCard({
  topicName,
  progress,
  onPress,
  testID,
  position,
  total,
  usesLargeLayout,
}: NextStepCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { animate, transition, handlePressIn, handlePressOut } =
    usePressAnimation(0.98);
  const { state, label, iconName } = getTopicStateMeta(progress, t);
  const skillLevel = getTopicSkillLevel(progress);
  const accentColor =
    state === 'due'
      ? theme.accent
      : state === 'mastered'
        ? theme.success
        : theme.secondary;
  const isAndroid = process.env.EXPO_OS === 'android';
  const topicIndexLabel = getTopicPositionLabel(position, total, t);
  const accessibilityLabel =
    state === 'started'
      ? getStartedStatusAccessibilityLabel(t, topicName, label, skillLevel, {
          prefix: t('nextStep'),
          detail: topicIndexLabel,
        })
      : undefined;

  return (
    <EaseView animate={animate} transition={transition}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.nextStepCard,
          {
            backgroundColor: withOpacity(accentColor, isAndroid ? 0.1 : 0.125),
            borderColor: withOpacity(accentColor, isAndroid ? 0.22 : 0.32),
          },
          isAndroid
            ? null
            : {
                shadowColor: accentColor,
                shadowOpacity: 0.11,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 5 },
                elevation: 3,
              },
        ]}
      >
        <View style={styles.nextStepBody}>
          <ThemedText
            type="caption"
            style={[styles.nextStepEyebrow, { color: accentColor }]}
          >
            {t('nextStep')}
          </ThemedText>
          <ThemedText
            type="h4"
            style={styles.nextStepTitle}
            numberOfLines={usesLargeLayout ? 3 : 2}
            ellipsizeMode="tail"
          >
            {topicName}
          </ThemedText>
          <View
            style={[
              styles.nextStepMeta,
              usesLargeLayout && styles.nextStepMetaStacked,
            ]}
          >
            {topicIndexLabel ? (
              <ThemedText
                type="caption"
                maxFontSizeMultiplier={getDenseControlTextCap()}
                style={[
                  styles.nextStepMetaText,
                  { color: theme.tabIconDefault },
                ]}
                numberOfLines={usesLargeLayout ? 2 : undefined}
              >
                {topicIndexLabel}
              </ThemedText>
            ) : null}
            {topicIndexLabel && !usesLargeLayout ? (
              <View
                style={[
                  styles.nextStepMetaDot,
                  { backgroundColor: theme.tabIconDefault },
                ]}
              />
            ) : null}
            <View
              style={[
                styles.nextStepMetaStatus,
                usesLargeLayout && styles.nextStepMetaStatusStacked,
              ]}
            >
              <View
                testID="next-step-status-line"
                style={[
                  styles.nextStepMetaStatusLine,
                  usesLargeLayout && styles.nextStepMetaStatusLineStacked,
                ]}
              >
                {iconName ? (
                  <AppIcon
                    name={iconName}
                    size={12}
                    color={accentColor}
                    style={styles.nextStepMetaIcon}
                  />
                ) : null}
                <ThemedText
                  type="caption"
                  maxFontSizeMultiplier={getDenseControlTextCap()}
                  style={[
                    styles.nextStepMetaText,
                    state === 'started' && styles.statusMetaTextTight,
                    { color: accentColor },
                  ]}
                  numberOfLines={usesLargeLayout ? 2 : 1}
                >
                  {label}
                </ThemedText>
              </View>
              {state === 'started' ? (
                <SkillLevelDots
                  level={skillLevel}
                  color={accentColor}
                  size={5}
                  gap={3}
                  inactiveOpacity={0.4}
                  style={[
                    styles.nextStepMetaLevelDots,
                    usesLargeLayout && styles.nextStepMetaLevelDotsStacked,
                  ]}
                />
              ) : null}
            </View>
          </View>
        </View>
        <AppIcon
          name="chevron-right"
          size={15}
          color={accentColor}
          style={styles.nextStepChevron}
        />
      </Pressable>
    </EaseView>
  );
}

interface CategoryCardProps {
  category: Category;
  categoryName: string;
  topicProgress: Record<string, TopicProgress>;
  onTopicPress: (topic: Topic) => void;
  getTopicDisplayName: (topic: Topic) => string;
  getTopicTestId: (topic: Topic) => string;
  recommendedTopicId?: string;
  t: TranslateFn;
  usesLargeLayout: boolean;
}

function CategoryCard({
  category,
  categoryName,
  topicProgress,
  onTopicPress,
  getTopicDisplayName,
  getTopicTestId,
  recommendedTopicId,
  t,
  usesLargeLayout,
}: CategoryCardProps) {
  const { theme } = useTheme();
  const { primaryLabel, secondaryLabel, topicCountLabel } = getCategoryStatus(
    category,
    topicProgress,
    t
  );
  const visualProgressPercent = getCategoryVisualProgress(
    category,
    topicProgress
  );
  const useCompactProgressBar = category.topics.length >= 6;
  const recommendedTopic = recommendedTopicId
    ? category.topics.find((topic) => topic.id === recommendedTopicId)
    : undefined;
  const recommendedTopicPosition = recommendedTopic
    ? category.topics.findIndex((topic) => topic.id === recommendedTopic.id) + 1
    : 0;
  const visibleTopics = recommendedTopic
    ? category.topics.filter((topic) => topic.id !== recommendedTopic.id)
    : category.topics;
  const topicRows = usesLargeLayout
    ? visibleTopics.map((topic) => [topic])
    : getTopicRows(
        visibleTopics,
        getWideTileIndexes(
          visibleTopics.map((topic) => getTopicDisplayName(topic))
        )
      );

  return (
    <View
      style={[
        styles.categoryCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.cardBorder,
        },
      ]}
    >
      <View
        style={[
          styles.categoryHeader,
          usesLargeLayout && styles.categoryHeaderStacked,
        ]}
      >
        <ThemedText type="h4" style={styles.categoryName}>
          {categoryName}
        </ThemedText>
        <View
          style={[
            styles.categoryBadge,
            usesLargeLayout && styles.categoryBadgeStacked,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText
            type="caption"
            maxFontSizeMultiplier={getDenseControlTextCap()}
            style={[styles.categoryBadgeText, { color: theme.tabIconDefault }]}
          >
            {topicCountLabel}
          </ThemedText>
        </View>
      </View>

      <View style={styles.categoryProgressGroup}>
        {useCompactProgressBar ? (
          <View
            style={[
              styles.categoryProgressBar,
              {
                backgroundColor: theme.backgroundRoot,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.categoryProgressFill,
                {
                  width: `${visualProgressPercent}%`,
                  backgroundColor: theme.secondary,
                },
              ]}
            />
          </View>
        ) : (
          <View style={styles.categorySegments}>
            {category.topics.map((topic) => {
              const state = getTopicVisualState(topicProgress[topic.id]);
              const accentColor = getStateAccentColor(state, theme);

              return (
                <View
                  key={topic.id}
                  style={[
                    styles.categorySegment,
                    {
                      backgroundColor:
                        state === 'new' ? theme.backgroundRoot : accentColor,
                      borderColor:
                        state === 'new'
                          ? theme.cardBorder
                          : withOpacity(accentColor, 0.2),
                    },
                  ]}
                />
              );
            })}
          </View>
        )}
        <ThemedText
          type="small"
          style={[styles.categoryStatus, { color: theme.tabIconDefault }]}
        >
          {primaryLabel}
        </ThemedText>
        {secondaryLabel ? (
          usesLargeLayout ? (
            <ThemedText
              type="caption"
              maxFontSizeMultiplier={getDenseControlTextCap()}
              style={[styles.statusPillText, { color: theme.text }]}
            >
              {secondaryLabel}
            </ThemedText>
          ) : (
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <ThemedText
                type="caption"
                maxFontSizeMultiplier={getDenseControlTextCap()}
                style={[styles.statusPillText, { color: theme.text }]}
              >
                {secondaryLabel}
              </ThemedText>
            </View>
          )
        ) : null}
      </View>

      {recommendedTopic ? (
        <View style={styles.recommendedSection}>
          <NextStepCard
            topicName={getTopicDisplayName(recommendedTopic)}
            progress={topicProgress[recommendedTopic.id]}
            testID={getTopicTestId(recommendedTopic)}
            onPress={() => onTopicPress(recommendedTopic)}
            position={recommendedTopicPosition}
            total={category.topics.length}
            usesLargeLayout={usesLargeLayout}
          />
        </View>
      ) : null}

      {visibleTopics.length > 0 ? (
        <View style={styles.topicsGrid}>
          {topicRows.map((row) => (
            <View
              key={row.map((topic) => topic.id).join('-')}
              testID={`learn-topic-row-${row.map((topic) => topic.id).join('-')}`}
              style={styles.topicRow}
            >
              {row.map((topic) => (
                <TopicTile
                  key={topic.id}
                  topicName={getTopicDisplayName(topic)}
                  progress={topicProgress[topic.id]}
                  testID={getTopicTestId(topic)}
                  onPress={() => onTopicPress(topic)}
                  usesLargeLayout={usesLargeLayout}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function LearnScreen() {
  const { theme } = useTheme();
  const { t, language, refreshLanguage } = useTranslation();
  const { usesLargeLayout } = useAccessibilityLayout();
  const { selectedLanguage } = useProgrammingLanguage();
  const categories = selectedLanguage?.categories ?? [];
  const languageId = selectedLanguage?.id ?? 'javascript';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { topicProgress, loading, dueTopics } = useTopicProgress({
    languageId,
    categories,
    refreshLanguage,
  });
  const dueTopicNames = dueTopics.map((topic) => getTopicName(topic, language));
  const dueTopicRows = usesLargeLayout
    ? dueTopics.map((topic) => [topic])
    : getTopicRows(dueTopics, getWideTileIndexes(dueTopicNames));

  const handleTopicPress = (topic: Topic) => {
    router.push({
      pathname: '/topic/[topicId]',
      params: { topicId: topic.id },
    });
  };

  const showRecommendations = dueTopics.length === 0;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerLeft: () => <ProgrammingLanguageHeaderBadge />,
          headerRight: () => <SettingsHeaderButton iconSize={17} />,
        }}
      />
      <Stack.Screen.Title>
        {selectedLanguage
          ? getLanguageDisplayName(selectedLanguage, language)
          : t('topicsTab')}
      </Stack.Screen.Title>
      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText
          type="body"
          maxFontSizeMultiplier={1.35}
          style={[
            styles.screenSubtitle,
            usesLargeLayout && styles.screenSubtitleLarge,
            { color: theme.tabIconDefault },
          ]}
        >
          {t('learnScreenSubtitle')}
        </ThemedText>

        {dueTopics.length > 0 ? (
          <View
            style={[
              styles.dueSection,
              {
                backgroundColor: withOpacity(theme.accent, 0.06),
                borderColor: withOpacity(theme.accent, 0.16),
              },
            ]}
          >
            <View
              style={[
                styles.dueSectionHeader,
                usesLargeLayout && styles.dueSectionHeaderStacked,
              ]}
            >
              <View style={styles.dueSectionTitleRow}>
                <AppIcon name="clock" size={20} color={theme.accent} />
                <ThemedText type="h4" style={{ color: theme.accent }}>
                  {t('dueForReview')}
                </ThemedText>
              </View>
              <ThemedText
                type="caption"
                maxFontSizeMultiplier={getDenseControlTextCap()}
                style={{ color: theme.accent }}
              >
                {getTopicCountLabel(dueTopics.length, t)}
              </ThemedText>
            </View>
            <View style={styles.topicsGrid}>
              {dueTopicRows.map((row) => (
                <View
                  key={row.map((topic) => topic.id).join('-')}
                  testID={`learn-due-row-${row.map((topic) => topic.id).join('-')}`}
                  style={styles.topicRow}
                >
                  {row.map((topic) => (
                    <TopicTile
                      key={topic.id}
                      topicName={getTopicName(topic, language)}
                      progress={topicProgress[topic.id]}
                      testID={`learn-due-topic-${topic.id}`}
                      onPress={() => handleTopicPress(topic)}
                      usesLargeLayout={usesLargeLayout}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            categoryName={getCategoryName(category, language)}
            topicProgress={topicProgress}
            onTopicPress={handleTopicPress}
            getTopicDisplayName={(topic) => getTopicName(topic, language)}
            getTopicTestId={(topic) => `learn-topic-${topic.id}`}
            recommendedTopicId={
              showRecommendations
                ? getRecommendedTopicId(category, topicProgress)
                : undefined
            }
            t={t}
            usesLargeLayout={usesLargeLayout}
          />
        ))}
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
    alignSelf: 'stretch',
    marginTop: Spacing.sm,
  },
  screenSubtitleLarge: {
    marginTop: Spacing.md,
  },
  categoryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadows.card,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  categoryHeaderStacked: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  categoryName: {
    flex: 1,
  },
  categoryBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryBadgeStacked: {
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontWeight: '600',
  },
  categoryProgressGroup: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  categoryProgressBar: {
    height: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  categorySegments: {
    flexDirection: 'row',
    gap: 6,
  },
  categorySegment: {
    flex: 1,
    height: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryStatus: {
    fontWeight: '500',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusPillText: {
    fontWeight: '600',
  },
  recommendedSection: {
    marginBottom: Spacing.md,
  },
  nextStepCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  nextStepBody: {
    flex: 1,
  },
  nextStepEyebrow: {
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  nextStepTitle: {
    marginBottom: Spacing.xs,
  },
  nextStepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  nextStepMetaStacked: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    width: '100%',
  },
  nextStepMetaDot: {
    width: 4,
    height: 4,
    borderRadius: BorderRadius.full,
  },
  nextStepMetaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  nextStepMetaStatusStacked: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: Spacing.xs,
    width: '100%',
  },
  nextStepMetaStatusLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    minWidth: 0,
  },
  nextStepMetaStatusLineStacked: {
    width: '100%',
  },
  nextStepMetaIcon: {
    marginRight: Spacing.xs,
  },
  nextStepMetaText: {
    fontWeight: '600',
  },
  nextStepMetaLevelDots: {
    marginLeft: Spacing.xs,
  },
  nextStepMetaLevelDotsStacked: {
    marginLeft: 12 + Spacing.xs,
  },
  nextStepChevron: {
    opacity: 0.66,
    marginLeft: 2,
    alignSelf: 'center',
  },
  topicsGrid: {
    gap: Spacing.xs + 2,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.xs + 2,
  },
  topicTileWrapper: {
    flex: 1,
    minWidth: 0,
  },
  topicTile: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    gap: Spacing.xs,
    ...Shadows.card,
  },
  topicTileTitle: {
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 0,
  },
  topicMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  topicMetaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  topicMetaIcon: {
    marginRight: Spacing.xs,
  },
  topicMetaText: {
    fontWeight: '600',
  },
  topicMetaLevelDots: {
    marginLeft: Spacing.xs,
  },
  statusMetaTextTight: {
    flexShrink: 1,
    minWidth: 0,
  },
  dueSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  dueSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  dueSectionHeaderStacked: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  dueSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
