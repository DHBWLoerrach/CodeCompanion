import { getTopicIdsByLanguage } from "@shared/curriculum";
import { mapWithConcurrency } from "@server/concurrency";
import { generateQuizQuestions } from "@server/quiz";
import { logApiError } from "@server/logging";
import {
  invalidJsonBodyResponse,
  InvalidJsonBodyError,
  parseJsonBody,
} from "@server/request";
import {
  toLanguage,
  toProgrammingLanguage,
  toQuestionCount,
  toQuizDifficultyLevel,
  validateTopicIdsForLanguage,
} from "@server/validation";

function hasTooManyTopicIds(value: unknown): boolean {
  return Array.isArray(value) && value.length > 20;
}

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }
  return shuffled;
}

type TopicQuestionPlan = {
  topicId: string;
  questionCount: number;
};

const MIXED_QUIZ_GENERATION_CONCURRENCY = 3;

function buildTopicQuestionPlan(
  topicIds: string[],
  totalQuestionCount: number,
): TopicQuestionPlan[] {
  const baseCount = Math.floor(totalQuestionCount / topicIds.length);
  const remainder = totalQuestionCount % topicIds.length;

  return topicIds
    .map((topicId, index) => ({
      topicId,
      questionCount: baseCount + (index < remainder ? 1 : 0),
    }))
    .filter((plan) => plan.questionCount > 0);
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{
      count?: number;
      language?: string;
      topicIds?: string[];
      skillLevel?: number;
      programmingLanguage?: string;
    }>(request);

    const count = toQuestionCount(body?.count, 10);
    const skillLevel = toQuizDifficultyLevel(body?.skillLevel, 1);
    const programmingLanguage = toProgrammingLanguage(
      body?.programmingLanguage,
    );
    if (!programmingLanguage) {
      return Response.json(
        {
          error: "programmingLanguage must be one of: javascript, python, java",
        },
        { status: 400 },
      );
    }
    if (hasTooManyTopicIds(body?.topicIds)) {
      return Response.json(
        { error: "topicIds cannot contain more than 20 entries" },
        { status: 400 },
      );
    }
    const language = toLanguage(body?.language);
    if (!language) {
      return Response.json(
        { error: "language must be 'en' or 'de'" },
        { status: 400 },
      );
    }

    const allTopicKeys = getTopicIdsByLanguage(programmingLanguage);
    let selectedTopics: string[];
    if (Array.isArray(body?.topicIds) && body.topicIds.length > 0) {
      if (!validateTopicIdsForLanguage(body.topicIds, programmingLanguage)) {
        return Response.json(
          {
            error: "topicIds contains invalid entries for programmingLanguage",
          },
          { status: 400 },
        );
      }
      selectedTopics = body.topicIds;
    } else {
      selectedTopics = shuffleArray(allTopicKeys).slice(0, 3);
    }

    selectedTopics = selectedTopics.slice(0, count);

    if (selectedTopics.length === 0) {
      return Response.json({ error: "No topics available" }, { status: 500 });
    }

    const topicPlan = buildTopicQuestionPlan(selectedTopics, count);
    const questionGroups = await mapWithConcurrency(
      topicPlan,
      MIXED_QUIZ_GENERATION_CONCURRENCY,
      ({ topicId, questionCount }) =>
        generateQuizQuestions(
          programmingLanguage,
          topicId,
          questionCount,
          language,
          skillLevel,
        ),
    );

    const allQuestions = questionGroups.flat();
    if (allQuestions.length !== count) {
      throw new Error(
        `Mixed quiz generation produced ${allQuestions.length} questions, expected ${count}`,
      );
    }

    return Response.json({ questions: shuffleArray(allQuestions) });
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return invalidJsonBodyResponse();
    }
    logApiError("Mixed quiz generation error", error);
    return Response.json(
      { error: "Failed to generate quiz questions" },
      { status: 500 },
    );
  }
}
