import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { EaseView } from 'react-native-ease';
import * as Haptics from 'expo-haptics';

import { AppIcon } from '@/components/AppIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { ThemedText } from '@/components/ThemedText';
import { useProgrammingLanguage } from '@/contexts/ProgrammingLanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getLanguageFlowOrigin,
  getLanguageFlowReturnTarget,
} from '@/lib/language-flow';
import {
  LANGUAGES,
  getLanguageDisplayName,
  type ProgrammingLanguage,
} from '@/lib/languages';
import { Spacing, BorderRadius, Shadows, withOpacity } from '@/constants/theme';

interface LanguageCardProps {
  disabled?: boolean;
  language: ProgrammingLanguage;
  languageName: string;
  index: number;
  onPress: () => void;
  statusLabel?: string;
  topicCount: number;
  topicLabel: string;
}

function LanguageCard({
  disabled = false,
  language,
  languageName,
  index,
  onPress,
  statusLabel,
  topicCount,
  topicLabel,
}: LanguageCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { animate, transition, handlePressIn, handlePressOut } =
    usePressAnimation(0.985);
  const chevronTint = useMemo(
    () => withOpacity(theme.primary, 0.1),
    [theme.primary]
  );
  const pressedOverlay = useMemo(
    () => withOpacity(theme.primary, 0.03),
    [theme.primary]
  );
  const pressedBorderColor = useMemo(
    () => withOpacity(theme.primary, 0.2),
    [theme.primary]
  );
  const accessibilityHint = disabled
    ? t('currentFocusDisabledHint').replace('{name}', languageName)
    : t('openFocusOverviewHint').replace('{name}', languageName);

  return (
    <EaseView
      initialAnimate={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: 300,
        easing: [0.455, 0.03, 0.515, 0.955],
        delay: index * 80,
      }}
    >
      <EaseView animate={animate} transition={transition}>
        <Pressable
          testID={`language-select-option-${language.id}`}
          disabled={disabled}
          onPress={disabled ? undefined : onPress}
          onPressIn={disabled ? undefined : handlePressIn}
          onPressOut={disabled ? undefined : handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={languageName}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.lg,
            padding: Spacing.lg,
            opacity: disabled ? 0.7 : 1,
            backgroundColor: disabled
              ? theme.backgroundSecondary
              : pressed
                ? pressedOverlay
                : theme.backgroundDefault,
            borderRadius: BorderRadius.lg,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: disabled
              ? theme.separator
              : pressed
                ? pressedBorderColor
                : theme.cardBorder,
            ...Shadows.card,
          })}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: BorderRadius.md,
              borderCurve: 'continuous',
              backgroundColor: language.color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemedText
              type="h3"
              lightColor="#000000"
              darkColor="#000000"
              style={{ fontWeight: '800' }}
            >
              {language.shortName}
            </ThemedText>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText type="h4">{languageName}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.tabIconDefault }}>
              {topicCount} {topicLabel}
            </ThemedText>
          </View>
          {disabled && statusLabel ? (
            <StatusBadge
              color={theme.secondary}
              label={statusLabel}
              size="compact"
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: BorderRadius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: chevronTint,
              }}
            >
              <AppIcon
                name="chevron-right"
                size={18}
                color={theme.primary}
                weight="semibold"
              />
            </View>
          )}
        </Pressable>
      </EaseView>
    </EaseView>
  );
}

export default function LanguageSelectScreen() {
  const { theme } = useTheme();
  const { t, language: appLanguage } = useTranslation();
  const { selectedLanguageId } = useProgrammingLanguage();
  const router = useRouter();
  const { origin: originParam, returnTo: returnToParam } =
    useLocalSearchParams<{ origin?: string; returnTo?: string }>();
  const origin = getLanguageFlowOrigin(originParam);
  const returnTo = getLanguageFlowReturnTarget(returnToParam);
  const canNavigateBack = origin !== undefined;

  const handleSelectLanguage = async (language: ProgrammingLanguage) => {
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    router.push({
      pathname: './language-overview',
      params: {
        languageId: language.id,
        ...(origin ? { origin } : {}),
        ...(returnTo ? { returnTo } : {}),
      },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          gestureEnabled: canNavigateBack,
          headerBackVisible: canNavigateBack,
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <Stack.Screen.Title>{t('selectTechnology')}</Stack.Screen.Title>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
        contentContainerStyle={{
          padding: Spacing.lg,
          gap: Spacing.md,
        }}
      >
        <ThemedText
          type="body"
          style={{
            color: theme.tabIconDefault,
            marginBottom: Spacing.sm,
          }}
        >
          {t('chooseTechnology')}
        </ThemedText>
        {LANGUAGES.map((programmingLanguage, index) => {
          const topicCount = programmingLanguage.categories.reduce(
            (sum, cat) => sum + cat.topics.length,
            0
          );
          const isCurrentLanguage =
            selectedLanguageId === programmingLanguage.id;
          return (
            <LanguageCard
              key={programmingLanguage.id}
              disabled={isCurrentLanguage}
              language={programmingLanguage}
              languageName={getLanguageDisplayName(
                programmingLanguage,
                appLanguage
              )}
              index={index}
              statusLabel={
                isCurrentLanguage ? t('currentFocusLabel') : undefined
              }
              topicCount={topicCount}
              topicLabel={topicCount === 1 ? t('topic') : t('topics')}
              onPress={() => handleSelectLanguage(programmingLanguage)}
            />
          );
        })}
      </ScrollView>
    </>
  );
}
