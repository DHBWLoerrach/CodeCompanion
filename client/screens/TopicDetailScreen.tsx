import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AppIcon } from "@/components/AppIcon";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getTopicById, getTopicName, getTopicDescription, type Topic } from "@/lib/topics";
import { storage, type TopicProgress, isTopicDue } from "@/lib/storage";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TopicDetailScreen() {
  const { theme } = useTheme();
  const { t, language, refreshLanguage } = useTranslation();
  const insets = useSafeAreaInsets();
  const isAndroid = process.env.EXPO_OS === "android";
  const navigation = useNavigation();
  const router = useRouter();
  const { topicId } = useLocalSearchParams<{ topicId?: string }>();
  const resolvedTopicId = Array.isArray(topicId) ? topicId[0] : topicId;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [progress, setProgress] = useState<TopicProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const scale = useSharedValue(1);
  const explainScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const explainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: explainScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handleExplainPressIn = () => {
    explainScale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handleExplainPressOut = () => {
    explainScale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const loadData = useCallback(async () => {
    try {
      if (!resolvedTopicId) {
        setTopic(null);
        setProgress(null);
        navigation.setOptions({ headerTitle: "" });
        return;
      }

      const topicData = getTopicById(resolvedTopicId);
      setTopic(topicData || null);
      navigation.setOptions({
        headerTitle: topicData ? getTopicName(topicData, language) : "",
      });

      const progressData = await storage.getProgress();
      setProgress(progressData.topicProgress[resolvedTopicId] || null);
    } catch (error) {
      console.error("Error loading topic:", error);
    } finally {
      setLoading(false);
    }
  }, [resolvedTopicId, navigation, language]);

  useFocusEffect(
    useCallback(() => {
      refreshLanguage();
      loadData();
    }, [refreshLanguage, loadData])
  );

  const handleStartQuiz = () => {
    if (!resolvedTopicId) return;
    router.push({
      pathname: "/quiz-session",
      params: { topicId: resolvedTopicId },
    });
  };

  const handleExplainTopic = () => {
    if (!resolvedTopicId) return;
    router.push({ pathname: "/topic-explanation", params: { topicId: resolvedTopicId } });
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!topic) {
    return (
      <ThemedView style={styles.errorContainer}>
        <AppIcon name="alert-circle" size={48} color={theme.error} />
        <ThemedText type="body">{t("topicNotFound")}</ThemedText>
      </ThemedView>
    );
  }

  const questionsAnswered = progress?.questionsAnswered || 0;
  const correctAnswers = progress?.correctAnswers || 0;
  const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;
  const displayName = getTopicName(topic, language);
  const displayDescription = getTopicDescription(topic, language);
  const dateLocale = language === "de" ? "de-DE" : "en-US";

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Spacing.xl, paddingBottom: 100 + insets.bottom },
          isAndroid ? styles.androidCenteredContent : null,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.topicIcon, { backgroundColor: theme.primary + "20" }]}>
            <AppIcon name="code" size={32} color={theme.primary} />
          </View>
          <ThemedText type="h3" style={styles.topicTitle}>
            {displayName}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.tabIconDefault, textAlign: "center" }}>
            {displayDescription}
          </ThemedText>
          {progress ? (
            <View style={[
              styles.completedBadge, 
              { backgroundColor: progress.skillLevel === 5 ? theme.success : isTopicDue(progress) ? theme.accent : theme.secondary }
            ]}>
              <AppIcon 
                name={progress.skillLevel === 5 ? "award" : isTopicDue(progress) ? "clock" : "trending-up"} 
                size={14} 
                color="#FFFFFF" 
              />
              <ThemedText type="label" style={{ color: "#FFFFFF" }}>
                {progress.skillLevel === 5 
                  ? t("mastered") 
                  : isTopicDue(progress) 
                    ? t("dueForReview") 
                    : `${t("level")} ${progress.skillLevel}/5`}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={{ color: theme.secondary }}>
              {questionsAnswered}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.tabIconDefault }}>
              {t("totalQuestions")}
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={{ color: theme.success }}>
              {correctAnswers}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.tabIconDefault }}>
              {t("correctAnswers")}
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={{ color: theme.accent }}>
              {accuracy}%
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.tabIconDefault }}>
              {t("accuracy")}
            </ThemedText>
          </View>
        </View>

        {progress?.lastPracticed ? (
          <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.infoRow}>
              <AppIcon name="clock" size={20} color={theme.tabIconDefault} />
              <ThemedText type="body" style={{ color: theme.tabIconDefault }}>
                {new Intl.DateTimeFormat(dateLocale, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(new Date(progress.lastPracticed))}
              </ThemedText>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.backgroundRoot },
        ]}
      >
        <View style={styles.buttonRow}>
          <AnimatedPressable
            testID="topic-explain-button"
            style={[styles.secondaryButton, { backgroundColor: theme.secondary }, explainAnimatedStyle]}
            onPress={handleExplainTopic}
            onPressIn={handleExplainPressIn}
            onPressOut={handleExplainPressOut}
          >
            <AppIcon name="book-open" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {t("explainTopic")}
            </ThemedText>
          </AnimatedPressable>
          <AnimatedPressable
            testID="topic-start-quiz-button"
            style={[styles.primaryButton, { backgroundColor: theme.primary }, animatedStyle]}
            onPress={handleStartQuiz}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <AppIcon name="play" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {t("startQuiz")}
            </ThemedText>
          </AnimatedPressable>
        </View>
      </View>
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
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    flexGrow: 1,
  },
  androidCenteredContent: {
    justifyContent: "center",
  },
  headerCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
    ...Shadows.card,
  },
  topicIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  topicTitle: {
    marginTop: Spacing.sm,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
    ...Shadows.card,
  },
  infoCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
    height: 56,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  primaryButton: {
    flex: 1,
    height: 56,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
});
