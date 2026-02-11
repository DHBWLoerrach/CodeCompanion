jest.mock("@shared/quiz", () => ({
  generateQuizQuestions: jest.fn(),
  TOPIC_PROMPTS: {
    variables: "Variables",
    loops: "Loops",
    promises: "Promises",
  },
}));

import { generateQuizQuestions } from "@shared/quiz";
import { POST } from "../../../../../app/api/quiz/generate-mixed+api";

const mockGenerateQuizQuestions = jest.mocked(generateQuizQuestions);

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/quiz/generate-mixed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildQuestions(topicId: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${topicId}-${index + 1}`,
    question: `${topicId} question ${index + 1}`,
    options: ["A", "B", "C", "D"],
    correctIndex: 0,
    explanation: "Because",
  }));
}

describe("POST /api/quiz/generate-mixed", () => {
  beforeEach(() => {
    mockGenerateQuizQuestions.mockReset();
    mockGenerateQuizQuestions.mockImplementation(async (topicId, count = 5) =>
      buildQuestions(topicId, count),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 400 when provided topic IDs are all invalid", async () => {
    const response = await POST(
      createRequest({ topicIds: ["invalid-a", "invalid-b"] }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "No valid topic IDs" });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
  });

  it("returns 400 when topicIds exceeds maximum size", async () => {
    const topicIds = Array.from({ length: 21 }, () => "variables");
    const response = await POST(createRequest({ topicIds }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "topicIds cannot contain more than 20 entries",
    });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
  });

  it("filters topicIds and generates requested count", async () => {
    const response = await POST(
      createRequest({
        topicIds: ["loops", "invalid", "variables"],
        count: 5,
        language: "de",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateQuizQuestions).toHaveBeenCalledTimes(2);
    expect(mockGenerateQuizQuestions).toHaveBeenNthCalledWith(
      1,
      "loops",
      3,
      "de",
    );
    expect(mockGenerateQuizQuestions).toHaveBeenNthCalledWith(
      2,
      "variables",
      3,
      "de",
    );
    expect(data.questions).toHaveLength(5);
  });

  it("uses default topics/count/language when omitted", async () => {
    const response = await POST(createRequest({}));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateQuizQuestions).toHaveBeenCalledTimes(3);
    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith(
      "variables",
      4,
      "en",
    );
    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith("loops", 4, "en");
    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith("promises", 4, "en");
    expect(data.questions).toHaveLength(10);
  });

  it("caps count to maximum to avoid oversized mixed quiz generation", async () => {
    const response = await POST(
      createRequest({
        topicIds: ["loops", "variables"],
        count: 100000,
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateQuizQuestions).toHaveBeenCalledTimes(2);
    expect(mockGenerateQuizQuestions).toHaveBeenNthCalledWith(
      1,
      "loops",
      10,
      "en",
    );
    expect(mockGenerateQuizQuestions).toHaveBeenNthCalledWith(
      2,
      "variables",
      10,
      "en",
    );
    expect(data.questions).toHaveLength(20);
  });

  it("returns 500 when generation fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockGenerateQuizQuestions.mockRejectedValueOnce(
      new Error("upstream error"),
    );

    const response = await POST(createRequest({ topicIds: ["variables"] }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to generate quiz questions" });
  });
});
