import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { EaseView } from 'react-native-ease';

import { AppIcon } from '@/components/AppIcon';
import { SkillLevelDots } from '@/components/SkillLevelDots';
import { ThemedText } from '@/components/ThemedText';
import { BorderRadius, Shadows, Spacing, withOpacity } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { getDenseControlTextCap } from '@/lib/accessibility';
import { type TopicProgress, isTopicDue } from '@/lib/storage';
import { hasStartedTopic, isTopicMastered } from '@/lib/topic-recommendations';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { useTranslation } from '@/hooks/useTranslation';

type TranslateFn = ReturnType<typeof useTranslation>['t'];
export type TopicVisualState = 'new' | 'started' | 'due' | 'mastered';

function capitalizeLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getTopicVisualState(
  progress: TopicProgress | undefined
): TopicVisualState {
  const hasStarted = hasStartedTopic(progress);

  if (isTopicMastered(progress)) {
    return 'mastered';
  }

  if (hasStarted && isTopicDue(progress)) {
    return 'due';
  }

  return hasStarted ? 'started' : 'new';
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

export function getStateAccentColor(
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

interface TopicTileProps {
  progress?: TopicProgress;
  onPress: () => void;
  topicName: string;
  testID?: string;
  usesLargeLayout?: boolean;
}

export function LearnTopicTile({
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

export function LearnNextStepCard({
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
              testID="next-step-meta-status"
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

const styles = StyleSheet.create({
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
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    flexShrink: 1,
    minWidth: 0,
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
    marginLeft: 0,
  },
  nextStepChevron: {
    opacity: 0.66,
    marginLeft: 2,
    alignSelf: 'center',
  },
});
