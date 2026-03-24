import * as https from "node:https";
import type { IncomingMessage } from "node:http";
import { EventEmitter } from "node:events";
import { generateMixedQuizQuestions, generateQuizQuestions } from "@server/quiz";

type MockResponseInit = {
  ok?: boolean;
  status?: number;
  statusText?: string;
  text?: string;
  json?: unknown;
  jsonError?: unknown;
};

function mockFetchResponse({
  ok = true,
  status = 200,
  statusText = "OK",
  text = "",
  json = {},
  jsonError,
}: MockResponseInit): Response {
  return {
    ok,
    status,
    statusText,
    text: async () => text,
    json: async () => {
      if (jsonError !== undefined) {
        throw jsonError;
      }
      return json;
    },
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

function buildStructuredQuizQuestions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    question: `Q${index + 1}?`,
    code: null,
    options: ["A", "B", "C", "D"],
    correctIndex: 0,
    explanation: `Because ${index + 1}`,
  }));
}

function buildStructuredMixedQuizQuestions(
  topicPlan: { topicId: string; questionCount: number }[],
) {
  return topicPlan.flatMap(({ topicId, questionCount }) =>
    Array.from({ length: questionCount }, (_, index) => ({
      topicId,
      question: `${topicId} Q${index + 1}?`,
      code: null,
      options: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: `Because ${topicId} ${index + 1}`,
    })),
  );
}

type StructuredQuizQuestionOverrides = {
  question?: unknown;
  code?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
};

function buildStructuredQuizQuestion(
  overrides: StructuredQuizQuestionOverrides = {},
) {
  return {
    question: "Q?",
    code: null,
    options: ["A", "B", "C", "D"],
    correctIndex: 0,
    explanation: "Because",
    ...overrides,
  };
}

