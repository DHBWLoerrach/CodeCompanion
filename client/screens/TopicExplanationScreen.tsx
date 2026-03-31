import React from 'react';
import { ScrollView, StyleSheet, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  EnrichedMarkdownText,
  type MarkdownStyle,
} from 'react-native-enriched-markdown';
import { getTopicExplanation } from '@shared/explanations';
import {
  DEFAULT_PROGRAMMING_LANGUAGE_ID,
  SUPPORTED_PROGRAMMING_LANGUAGE_IDS,
  type ProgrammingLanguageId,
} from '@shared/programming-language';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { StatusBadge } from '@/components/StatusBadge';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useCloseHandler } from '@/hooks/useCloseHandler';
import {
  BorderRadius,
  Fonts,
  Spacing,
  Typography,
  withOpacity,
} from '@/constants/theme';
import { getParam, getParamWithDefault } from '@/lib/router-utils';
import {
  getCategoryName,
  getCategoriesByLanguage,
  getTopicById,
  getTopicDescription,
  getTopicName,
} from '@/lib/topics';

function resolveProgrammingLanguage(value: string): ProgrammingLanguageId {
  if (
    SUPPORTED_PROGRAMMING_LANGUAGE_IDS.includes(value as ProgrammingLanguageId)
  ) {
    return value as ProgrammingLanguageId;
  }

  return DEFAULT_PROGRAMMING_LANGUAGE_ID;
}

function getMarkdownStyle(
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean
): MarkdownStyle {
  return {
    paragraph: {
      color: theme.text,
      fontSize: Typography.body.fontSize,
      lineHeight: 24,
      marginBottom: Spacing.sm,
    },
    h1: {
      color: theme.text,
      fontSize: 24,
      fontWeight: '700',
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    h2: {
      color: theme.text,
      fontSize: 20,
      fontWeight: '700',
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    h3: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '600',
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
    },
    list: {
      color: theme.text,
      fontSize: Typography.body.fontSize,
      lineHeight: 24,
      gapWidth: Spacing.sm,
      marginLeft: Spacing.sm,
      markerColor: theme.secondary,
      markerFontWeight: '600',
    },
    link: {
      color: theme.link,
      underline: true,
    },
    code: {
      backgroundColor: isDark
        ? withOpacity(theme.secondary, 0.12)
        : theme.codeBackground,
      borderColor: isDark
        ? withOpacity(theme.secondary, 0.2)
        : theme.cardBorder,
      color: theme.secondary,
      fontFamily: Fonts.mono,
      fontSize: Typography.code.fontSize,
    },
    codeBlock: {
      backgroundColor: theme.codeBackground,
      borderColor: theme.cardBorder,
      borderRadius: BorderRadius.md,
      borderWidth: StyleSheet.hairlineWidth,
      color: theme.text,
      fontFamily: Fonts.mono,
      fontSize: Typography.code.fontSize,
      lineHeight: 20,
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
      padding: Spacing.md,
    },
  };
}

export default function TopicExplanationScreen() {
  const { theme, isDark } = useTheme();
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { topicId, programmingLanguage } = useLocalSearchParams<{
    topicId?: string;
    programmingLanguage?: string;
  }>();
  const resolvedTopicId = getParam(topicId);
  const resolvedProgrammingLanguage = resolveProgrammingLanguage(
    getParamWithDefault(programmingLanguage, DEFAULT_PROGRAMMING_LANGUAGE_ID)
  );
  const topic = resolvedTopicId
    ? getTopicById(
        resolvedTopicId,
        getCategoriesByLanguage(resolvedProgrammingLanguage)
      )
    : undefined;
  const staticExplanation = resolvedTopicId
    ? getTopicExplanation(
        resolvedProgrammingLanguage,
        resolvedTopicId,
        language
      )
    : undefined;
  const handleClose = useCloseHandler();
  const markdownStyle = getMarkdownStyle(theme, isDark);
  const title = topic ? getTopicName(topic, language) : t('topicExplanation');
  const topicDescription = topic
    ? getTopicDescription(topic, language)
    : undefined;
  const currentCategory = topic
    ? getCategoriesByLanguage(resolvedProgrammingLanguage).find(
        (category) => category.id === topic.category
      )
    : undefined;
  const errorMessage = !resolvedTopicId
    ? t('topicNotFound')
    : t('explanationUnavailable');

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerLeft: router.canGoBack()
            ? undefined
            : () => <HeaderIconButton icon="x" onPress={handleClose} />,
        }}
      />
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.xl, flexGrow: 1 },
          ]}
          showsVerticalScrollIndicator
        >
          {topic ? (
            <SurfaceCard
              style={styles.heroCard}
              borderColor={theme.cardBorderSubtle}
              topAccentColor={theme.secondary}
            >
              <StatusBadge
                color={theme.secondary}
                icon="book-open"
                label={t('topicExplanation')}
              />
              <ThemedText type="h3">{getTopicName(topic, language)}</ThemedText>
              {currentCategory ? (
                <ThemedText
                  type="small"
                  style={{ color: theme.tabIconDefault, fontWeight: '600' }}
                >
                  {getCategoryName(currentCategory, language)}
                </ThemedText>
              ) : null}
              {topicDescription ? (
                <ThemedText type="body" style={{ color: theme.tabIconDefault }}>
                  {topicDescription}
                </ThemedText>
              ) : null}
            </SurfaceCard>
          ) : null}

          {staticExplanation ? (
            <SurfaceCard style={styles.markdownCard}>
              <EnrichedMarkdownText
                markdown={staticExplanation}
                markdownStyle={markdownStyle}
                onLinkPress={({ url }) => {
                  void Linking.openURL(url);
                }}
              />
            </SurfaceCard>
          ) : (
            <SurfaceCard style={styles.errorState}>
              <ThemedText type="body" selectable style={{ color: theme.error }}>
                {errorMessage}
              </ThemedText>
            </SurfaceCard>
          )}
        </ScrollView>
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
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  heroCard: {
    gap: Spacing.sm,
  },
  markdownCard: {
    paddingTop: Spacing.md,
  },
  errorState: {
    gap: Spacing.lg,
  },
});
