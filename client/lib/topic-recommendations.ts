import type { TopicProgress } from './storage';
import type { Category, Topic } from './topics';

function getLastPracticedTime(progress: TopicProgress | undefined) {
  if (!progress?.lastPracticed) return 0;
  const timestamp = new Date(progress.lastPracticed).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function hasStartedTopic(progress: TopicProgress | undefined) {
  return Boolean(progress && progress.questionsAnswered > 0);
}

export function isTopicMastered(progress: TopicProgress | undefined) {
  return progress?.skillLevel === 5;
}

export function areTopicPrerequisitesMet(
  topic: Topic,
  topicProgress: Record<string, TopicProgress>
) {
  return topic.prerequisites.every((prerequisiteId) =>
    isTopicMastered(topicProgress[prerequisiteId])
  );
}

function compareTopicsForRecommendation(
  a: Topic,
  b: Topic,
  topicProgress: Record<string, TopicProgress>
) {
  if (a.optional !== b.optional) {
    return Number(a.optional) - Number(b.optional);
  }

  const progressA = topicProgress[a.id];
  const progressB = topicProgress[b.id];
  const hasStartedA = hasStartedTopic(progressA);
  const hasStartedB = hasStartedTopic(progressB);

  if (hasStartedA !== hasStartedB) {
    return hasStartedA ? -1 : 1;
  }

  if (hasStartedA && hasStartedB) {
    const levelA = progressA?.skillLevel ?? 1;
    const levelB = progressB?.skillLevel ?? 1;

    if (levelA !== levelB) {
      return levelA - levelB;
    }

    const lastPracticedA = getLastPracticedTime(progressA);
    const lastPracticedB = getLastPracticedTime(progressB);

    if (lastPracticedA !== lastPracticedB) {
      return lastPracticedA - lastPracticedB;
    }
  }

  return a.order - b.order;
}

export function getRecommendedTopicId(
  category: Category,
  topicProgress: Record<string, TopicProgress>
): string | undefined {
  const availableTopics = category.topics.filter((topic) => {
    const progress = topicProgress[topic.id];

    return (
      !isTopicMastered(progress) &&
      areTopicPrerequisitesMet(topic, topicProgress)
    );
  });

  if (availableTopics.length === 0) {
    return undefined;
  }

  const [selected] = [...availableTopics].sort((a, b) =>
    compareTopicsForRecommendation(a, b, topicProgress)
  );

  return selected?.id;
}
