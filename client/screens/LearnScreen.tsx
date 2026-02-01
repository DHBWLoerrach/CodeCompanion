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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { CATEGORIES, type Topic, type Category, getTopicName, getCategoryName } from "@/lib/topics";
import { storage, type TopicProgress, type SkillLevel, isTopicDue, SKILL_LEVEL_INTERVALS } from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TopicChipProps {
  topic: Topic;
  progress?: TopicProgress;
  onPress: () => void;
  topicName: string;
}

function SkillLevelIndicator({ level, color }: { level: SkillLevel; color: string }) {
  return (
    <View style={styles.levelIndicator}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.levelDot,
            { backgroundColor: i <= level ? color : color + "40" },
          ]}
        />
      ))}
    </View>
  );
}

function TopicChip({ topic, progress, onPress, topicName }: TopicChipProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const isMastered = progress?.skillLevel === 5;
  const isDue = isTopicDue(progress);
  const hasStarted = progress && progress.questionsAnswered > 0;
  const skillLevel = progress?.skillLevel ?? 1;

  const chipStyle = isMastered
    ? { backgroundColor: theme.success, borderColor: theme.success }
    : isDue && hasStarted
    ? { backgroundColor: "transparent", borderColor: theme.accent }
    : hasStarted
    ? { backgroundColor: "transparent", borderColor: theme.secondary }
    : { backgroundColor: "transparent", borderColor: theme.cardBorder };

  const textColor = isMastered ? "#FFFFFF" : theme.text;
  const levelColor = isMastered ? "#FFFFFF" : theme.accent;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.topicChip, chipStyle, animatedStyle]}
    >
      {isMastered ? (
        <Feather name="award" size={14} color="#FFFFFF" style={styles.chipIcon} />
      ) : isDue && hasStarted ? (
        <Feather name="clock" size={14} color={theme.accent} style={styles.chipIcon} />
      ) : null}
      <ThemedText
        type="label"
        style={[styles.chipText, { color: textColor }]}
        numberOfLines={1}
      >
        {topicName}
      </ThemedText>
      {hasStarted ? (
        <SkillLevelIndicator level={skillLevel} color={levelColor} />
      ) : null}
    </AnimatedPressable>
  );
}

interface CategoryCardProps {
  category: Category;
  categoryName: string;
  topicProgress: Record<string, TopicProgress>;
  onTopicPress: (topic: Topic, topicName: string) => void;
  getTopicDisplayName: (topic: Topic) => string;
}

function CategoryCard({ category, categoryName, topicProgress, onTopicPress, getTopicDisplayName }: CategoryCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const dueCount = category.topics.filter(
    (t) => isTopicDue(topicProgress[t.id])
  ).length;
  
  const avgSkillLevel = category.topics.reduce((sum, topic) => {
    return sum + (topicProgress[topic.id]?.skillLevel ?? 0);
  }, 0) / category.topics.length;
  
  const progressPercent = (avgSkillLevel / 5) * 100;

  return (
    <View style={[styles.categoryCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.categoryHeader}>
        <ThemedText type="h4">{categoryName}</ThemedText>
        <ThemedText type="caption" style={{ color: dueCount > 0 ? theme.accent : theme.tabIconDefault }}>
          {dueCount > 0 ? `${dueCount} ${t("dueForReview")}` : t("allCaughtUp")}
        </ThemedText>
      </View>

      <View style={[styles.progressBar, { backgroundColor: theme.cardBorder }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progressPercent}%`, backgroundColor: theme.secondary },
          ]}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topicsContainer}
      >
        {category.topics.map((topic) => {
          const topicDisplayName = getTopicDisplayName(topic);
          return (
            <TopicChip
              key={topic.id}
              topic={topic}
              topicName={topicDisplayName}
              progress={topicProgress[topic.id]}
              onPress={() => onTopicPress(topic, topicDisplayName)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function LearnScreen() {
  const { theme } = useTheme();
  const { t, language, refreshLanguage } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [topicProgress, setTopicProgress] = useState<Record<string, TopicProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadProgress();
      refreshLanguage();
    });
    return unsubscribe;
  }, [navigation, refreshLanguage]);

  const loadProgress = async () => {
    try {
      const progress = await storage.getProgress();
      setTopicProgress(progress.topicProgress);
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicPress = (topic: Topic, topicName: string) => {
    navigation.navigate("TopicDetail", { topicId: topic.id, topicName });
  };

  if (loading) {
    return (
      <ThemedView style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <HeaderTitle title={t("learnJavaScript")} />
        <Pressable
          style={styles.filterButton}
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
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            categoryName={getCategoryName(category, language)}
            topicProgress={topicProgress}
            onTopicPress={handleTopicPress}
            getTopicDisplayName={(topic) => getTopicName(topic, language)}
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
  filterButton: {
    padding: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  categoryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  topicsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
  },
  chipIcon: {
    marginRight: Spacing.xs,
  },
  chipText: {
    fontWeight: "500",
  },
  levelIndicator: {
    flexDirection: "row",
    marginLeft: Spacing.xs,
    gap: 2,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
