import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { EaseView } from 'react-native-ease';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AppIcon } from '@/components/AppIcon';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StatusBadge } from '@/components/StatusBadge';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTheme } from '@/contexts/ThemeContext';
import { useAccessibilityLayout } from '@/hooks/useAccessibilityLayout';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { useTranslation } from '@/hooks/useTranslation';
import { getProgrammingLanguageHeaderOptions } from '@/lib/getProgrammingLanguageHeaderOptions';
import {
  Spacing,
  BorderRadius,
  AvatarColors,
  AVATARS,
  withOpacity,
} from '@/constants/theme';
import {
  storage,
  type UserProfile,
  type ProgressData,
  type StreakData,
} from '@/lib/storage';
import { useProgrammingLanguage } from '@/contexts/ProgrammingLanguageContext';

const TWO_COLUMN_PROGRESS_CARD_WIDTH = '47.5%';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  usesLargeLayout?: boolean;
}

function StatCard({
  title,
  value,
  icon,
  color,
  usesLargeLayout = false,
}: StatCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.statCardWrapper,
        usesLargeLayout && styles.statCardWrapperFullWidth,
      ]}
    >
      <SurfaceCard style={styles.statCard} borderColor={theme.cardBorderSubtle}>
        <View
          style={[
            styles.statIconContainer,
            { backgroundColor: withOpacity(color, 0.14) },
          ]}
        >
          <AppIcon name={icon} size={20} color={color} />
        </View>
        <ThemedText type="h3" style={styles.statValue}>
          {value}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.tabIconDefault }}>
          {title}
        </ThemedText>
      </SurfaceCard>
    </View>
  );
}

interface DayIndicatorProps {
  practiced: boolean;
  isToday: boolean;
}

function DayIndicator({ practiced, isToday }: DayIndicatorProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.dayIndicator,
        {
          backgroundColor: practiced ? theme.success : theme.cardBorder,
          borderWidth: isToday ? 2 : 0,
          borderColor: theme.secondary,
        },
      ]}
    />
  );
}

interface AchievementBadgeProps {
  name: string;
  icon: string;
  unlocked: boolean;
}

function AchievementBadge({ name, icon, unlocked }: AchievementBadgeProps) {
  const { theme } = useTheme();

  return (
    <SurfaceCard
      style={styles.achievementCard}
      backgroundColor={
        unlocked ? theme.backgroundDefault : theme.backgroundSecondary
      }
      borderColor={theme.cardBorderSubtle}
    >
      <View
        style={[
          styles.achievementBadge,
          {
            backgroundColor: unlocked
              ? withOpacity(theme.accent, 0.18)
              : theme.cardBorder,
            opacity: unlocked ? 1 : 0.72,
          },
        ]}
      >
        {unlocked ? (
          <AppIcon name={icon} size={24} color={theme.accent} />
        ) : (
          <AppIcon name="lock" size={20} color={theme.tabIconDefault} />
        )}
      </View>
      <ThemedText
        type="small"
        style={[
          styles.achievementName,
          { color: unlocked ? theme.text : theme.tabIconDefault },
        ]}
        numberOfLines={2}
      >
        {name}
      </ThemedText>
    </SurfaceCard>
  );
}

