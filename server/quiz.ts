import * as https from "node:https";
import type { QuizDifficultyLevel } from "@shared/skill-level";
import type { QuizQuestion } from "@shared/quiz-question";
import { getTopicIdsByLanguage } from "@shared/curriculum";
import type { ProgrammingLanguageId } from "@shared/programming-language";
import {
  getTopicPrompt,
  LANGUAGE_CONTEXT_EXCLUSIONS,
  LANGUAGE_NAMES,
} from "./topic-prompts";

type GeneratedQuizQuestion = Omit<QuizQuestion, "id" | "code"> & {
  code?: string;
};

type StructuredQuizQuestion = Omit<GeneratedQuizQuestion, "code"> & {
  code: string | null;
};

const QUIZ_RESPONSE_FORMAT = {
  format: {
    type: "json_schema",
    name: "quiz_questions",
    strict: true,
    schema: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              code: { type: ["string", "null"] },
              options: {
                type: "array",
                items: { type: "string" },
              },
              correctIndex: { type: "integer" },
              explanation: { type: "string" },
            },
            required: [
              "question",
              "code",
              "options",
              "correctIndex",
              "explanation",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
  },
} as const;

export function getAvailableTopicIds(
  programmingLanguage: ProgrammingLanguageId,
): string[] {
  return getTopicIdsByLanguage(programmingLanguage);
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_TIMEOUT_MS = 30_000;
const MARKDOWN_CODE_BLOCK_PATTERN = /```(?:[^\n\r`]*)\r?\n([\s\S]*?)```/g;

function quizMaxOutputTokens(count: number): number {
  return Math.min(8192, Math.max(4096, count * 300));
}

function getResponseText(response: unknown): string {
  if (
    typeof (response as { output_text?: unknown })?.output_text === "string"
  ) {
    return (response as { output_text: string }).output_text;
  }

  const output = (response as { output?: unknown })?.output;
  if (!Array.isArray(output)) {
    return "";
  }

  const parts: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown })?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (
        (block as { type?: string })?.type === "output_text" &&
        typeof (block as { text?: unknown })?.text === "string"
      ) {
        parts.push((block as { text: string }).text);
      } else if (typeof (block as { text?: unknown })?.text === "string") {
        parts.push((block as { text: string }).text);
      }
    }
  }

  return parts.join("");
}

function stripJsonFences(content: string): string {
  let cleanContent = content.trim();
  if (cleanContent.startsWith("```json")) {
    cleanContent = cleanContent.slice(7);
  }
  if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.slice(3);
  }
  if (cleanContent.endsWith("```")) {
    cleanContent = cleanContent.slice(0, -3);
  }
  return cleanContent.trim();
}

function parseQuestions(content: string): StructuredQuizQuestion[] {
  const cleanContent = stripJsonFences(content);
  const parsed = JSON.parse(cleanContent) as unknown;

  if (Array.isArray(parsed)) {
    return parsed as StructuredQuizQuestion[];
  }

  const wrapped = parsed as { questions?: unknown } | null;
  if (wrapped?.questions && Array.isArray(wrapped.questions)) {
    return wrapped.questions as StructuredQuizQuestion[];
  }

  return [];
}

function getResponseRefusal(response: unknown): string | null {
  const output = (response as { output?: unknown })?.output;
  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
    const content = (item as { content?: unknown })?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (
        (block as { type?: string })?.type === "refusal" &&
        typeof (block as { refusal?: unknown })?.refusal === "string"
      ) {
        return (block as { refusal: string }).refusal;
      }
    }
  }

  return null;
}

function assertOpenAIResponseIsUsable(response: unknown): void {
  const refusal = getResponseRefusal(response);
  if (refusal) {
    throw new Error(`OpenAI refused the request: ${refusal}`);
  }

  const status = (response as { status?: unknown })?.status;
  if (status !== "incomplete") {
    return;
  }

  const reason = (
    response as {
      incomplete_details?: { reason?: unknown } | null;
    }
  )?.incomplete_details?.reason;

  if (typeof reason === "string" && reason.length > 0) {
    throw new Error(`OpenAI response incomplete: ${reason}`);
  }

  throw new Error("OpenAI response incomplete");
}

