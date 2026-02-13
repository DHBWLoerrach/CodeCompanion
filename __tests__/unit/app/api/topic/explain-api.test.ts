jest.mock("@server/quiz", () => ({
  generateTopicExplanation: jest.fn(),
}));

import { generateTopicExplanation } from "@server/quiz";
import { POST } from "../../../../../app/api/topic/explain+api";

const mockGenerateTopicExplanation = jest.mocked(generateTopicExplanation);

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/topic/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/topic/explain", () => {
  beforeEach(() => {
    mockGenerateTopicExplanation.mockReset();
  });

  it("returns 400 when topicId is missing", async () => {
    const response = await POST(createRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "topicId is required" });
    expect(mockGenerateTopicExplanation).not.toHaveBeenCalled();
  });

  it("returns 400 when language is invalid", async () => {
    const response = await POST(
      createRequest({ topicId: "variables", language: "fr" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "language must be 'en' or 'de'" });
    expect(mockGenerateTopicExplanation).not.toHaveBeenCalled();
  });

  it("uses default language en", async () => {
    mockGenerateTopicExplanation.mockResolvedValueOnce("Explanation text");

    const response = await POST(createRequest({ topicId: "variables" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateTopicExplanation).toHaveBeenCalledWith(
      "javascript",
      "variables",
      "en",
    );
    expect(data).toEqual({ explanation: "Explanation text" });
  });

  it("uses provided language", async () => {
    mockGenerateTopicExplanation.mockResolvedValueOnce("Erklaerung");

    await POST(createRequest({ topicId: "variables", language: "de" }));

    expect(mockGenerateTopicExplanation).toHaveBeenCalledWith(
      "javascript",
      "variables",
      "de",
    );
  });

  it("returns 500 when explanation generation fails", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env = { ...process.env, NODE_ENV: "production" };
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockGenerateTopicExplanation.mockRejectedValueOnce(
      new Error("OpenAI down"),
    );

    const response = await POST(createRequest({ topicId: "variables" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to generate topic explanation" });
    expect(errorSpy).toHaveBeenCalledWith(
      "Topic explanation error: OpenAI down",
    );
    process.env = { ...process.env, NODE_ENV: originalEnv };
  });
});