export default function ProgressScreen() {
  const { theme } = useTheme();
  const { t, refreshLanguage } = useTranslation();
  const { usesLargeLayout } = useAccessibilityLayout();
  const headerOptions = getProgrammingLanguageHeaderOptions('/progress');
  const { selectedLanguage } = useProgrammingLanguage();
  const languageId = selectedLanguage?.id ?? 'javascript';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const { animate, transition, handlePressIn, handlePressOut } =
    usePressAnimation(0.98);

  const ACHIEVEMENTS = [
    {
      id: 'first-quiz',
      nameKey: 'firstQuiz' as const,
      icon: 'star',
      threshold: 1,
    },
    {
      id: 'streak-7',
      nameKey: 'streak7Days' as const,
      icon: 'zap',
      threshold: 7,
    },
    {
      id: 'streak-30',
      nameKey: 'streak30Days' as const,
      icon: 'award',
      threshold: 30,
    },
    {
      id: 'questions-100',
      nameKey: 'questions100' as const,
      icon: 'check-circle',
      threshold: 100,
    },
    {
      id: 'novice',
      nameKey: 'novice' as const,
      icon: 'book',
      threshold: 50,
    },
    {
      id: 'expert',
      nameKey: 'expert' as const,
      icon: 'award',
      threshold: 200,
    },
  ];

  const loadData = useCallback(async () => {
    try {
      const [profileData, progressData, streakData] = await Promise.all([
        storage.getProfile(),
        storage.getProgress(),
        storage.getStreak(),
      ]);
      setProfile(profileData);
      setProgress(progressData);
      setStreak(streakData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      refreshLanguage();
    }, [loadData, refreshLanguage])
  );

  const getTopicsMastered = () => {
    if (!progress) return 0;
    const langProgress = storage.getTopicProgressForLanguage(
      progress.topicProgress,
      languageId
    );
    return Object.values(langProgress).filter((t) => t.skillLevel === 5).length;
  };

  const getUnlockedAchievements = () => {
    if (!progress || !streak) return [];
    const unlocked: string[] = [];

    if (progress.totalQuestions >= 1) unlocked.push('first-quiz');
    if (streak.currentStreak >= 7) unlocked.push('streak-7');
    if (streak.currentStreak >= 30) unlocked.push('streak-30');
    if (progress.totalQuestions >= 100) unlocked.push('questions-100');
    if (progress.correctAnswers >= 50) unlocked.push('novice');
    if (progress.correctAnswers >= 200) unlocked.push('expert');

    return unlocked;
  };

  if (loading || !profile || !progress || !streak) {
    return <LoadingScreen />;
  }

  const unlockedAchievements = getUnlockedAchievements();
  const today = new Date().getDay();
  const dayLabels = [
    t('sunday'),
    t('monday'),
    t('tuesday'),
    t('wednesday'),
    t('thursday'),
    t('friday'),
    t('saturday'),
  ];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={headerOptions} />
      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Spacing['4xl'] + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SurfaceCard
          style={styles.profileCard}
          borderColor={theme.cardBorderSubtle}
          topAccentColor={AvatarColors[profile.avatarIndex]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: AvatarColors[profile.avatarIndex] },
            ]}
          >
            <AppIcon
              name={AVATARS[profile.avatarIndex] as any}
              size={36}
              color={theme.onColor}
            />
          </View>
          <ThemedText type="h4">
            {profile.displayName || t('student')}
          </ThemedText>
          <EaseView animate={animate} transition={transition}>
            <Pressable
              onPress={() => router.push('/settings')}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <ThemedText type="link">{t('editProfile')}</ThemedText>
            </Pressable>
          </EaseView>
        </SurfaceCard>

        <SurfaceCard
          style={styles.streakCard}
          borderColor={theme.cardBorderSubtle}
          topAccentColor={theme.accent}
        >
          <View style={styles.streakHeader}>
            <View style={styles.streakInfo}>
              <ThemedText
                type="h1"
                style={[styles.metricValue, { color: theme.accent }]}
              >
                {streak.currentStreak}
              </ThemedText>
              <ThemedText type="body">{t('dayStreak')}</ThemedText>
            </View>
            <AppIcon name="zap" size={40} color={theme.accent} />
          </View>

          <View style={styles.weekRow}>
            {dayLabels.map((label, index) => (
              <View key={index} style={styles.dayColumn}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.tabIconDefault }}
                >
                  {label}
                </ThemedText>
                <DayIndicator
                  practiced={streak.weekHistory[index]}
                  isToday={index === today}
                />
              </View>
            ))}
          </View>
        </SurfaceCard>

        <View style={styles.statsGrid}>
          <StatCard
            title={t('totalQuestions')}
            value={progress.totalQuestions}
            icon="help-circle"
            color={theme.secondary}
            usesLargeLayout={usesLargeLayout}
          />
          <StatCard
            title={t('topicsMastered')}
            value={getTopicsMastered()}
            icon="check-square"
            color={theme.success}
            usesLargeLayout={usesLargeLayout}
          />
          <StatCard
            title={t('currentStreak')}
            value={streak.currentStreak}
            icon="zap"
            color={theme.accent}
            usesLargeLayout={usesLargeLayout}
          />
          <StatCard
            title={t('bestStreak')}
            value={streak.bestStreak}
            icon="award"
            color={theme.primary}
            usesLargeLayout={usesLargeLayout}
          />
        </View>

        <View style={styles.achievementsSection}>
          <View
            style={[
              styles.achievementsHeader,
              usesLargeLayout && styles.achievementsHeaderStacked,
            ]}
          >
            <ThemedText type="h4" style={styles.sectionTitle}>
              {t('achievements')}
            </ThemedText>
            <StatusBadge
              color={theme.accent}
              icon="award"
              label={`${unlockedAchievements.length}/${ACHIEVEMENTS.length}`}
              size="compact"
            />
          </View>
          <View style={styles.achievementsGrid}>
            {ACHIEVEMENTS.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementContainer,
                  usesLargeLayout && styles.achievementContainerFullWidth,
                ]}
              >
                <AchievementBadge
                  name={t(achievement.nameKey)}
                  icon={achievement.icon}
                  unlocked={unlockedAchievements.includes(achievement.id)}
                />
              </View>
            ))}
          </View>
        </View>
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
  profileCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCard: {
    gap: Spacing.lg,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayColumn: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dayIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCardWrapper: {
    width: TWO_COLUMN_PROGRESS_CARD_WIDTH,
  },
  statCardWrapperFullWidth: {
    width: '100%',
  },
  statCard: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontVariant: ['tabular-nums'],
  },
  metricValue: {
    fontVariant: ['tabular-nums'],
  },
  achievementsSection: {
    gap: Spacing.md,
  },
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  achievementsHeaderStacked: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  sectionTitle: {
    marginBottom: 0,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  achievementContainer: {
    width: TWO_COLUMN_PROGRESS_CARD_WIDTH,
  },
  achievementContainerFullWidth: {
    width: '100%',
  },
  achievementCard: {
    alignItems: 'center',
    minHeight: 132,
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  achievementBadge: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementName: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