function normalizeStructuredQuizQuestions(
  questions: StructuredQuizQuestion[],
): GeneratedQuizQuestion[] {
  return questions.map(({ code, ...question }) => {
    const { text, code: extractedCode } = extractMarkdownCodeFromQuestion(
      question.question,
    );
    const normalizedCode = code ?? extractedCode;

    return normalizedCode === null
      ? { ...question, question: text }
      : { ...question, question: text, code: normalizedCode };
  });
}

type StructuredQuizQuestionCandidate = {
  question?: unknown;
  code?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
};

function validateStructuredQuizQuestions(
  questions: StructuredQuizQuestion[],
  expectedCount: number,
): void {
  if (questions.length !== expectedCount) {
    throw new Error(
      `OpenAI returned ${questions.length} quiz questions, expected ${expectedCount}`,
    );
  }

  for (const [index, rawQuestion] of questions.entries()) {
    const question = rawQuestion as StructuredQuizQuestionCandidate | null;

    if (!question || typeof question !== "object") {
      throw new Error(
        `Invalid quiz question at index ${index}: question must be an object`,
      );
    }

    if (typeof question.question !== "string") {
      throw new Error(
        `Invalid quiz question at index ${index}: question text must be a string`,
      );
    }

    if (!question.question.trim()) {
      throw new Error(
        `Invalid quiz question at index ${index}: question text is empty`,
      );
    }

    if (!(typeof question.code === "string" || question.code === null)) {
      throw new Error(
        `Invalid quiz question at index ${index}: code must be a string or null`,
      );
    }

    if (!Array.isArray(question.options)) {
      throw new Error(
        `Invalid quiz question at index ${index}: options must be an array`,
      );
    }

    if (question.options.length !== 4) {
      throw new Error(
        `Invalid quiz question at index ${index}: expected exactly 4 options`,
      );
    }

    if (
      question.options.some(
        (option) => typeof option !== "string" || option.trim().length === 0,
      )
    ) {
      throw new Error(
        `Invalid quiz question at index ${index}: answer options must be non-empty strings`,
      );
    }

    if (typeof question.explanation !== "string") {
      throw new Error(
        `Invalid quiz question at index ${index}: explanation must be a string`,
      );
    }

    if (!question.explanation.trim()) {
      throw new Error(
        `Invalid quiz question at index ${index}: explanation is empty`,
      );
    }

    const correctIndex = question.correctIndex;
    if (
      typeof correctIndex !== "number" ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= question.options.length
    ) {
      throw new Error(
        `Invalid quiz question at index ${index}: correctIndex is out of bounds`,
      );
    }
  }
}

function validateNormalizedQuizQuestions(
  questions: GeneratedQuizQuestion[],
): void {
  for (const [index, question] of questions.entries()) {
    if (question.code !== undefined && !question.code.trim()) {
      throw new Error(`Invalid quiz question at index ${index}: code is empty`);
    }
  }
}

function extractMarkdownCodeFromQuestion(questionText: string): {
  text: string;
  code: string | null;
} {
  const blocks: string[] = [];
  const textWithoutCode = questionText.replace(
    MARKDOWN_CODE_BLOCK_PATTERN,
    (_, codeBlock: string) => {
      const trimmedCodeBlock = codeBlock.trim();
      if (trimmedCodeBlock) {
        blocks.push(trimmedCodeBlock);
      }
      return "\n\n";
    },
  );

  const normalizedText =
    textWithoutCode
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim() || questionText.trim();

  return {
    text: normalizedText,
    code: blocks.length > 0 ? blocks.join("\n\n") : null,
  };
}

async function requestOpenAI(payload: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!isTimeoutError(error)) {
      throw error;
    }

    // Expo's fetch-nodeshim uses a hard 5s socket timeout.
    // Fall back to node:https with a configurable timeout for longer OpenAI responses.
    return requestOpenAIViaHttps(apiKey, payload);
  }

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    if (isTimeoutError(error)) {
      return requestOpenAIViaHttps(apiKey, payload);
    }

    throw new Error("Invalid JSON response from OpenAI");
  }
}

