import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/AppIcon';
import { LearnTopicTile } from '@/components/learn/LearnTopicCards';
import { ThemedText } from '@/components/ThemedText';
import { BorderRadius, Spacing, withOpacity } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { getDenseControlTextCap } from '@/lib/accessibility';
import { buildLearnTopicRows } from '@/lib/learn-topic-layout';
import { type TopicProgress } from '@/lib/storage';
import { type Topic, getTopicName } from '@/lib/topics';

interface LearnDueTopicsSectionProps {
  topics: Topic[];
  topicProgress: Record<string, TopicProgress>;
  onTopicPress: (topic: Topic) => void;
  usesLargeLayout: boolean;
}

export function LearnDueTopicsSection({
  topics,
  topicProgress,
  onTopicPress,
  usesLargeLayout,
}: LearnDueTopicsSectionProps) {
  const { theme } = useTheme();
  const { t, language } = useTranslation();
  const topicRows = buildLearnTopicRows(
    topics,
    (topic) => getTopicName(topic, language),
    usesLargeLayout
  );
  const topicCountLabel = `${topics.length} ${
    topics.length === 1 ? t('topic') : t('topics')
  }`;

  return (
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
          {topicCountLabel}
        </ThemedText>
      </View>
      <View style={styles.topicsGrid}>
        {topicRows.map((row) => (
          <View
            key={row.map((topic) => topic.id).join('-')}
            testID={`learn-due-row-${row.map((topic) => topic.id).join('-')}`}
            style={styles.topicRow}
          >
            {row.map((topic) => (
              <LearnTopicTile
                key={topic.id}
                topicName={getTopicName(topic, language)}
                progress={topicProgress[topic.id]}
                testID={`learn-due-topic-${topic.id}`}
                onPress={() => onTopicPress(topic)}
                usesLargeLayout={usesLargeLayout}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  topicsGrid: {
    gap: Spacing.xs + 2,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.xs + 2,
  },
});
