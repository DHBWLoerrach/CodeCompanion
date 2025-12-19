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
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { CATEGORIES, type Topic } from "@/lib/topics";
import { storage, type TopicProgress } from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TopicChipProps {
  topic: Topic;
  progress?: TopicProgress;
  onPress: () => void;
}

function TopicChip({ topic, progress, onPress }: TopicChipProps) {
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

  const isCompleted = progress?.completed;
  const isInProgress = progress && !progress.completed && progress.questionsAnswered > 0;

  const chipStyle = isCompleted
    ? { backgroundColor: theme.success, borderColor: theme.success }
    : isInProgress
    ? { backgroundColor: "transparent", borderColor: theme.secondary }
    : { backgroundColor: "transparent", borderColor: theme.cardBorder };

  const textColor = isCompleted ? "#FFFFFF" : theme.text;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.topicChip, chipStyle, animatedStyle]}
    >
      {isCompleted ? (
        <Feather name="check" size={14} color="#FFFFFF" style={styles.chipIcon} />
      ) : null}
      <ThemedText
        type="label"
        style={[styles.chipText, { color: textColor }]}
        numberOfLines={1}
      >
        {topic.name}
      </ThemedText>
    </AnimatedPressable>
  );
}

interface CategoryCardProps {
  category: { id: string; name: string; topics: Topic[] };
  topicProgress: Record<string, TopicProgress>;
  onTopicPress: (topic: Topic) => void;
}

function CategoryCard({ category, topicProgress, onTopicPress }: CategoryCardProps) {
  const { theme } = useTheme();

  const completedCount = category.topics.filter(
    (t) => topicProgress[t.id]?.completed
  ).length;
  const progressPercent = (completedCount / category.topics.length) * 100;

  return (
    <View style={[styles.categoryCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.categoryHeader}>
        <ThemedText type="h4">{category.name}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.tabIconDefault }}>
          {completedCount}/{category.topics.length}
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
        {category.topics.map((topic) => (
          <TopicChip
            key={topic.id}
            topic={topic}
            progress={topicProgress[topic.id]}
            onPress={() => onTopicPress(topic)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default function LearnScreen() {
  const { theme } = useTheme();
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
    });
    return unsubscribe;
  }, [navigation]);

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

  const handleTopicPress = (topic: Topic) => {
    navigation.navigate("TopicDetail", { topicId: topic.id, topicName: topic.name });
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
        <HeaderTitle title="Learn JavaScript" />
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
            topicProgress={topicProgress}
            onTopicPress={handleTopicPress}
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
});
