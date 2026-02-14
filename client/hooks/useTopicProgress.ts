import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { storage, type TopicProgress, isTopicDue } from "@/lib/storage";
import type { Category } from "@/lib/topics";

interface UseTopicProgressOptions {
  languageId: string;
  categories: Category[];
  refreshLanguage: () => void;
}

export function useTopicProgress({
  languageId,
  categories,
  refreshLanguage,
}: UseTopicProgressOptions) {
  const [topicProgress, setTopicProgress] = useState<
    Record<string, TopicProgress>
  >({});
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    try {
      const progress = await storage.getProgress();
      setTopicProgress(
        storage.getTopicProgressForLanguage(progress.topicProgress, languageId),
      );
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  }, [languageId]);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
      refreshLanguage();
    }, [loadProgress, refreshLanguage]),
  );

  const allTopics = categories.flatMap((cat) => cat.topics);
  const dueTopics = allTopics.filter((topic) => {
    const progress = topicProgress[topic.id];
    return progress && progress.questionsAnswered > 0 && isTopicDue(progress);
  });

  return { topicProgress, loading, dueTopics };
}

export function getCategoryProgress(
  category: Category,
  topicProgress: Record<string, TopicProgress>,
) {
  const avgSkillLevel =
    category.topics.reduce((sum, topic) => {
      return sum + (topicProgress[topic.id]?.skillLevel ?? 0);
    }, 0) / category.topics.length;

  return { avgSkillLevel, progressPercent: (avgSkillLevel / 5) * 100 };
}
