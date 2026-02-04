import {
  generateQuizQuestions,
  TOPIC_PROMPTS,
  type QuizQuestion,
} from "@shared/quiz";

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      count?: number;
      language?: string;
      topicIds?: string[];
    };

    const count = toNumber(body?.count, 10);
    const language = typeof body?.language === "string" ? body.language : "en";

    const allTopicKeys = Object.keys(TOPIC_PROMPTS);
    let selectedTopics: string[];
    if (Array.isArray(body?.topicIds) && body.topicIds.length > 0) {
      selectedTopics = body.topicIds.filter((id) => allTopicKeys.includes(id));
      if (selectedTopics.length === 0) {
        return Response.json({ error: "No valid topic IDs" }, { status: 400 });
      }
    } else {
      selectedTopics = allTopicKeys
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
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

    const shuffled = allQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
    return Response.json({ questions: shuffled });
  } catch (error) {
    console.error("Mixed quiz generation error:", error);
    return Response.json(
      { error: "Failed to generate quiz questions" },
      { status: 500 },
    );
  }
}
