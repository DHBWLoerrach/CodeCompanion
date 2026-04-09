import React, { useEffect, useEffectEvent, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EaseView } from 'react-native-ease';

import { PrimaryButton, SecondaryButton } from '@/components/ActionButton';
import { BottomActionBar } from '@/components/BottomActionBar';
import { StatusBadge } from '@/components/StatusBadge';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  BorderRadius,
  Spacing,
  getBottomActionBarScrollPadding,
  withOpacity,
} from '@/constants/theme';
import { useProgrammingLanguage } from '@/contexts/ProgrammingLanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getLanguageFlowOrigin,
  getLanguageOverviewMode,
} from '@/lib/language-flow';
import { getLanguageById, getLanguageDisplayName } from '@/lib/languages';
import { getParam } from '@/lib/router-utils';
import { getLanguageOverviewById } from '@shared/language-overview';

type SectionProps = {
  color: string;
  delay: number;
  items: string[];
  title: string;
};

function OverviewSection({ color, delay, items, title }: SectionProps) {
  const { theme } = useTheme();

  return (
    <EaseView
      initialAnimate={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: 320,
        easing: [0.455, 0.03, 0.515, 0.955],
        delay,
      }}
    >
      <SurfaceCard style={styles.sectionCard} topAccentColor={color}>
        <ThemedText type="h4">{title}</ThemedText>
        <View style={styles.sectionList}>
          {items.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View
                style={[
                  styles.bulletDot,
                  { backgroundColor: withOpacity(color, 0.9) },
                ]}
              />
              <ThemedText
                type="body"
                style={[styles.bulletText, { color: theme.tabIconDefault }]}
              >
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
      </SurfaceCard>
    </EaseView>
  );
}

