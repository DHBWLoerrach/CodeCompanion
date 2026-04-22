import { getCategoryProgress } from '@/hooks/useTopicProgress';
import type { Category } from '@/lib/topics';
import type { TopicProgress } from '@/lib/storage';

function localizedText(value: string) {
  return { en: value, de: value };
}

function createCategory(topicIds: string[]): Category {
  return {
    id: 'test-category',
    order: 1,
    name: localizedText('Test Category'),
    shortDescription: localizedText('Test category description'),
    topics: topicIds.map((topicId, index) => ({
      id: topicId,
      category: 'test-category',
      order: index + 1,
      prerequisites: [],
      optional: false,
      name: localizedText(topicId),
      shortDescription: localizedText(`${topicId}-description`),
    })),
  };
}

describe('useTopicProgress helpers', () => {
  it('returns zero progress for empty categories', () => {
    expect(getCategoryProgress(createCategory([]), {})).toEqual({
      avgSkillLevel: 0,
      progressPercent: 0,
    });
  });

  it('calculates the average mastery across category topics', () => {
    const topicProgress: Record<string, TopicProgress> = {
      variables: {
        topicId: 'variables',
        questionsAnswered: 5,
        correctAnswers: 4,
        skillLevel: 3,
        lastPracticed: '2026-04-22T08:00:00.000Z',
      },
      loops: {
        topicId: 'loops',
        questionsAnswered: 4,
        correctAnswers: 3,
        skillLevel: 1,
        lastPracticed: '2026-04-22T09:00:00.000Z',
      },
    };

    expect(
      getCategoryProgress(createCategory(['variables', 'loops']), topicProgress)
    ).toEqual({
      avgSkillLevel: 2,
      progressPercent: 40,
    });
  });
});
