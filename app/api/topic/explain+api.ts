import { generateTopicExplanation } from "@shared/quiz";

function toLanguage(value: unknown): "en" | "de" | null {
  if (value === undefined || value === null) return "en";
  return value === "en" || value === "de" ? value : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      topicId?: string;
      language?: string;
    };

    const topicId = body?.topicId;
    if (!topicId || typeof topicId !== "string") {
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
    console.error("Topic explanation error:", error);
    return Response.json(
      { error: "Failed to generate topic explanation" },
      { status: 500 },
    );
  }
}
