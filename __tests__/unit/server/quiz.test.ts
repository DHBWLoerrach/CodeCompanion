import {
  generateQuizQuestions,
  generateTopicExplanation,
  getAvailableTopicIds,
} from "@server/quiz";

type MockResponseInit = {
  ok?: boolean;
  status?: number;
  statusText?: string;
  text?: string;
  json?: unknown;
};

function mockFetchResponse({
  ok = true,
  status = 200,
  statusText = "OK",
  text = "",
  json = {},
}: MockResponseInit): Response {
  return {
    ok,
    status,
    statusText,
    text: async () => text,
    json: async () => json,
  } as Response;
}

function mockDigest(input: BufferSource): Promise<ArrayBuffer> {
  const source = new Uint8Array(input as ArrayBuffer);
  const output = new Uint8Array(32);
  for (let i = 0; i < output.length; i += 1) {
    const base = source.length > 0 ? source[i % source.length] : 0;
    output[i] = (base + i * 13) % 256;
  }
  return Promise.resolve(output.buffer);
}

describe("server/quiz", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  const originalCrypto = global.crypto;
  const fetchMock = jest.fn<
    Promise<Response>,
    [RequestInfo | URL, RequestInit?]
  >();

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-key",
    };
    delete process.env.OPENAI_MODEL;

    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    global.crypto = {
      subtle: {
        digest: jest.fn(mockDigest),
      },
    } as unknown as Crypto;
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    global.crypto = originalCrypto;
  });

  describe("getAvailableTopicIds", () => {
    it("returns language-specific topic IDs from curriculum", () => {
      expect(getAvailableTopicIds("javascript")).toContain("variables");
      expect(getAvailableTopicIds("python")).toContain("variables-assignment");
      expect(getAvailableTopicIds("java")).toContain("variables-constants");
    });
  });

  describe("generateQuizQuestions", () => {
    it("throws when API key is missing", async () => {
      delete process.env.OPENAI_API_KEY;

      await expect(
        generateQuizQuestions("javascript", "variables"),
      ).rejects.toThrow("OPENAI_API_KEY is not set");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("uses default OpenAI base URL", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text:
              '{"questions":[{"id":"x","question":"Q?","options":["A","B","C","D"],"correctIndex":0,"explanation":"Because"}]}',
          },
        }),
      );

      const questions = await generateQuizQuestions(
        "javascript",
        "variables",
        1,
        "en",
        1,
      );

      expect(questions).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0].toString()).toBe(
        "https://api.openai.com/v1/responses",
      );
    });

    it("parses fenced JSON and assigns stable IDs", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text:
              '```json\n[{"id":"original-1","question":"What is const?","options":["A","B","C","D"],"correctIndex":1,"explanation":"Because"}]\n```',
          },
        }),
      );

      const [question] = await generateQuizQuestions(
        "javascript",
        "variables",
        1,
        "en",
        1,
      );

      expect(question.id).toMatch(/^variables-[a-f0-9]{12}$/);
      expect(question.id).not.toBe("original-1");
      expect(question.question).toBe("What is const?");
    });

    it("parses wrapped questions from output content blocks", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output: [
              {
                content: [
                  {
                    type: "output_text",
                    text: '{"questions":[{"id":"q1","question":"Q?","options":["A","B","C","D"],"correctIndex":2,"explanation":"E"}]}',
                  },
                ],
              },
            ],
          },
        }),
      );

      const questions = await generateQuizQuestions(
        "javascript",
        "loops",
        1,
        "en",
        2,
      );

      expect(questions).toHaveLength(1);
      expect(questions[0].correctIndex).toBe(2);
      expect(questions[0].id).toMatch(/^loops-[a-f0-9]{12}$/);
    });

    it("throws on non-ok OpenAI response", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          ok: false,
          status: 500,
          text: "upstream failed",
        }),
      );

      await expect(
        generateQuizQuestions("javascript", "variables"),
      ).rejects.toThrow("OpenAI request failed with status 500");
    });

    it("throws when response content is empty", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output: [],
          },
        }),
      );

      await expect(
        generateQuizQuestions("javascript", "variables"),
      ).rejects.toThrow("Empty response from OpenAI");
    });

    it("uses python language context when generating python quizzes", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text:
              '{"questions":[{"id":"x","question":"Q?","options":["A","B","C","D"],"correctIndex":0,"explanation":"Because"}]}',
          },
        }),
      );

      await generateQuizQuestions("python", "variables-assignment", 1, "en", 1);

      const fetchOptions = fetchMock.mock.calls[0][1] as RequestInit;
      const payload = JSON.parse(String(fetchOptions.body)) as {
        instructions: string;
        input: string;
      };

      expect(payload.instructions).toContain("Python programming tutor");
      expect(payload.input).toContain("Python variable assignment");
    });
  });

  describe("generateTopicExplanation", () => {
    it("returns explanation from output_text", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: { output_text: "## Introduction\nText" },
        }),
      );

      const explanation = await generateTopicExplanation(
        "javascript",
        "promises",
        "en",
      );

      expect(explanation).toBe("## Introduction\nText");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("uses language-specific instructions for German", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: { output_text: "## Einfuhrung\nText" },
        }),
      );

      await generateTopicExplanation("javascript", "promises", "de");

      const fetchOptions = fetchMock.mock.calls[0][1] as RequestInit;
      const payload = JSON.parse(String(fetchOptions.body)) as {
        instructions: string;
        input: string;
      };

      expect(payload.instructions).toContain("Respond in German.");
      expect(payload.input).toContain("Write the ENTIRE explanation in German");
    });

    it("throws when explanation response is empty", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: { output: [] },
        }),
      );

      await expect(
        generateTopicExplanation("javascript", "promises"),
      ).rejects.toThrow("Empty response from OpenAI");
    });
  });
});