function isTimeoutError(error: unknown): boolean {
  const timeoutError = error as { code?: unknown; message?: unknown } | null;
  if (timeoutError?.code === "ETIMEDOUT") {
    return true;
  }

  return (
    typeof timeoutError?.message === "string" &&
    timeoutError.message.toLowerCase().includes("timed out")
  );
}

function getOpenAIRequestTimeoutMs(): number {
  const timeout = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS);
  if (Number.isFinite(timeout) && timeout > 0) {
    return timeout;
  }
  return DEFAULT_OPENAI_TIMEOUT_MS;
}

async function requestOpenAIViaHttps(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const requestBody = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const request = https.request(
      OPENAI_RESPONSES_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(requestBody).toString(),
        },
      },
      (response) => {
        response.setEncoding("utf8");
        let responseBody = "";
        response.on("data", (chunk) => {
          responseBody += chunk;
        });
        response.on("end", () => {
          const statusCode = response.statusCode ?? 500;
          if (statusCode < 200 || statusCode >= 300) {
            reject(
              new Error(`OpenAI request failed with status ${statusCode}`),
            );
            return;
          }

          try {
            resolve(responseBody ? (JSON.parse(responseBody) as unknown) : {});
          } catch {
            reject(new Error("Invalid JSON response from OpenAI"));
          }
        });
      },
    );

    request.setTimeout(getOpenAIRequestTimeoutMs(), () => {
      const timeoutError = new Error(
        "Request timed out",
      ) as NodeJS.ErrnoException;
      timeoutError.code = "ETIMEDOUT";
      request.destroy(timeoutError);
    });

    request.on("error", reject);
    request.write(requestBody);
    request.end();
  });
}

async function sha256Hex(input: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("crypto.subtle is not available");
  }

  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function addStableIds(
  programmingLanguage: ProgrammingLanguageId,
  topicId: string,
  questions: GeneratedQuizQuestion[],
): Promise<QuizQuestion[]> {
  const withIds = await Promise.all(
    questions.map(async (question, index) => {
      const contentHash = await sha256Hex(
        JSON.stringify({
          programmingLanguage,
          topicId,
          question: question.question,
          code: question.code ?? null,
          options: question.options,
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          index,
        }),
      );
      return {
        ...question,
        id: `${topicId}-${contentHash.substring(0, 12)}`,
      };
    }),
  );

  return withIds;
}

function resolveLanguageContext(
  programmingLanguage: ProgrammingLanguageId,
  topicId: string,
) {
  const programmingLanguageName =
    LANGUAGE_NAMES[programmingLanguage] ?? programmingLanguage;
  const topicDescription =
    getTopicPrompt(programmingLanguage, topicId) ||
    `general ${programmingLanguageName} programming concepts`;
  const contextExclusion =
    LANGUAGE_CONTEXT_EXCLUSIONS[programmingLanguage] ?? "";

  return { topicDescription, programmingLanguageName, contextExclusion };
}

