import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  LearnNextStepCard,
  LearnTopicTile,
  getStateAccentColor,
  getTopicVisualState,
} from '@/components/learn/LearnTopicCards';
import { ThemedText } from '@/components/ThemedText';
import { BorderRadius, Shadows, Spacing, withOpacity } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { getDenseControlTextCap } from '@/lib/accessibility';
import { buildLearnTopicRows } from '@/lib/learn-topic-layout';
import { type TopicProgress, isTopicDue } from '@/lib/storage';
import { hasStartedTopic, isTopicMastered } from '@/lib/topic-recommendations';
import {
  type Category,
  type Topic,
  getCategoryName,
  getTopicName,
} from '@/lib/topics';

type TranslateFn = ReturnType<typeof useTranslation>['t'];

function getTopicCountLabel(topicCount: number, t: TranslateFn) {
  return `${topicCount} ${topicCount === 1 ? t('topic') : t('topics')}`;
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
  const startedTopics = category.topics.filter((topic) =>
    hasStartedTopic(topicProgress[topic.id])
  );
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

interface LearnCategoryCardProps {
  category: Category;
  topicProgress: Record<string, TopicProgress>;
  onTopicPress: (topic: Topic) => void;
  recommendedTopicId?: string;
  usesLargeLayout: boolean;
}

export function LearnCategoryCard({
  category,
  topicProgress,
  onTopicPress,
  recommendedTopicId,
  usesLargeLayout,
}: LearnCategoryCardProps) {
  const { theme } = useTheme();
  const { t, language } = useTranslation();
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
  const topicRows = buildLearnTopicRows(
    visibleTopics,
    (topic) => getTopicName(topic, language),
    usesLargeLayout
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
        <ThemedText
          type="h4"
          style={[
            styles.categoryName,
            usesLargeLayout && styles.categoryNameStacked,
          ]}
        >
          {getCategoryName(category, language)}
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
          <LearnNextStepCard
            topicName={getTopicName(recommendedTopic, language)}
            progress={topicProgress[recommendedTopic.id]}
            testID={`learn-topic-${recommendedTopic.id}`}
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
                <LearnTopicTile
                  key={topic.id}
                  topicName={getTopicName(topic, language)}
                  progress={topicProgress[topic.id]}
                  testID={`learn-topic-${topic.id}`}
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

const styles = StyleSheet.create({
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
    minWidth: 0,
  },
  categoryNameStacked: {
    alignSelf: 'stretch',
    flex: 0,
    width: '100%',
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
  topicsGrid: {
    gap: Spacing.xs + 2,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.xs + 2,
  },
});