function mockHttpsJsonResponse(json: unknown): {
  requestSpy: jest.SpyInstance;
  getLastTimeoutMs: () => number | undefined;
} {
  let lastTimeoutMs: number | undefined;
  const requestSpy = jest.spyOn(https, "request").mockImplementation(((
    ...args: unknown[]
  ) => {
    const callback = args[2] as
      | ((response: IncomingMessage) => void)
      | undefined;
    const requestEmitter = new EventEmitter() as EventEmitter & {
      setTimeout: (timeoutMs: number, cb: () => void) => typeof requestEmitter;
      write: (chunk: string) => boolean;
      end: () => void;
      destroy: (error?: Error) => void;
    };

    requestEmitter.setTimeout = (timeoutMs: number) => {
      lastTimeoutMs = timeoutMs;
      return requestEmitter;
    };
    requestEmitter.write = () => true;
    requestEmitter.end = () => {
      const responseEmitter = new EventEmitter() as EventEmitter & {
        statusCode?: number;
        setEncoding: (encoding: BufferEncoding) => void;
      };
      responseEmitter.statusCode = 200;
      responseEmitter.setEncoding = () => {};
      callback?.(responseEmitter as unknown as IncomingMessage);
      responseEmitter.emit("data", JSON.stringify(json));
      responseEmitter.emit("end");
    };
    requestEmitter.destroy = (error?: Error) => {
      if (error) {
        requestEmitter.emit("error", error);
      }
    };

    return requestEmitter as unknown as ReturnType<typeof https.request>;
  }) as typeof https.request);
  return { requestSpy, getLastTimeoutMs: () => lastTimeoutMs };
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
    delete process.env.OPENAI_REQUEST_TIMEOUT_MS;

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
              '{"questions":[{"question":"Q?","code":null,"options":["A","B","C","D"],"correctIndex":0,"explanation":"Because"}]}',
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

      const fetchOptions = fetchMock.mock.calls[0][1] as RequestInit;
      const payload = JSON.parse(String(fetchOptions.body)) as {
        model: string;
        max_output_tokens: number;
        text: {
          format: {
            type: string;
            name: string;
            strict: boolean;
            schema: { required: string[] };
          };
        };
      };

      expect(payload.model).toBe("gpt-5.4-nano");
      expect(payload.text.format.type).toBe("json_schema");
      expect(payload.text.format.name).toBe("quiz_questions");
      expect(payload.text.format.strict).toBe(true);
      expect(payload.text.format.schema.required).toEqual(["questions"]);
      expect(payload.max_output_tokens).toBe(4096);
    });

    it("scales max_output_tokens for larger quiz counts", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: buildStructuredQuizQuestions(20),
            }),
          },
        }),
      );

      const questions = await generateQuizQuestions(
        "javascript",
        "variables",
        20,
        "en",
        1,
      );

      expect(questions).toHaveLength(20);

      const fetchOptions = fetchMock.mock.calls[0][1] as RequestInit;
      const payload = JSON.parse(String(fetchOptions.body)) as {
        max_output_tokens: number;
      };

      expect(payload.max_output_tokens).toBe(6000);
    });

    it("normalizes null code values and assigns stable IDs", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text:
              '{"questions":[{"question":"What is const?","code":null,"options":["A","B","C","D"],"correctIndex":1,"explanation":"Because"}]}',
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
      expect(question.question).toBe("What is const?");
      expect(question.code).toBeUndefined();
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
                    text: '{"questions":[{"question":"Q?","code":"for (let i = 0; i < 1; i += 1) {}","options":["A","B","C","D"],"correctIndex":2,"explanation":"E"}]}',
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
      expect(questions[0].code).toContain("for");
    });

    it("extracts markdown code blocks from question text when code is missing", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                {
                  question:
                    'Was gibt dieser Code aus?\n\n```javascript\nfunction greet(name, callback) {\n  console.log("Hallo " + name);\n  callback();\n}\n\ngreet("Mia", function() {\n  console.log("Willkommen!");\n});\n```',
                  code: null,
                  options: ["A", "B", "C", "D"],
                  correctIndex: 0,
                  explanation: "Because",
                },
              ],
            }),
          },
        }),
      );

      const [question] = await generateQuizQuestions(
        "javascript",
        "functions",
        1,
        "de",
        1,
      );

      expect(question.question).toBe("Was gibt dieser Code aus?");
      expect(question.code).toContain('console.log("Hallo " + name);');
      expect(question.code).not.toContain("```");
    });

    it("throws when normalized code is an empty string", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                buildStructuredQuizQuestion({
                  question: "What does this do?",
                  code: "   ",
                }),
              ],
            }),
          },
        }),
      );

      await expect(
        generateQuizQuestions("javascript", "functions", 1, "en", 1),
      ).rejects.toThrow("Invalid quiz question at index 0: code is empty");
    });

    it("removes duplicate markdown code blocks from question text", async () => {
      const code =
        'function greet(name, callback) {\n  console.log("Hallo " + name);\n  callback();\n}\n\ngreet("Mia", function() {\n  console.log("Willkommen!");\n});';

      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                {
                  question: `Was gibt dieser Code aus?\n\n\`\`\`javascript\n${code}\n\`\`\``,
                  code,
                  options: ["A", "B", "C", "D"],
                  correctIndex: 0,
                  explanation: "Because",
                },
              ],
            }),
          },
        }),
      );

      const [question] = await generateQuizQuestions(
        "javascript",
        "functions",
        1,
        "de",
        1,
      );

      expect(question.question).toBe("Was gibt dieser Code aus?");
      expect(question.code).toBe(code);
    });

    it("includes programming language and full question content in stable ID input", async () => {
      fetchMock
        .mockResolvedValueOnce(
          mockFetchResponse({
            json: {
              output_text: JSON.stringify({
                questions: [
                  {
                    question: "Q?",
                    code: "console.log('js');",
                    options: ["A", "B", "C", "D"],
                    correctIndex: 0,
                    explanation: "JavaScript explanation",
                  },
                ],
              }),
            },
          }),
        )
        .mockResolvedValueOnce(
          mockFetchResponse({
            json: {
              output_text: JSON.stringify({
                questions: [
                  {
                    question: "Q?",
                    code: "print('py')",
                    options: ["A", "B", "C", "D"],
                    correctIndex: 0,
                    explanation: "Python explanation",
                  },
                ],
              }),
            },
          }),
        );

      const [javascriptQuestion] = await generateQuizQuestions(
        "javascript",
        "data-types",
        1,
        "en",
        1,
      );
      const [pythonQuestion] = await generateQuizQuestions(
        "python",
        "data-types",
        1,
        "en",
        1,
      );

      expect(javascriptQuestion.id).toMatch(/^data-types-[a-f0-9]{12}$/);
      expect(pythonQuestion.id).toMatch(/^data-types-[a-f0-9]{12}$/);

      const digestMock = jest.mocked(global.crypto.subtle.digest);
      const firstDigestInput = new TextDecoder().decode(
        digestMock.mock.calls[0][1] as BufferSource,
      );
      const secondDigestInput = new TextDecoder().decode(
        digestMock.mock.calls[1][1] as BufferSource,
      );

      expect(firstDigestInput).toContain('"programmingLanguage":"javascript"');
      expect(firstDigestInput).toContain('"code":"console.log(\'js\');"');
      expect(firstDigestInput).toContain(
        '"explanation":"JavaScript explanation"',
      );
      expect(secondDigestInput).toContain('"programmingLanguage":"python"');
      expect(secondDigestInput).toContain('"code":"print(\'py\')"');
      expect(secondDigestInput).toContain('"explanation":"Python explanation"');
      expect(firstDigestInput).not.toBe(secondDigestInput);
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

    it("throws when question text is not a string", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [buildStructuredQuizQuestion({ question: 42 })],
            }),
          },
        }),
      );

      await expect(
        generateQuizQuestions("javascript", "variables", 1),
      ).rejects.toThrow(
        "Invalid quiz question at index 0: question text must be a string",
      );
    });

    it("throws when answer options are not non-empty strings", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                buildStructuredQuizQuestion({
                  options: ["A", " ", "C", "D"],
                }),
              ],
            }),
          },
        }),
      );

      await expect(
        generateQuizQuestions("javascript", "variables", 1),
      ).rejects.toThrow(
        "Invalid quiz question at index 0: answer options must be non-empty strings",
      );
    });

    it("throws when explanation is empty", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                buildStructuredQuizQuestion({
                  explanation: "   ",
                }),
              ],
            }),
          },
        }),
      );

      await expect(
        generateQuizQuestions("javascript", "variables", 1),
      ).rejects.toThrow(
        "Invalid quiz question at index 0: explanation is empty",
      );
    });

    it("throws when OpenAI returns invalid JSON", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          jsonError: new SyntaxError("Unexpected token < in JSON"),
        }),
      );

      await expect(
        generateQuizQuestions("javascript", "variables"),
      ).rejects.toThrow("Invalid JSON response from OpenAI");
    });

    it("uses python language context when generating python quizzes", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text:
              '{"questions":[{"question":"Q?","code":null,"options":["A","B","C","D"],"correctIndex":0,"explanation":"Because"}]}',
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
      expect(payload.input).toContain(
        'Use "code": null when a code snippet is not needed',
      );
      expect(payload.input).toContain(
        "Do not include Markdown fences or code snippets in the question text",
      );
    });

    it("throws when OpenAI refuses the quiz request", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output: [
              {
                content: [
                  {
                    type: "refusal",
                    refusal: "I cannot help with that.",
                  },
                ],
              },
            ],
          },
        }),
      );

      await expect(
        generateQuizQuestions("javascript", "variables"),
      ).rejects.toThrow("OpenAI refused the request: I cannot help with that.");
    });

    it("throws when quiz output is incomplete", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            status: "incomplete",
            incomplete_details: {
              reason: "max_output_tokens",
            },
          },
        }),
      );

      await expect(
        generateQuizQuestions("javascript", "variables"),
      ).rejects.toThrow("OpenAI response incomplete: max_output_tokens");
    });
  });

  describe("generateMixedQuizQuestions", () => {
    it("returns an empty array when the mixed topic plan is empty", async () => {
      await expect(
        generateMixedQuizQuestions("javascript", [], "en", 1),
      ).resolves.toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("throws when the mixed topic plan contains duplicate topicIds", async () => {
      await expect(
        generateMixedQuizQuestions(
          "javascript",
          [
            { topicId: "loops", questionCount: 1 },
            { topicId: "loops", questionCount: 1 },
          ],
          "en",
          1,
        ),
      ).rejects.toThrow("Mixed topic plan contains duplicate topicIds");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("generates a mixed quiz in a single request with topic-aware IDs", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: buildStructuredMixedQuizQuestions([
                { topicId: "loops", questionCount: 2 },
                { topicId: "variables", questionCount: 1 },
              ]),
            }),
          },
        }),
      );

      const questions = await generateMixedQuizQuestions(
        "javascript",
        [
          { topicId: "loops", questionCount: 2 },
          { topicId: "variables", questionCount: 1 },
        ],
        "de",
        2,
      );

      expect(questions).toHaveLength(3);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(questions[0].id).toMatch(/^loops-[a-f0-9]{12}$/);
      expect(questions[1].id).toMatch(/^loops-[a-f0-9]{12}$/);
      expect(questions[2].id).toMatch(/^variables-[a-f0-9]{12}$/);
      expect("topicId" in questions[0]).toBe(false);

      const fetchOptions = fetchMock.mock.calls[0][1] as RequestInit;
      const payload = JSON.parse(String(fetchOptions.body)) as {
        input: string;
        text: {
          format: {
            name: string;
            schema: {
              properties: {
                questions: {
                  items: {
                    properties: {
                      topicId: {
                        enum: string[];
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };

      expect(payload.text.format.name).toBe("mixed_quiz_questions");
      expect(
        payload.text.format.schema.properties.questions.items.properties.topicId
          .enum,
      ).toEqual(["loops", "variables"]);
      expect(payload.input).toContain("TOPIC PLAN:");
      expect(payload.input).toContain(
        "- loops: exactly 2 question(s) about JavaScript for, while, do-while, and for...of loops",
      );
      expect(payload.input).toContain(
        "- variables: exactly 1 question(s) about JavaScript variable declarations using let and const only (do not include var), including block scope and when to use each",
      );
      expect(payload.input).toContain(
        "Include a topicId field on every question using only the topic IDs from the topic plan",
      );
    });

    it("throws when mixed quiz output violates the requested topic plan", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: buildStructuredMixedQuizQuestions([
                { topicId: "loops", questionCount: 2 },
              ]),
            }),
          },
        }),
      );

      await expect(
        generateMixedQuizQuestions(
          "javascript",
          [
            { topicId: "loops", questionCount: 1 },
            { topicId: "variables", questionCount: 1 },
          ],
          "en",
          1,
        ),
      ).rejects.toThrow(
        "OpenAI returned 2 questions for topic 'loops', expected 1",
      );
    });
  });
});
