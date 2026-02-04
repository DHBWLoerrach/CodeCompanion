import { generateQuizQuestions } from "@shared/quiz";

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

    const count = toNumber(body?.count, 5);
    const language = typeof body?.language === "string" ? body.language : "en";
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