export async function generateQuizQuestions(
  programmingLanguage: ProgrammingLanguageId,
  topicId: string,
  count: number = 5,
  language: string = "en",
  skillLevel: QuizDifficultyLevel = 1,
): Promise<QuizQuestion[]> {
  const { topicDescription, programmingLanguageName, contextExclusion } =
    resolveLanguageContext(programmingLanguage, topicId);

  const languageInstruction =
    language === "de"
      ? `Write all questions, answer options, and explanations in German (Deutsch). Keep code examples and ${programmingLanguageName} syntax in English as they are programming terms.`
      : "Write all questions, answer options, and explanations in English.";

  const difficultyInstruction =
    skillLevel === 1
      ? "Create BEGINNER level questions: Focus on basic syntax, simple examples, and fundamental concepts. Use straightforward code snippets under 5 lines."
      : skillLevel === 2
        ? "Create INTERMEDIATE level questions: Include more complex scenarios, edge cases, and require deeper understanding. Use code snippets of 5-8 lines with subtle behavior."
        : "Create ADVANCED level questions: Focus on tricky edge cases, performance considerations, and expert-level understanding. Use complex code with multiple concepts combined.";

  const prompt = `Generate ${count} multiple-choice quiz questions about ${topicDescription} for computer science students learning ${programmingLanguageName} programming.

${languageInstruction}

DIFFICULTY LEVEL: ${skillLevel === 1 ? "Beginner" : skillLevel === 2 ? "Intermediate" : "Advanced"}
${difficultyInstruction}

Each question should:
- Test understanding of the concept, not just memorization
- Include a short code snippet when appropriate (keep code under 10 lines)
- Use "code": null when a code snippet is not needed
- Do not include Markdown fences or code snippets in the question text; put code only in the code field
- Have exactly 4 answer options
- Have only one correct answer
- Include a brief explanation of why the correct answer is right

Important:
- Make questions progressively challenging
- Use realistic code examples students would encounter
- The response schema already defines the JSON shape, so focus on the question content
${contextExclusion ? `- ${contextExclusion}` : ""}
- Do not include any keys other than question, code, options, correctIndex, and explanation`;

  const response = await requestOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    instructions: `You are a ${programmingLanguageName} programming tutor creating quiz questions. ${
      language === "de" ? "Respond in German." : "Respond in English."
    } Follow the provided response schema exactly.`,
    input: prompt,
    text: QUIZ_RESPONSE_FORMAT,
    max_output_tokens: quizMaxOutputTokens(count),
  });

  assertOpenAIResponseIsUsable(response);

  const content = getResponseText(response);
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  const structuredQuestions = parseQuestions(content);
  validateStructuredQuizQuestions(structuredQuestions, count);

  const questions = normalizeStructuredQuizQuestions(structuredQuestions);
  validateNormalizedQuizQuestions(questions);

  return addStableIds(programmingLanguage, topicId, questions);
}

export async function generateTopicExplanation(
  programmingLanguage: ProgrammingLanguageId,
  topicId: string,
  language: string = "en",
): Promise<string> {
  const { topicDescription, programmingLanguageName, contextExclusion } =
    resolveLanguageContext(programmingLanguage, topicId);

  const languageInstruction =
    language === "de"
      ? `Write the ENTIRE explanation in German (Deutsch), including ALL headings and section titles. Keep only code examples and ${programmingLanguageName} syntax in English as they are programming terms.`
      : "Write the entire explanation in English.";

  const sectionHeadings =
    language === "de"
      ? `1. **Einführung** - Ein kurzer Überblick, was dieses Konzept ist und warum es wichtig ist
2. **Kernkonzepte** - Die wichtigsten Punkte, die Studierende verstehen müssen
3. **Code-Beispiele** - 2-3 praktische Code-Beispiele mit Erklärungen
4. **Häufige Fehler** - Was man bei diesem Konzept vermeiden sollte
5. **Best Practices** - Tipps für den effektiven Einsatz dieses Konzepts`
      : `1. **Introduction** - A brief overview of what this concept is and why it's important
2. **Key Concepts** - The main points students need to understand
3. **Code Examples** - 2-3 practical code examples with explanations
4. **Common Mistakes** - Things to avoid when using this concept
5. **Best Practices** - Tips for using this concept effectively`;

  const prompt = `Explain the following ${programmingLanguageName} topic for computer science students: ${topicDescription}

${languageInstruction}

Structure your explanation as follows:
${sectionHeadings}

Format the response in Markdown. Use code blocks with \`\`\`${programmingLanguage} for code examples.
Keep the total length to about 500-700 words.
${contextExclusion ? `${contextExclusion}.` : ""}`;

  const response = await requestOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    instructions: `You are an experienced ${programmingLanguageName} programming tutor explaining concepts to university students. ${
      language === "de" ? "Respond in German." : "Respond in English."
    } Use clear, concise language and practical examples.`,
    input: prompt,
    max_output_tokens: 2048,
  });

  assertOpenAIResponseIsUsable(response);

  const explanation = getResponseText(response);
  if (!explanation) {
    throw new Error("Empty response from OpenAI");
  }

  return explanation;
}
