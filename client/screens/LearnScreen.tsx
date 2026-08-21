import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LearnCategoryCard } from '@/components/learn/LearnCategoryCard';
import { LearnDueTopicsSection } from '@/components/learn/LearnDueTopicsSection';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing } from '@/constants/theme';
import { useProgrammingLanguage } from '@/contexts/ProgrammingLanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAccessibilityLayout } from '@/hooks/useAccessibilityLayout';
import { useTopicProgress } from '@/hooks/useTopicProgress';
import { useTranslation } from '@/hooks/useTranslation';
import { getProgrammingLanguageHeaderOptions } from '@/lib/getProgrammingLanguageHeaderOptions';
import { getRecommendedTopicId } from '@/lib/topic-recommendations';
import { type Topic } from '@/lib/topics';

export default function LearnScreen() {
  const { theme } = useTheme();
  const { t, refreshLanguage } = useTranslation();
  const { usesLargeLayout } = useAccessibilityLayout();
  const headerOptions = getProgrammingLanguageHeaderOptions('/learn');
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
      <Stack.Screen options={headerOptions} />
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
          <LearnDueTopicsSection
            topics={dueTopics}
            topicProgress={topicProgress}
            onTopicPress={handleTopicPress}
            usesLargeLayout={usesLargeLayout}
          />
        ) : null}

        {categories.map((category) => (
          <LearnCategoryCard
            key={category.id}
            category={category}
            topicProgress={topicProgress}
            onTopicPress={handleTopicPress}
            recommendedTopicId={
              showRecommendations
                ? getRecommendedTopicId(category, topicProgress)
                : undefined
            }
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
});
