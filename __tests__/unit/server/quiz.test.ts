import {
  generateMixedQuizQuestions,
  generateQuizQuestions,
} from '@server/quiz';

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
  statusText = 'OK',
  text = '',
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
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanation: `Because ${index + 1}`,
    resultSentence: 'Result: A',
    takeaway: `Remember ${index + 1}`,
    commonMistake: '',
  }));
}

function buildStructuredMixedQuizQuestions(
  topicPlan: { topicId: string; questionCount: number }[]
) {
  return topicPlan.flatMap(({ topicId, questionCount }) =>
    Array.from({ length: questionCount }, (_, index) => ({
      topicId,
      question: `${topicId} Q${index + 1}?`,
      code: null,
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      explanation: `Because ${topicId} ${index + 1}`,
      resultSentence: 'Result: A',
      takeaway: `Remember ${topicId} ${index + 1}`,
      commonMistake: '',
    }))
  );
}

type StructuredQuizQuestionOverrides = {
  question?: unknown;
  code?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
  resultSentence?: unknown;
  takeaway?: unknown;
  commonMistake?: unknown;
};

function buildStructuredQuizQuestion(
  overrides: StructuredQuizQuestionOverrides = {}
) {
  return {
    question: 'Q?',
    code: null,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanation: 'Because',
    resultSentence: 'Result: A',
    takeaway: 'Remember A',
    commonMistake: '',
    ...overrides,
  };
}

