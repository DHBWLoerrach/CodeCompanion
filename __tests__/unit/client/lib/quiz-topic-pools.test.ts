import {
  areTopicPrerequisitesTreated,
  buildQuizTopicPools,
  hasTreatedTopic,
} from '@/lib/quiz-topic-pools';
import { getCategoriesByLanguage, getTopicById } from '@/lib/topics';
import type { TopicProgress } from '@/lib/storage';

const javascriptCategories = getCategoriesByLanguage('javascript');

function buildProgress(
  topicId: string,
  overrides: Partial<TopicProgress> = {}
): TopicProgress {
  return {
    topicId,
    questionsAnswered: 1,
    correctAnswers: 1,
    skillLevel: 1,
    ...overrides,
  };
}

describe('quiz topic pools', () => {
  it('treats topics as started only when questions were answered', () => {
    expect(hasTreatedTopic(undefined)).toBe(false);
    expect(
      hasTreatedTopic(buildProgress('variables', { questionsAnswered: 0 }))
    ).toBe(false);
    expect(hasTreatedTopic(buildProgress('variables'))).toBe(true);
  });

  it('builds mixed fundamentals fallback when no treated topics exist', () => {
    const pools = buildQuizTopicPools(javascriptCategories, {});

    expect(pools.treatedTopicIds).toEqual([]);
    expect(pools.mixedTopicIds).toEqual([
      'variables',
      'data-types',
      'operators',
    ]);
    expect(pools.exploreTopicIds).toEqual(['variables']);
  });

  it('supplements a single treated topic with fundamentals without duplicates', () => {
    const pools = buildQuizTopicPools(javascriptCategories, {
      variables: buildProgress('variables'),
    });

    expect(pools.mixedTopicIds).toEqual([
      'variables',
      'data-types',
      'operators',
    ]);
  });

  it('selects up to three random treated topics once enough review history exists', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);

    try {
      const pools = buildQuizTopicPools(javascriptCategories, {
        variables: buildProgress('variables'),
        'data-types': buildProgress('data-types'),
        operators: buildProgress('operators'),
        loops: buildProgress('loops'),
      });

      expect(pools.mixedTopicIds).toEqual([
        'variables',
        'data-types',
        'operators',
      ]);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('builds explore topics from unstarted topics with treated prerequisites', () => {
    const pools = buildQuizTopicPools(javascriptCategories, {
      variables: buildProgress('variables'),
      'data-types': buildProgress('data-types'),
    });

    expect(pools.exploreTopicIds).toEqual([
      'operators',
      'null-undefined',
      'strings-template-literals',
    ]);
  });

  it('returns no explore topics when every topic is already treated', () => {
    const allProgress = Object.fromEntries(
      javascriptCategories.flatMap((category) =>
        category.topics.map((topic) => [topic.id, buildProgress(topic.id)])
      )
    );

    const pools = buildQuizTopicPools(javascriptCategories, allProgress);

    expect(pools.unstartedTopicIds).toEqual([]);
    expect(pools.exploreTopicIds).toEqual([]);
  });

  it('checks explore prerequisites against treated topics instead of mastery', () => {
    const operatorsTopic = getTopicById('operators', javascriptCategories);

    expect(operatorsTopic).toBeDefined();
    expect(
      areTopicPrerequisitesTreated(operatorsTopic!, {
        'data-types': buildProgress('data-types', { skillLevel: 1 }),
      })
    ).toBe(true);
    expect(
      areTopicPrerequisitesTreated(operatorsTopic!, {
        'data-types': buildProgress('data-types', { questionsAnswered: 0 }),
      })
    ).toBe(false);
  });
});
