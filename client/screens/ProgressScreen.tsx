import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, Shadows, AvatarColors } from "@/constants/theme";
import {
  storage,
  type UserProfile,
  type ProgressData,
  type StreakData,
} from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AVATARS = ["monitor", "award", "code", "zap"] as const;

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <ThemedText type="h3" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.tabIconDefault }}>
        {title}
      </ThemedText>
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
    <View style={styles.achievementContainer}>
      <View
        style={[
          styles.achievementBadge,
          {
            backgroundColor: unlocked ? theme.accent : theme.cardBorder,
            opacity: unlocked ? 1 : 0.5,
          },
        ]}
      >
        {unlocked ? (
          <Feather name={icon as any} size={24} color="#FFFFFF" />
        ) : (
          <Feather name="lock" size={20} color={theme.tabIconDefault} />
        )}
      </View>
      <ThemedText
        type="caption"
        style={[styles.achievementName, { opacity: unlocked ? 1 : 0.5 }]}
        numberOfLines={1}
      >
        {name}
      </ThemedText>
    </View>
  );
}

export default function ProgressScreen() {
  const { theme } = useTheme();
  const { t, refreshLanguage } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  const ACHIEVEMENTS = [
    { id: "first-quiz", nameKey: "firstQuiz" as const, icon: "star", threshold: 1 },
    { id: "streak-7", nameKey: "streak7Days" as const, icon: "zap", threshold: 7 },
    { id: "streak-30", nameKey: "streak30Days" as const, icon: "award", threshold: 30 },
    { id: "questions-100", nameKey: "questions100" as const, icon: "check-circle", threshold: 100 },
    { id: "js-novice", nameKey: "jsNovice" as const, icon: "book", threshold: 50 },
    { id: "js-master", nameKey: "jsMaster" as const, icon: "award", threshold: 200 },
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadData();
      refreshLanguage();
    });
    return unsubscribe;
  }, [navigation, refreshLanguage]);

  const loadData = async () => {
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
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTopicsMastered = () => {
    if (!progress) return 0;
    return Object.values(progress.topicProgress).filter((t) => t.completed).length;
  };

  const getUnlockedAchievements = () => {
    if (!progress || !streak) return [];
    const unlocked: string[] = [];

    if (progress.totalQuestions >= 1) unlocked.push("first-quiz");
    if (streak.currentStreak >= 7) unlocked.push("streak-7");
    if (streak.currentStreak >= 30) unlocked.push("streak-30");
    if (progress.totalQuestions >= 100) unlocked.push("questions-100");
    if (progress.correctAnswers >= 50) unlocked.push("js-novice");
    if (progress.correctAnswers >= 200) unlocked.push("js-master");

    return unlocked;
  };

  if (loading || !profile || !progress || !streak) {
    return (
      <ThemedView style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  const unlockedAchievements = getUnlockedAchievements();
  const today = new Date().getDay();
  const dayLabels = [
    t("sunday"),
    t("monday"),
    t("tuesday"),
    t("wednesday"),
    t("thursday"),
    t("friday"),
    t("saturday"),
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <ThemedText type="h3">{t("yourProgress")}</ThemedText>
        <Pressable
          style={styles.settingsButton}
          onPress={() => navigation.navigate("Settings")}
        >
          <Feather name="settings" size={22} color={theme.tabIconDefault} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: theme.backgroundDefault }]}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: AvatarColors[profile.avatarIndex] },
            ]}
          >
            <Feather
              name={AVATARS[profile.avatarIndex] as any}
              size={36}
              color="#FFFFFF"
            />
          </View>
          <ThemedText type="h4" style={styles.displayName}>
            {profile.displayName || t("student")}
          </ThemedText>
          <Pressable onPress={() => navigation.navigate("Settings")}>
            <ThemedText type="link">{t("editProfile")}</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.streakCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.streakHeader}>
            <View style={styles.streakInfo}>
              <ThemedText type="h1" style={{ color: theme.accent }}>
                {streak.currentStreak}
              </ThemedText>
              <ThemedText type="body">{t("dayStreak")}</ThemedText>
            </View>
            <Feather name="zap" size={40} color={theme.accent} />
          </View>

          <View style={styles.weekRow}>
            {dayLabels.map((label, index) => (
              <View key={index} style={styles.dayColumn}>
                <ThemedText type="caption" style={{ color: theme.tabIconDefault }}>
                  {label}
                </ThemedText>
                <DayIndicator
                  practiced={streak.weekHistory[index]}
                  isToday={index === today}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title={t("totalQuestions")}
            value={progress.totalQuestions}
            icon="help-circle"
            color={theme.secondary}
          />
          <StatCard
            title={t("topicsMastered")}
            value={getTopicsMastered()}
            icon="check-square"
            color={theme.success}
          />
          <StatCard
            title={t("currentStreak")}
            value={streak.currentStreak}
            icon="zap"
            color={theme.accent}
          />
          <StatCard
            title={t("bestStreak")}
            value={streak.bestStreak}
            icon="award"
            color={theme.primary}
          />
        </View>

        <View style={styles.achievementsSection}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            {t("achievements")}
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsRow}
          >
            {ACHIEVEMENTS.map((achievement) => (
              <AchievementBadge
                key={achievement.id}
                name={t(achievement.nameKey)}
                icon={achievement.icon}
                unlocked={unlockedAchievements.includes(achievement.id)}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  settingsButton: {
    padding: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  profileCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    ...Shadows.card,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  displayName: {
    marginBottom: Spacing.sm,
  },
  streakCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  streakHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  streakInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  dayColumn: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  dayIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
    ...Shadows.card,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    marginBottom: Spacing.xs,
  },
  achievementsSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  achievementsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  achievementContainer: {
    alignItems: "center",
    width: 72,
  },
  achievementBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  achievementName: {
    textAlign: "center",
  },
});
