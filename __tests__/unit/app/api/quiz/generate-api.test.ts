jest.mock("@shared/quiz", () => ({
  generateQuizQuestions: jest.fn(),
}));

import { generateQuizQuestions } from "@shared/quiz";
import { POST } from "../../../../../app/api/quiz/generate+api";

const mockGenerateQuizQuestions = jest.mocked(generateQuizQuestions);

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/quiz/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/quiz/generate", () => {
  beforeEach(() => {
    mockGenerateQuizQuestions.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 400 when topicId is missing", async () => {
    const response = await POST(createRequest({ count: 5 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "topicId is required" });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
  });

  it("returns 400 when language is invalid", async () => {
    const response = await POST(
      createRequest({ topicId: "variables", language: "fr" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "language must be 'en' or 'de'" });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
  });

  it("uses defaults and clamps skill level", async () => {
    mockGenerateQuizQuestions.mockResolvedValueOnce([
      {
        id: "q1",
        question: "Q?",
        options: ["A", "B", "C", "D"],
        correctIndex: 0,
        explanation: "Because",
      },
    ]);

    const response = await POST(
      createRequest({
        topicId: "variables",
        count: "7",
        skillLevel: 99,
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith(
      "variables",
      7,
      "en",
      3,
    );
    expect(data.questions).toHaveLength(1);
  });

  it("uses fallback count when count is invalid", async () => {
    mockGenerateQuizQuestions.mockResolvedValueOnce([]);

    await POST(
      createRequest({
        topicId: "loops",
        count: "abc",
        language: "de",
        skillLevel: -3,
      }),
    );

    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith("loops", 5, "de", 1);
  });

  it("caps count to maximum to avoid oversized generation", async () => {
    mockGenerateQuizQuestions.mockResolvedValueOnce([]);

    await POST(
      createRequest({
        topicId: "variables",
        count: 100000,
      }),
    );

    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith(
      "variables",
      20,
      "en",
      1,
    );
  });

  it("returns 500 when generator fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockGenerateQuizQuestions.mockRejectedValueOnce(new Error("network down"));

    const response = await POST(createRequest({ topicId: "variables" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to generate quiz questions" });
  });
});
