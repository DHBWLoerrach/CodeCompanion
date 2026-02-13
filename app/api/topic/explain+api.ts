import { generateTopicExplanation } from "@server/quiz";
import { logApiError } from "@server/logging";
import {
  requireTopicId,
  toLanguage,
  toProgrammingLanguage,
  validateTopicIdForLanguage,
} from "@server/validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      topicId?: string;
      language?: string;
      programmingLanguage?: string;
    };

    const topicId = requireTopicId(body?.topicId);
    if (!topicId) {
      return Response.json({ error: "topicId is required" }, { status: 400 });
    }

    const language = toLanguage(body?.language);
    if (!language) {
      return Response.json(
        { error: "language must be 'en' or 'de'" },
        { status: 400 },
      );
    }
    const programmingLanguage = toProgrammingLanguage(
      body?.programmingLanguage,
    );
    if (!validateTopicIdForLanguage(topicId, programmingLanguage)) {
      return Response.json(
        { error: "Invalid topicId for programmingLanguage" },
        { status: 400 },
      );
    }
    const explanation = await generateTopicExplanation(
      programmingLanguage,
      topicId,
      language,
    );

    return Response.json({ explanation });
  } catch (error) {
    logApiError("Topic explanation error", error);
    return Response.json(
      { error: "Failed to generate topic explanation" },
      { status: 500 },
    );
  }
}
