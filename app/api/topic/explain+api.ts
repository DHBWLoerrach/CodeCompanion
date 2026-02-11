import { generateTopicExplanation } from "@shared/quiz";
import { logApiError } from "@shared/logging";
import { requireTopicId, toLanguage } from "../_lib/validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      topicId?: string;
      language?: string;
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
    const explanation = await generateTopicExplanation(topicId, language);

    return Response.json({ explanation });
  } catch (error) {
    logApiError("Topic explanation error", error);
    return Response.json(
      { error: "Failed to generate topic explanation" },
      { status: 500 },
    );
  }
}
