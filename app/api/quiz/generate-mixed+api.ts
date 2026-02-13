import {
  generateQuizQuestions,
  getAvailableTopicIds,
  type QuizQuestion,
} from "@server/quiz";
import { logApiError } from "@server/logging";
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      count?: number;
      language?: string;
      topicIds?: string[];
      skillLevel?: number;
      programmingLanguage?: string;
    };

    const count = toQuestionCount(body?.count, 10);
    const skillLevel = toQuizDifficultyLevel(body?.skillLevel, 1);
    const programmingLanguage = toProgrammingLanguage(
      body?.programmingLanguage,
    );
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

    const allTopicKeys = getAvailableTopicIds(programmingLanguage);
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

    if (selectedTopics.length === 0) {
      return Response.json({ error: "No topics available" }, { status: 500 });
    }

    const questionsPerTopic = Math.ceil(count / selectedTopics.length);
    const allQuestions: QuizQuestion[] = [];

    for (const topicId of selectedTopics) {
      const questions = await generateQuizQuestions(
        programmingLanguage,
        topicId,
        questionsPerTopic,
        language,
        skillLevel,
      );
      allQuestions.push(...questions);
    }

    const shuffled = shuffleArray(allQuestions).slice(0, count);
    return Response.json({ questions: shuffled });
  } catch (error) {
    logApiError("Mixed quiz generation error", error);
    return Response.json(
      { error: "Failed to generate quiz questions" },
      { status: 500 },
    );
  }
}
