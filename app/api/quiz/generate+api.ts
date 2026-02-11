import { generateQuizQuestions } from "@shared/quiz";

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toLanguage(value: unknown): "en" | "de" | null {
  if (value === undefined || value === null) return "en";
  return value === "en" || value === "de" ? value : null;
}

function toQuestionCount(value: unknown): number {
  const parsed = toNumber(value, 5);
  return Math.min(20, Math.max(1, parsed));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      topicId?: string;
      count?: number;
      language?: string;
      skillLevel?: number;
    };

    const topicId = body?.topicId;
    if (!topicId || typeof topicId !== "string") {
      return Response.json({ error: "topicId is required" }, { status: 400 });
    }

    const count = toQuestionCount(body?.count);
    const language = toLanguage(body?.language);
    if (!language) {
      return Response.json(
        { error: "language must be 'en' or 'de'" },
        { status: 400 },
      );
    }
    const skillLevelRaw = toNumber(body?.skillLevel, 1);
    const skillLevel = Math.min(3, Math.max(1, skillLevelRaw)) as 1 | 2 | 3;

    const questions = await generateQuizQuestions(
      topicId,
      count,
      language,
      skillLevel,
    );
    return Response.json({ questions });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return Response.json(
      { error: "Failed to generate quiz questions" },
      { status: 500 },
    );
  }
}