export default function LanguageOverviewScreen() {
  const { theme } = useTheme();
  const { t, language } = useTranslation();
  const { selectedLanguageId, setSelectedLanguage } = useProgrammingLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    languageId: languageIdParam,
    mode: modeParam,
    origin: originParam,
  } = useLocalSearchParams<{
    languageId?: string;
    mode?: string;
    origin?: string;
  }>();

  const origin = getLanguageFlowOrigin(originParam);
  const mode = getLanguageOverviewMode(modeParam);
  const isViewMode = mode === 'view';
  const languageId = getParam(languageIdParam);
  const programmingLanguage = getLanguageById(languageId);
  const overview = getLanguageOverviewById(languageId);
  const redirectInvalidRoute = useEffectEvent(() => {
    if (isViewMode && origin === 'settings') {
      router.dismissTo('/settings');
      return;
    }

    if (origin === 'settings') {
      router.replace({
        pathname: '/language-select',
        params: { origin },
      });
      return;
    }

    router.replace('/language-select');
  });

  useEffect(() => {
    if (programmingLanguage && overview) {
      return;
    }

    redirectInvalidRoute();
  }, [overview, programmingLanguage, redirectInvalidRoute]);

  const languageName = programmingLanguage
    ? getLanguageDisplayName(programmingLanguage, language)
    : '';
  const topicCount = programmingLanguage
    ? programmingLanguage.categories.reduce(
        (sum, category) => sum + category.topics.length,
        0
      )
    : 0;
  const categoryCount = programmingLanguage?.categories.length ?? 0;
  const localizedOverview = useMemo(() => {
    if (!overview) {
      return null;
    }

    return {
      summary: overview.summary[language],
      keyFacts: overview.keyFacts.map((item) => item[language]),
      useCases: overview.useCases.map((item) => item[language]),
      contentNotes: overview.contentNotes.map((item) => item[language]),
    };
  }, [language, overview]);

  const handleChooseAnotherLanguage = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (origin === 'settings') {
      router.replace({
        pathname: '/language-select',
        params: { origin },
      });
      return;
    }

    router.replace('/language-select');
  };

  const handleCloseOverview = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (origin === 'settings') {
      router.dismissTo('/settings');
      return;
    }

    router.replace('/learn');
  };

  const handleConfirmLanguage = async () => {
    if (!programmingLanguage) {
      return;
    }

    if (selectedLanguageId !== programmingLanguage.id) {
      await setSelectedLanguage(programmingLanguage.id);
    }

    if (origin === 'settings') {
      router.dismissTo('/settings');
      return;
    }

    router.replace('/learn');
  };

  if (!programmingLanguage || !localizedOverview) {
    return null;
  }

  const confirmLabel = (
    origin === 'settings' ? t('switchToLanguage') : t('startWithLanguage')
  ).replace('{name}', languageName);
  const actionButtonCount = isViewMode ? 1 : 2;

  return (
    <>
      <Stack.Screen options={{ title: languageName }} />
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Spacing.xl,
              paddingBottom: getBottomActionBarScrollPadding({
                buttonCount: actionButtonCount,
                safeAreaBottom: insets.bottom,
              }),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <EaseView
            initialAnimate={{ opacity: 0, translateY: 18 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'timing',
              duration: 360,
              easing: [0.455, 0.03, 0.515, 0.955],
            }}
          >
            <SurfaceCard
              style={styles.heroCard}
              testID="language-overview-hero"
              topAccentColor={programmingLanguage.color}
            >
              <View style={styles.heroTopRow}>
                <StatusBadge
                  color={programmingLanguage.color}
                  icon="compass"
                  label={t('selectedFocusLabel')}
                />
                <View
                  accessibilityElementsHidden
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  style={[
                    styles.heroShortNameChip,
                    {
                      backgroundColor: withOpacity(
                        programmingLanguage.color,
                        0.18
                      ),
                      borderColor: withOpacity(programmingLanguage.color, 0.26),
                    },
                  ]}
                >
                  <ThemedText
                    type="label"
                    lightColor="#000000"
                    darkColor="#000000"
                    style={styles.heroShortNameText}
                  >
                    {programmingLanguage.shortName}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.heroBody}>
                <View
                  accessibilityElementsHidden
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  style={[
                    styles.heroLanguageBadge,
                    { backgroundColor: programmingLanguage.color },
                  ]}
                >
                  <ThemedText
                    type="h2"
                    lightColor="#000000"
                    darkColor="#000000"
                    style={styles.heroLanguageBadgeText}
                  >
                    {programmingLanguage.shortName}
                  </ThemedText>
                </View>

                <View style={styles.heroTextColumn}>
                  <ThemedText type="h2" style={styles.heroTitle}>
                    {languageName}
                  </ThemedText>
                  <ThemedText
                    testID="language-overview-summary"
                    type="body"
                    style={[
                      styles.heroSummary,
                      { color: theme.tabIconDefault },
                    ]}
                  >
                    {localizedOverview.summary}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.metaGrid}>
                <View
                  style={[
                    styles.metaCard,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText
                    testID="language-overview-categories-value"
                    type="h3"
                    style={[styles.metaValue, { color: theme.secondary }]}
                  >
                    {categoryCount}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={[styles.metaLabel, { color: theme.tabIconDefault }]}
                  >
                    {t('categoriesLabel')}
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.metaCard,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText
                    testID="language-overview-topics-value"
                    type="h3"
                    style={[styles.metaValue, { color: theme.accent }]}
                  >
                    {topicCount}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={[styles.metaLabel, { color: theme.tabIconDefault }]}
                  >
                    {t('topicsLabel')}
                  </ThemedText>
                </View>
              </View>
            </SurfaceCard>
          </EaseView>

          <OverviewSection
            color={programmingLanguage.color}
            delay={90}
            items={localizedOverview.keyFacts}
            title={t('keyFactsHeading')}
          />

          <OverviewSection
            color={programmingLanguage.color}
            delay={150}
            items={localizedOverview.useCases}
            title={t('useCasesHeading')}
          />

          <OverviewSection
            color={programmingLanguage.color}
            delay={210}
            items={localizedOverview.contentNotes}
            title={t('contentNotesHeading')}
          />
        </ScrollView>

        <BottomActionBar>
          {isViewMode ? (
            <PrimaryButton
              testID="language-overview-close-button"
              color={theme.secondary}
              icon="x"
              label={t('close')}
              onPress={handleCloseOverview}
            />
          ) : (
            <>
              <PrimaryButton
                testID="language-overview-confirm-button"
                color={theme.secondary}
                icon="chevron-right"
                label={confirmLabel}
                onPress={handleConfirmLanguage}
              />
              <SecondaryButton
                testID="language-overview-choose-another-button"
                color={theme.secondary}
                label={t('chooseAnotherLanguage')}
                onPress={handleChooseAnotherLanguage}
              />
            </>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  heroCard: {
    gap: Spacing.lg,
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  heroShortNameChip: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minWidth: 56,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  heroShortNameText: {
    fontWeight: '700',
  },
  heroBody: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.md,
  },
  heroLanguageBadge: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: BorderRadius.xl,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  heroLanguageBadgeText: {
    fontWeight: '800',
  },
  heroTextColumn: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 31,
  },
  heroSummary: {
    lineHeight: 22,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metaCard: {
    borderRadius: BorderRadius.md,
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  metaValue: {
    fontWeight: '700',
    lineHeight: 24,
  },
  metaLabel: {
    lineHeight: 16,
  },
  sectionCard: {
    gap: Spacing.md,
  },
  sectionList: {
    gap: Spacing.md,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bulletDot: {
    borderRadius: BorderRadius.full,
    height: 8,
    marginTop: 8,
    width: 8,
  },
  bulletText: {
    flex: 1,
    lineHeight: 22,
  },
});
