import {
  generateQuizQuestions,
  TOPIC_PROMPTS,
  type QuizQuestion,
} from "@shared/quiz";
import { logApiError } from "@shared/logging";

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toQuestionCount(value: unknown): number {
  const parsed = toNumber(value, 10);
  return Math.min(20, Math.max(1, parsed));
}

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
    };

    const count = toQuestionCount(body?.count);
    if (hasTooManyTopicIds(body?.topicIds)) {
      return Response.json(
        { error: "topicIds cannot contain more than 20 entries" },
        { status: 400 },
      );
    }
    const language = typeof body?.language === "string" ? body.language : "en";

    const allTopicKeys = Object.keys(TOPIC_PROMPTS);
    let selectedTopics: string[];
    if (Array.isArray(body?.topicIds) && body.topicIds.length > 0) {
      selectedTopics = body.topicIds.filter((id) => allTopicKeys.includes(id));
      if (selectedTopics.length === 0) {
        return Response.json({ error: "No valid topic IDs" }, { status: 400 });
      }
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
        topicId,
        questionsPerTopic,
        language,
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
