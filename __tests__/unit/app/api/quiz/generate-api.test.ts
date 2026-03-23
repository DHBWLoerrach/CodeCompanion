import { generateQuizQuestions } from "@server/quiz";
import { POST } from "../../../../../app/api/quiz/generate+api";

jest.mock("@server/quiz", () => ({
  generateQuizQuestions: jest.fn(),
}));

const mockGenerateQuizQuestions = jest.mocked(generateQuizQuestions);

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/quiz/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createInvalidJsonRequest(): Request {
  return new Request("http://localhost/api/quiz/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
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

  it("returns 400 when request body is invalid JSON", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(createInvalidJsonRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Request body must be valid JSON" });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
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

  it("returns 400 when programmingLanguage is invalid", async () => {
    const response = await POST(
      createRequest({
        topicId: "variables",
        programmingLanguage: "rust",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "programmingLanguage must be one of: javascript, python, java",
    });
    expect(mockGenerateQuizQuestions).not.toHaveBeenCalled();
  });

  it("returns 400 when topicId is invalid for programmingLanguage", async () => {
    const response = await POST(
      createRequest({
        topicId: "variables",
        programmingLanguage: "python",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Invalid topicId for programmingLanguage",
    });
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
      "javascript",
      "variables",
      7,
      "en",
      3,
    );
    expect(data.questions).toHaveLength(1);
  });

  it("truncates decimal count and skill level", async () => {
    mockGenerateQuizQuestions.mockResolvedValueOnce([]);

    await POST(
      createRequest({
        topicId: "variables",
        count: 2.9,
        skillLevel: 2.8,
      }),
    );

    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith(
      "javascript",
      "variables",
      2,
      "en",
      2,
    );
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

    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith(
      "javascript",
      "loops",
      5,
      "de",
      1,
    );
  });

  it("uses fallback count when count is null", async () => {
    mockGenerateQuizQuestions.mockResolvedValueOnce([]);

    await POST(
      createRequest({
        topicId: "loops",
        count: null,
      }),
    );

    expect(mockGenerateQuizQuestions).toHaveBeenCalledWith(
      "javascript",
      "loops",
      5,
      "en",
      1,
    );
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
      "javascript",
      "variables",
      20,
      "en",
      1,
    );
  });

  it("returns 500 when generator fails", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env = { ...process.env, NODE_ENV: "production" };
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockGenerateQuizQuestions.mockRejectedValueOnce(new Error("network down"));

    const response = await POST(createRequest({ topicId: "variables" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to generate quiz questions" });
    expect(errorSpy).toHaveBeenCalledWith(
      "Quiz generation error: network down",
    );
    process.env = { ...process.env, NODE_ENV: originalEnv };
  });
});
