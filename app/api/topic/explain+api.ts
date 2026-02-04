import { generateTopicExplanation } from "@shared/quiz";

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

    const language = typeof body?.language === "string" ? body.language : "en";
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
