import { generateTopicExplanation } from "@server/quiz";
import { logApiError } from "@server/logging";
import {
  invalidJsonBodyResponse,
  InvalidJsonBodyError,
  parseJsonBody,
} from "@server/request";
import {
  requireTopicId,
  toLanguage,
  toProgrammingLanguage,
  validateTopicIdForLanguage,
} from "@server/validation";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{
      topicId?: string;
      language?: string;
      programmingLanguage?: string;
    }>(request);

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
    if (!programmingLanguage) {
      return Response.json(
        {
          error: "programmingLanguage must be one of: javascript, python, java",
        },
        { status: 400 },
      );
    }
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
    if (error instanceof InvalidJsonBodyError) {
      return invalidJsonBodyResponse();
    }
    logApiError("Topic explanation error", error);
    return Response.json(
      { error: "Failed to generate topic explanation" },
      { status: 500 },
    );
  }
}