describe('server/quiz', () => {
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
      OPENAI_API_KEY: 'test-key',
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

  describe('generateQuizQuestions', () => {
    it('throws when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;

      await expect(
        generateQuizQuestions('javascript', 'variables')
      ).rejects.toThrow('OPENAI_API_KEY is not set');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('uses default OpenAI base URL', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text:
              '{"questions":[{"question":"Q?","code":null,"options":["A","B","C","D"],"correctIndex":0,"explanation":"Because","resultSentence":"Result: A","takeaway":"Remember A","commonMistake":""}]}',
          },
        })
      );

      const questions = await generateQuizQuestions(
        'javascript',
        'variables',
        1,
        'en',
        1
      );

      expect(questions).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0].toString()).toBe(
        'https://api.openai.com/v1/responses'
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

      expect(payload.model).toBe('gpt-5.4-nano');
      expect(payload.text.format.type).toBe('json_schema');
      expect(payload.text.format.name).toBe('quiz_questions');
      expect(payload.text.format.strict).toBe(true);
      expect(payload.text.format.schema.required).toEqual(['questions']);
      expect(payload.max_output_tokens).toBe(4096);
    });

    it('scales max_output_tokens for larger quiz counts', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: buildStructuredQuizQuestions(20),
            }),
          },
        })
      );

      const questions = await generateQuizQuestions(
        'javascript',
        'variables',
        20,
        'en',
        1
      );

      expect(questions).toHaveLength(20);

      const fetchOptions = fetchMock.mock.calls[0][1] as RequestInit;
      const payload = JSON.parse(String(fetchOptions.body)) as {
        max_output_tokens: number;
      };

      expect(payload.max_output_tokens).toBe(6000);
    });

    it('normalizes null code values and assigns stable IDs', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text:
              '{"questions":[{"question":"What is const?","code":null,"options":["A","B","C","D"],"correctIndex":1,"explanation":"Because","resultSentence":"Result: B","takeaway":"Remember const","commonMistake":""}]}',
          },
        })
      );

      const [question] = await generateQuizQuestions(
        'javascript',
        'variables',
        1,
        'en',
        1
      );

      expect(question.id).toMatch(/^variables-[a-f0-9]{12}$/);
      expect(question.question).toBe('What is const?');
      expect(question.code).toBeUndefined();
    });

    it('collapses empty-string commonMistake back to the optional domain field', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text:
              '{"questions":[{"question":"Q?","code":null,"options":["A","B","C","D"],"correctIndex":0,"explanation":"Because","resultSentence":"Result: A","takeaway":"Remember A","commonMistake":""}]}',
          },
        })
      );

      const [question] = await generateQuizQuestions(
        'javascript',
        'variables',
        1,
        'en',
        1
      );

      expect(question.commonMistake).toBeUndefined();
      expect(
        Object.prototype.hasOwnProperty.call(question, 'commonMistake')
      ).toBe(false);
    });

    it('parses wrapped questions from output content blocks', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output: [
              {
                content: [
                  {
                    type: 'output_text',
                    text: '{"questions":[{"question":"Q?","code":"for (let i = 0; i < 1; i += 1) {}","options":["A","B","C","D"],"correctIndex":2,"explanation":"E","resultSentence":"Result: C","takeaway":"Remember loops","commonMistake":""}]}',
                  },
                ],
              },
            ],
          },
        })
      );

      const questions = await generateQuizQuestions(
        'javascript',
        'loops',
        1,
        'en',
        2
      );

      expect(questions).toHaveLength(1);
      expect(questions[0].correctIndex).toBe(2);
      expect(questions[0].id).toMatch(/^loops-[a-f0-9]{12}$/);
      expect(questions[0].code).toContain('for');
    });

    it('extracts markdown code blocks from question text when code is missing', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                {
                  question:
                    'Was gibt dieser Code aus?\n\n```javascript\nfunction greet(name, callback) {\n  console.log("Hallo " + name);\n  callback();\n}\n\ngreet("Mia", function() {\n  console.log("Willkommen!");\n});\n```',
                  code: null,
                  options: ['A', 'B', 'C', 'D'],
                  correctIndex: 0,
                  explanation: 'Because',
                  resultSentence: 'Result: A',
                  takeaway: 'Remember A',
                  commonMistake: '',
                },
              ],
            }),
          },
        })
      );

      const [question] = await generateQuizQuestions(
        'javascript',
        'functions',
        1,
        'de',
        1
      );

      expect(question.question).toBe('Was gibt dieser Code aus?');
      expect(question.code).toContain('console.log("Hallo " + name);');
      expect(question.code).not.toContain('```');
    });

    it('throws when normalized code is an empty string', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                buildStructuredQuizQuestion({
                  question: 'What does this do?',
                  code: '   ',
                }),
              ],
            }),
          },
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'functions', 1, 'en', 1)
      ).rejects.toThrow('Invalid quiz question at index 0: code is empty');
    });

    it('removes duplicate markdown code blocks from question text', async () => {
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
                  options: ['A', 'B', 'C', 'D'],
                  correctIndex: 0,
                  explanation: 'Because',
                  resultSentence: 'Result: A',
                  takeaway: 'Remember A',
                  commonMistake: '',
                },
              ],
            }),
          },
        })
      );

      const [question] = await generateQuizQuestions(
        'javascript',
        'functions',
        1,
        'de',
        1
      );

      expect(question.question).toBe('Was gibt dieser Code aus?');
      expect(question.code).toBe(code);
    });

    it('removes duplicate plain code blocks from question text', async () => {
      const code = "let a = 5; let b = '5';\nconsole.log(a == b);";

      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                {
                  question: `Welche Aussage trifft auf den Operator == im folgenden Code zu?\n\n${code}`,
                  code,
                  options: ['A', 'B', 'C', 'D'],
                  correctIndex: 0,
                  explanation: 'Because',
                  resultSentence: 'Result: A',
                  takeaway: 'Remember A',
                  commonMistake: '',
                },
              ],
            }),
          },
        })
      );

      const [question] = await generateQuizQuestions(
        'javascript',
        'variables',
        1,
        'de',
        1
      );

      expect(question.question).toBe(
        'Welche Aussage trifft auf den Operator == im folgenden Code zu?'
      );
      expect(question.code).toBe(code);
    });

    it('preserves a single literal \\n mention in regular question text', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                {
                  question: 'What does `\\n` represent in a string literal?',
                  code: "const value = 'line1';",
                  options: ['A', 'B', 'C', 'D'],
                  correctIndex: 0,
                  explanation: 'Because',
                  resultSentence: 'Result: A',
                  takeaway: 'Remember A',
                  commonMistake: '',
                },
              ],
            }),
          },
        })
      );

      const [question] = await generateQuizQuestions(
        'javascript',
        'strings',
        1,
        'en',
        1
      );

      expect(question.question).toBe(
        'What does `\\n` represent in a string literal?'
      );
      expect(question.code).toBe("const value = 'line1';");
    });

    it('decodes repeated escaped newlines when removing duplicate code from question text', async () => {
      const code = 'let total = 0;\nconsole.log(total);';

      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                {
                  question:
                    'What does this print?\\n\\nlet total = 0;\\nconsole.log(total);',
                  code,
                  options: ['A', 'B', 'C', 'D'],
                  correctIndex: 0,
                  explanation: 'Because',
                  resultSentence: 'Result: A',
                  takeaway: 'Remember A',
                  commonMistake: '',
                },
              ],
            }),
          },
        })
      );

      const [question] = await generateQuizQuestions(
        'javascript',
        'variables',
        1,
        'en',
        1
      );

      expect(question.question).toBe('What does this print?');
      expect(question.code).toBe(code);
    });

    it('includes programming language and full question content in stable ID input', async () => {
      fetchMock
        .mockResolvedValueOnce(
          mockFetchResponse({
            json: {
              output_text: JSON.stringify({
                questions: [
                  {
                    question: 'Q?',
                    code: "console.log('js');",
                    options: ['A', 'B', 'C', 'D'],
                    correctIndex: 0,
                    explanation: 'JavaScript explanation',
                    resultSentence: 'Result: A',
                    takeaway: 'Remember JS',
                    commonMistake: '',
                  },
                ],
              }),
            },
          })
        )
        .mockResolvedValueOnce(
          mockFetchResponse({
            json: {
              output_text: JSON.stringify({
                questions: [
                  {
                    question: 'Q?',
                    code: "print('py')",
                    options: ['A', 'B', 'C', 'D'],
                    correctIndex: 0,
                    explanation: 'Python explanation',
                    resultSentence: 'Result: A',
                    takeaway: 'Remember Py',
                    commonMistake: '',
                  },
                ],
              }),
            },
          })
        );

      const [javascriptQuestion] = await generateQuizQuestions(
        'javascript',
        'data-types',
        1,
        'en',
        1
      );
      const [pythonQuestion] = await generateQuizQuestions(
        'python',
        'data-types',
        1,
        'en',
        1
      );

      expect(javascriptQuestion.id).toMatch(/^data-types-[a-f0-9]{12}$/);
      expect(pythonQuestion.id).toMatch(/^data-types-[a-f0-9]{12}$/);

      const digestMock = jest.mocked(global.crypto.subtle.digest);
      const firstDigestInput = new TextDecoder().decode(
        digestMock.mock.calls[0][1] as BufferSource
      );
      const secondDigestInput = new TextDecoder().decode(
        digestMock.mock.calls[1][1] as BufferSource
      );

      expect(firstDigestInput).toContain('"programmingLanguage":"javascript"');
      expect(firstDigestInput).toContain('"code":"console.log(\'js\');"');
      expect(firstDigestInput).toContain(
        '"explanation":"JavaScript explanation"'
      );
      expect(firstDigestInput).toContain('"resultSentence":"Result: A"');
      expect(firstDigestInput).toContain('"takeaway":"Remember JS"');
      expect(secondDigestInput).toContain('"programmingLanguage":"python"');
      expect(secondDigestInput).toContain('"code":"print(\'py\')"');
      expect(secondDigestInput).toContain('"explanation":"Python explanation"');
      expect(secondDigestInput).toContain('"takeaway":"Remember Py"');
      expect(firstDigestInput).not.toBe(secondDigestInput);
    });

    it('throws on non-ok OpenAI response', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          ok: false,
          status: 500,
          text: 'upstream failed',
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables')
      ).rejects.toThrow('OpenAI request failed with status 500');
    });

    it('throws when response content is empty', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output: [],
          },
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables')
      ).rejects.toThrow('Empty response from OpenAI');
    });

    it('throws when question text is not a string', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [buildStructuredQuizQuestion({ question: 42 })],
            }),
          },
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables', 1)
      ).rejects.toThrow(
        'Invalid quiz question at index 0: question text must be a string'
      );
    });

    it('throws when answer options are not non-empty strings', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                buildStructuredQuizQuestion({
                  options: ['A', ' ', 'C', 'D'],
                }),
              ],
            }),
          },
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables', 1)
      ).rejects.toThrow(
        'Invalid quiz question at index 0: answer options must be non-empty strings'
      );
    });

    it('throws when answer options contain duplicates', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                buildStructuredQuizQuestion({
                  options: ['A', 'a', 'C', 'D'],
                }),
              ],
            }),
          },
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables', 1)
      ).rejects.toThrow(
        'Invalid quiz question at index 0: answer options contain duplicates'
      );
    });

    it('throws when explanation is empty', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                buildStructuredQuizQuestion({
                  explanation: '   ',
                }),
              ],
            }),
          },
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables', 1)
      ).rejects.toThrow(
        'Invalid quiz question at index 0: explanation is empty'
      );
    });

    it('throws when resultSentence is empty', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                buildStructuredQuizQuestion({
                  resultSentence: '   ',
                }),
              ],
            }),
          },
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables', 1)
      ).rejects.toThrow(
        'Invalid quiz question at index 0: resultSentence is empty'
      );
    });

    it('throws when takeaway is empty', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                buildStructuredQuizQuestion({
                  takeaway: '   ',
                }),
              ],
            }),
          },
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables', 1)
      ).rejects.toThrow('Invalid quiz question at index 0: takeaway is empty');
    });

    it('throws when resultSentence references an option by number or letter', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                buildStructuredQuizQuestion({
                  resultSentence: 'Option A is the result.',
                }),
              ],
            }),
          },
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables', 1)
      ).rejects.toThrow(
        'Invalid quiz question at index 0: resultSentence must not reference options by number or letter'
      );
    });

    it('throws when explanation references an option by number or letter', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: [
                buildStructuredQuizQuestion({
                  explanation: 'Option A is correct because it uses const.',
                }),
              ],
            }),
          },
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables', 1)
      ).rejects.toThrow(
        'Invalid quiz question at index 0: explanation must not reference options by number or letter'
      );
    });

    it('throws when OpenAI returns invalid JSON', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          jsonError: new SyntaxError('Unexpected token < in JSON'),
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables')
      ).rejects.toThrow('Invalid JSON response from OpenAI');
    });

    it('uses python language context when generating python quizzes', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text:
              '{"questions":[{"question":"Q?","code":null,"options":["A","B","C","D"],"correctIndex":0,"explanation":"Because","resultSentence":"Result: A","takeaway":"Remember A","commonMistake":""}]}',
          },
        })
      );

      await generateQuizQuestions('python', 'variables-assignment', 1, 'en', 1);

      const fetchOptions = fetchMock.mock.calls[0][1] as RequestInit;
      const payload = JSON.parse(String(fetchOptions.body)) as {
        instructions: string;
        input: string;
      };

      expect(payload.instructions).toContain('Python programming tutor');
      expect(payload.input).toContain('Python variable assignment');
      expect(payload.input).toContain(
        'Use "code": null when a code snippet is not needed'
      );
      expect(payload.input).toContain(
        'Do not include Markdown fences or code snippets in the question text'
      );
      expect(payload.input).toContain(
        'In the resultSentence, state the correct result in one short sentence'
      );
      expect(payload.input).toContain(
        'In the takeaway, provide one memorable rule the learner should remember'
      );
    });

    it('uses rust language context when generating rust quizzes', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text:
              '{"questions":[{"question":"Q?","code":null,"options":["A","B","C","D"],"correctIndex":0,"explanation":"Because","resultSentence":"Result: A","takeaway":"Remember A","commonMistake":""}]}',
          },
        })
      );

      await generateQuizQuestions('rust', 'ownership', 1, 'en', 1);

      const fetchOptions = fetchMock.mock.calls[0][1] as RequestInit;
      const payload = JSON.parse(String(fetchOptions.body)) as {
        instructions: string;
        input: string;
      };

      expect(payload.instructions).toContain('Rust programming tutor');
      expect(payload.input).toContain(
        'Rust ownership rules, stack vs heap memory, moves, Copy types, and ownership transfer'
      );
      expect(payload.input).toContain(
        'Focus on Rust language fundamentals and idiomatic Rust. Avoid generic programming examples - always use Rust-specific patterns. Emphasize ownership, borrowing, and the borrow checker.'
      );
    });

    it('uses javascript language context when generating javascript quizzes', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text:
              '{"questions":[{"question":"Q?","code":null,"options":["A","B","C","D"],"correctIndex":0,"explanation":"Because","resultSentence":"Result: A","takeaway":"Remember A","commonMistake":""}]}',
          },
        })
      );

      await generateQuizQuestions('javascript', 'data-types', 1, 'en', 1);

      const fetchOptions = fetchMock.mock.calls[0][1] as RequestInit;
      const payload = JSON.parse(String(fetchOptions.body)) as {
        instructions: string;
        input: string;
      };

      expect(payload.instructions).toContain('JavaScript programming tutor');
      expect(payload.input).toContain(
        'JavaScript primitive data types (string, number, boolean, null, undefined, symbol, bigint) and type checking'
      );
      expect(payload.input).toContain(
        'Have exactly one objectively correct option and three objectively incorrect distractors'
      );
      expect(payload.input).toContain(
        'For syntax questions, the three wrong options must contain actual syntax errors; never use alternative valid syntax as a distractor'
      );
      expect(payload.input).toContain(
        'In the commonMistake, briefly explain a common misconception relevant to this question if one exists'
      );
      expect(payload.input).toContain(
        'Avoid web/HTML/CSS context - focus purely on JavaScript language concepts. Always use let and const for variable declarations; never include var in questions or code examples.'
      );
    });

    it('throws when OpenAI refuses the quiz request', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output: [
              {
                content: [
                  {
                    type: 'refusal',
                    refusal: 'I cannot help with that.',
                  },
                ],
              },
            ],
          },
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables')
      ).rejects.toThrow('OpenAI refused the request: I cannot help with that.');
    });

    it('throws when quiz output is incomplete', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            status: 'incomplete',
            incomplete_details: {
              reason: 'max_output_tokens',
            },
          },
        })
      );

      await expect(
        generateQuizQuestions('javascript', 'variables')
      ).rejects.toThrow('OpenAI response incomplete: max_output_tokens');
    });
  });

  describe('generateMixedQuizQuestions', () => {
    it('returns an empty array when the mixed topic plan is empty', async () => {
      await expect(
        generateMixedQuizQuestions('javascript', [], 'en', 1)
      ).resolves.toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws when the mixed topic plan contains duplicate topicIds', async () => {
      await expect(
        generateMixedQuizQuestions(
          'javascript',
          [
            { topicId: 'loops', questionCount: 1 },
            { topicId: 'loops', questionCount: 1 },
          ],
          'en',
          1
        )
      ).rejects.toThrow('Mixed topic plan contains duplicate topicIds');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('generates a mixed quiz in a single request with topic-aware IDs', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: buildStructuredMixedQuizQuestions([
                { topicId: 'loops', questionCount: 2 },
                { topicId: 'variables', questionCount: 1 },
              ]),
            }),
          },
        })
      );

      const questions = await generateMixedQuizQuestions(
        'javascript',
        [
          { topicId: 'loops', questionCount: 2 },
          { topicId: 'variables', questionCount: 1 },
        ],
        'de',
        2
      );

      expect(questions).toHaveLength(3);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(questions[0].id).toMatch(/^loops-[a-f0-9]{12}$/);
      expect(questions[1].id).toMatch(/^loops-[a-f0-9]{12}$/);
      expect(questions[2].id).toMatch(/^variables-[a-f0-9]{12}$/);
      expect(questions[0].topicId).toBe('loops');
      expect(questions[2].topicId).toBe('variables');

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

      expect(payload.text.format.name).toBe('mixed_quiz_questions');
      expect(
        payload.text.format.schema.properties.questions.items.properties.topicId
          .enum
      ).toEqual(['loops', 'variables']);
      expect(payload.input).toContain('TOPIC PLAN:');
      expect(payload.input).toContain(
        '- loops: exactly 2 question(s) about JavaScript for, while, do-while, and for...of loops'
      );
      expect(payload.input).toContain(
        '- variables: exactly 1 question(s) about JavaScript variable declarations using let and const only (do not include var), including block scope and when to use each'
      );
      expect(payload.input).toContain(
        'Avoid web/HTML/CSS context - focus purely on JavaScript language concepts. Always use let and const for variable declarations; never include var in questions or code examples.'
      );
      expect(payload.input).toContain(
        'Include a topicId field on every question using only the topic IDs from the topic plan'
      );
      expect(payload.input).toContain(
        'Have exactly one objectively correct option and three objectively incorrect distractors'
      );
    });

    it('throws when mixed quiz output violates the requested topic plan', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          json: {
            output_text: JSON.stringify({
              questions: buildStructuredMixedQuizQuestions([
                { topicId: 'loops', questionCount: 2 },
              ]),
            }),
          },
        })
      );

      await expect(
        generateMixedQuizQuestions(
          'javascript',
          [
            { topicId: 'loops', questionCount: 1 },
            { topicId: 'variables', questionCount: 1 },
          ],
          'en',
          1
        )
      ).rejects.toThrow(
        "OpenAI returned 2 questions for topic 'loops', expected 1"
      );
    });
  });
});
