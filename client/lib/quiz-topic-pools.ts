import { MULTI_TOPIC_QUIZ_TOPIC_LIMIT } from '@/constants/quiz';
import type { TopicProgress } from './storage';
import type { Category, Topic } from './topics';

export type MultiTopicQuizMode = 'mixed' | 'explore';

export interface QuizTopicPools {
  treatedTopicIds: string[];
  unstartedTopicIds: string[];
  mixedTopicIds: string[];
  exploreTopicIds: string[];
}

export function hasTreatedTopic(progress: TopicProgress | undefined): boolean {
  return Boolean(progress && progress.questionsAnswered > 0);
}

export function areTopicPrerequisitesTreated(
  topic: Topic,
  topicProgress: Record<string, TopicProgress>
): boolean {
  return topic.prerequisites.every((prerequisiteId) =>
    hasTreatedTopic(topicProgress[prerequisiteId])
  );
}

function sortTopics(categories: Category[]): Topic[] {
  return [...categories]
    .sort((a, b) => a.order - b.order)
    .flatMap((category) =>
      [...category.topics].sort((a, b) => a.order - b.order)
    );
}

function pickRandomTopicIds(topicIds: string[], limit: number): string[] {
  const shuffled = [...topicIds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled.slice(0, Math.min(limit, shuffled.length));
}

function buildMixedTopicIds(
  categories: Category[],
  topicProgress: Record<string, TopicProgress>,
  limit: number
): string[] {
  const sortedTopics = sortTopics(categories);
  const treatedTopicIds = sortedTopics
    .filter((topic) => hasTreatedTopic(topicProgress[topic.id]))
    .map((topic) => topic.id);

  if (treatedTopicIds.length >= 2) {
    return pickRandomTopicIds(treatedTopicIds, limit);
  }

  const selectedTopicIds = [...treatedTopicIds];
  const selectedTopicIdSet = new Set(selectedTopicIds);
  const fundamentalsCategory = categories.find(
    (category) => category.id === 'fundamentals'
  );
  const fundamentalsTopicIds =
    fundamentalsCategory?.topics
      .slice()
      .sort((a, b) => a.order - b.order)
      .filter(
        (topic) =>
          !hasTreatedTopic(topicProgress[topic.id]) &&
          !selectedTopicIdSet.has(topic.id)
      )
      .map((topic) => topic.id) ?? [];

  for (const topicId of fundamentalsTopicIds) {
    if (selectedTopicIds.length >= limit) {
      break;
    }

    selectedTopicIds.push(topicId);
    selectedTopicIdSet.add(topicId);
  }

  return selectedTopicIds.slice(0, limit);
}

function buildExploreTopicIds(
  categories: Category[],
  topicProgress: Record<string, TopicProgress>,
  limit: number
): string[] {
  return sortTopics(categories)
    .filter(
      (topic) =>
        !hasTreatedTopic(topicProgress[topic.id]) &&
        areTopicPrerequisitesTreated(topic, topicProgress)
    )
    .slice(0, limit)
    .map((topic) => topic.id);
}

export function buildQuizTopicPools(
  categories: Category[],
  topicProgress: Record<string, TopicProgress>,
  limit = MULTI_TOPIC_QUIZ_TOPIC_LIMIT
): QuizTopicPools {
  const sortedTopics = sortTopics(categories);
  const treatedTopicIds = sortedTopics
    .filter((topic) => hasTreatedTopic(topicProgress[topic.id]))
    .map((topic) => topic.id);
  const unstartedTopicIds = sortedTopics
    .filter((topic) => !hasTreatedTopic(topicProgress[topic.id]))
    .map((topic) => topic.id);

  return {
    treatedTopicIds,
    unstartedTopicIds,
    mixedTopicIds: buildMixedTopicIds(categories, topicProgress, limit),
    exploreTopicIds: buildExploreTopicIds(categories, topicProgress, limit),
  };
}

export function resolveMultiTopicQuizTopicIds(
  categories: Category[],
  topicProgress: Record<string, TopicProgress>,
  mode: MultiTopicQuizMode,
  limit = MULTI_TOPIC_QUIZ_TOPIC_LIMIT
): string[] {
  const pools = buildQuizTopicPools(categories, topicProgress, limit);
  return mode === 'explore' ? pools.exploreTopicIds : pools.mixedTopicIds;
}
