import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getTopicById, getTopicName, getTopicDescription, type Topic } from "@/lib/topics";
import { storage, type TopicProgress, isTopicDue, getDaysUntilDue, SKILL_LEVEL_INTERVALS } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = NativeStackScreenProps<RootStackParamList, "TopicDetail">["route"];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TopicDetailScreen() {
  const { theme } = useTheme();
  const { t, language, refreshLanguage } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { topicId, topicName } = route.params;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [progress, setProgress] = useState<TopicProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [explanationModalVisible, setExplanationModalVisible] = useState(false);
  const [explanation, setExplanation] = useState<string>("");
  const [loadingExplanation, setLoadingExplanation] = useState(false);

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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      await refreshLanguage();
      loadData();
    });
    return unsubscribe;
  }, [navigation, refreshLanguage]);

  // Update header title based on current language
  useEffect(() => {
    const topicData = getTopicById(topicId);
    if (topicData) {
      navigation.setOptions({ headerTitle: getTopicName(topicData, language) });
    }
  }, [topicId, language, navigation]);

  const loadData = async () => {
    try {
      const topicData = getTopicById(topicId);
      setTopic(topicData || null);

      const progressData = await storage.getProgress();
      setProgress(progressData.topicProgress[topicId] || null);
    } catch (error) {
      console.error("Error loading topic:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    navigation.navigate("QuizSession", { topicId });
  };

  const handleExplainTopic = async () => {
    setExplanationModalVisible(true);
    setLoadingExplanation(true);
    setExplanation("");
    
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(new URL("/api/topic/explain", apiUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, language }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate explanation");
      }
      
      const data = await response.json();
      setExplanation(data.explanation);
    } catch (error) {
      console.error("Error generating explanation:", error);
      setExplanation("Failed to load explanation. Please try again.");
    } finally {
      setLoadingExplanation(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!topic) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <ThemedText type="body">{t("topicNotFound")}</ThemedText>
      </ThemedView>
    );
  }

  const questionsAnswered = progress?.questionsAnswered || 0;
  const correctAnswers = progress?.correctAnswers || 0;
  const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;
  const displayName = getTopicName(topic, language);
  const displayDescription = getTopicDescription(topic, language);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Spacing.xl, paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.topicIcon, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="code" size={32} color={theme.primary} />
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
              <Feather 
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
              <Feather name="clock" size={20} color={theme.tabIconDefault} />
              <ThemedText type="body" style={{ color: theme.tabIconDefault }}>
                {new Date(progress.lastPracticed).toLocaleDateString()}
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
            style={[styles.secondaryButton, { backgroundColor: theme.secondary }, explainAnimatedStyle]}
            onPress={handleExplainTopic}
            onPressIn={handleExplainPressIn}
            onPressOut={handleExplainPressOut}
          >
            <Feather name="book-open" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {t("explainTopic")}
            </ThemedText>
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }, animatedStyle]}
            onPress={handleStartQuiz}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <Feather name="play" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {t("startQuiz")}
            </ThemedText>
          </AnimatedPressable>
        </View>
      </View>

      <Modal
        visible={explanationModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setExplanationModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
            <ThemedText type="h3">{t("topicExplanation")}</ThemedText>
            <Pressable
              style={[styles.closeButton, { backgroundColor: theme.backgroundDefault }]}
              onPress={() => setExplanationModalVisible(false)}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={true}
          >
            {loadingExplanation ? (
              <View style={styles.loadingExplanation}>
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText type="body" style={{ color: theme.tabIconDefault, marginTop: Spacing.lg }}>
                  {t("generatingExplanation")}
                </ThemedText>
              </View>
            ) : (
              <ThemedText type="body" style={styles.explanationText}>
                {explanation}
              </ThemedText>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  loadingExplanation: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 3,
  },
  explanationText: {
    lineHeight: 24,
  },
});
