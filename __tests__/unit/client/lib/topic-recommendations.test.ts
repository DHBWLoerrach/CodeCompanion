import {
  areTopicPrerequisitesMet,
  getRecommendedTopicId,
  hasStartedTopic,
  isTopicMastered,
} from '@/lib/topic-recommendations';
import type { TopicProgress } from '@/lib/storage';
import type { Category, Topic } from '@/lib/topics';

function localizedText(value: string) {
  return { en: value, de: value };
}

function createTopic({
  id,
  order,
  category = 'fundamentals',
  prerequisites = [],
  optional = false,
}: {
  id: string;
  order: number;
  category?: string;
  prerequisites?: string[];
  optional?: boolean;
}): Topic {
  return {
    id,
    category,
    order,
    prerequisites,
    optional,
    name: localizedText(id),
    shortDescription: localizedText(`${id}-description`),
  };
}

function createCategory(topics: Topic[]): Category {
  return {
    id: 'test-category',
    order: 1,
    name: localizedText('Test Category'),
    shortDescription: localizedText('Test category description'),
    topics,
  };
}

function createProgress({
  topicId,
  questionsAnswered = 10,
  correctAnswers = 8,
  skillLevel = 1,
  lastPracticed = '2026-03-30T12:00:00.000Z',
}: {
  topicId: string;
  questionsAnswered?: number;
  correctAnswers?: number;
  skillLevel?: TopicProgress['skillLevel'];
  lastPracticed?: string;
}): TopicProgress {
  return {
    topicId,
    questionsAnswered,
    correctAnswers,
    skillLevel,
    lastPracticed,
  };
}

describe('topic recommendations', () => {
  describe('hasStartedTopic', () => {
    it('returns true only when at least one question was answered', () => {
      expect(hasStartedTopic(undefined)).toBe(false);
      expect(
        hasStartedTopic(
          createProgress({ topicId: 'variables', questionsAnswered: 0 })
        )
      ).toBe(false);
      expect(
        hasStartedTopic(
          createProgress({ topicId: 'variables', questionsAnswered: 1 })
        )
      ).toBe(true);
    });
  });

  describe('isTopicMastered', () => {
    it('returns true only for skill level 5', () => {
      expect(isTopicMastered(undefined)).toBe(false);
      expect(
        isTopicMastered(createProgress({ topicId: 'variables', skillLevel: 4 }))
      ).toBe(false);
      expect(
        isTopicMastered(createProgress({ topicId: 'variables', skillLevel: 5 }))
      ).toBe(true);
    });
  });

  it('checks prerequisites against mastered prerequisite topics', () => {
    const topic = createTopic({
      id: 'data-types',
      order: 2,
      prerequisites: ['variables'],
    });

    expect(
      areTopicPrerequisitesMet(topic, {
        variables: createProgress({ topicId: 'variables', skillLevel: 5 }),
      })
    ).toBe(true);
    expect(
      areTopicPrerequisitesMet(topic, {
        variables: createProgress({ topicId: 'variables', skillLevel: 4 }),
      })
    ).toBe(false);
  });

  it('recommends the next unlocked topic in curriculum order', () => {
    const category = createCategory([
      createTopic({ id: 'variables', order: 1 }),
      createTopic({
        id: 'data-types',
        order: 2,
        prerequisites: ['variables'],
      }),
      createTopic({
        id: 'operators',
        order: 3,
        prerequisites: ['data-types'],
      }),
    ]);

    expect(
      getRecommendedTopicId(category, {
        variables: createProgress({ topicId: 'variables', skillLevel: 5 }),
      })
    ).toBe('data-types');
  });

  it('prefers an unlocked started topic over a new unlocked topic', () => {
    const category = createCategory([
      createTopic({
        id: 'loops',
        order: 8,
        category: 'control-flow',
        prerequisites: ['conditionals'],
      }),
      createTopic({
        id: 'switch',
        order: 9,
        category: 'control-flow',
        prerequisites: ['conditionals'],
      }),
    ]);

    expect(
      getRecommendedTopicId(category, {
        conditionals: createProgress({
          topicId: 'conditionals',
          skillLevel: 5,
        }),
        switch: createProgress({ topicId: 'switch', skillLevel: 2 }),
      })
    ).toBe('switch');
  });

  it('uses lastPracticed as a tiebreaker for equally advanced started topics', () => {
    const category = createCategory([
      createTopic({
        id: 'loops',
        order: 8,
        category: 'control-flow',
        prerequisites: ['conditionals'],
      }),
      createTopic({
        id: 'switch',
        order: 9,
        category: 'control-flow',
        prerequisites: ['conditionals'],
      }),
    ]);

    expect(
      getRecommendedTopicId(category, {
        conditionals: createProgress({
          topicId: 'conditionals',
          skillLevel: 5,
        }),
        loops: createProgress({
          topicId: 'loops',
          skillLevel: 2,
          lastPracticed: '2026-03-28T12:00:00.000Z',
        }),
        switch: createProgress({
          topicId: 'switch',
          skillLevel: 2,
          lastPracticed: '2026-03-30T12:00:00.000Z',
        }),
      })
    ).toBe('loops');
  });

  it('treats invalid lastPracticed values as the oldest timestamp', () => {
    const category = createCategory([
      createTopic({
        id: 'loops',
        order: 8,
        category: 'control-flow',
        prerequisites: ['conditionals'],
      }),
      createTopic({
        id: 'switch',
        order: 9,
        category: 'control-flow',
        prerequisites: ['conditionals'],
      }),
    ]);

    expect(
      getRecommendedTopicId(category, {
        conditionals: createProgress({
          topicId: 'conditionals',
          skillLevel: 5,
        }),
        loops: createProgress({
          topicId: 'loops',
          skillLevel: 2,
          lastPracticed: 'not-a-date',
        }),
        switch: createProgress({
          topicId: 'switch',
          skillLevel: 2,
          lastPracticed: '2026-03-30T12:00:00.000Z',
        }),
      })
    ).toBe('loops');
  });

  it('does not recommend blocked categories with unmet prerequisites', () => {
    const category = createCategory([
      createTopic({
        id: 'conditionals',
        order: 7,
        category: 'control-flow',
        prerequisites: ['operators'],
      }),
      createTopic({
        id: 'loops',
        order: 8,
        category: 'control-flow',
        prerequisites: ['conditionals'],
      }),
    ]);

    expect(getRecommendedTopicId(category, {})).toBeUndefined();
  });

  it('does not recommend fully mastered categories', () => {
    const category = createCategory([
      createTopic({ id: 'variables', order: 1 }),
    ]);

    expect(
      getRecommendedTopicId(category, {
        variables: createProgress({ topicId: 'variables', skillLevel: 5 }),
      })
    ).toBeUndefined();
  });

  it('prefers core topics over optional topics when both are unlocked', () => {
    const category = createCategory([
      createTopic({ id: 'base', order: 1 }),
      createTopic({
        id: 'optional-topic',
        order: 2,
        prerequisites: ['base'],
        optional: true,
      }),
      createTopic({
        id: 'core-topic',
        order: 3,
        prerequisites: ['base'],
      }),
    ]);

    expect(
      getRecommendedTopicId(category, {
        base: createProgress({ topicId: 'base', skillLevel: 5 }),
      })
    ).toBe('core-topic');
  });
});
