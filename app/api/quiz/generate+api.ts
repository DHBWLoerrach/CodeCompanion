import { generateQuizQuestions } from "@shared/quiz";
import { logApiError } from "@shared/logging";
import {
  requireTopicId,
  toLanguage,
  toQuestionCount,
  toQuizDifficultyLevel,
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
    const skillLevel = toQuizDifficultyLevel(body?.skillLevel, 1);

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
