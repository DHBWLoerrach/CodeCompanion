import type { QuizDifficultyLevel } from '@shared/skill-level';
import type { QuizQuestion } from '@shared/quiz-question';
import type { ProgrammingLanguageId } from '@shared/programming-language';
import { resolveLanguageContext } from './quiz/context';
import {
  requestMixedQuizQuestionBatch,
  requestQuizQuestionBatch,
} from './quiz/request-batches';
import { addStableIds } from './quiz/stable-ids';
import type { MixedQuizTopicPlanItem } from './quiz/types';

export async function generateQuizQuestions(
  programmingLanguage: ProgrammingLanguageId,
  topicId: string,
  count: number = 5,
  language: string = 'en',
  skillLevel: QuizDifficultyLevel = 1
): Promise<QuizQuestion[]> {
  const { topicDescription, programmingLanguageName, contextExclusion } =
    resolveLanguageContext(programmingLanguage, topicId);

  const questions = await requestQuizQuestionBatch({
    programmingLanguageName,
    topicDescription,
    contextExclusion,
    count,
    language,
    skillLevel,
  });

  return addStableIds(programmingLanguage, questions, () => topicId);
}

export async function generateMixedQuizQuestions(
  programmingLanguage: ProgrammingLanguageId,
  topicPlan: MixedQuizTopicPlanItem[],
  language: string = 'en',
  skillLevel: QuizDifficultyLevel = 1
): Promise<QuizQuestion[]> {
  if (topicPlan.length === 0) {
    return [];
  }

  const uniqueTopicIds = new Set(topicPlan.map((item) => item.topicId));
  if (uniqueTopicIds.size !== topicPlan.length) {
    throw new Error('Mixed topic plan contains duplicate topicIds');
  }

  const questions = await requestMixedQuizQuestionBatch({
    programmingLanguage,
    topicPlan,
    language,
    skillLevel,
  });

  return addStableIds(
    programmingLanguage,
    questions,
    (question) => question.topicId
  );
}
