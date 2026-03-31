import type { QuizDifficultyLevel } from '@shared/skill-level';
import type { ProgrammingLanguageId } from '@shared/programming-language';
import {
  resolveProgrammingLanguageContext,
  resolveTopicDescription,
} from './context';
import {
  DEFAULT_OPENAI_MODEL,
  quizMaxOutputTokens,
  requestQuizResponseText,
} from './openai';
import {
  parseAndNormalizeQuizQuestions,
  validateStructuredMixedQuizQuestions,
  validateStructuredQuizQuestions,
} from './questions';
import {
  buildMixedQuizResponseFormat,
  QUIZ_RESPONSE_FORMAT,
} from './response-format';
import {
  buildMixedQuizInstructions,
  buildMixedQuizPrompt,
  buildQuizInstructions,
  buildQuizPrompt,
} from './prompts';
import type {
  GeneratedMixedQuizQuestion,
  GeneratedQuizQuestion,
  MixedQuizTopicPlanItem,
} from './types';

export async function requestQuizQuestionBatch({
  programmingLanguageName,
  topicDescription,
  contextExclusion,
  count,
  language,
  skillLevel,
}: {
  programmingLanguageName: string;
  topicDescription: string;
  contextExclusion: string;
  count: number;
  language: string;
  skillLevel: QuizDifficultyLevel;
}): Promise<GeneratedQuizQuestion[]> {
  const content = await requestQuizResponseText({
    model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
    instructions: buildQuizInstructions(programmingLanguageName, language),
    input: buildQuizPrompt({
      programmingLanguageName,
      topicDescription,
      contextExclusion,
      count,
      language,
      skillLevel,
    }),
    text: QUIZ_RESPONSE_FORMAT,
    max_output_tokens: quizMaxOutputTokens(count),
  });

  return parseAndNormalizeQuizQuestions(content, (questions) =>
    validateStructuredQuizQuestions(questions, count)
  );
}

export async function requestMixedQuizQuestionBatch({
  programmingLanguage,
  topicPlan,
  language,
  skillLevel,
}: {
  programmingLanguage: ProgrammingLanguageId;
  topicPlan: MixedQuizTopicPlanItem[];
  language: string;
  skillLevel: QuizDifficultyLevel;
}): Promise<GeneratedMixedQuizQuestion[]> {
  const { programmingLanguageName, contextExclusion } =
    resolveProgrammingLanguageContext(programmingLanguage);
  const totalCount = topicPlan.reduce(
    (sum, item) => sum + item.questionCount,
    0
  );
  const resolvedTopicPlan = topicPlan.map(({ topicId, questionCount }) => ({
    topicId,
    questionCount,
    topicDescription: resolveTopicDescription(
      programmingLanguage,
      programmingLanguageName,
      topicId
    ),
  }));

  const content = await requestQuizResponseText({
    model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
    instructions: buildMixedQuizInstructions(programmingLanguageName, language),
    input: buildMixedQuizPrompt({
      programmingLanguageName,
      contextExclusion,
      language,
      skillLevel,
      resolvedTopicPlan,
    }),
    text: buildMixedQuizResponseFormat(topicPlan.map((item) => item.topicId)),
    max_output_tokens: quizMaxOutputTokens(totalCount),
  });

  return parseAndNormalizeQuizQuestions(content, (questions) =>
    validateStructuredMixedQuizQuestions(questions, topicPlan)
  );
}
