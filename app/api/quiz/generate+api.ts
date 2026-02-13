import { generateQuizQuestions } from "@server/quiz";
import { logApiError } from "@server/logging";
import {
  requireTopicId,
  toLanguage,
  toProgrammingLanguage,
  toQuestionCount,
  toQuizDifficultyLevel,
} from "@server/validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      topicId?: string;
      count?: number;
      language?: string;
      skillLevel?: number;
      programmingLanguage?: string;
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
    const programmingLanguage = toProgrammingLanguage(
      body?.programmingLanguage,
    );

    const questions = await generateQuizQuestions(
      programmingLanguage,
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
