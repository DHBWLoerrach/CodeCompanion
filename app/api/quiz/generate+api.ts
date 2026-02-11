import { generateQuizQuestions } from "@shared/quiz";
import { logApiError } from "@shared/logging";
import {
  requireTopicId,
  toLanguage,
  toNumber,
  toQuestionCount,
} from "../_lib/validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      topicId?: string;
      count?: number;
      language?: string;
      skillLevel?: number;
    };

    const topicId = requireTopicId(body?.topicId);
    if (!topicId) {
      return Response.json({ error: "topicId is required" }, { status: 400 });
    }

    const count = toQuestionCount(body?.count, 5);
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
    logApiError("Quiz generation error", error);
    return Response.json(
      { error: "Failed to generate quiz questions" },
      { status: 500 },
    );
  }
}
