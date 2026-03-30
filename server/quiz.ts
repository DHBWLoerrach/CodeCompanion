import * as https from "node:https";
import type { QuizDifficultyLevel } from "@shared/skill-level";
import type { QuizQuestion } from "@shared/quiz-question";
import type { ProgrammingLanguageId } from "@shared/programming-language";
import { sha256Hex } from "@server/crypto";
import {
  getTopicPrompt,
  LANGUAGE_CONTEXT_EXCLUSIONS,
  LANGUAGE_NAMES,
} from "@shared/topic-prompts";

type GeneratedQuizQuestion = Omit<QuizQuestion, "id" | "code"> & {
  code?: string;
};

type GeneratedMixedQuizQuestion = GeneratedQuizQuestion & {
  topicId: string;
};

type StructuredQuizQuestion = Omit<GeneratedQuizQuestion, "code"> & {
  code: string | null;
};

type StructuredMixedQuizQuestion = Omit<GeneratedMixedQuizQuestion, "code"> & {
  code: string | null;
};

type MixedQuizTopicPlanItem = {
  topicId: string;
  questionCount: number;
};

// The strict wire schema always includes commonMistake as a string because
// OpenAI structured outputs require all declared properties when
// additionalProperties is false. An empty string means "not applicable" and
// is collapsed back to the optional QuizQuestion.commonMistake field during
// validation.
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
              resultSentence: { type: "string" },
              takeaway: { type: "string" },
              commonMistake: { type: "string" },
            },
            required: [
              "question",
              "code",
              "options",
              "correctIndex",
              "explanation",
              "resultSentence",
              "takeaway",
              "commonMistake",
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

function buildMixedQuizResponseFormat(topicIds: string[]) {
  return {
    format: {
      type: "json_schema",
      name: "mixed_quiz_questions",
      strict: true,
      schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topicId: {
                  type: "string",
                  enum: topicIds,
                },
                question: { type: "string" },
                code: { type: ["string", "null"] },
                options: {
                  type: "array",
                  items: { type: "string" },
                },
                correctIndex: { type: "integer" },
                explanation: { type: "string" },
                resultSentence: { type: "string" },
                takeaway: { type: "string" },
                commonMistake: { type: "string" },
              },
              required: [
                "topicId",
                "question",
                "code",
                "options",
                "correctIndex",
                "explanation",
                "resultSentence",
                "takeaway",
                "commonMistake",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["questions"],
        additionalProperties: false,
      },
    },
  };
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_TIMEOUT_MS = 30_000;
const DEFAULT_OPENAI_MODEL = "gpt-5.4-nano";
const EXPLANATION_OPTION_REFERENCE_PATTERN =
  /\b(?:option|antwort|answer|choice|möglichkeit)\s*[1-4abcd]\b/i;
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

function parseJsonValue(content: string): unknown {
  try {
    return JSON.parse(stripJsonFences(content)) as unknown;
  } catch {
    throw new Error("Invalid JSON content from OpenAI");
  }
}

function parseQuestions(content: string): unknown[] {
  const parsed = parseJsonValue(content);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  const wrapped = parsed as { questions?: unknown } | null;
  if (wrapped?.questions && Array.isArray(wrapped.questions)) {
    return wrapped.questions;
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

function normalizeStructuredQuizQuestions<
  T extends StructuredQuizQuestion | StructuredMixedQuizQuestion,
>(questions: T[]): (Omit<T, "code"> & { code?: string })[] {
  return questions.map(({ code, ...question }) => {
    const { text, code: extractedCode } = extractMarkdownCodeFromQuestion(
      question.question,
    );
    const normalizedCode = code ?? extractedCode;
    const normalizedQuestionText =
      normalizedCode === null
        ? text
        : stripDuplicateCodeFromQuestion(text, normalizedCode);

    return normalizedCode === null
      ? { ...question, question: normalizedQuestionText }
      : { ...question, question: normalizedQuestionText, code: normalizedCode };
  });
}

type StructuredQuizQuestionWireCandidate = {
  topicId?: unknown;
  question?: unknown;
  code?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
  resultSentence?: unknown;
  takeaway?: unknown;
  commonMistake?: unknown;
};

type StructuredQuizQuestionFields = {
  question: string;
  code: string | null;
  options: string[];
  correctIndex: number;
  explanation: string;
  resultSentence: string;
  takeaway: string;
  commonMistake?: string;
};

type ProgrammingLanguageContext = {
  programmingLanguageName: string;
  contextExclusion: string;
};

function validateStructuredQuizQuestionFields(
  rawQuestion: unknown,
  index: number,
): StructuredQuizQuestionFields {
  const question = rawQuestion as StructuredQuizQuestionWireCandidate | null;

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

  const uniqueOptions = new Set(
    question.options.map((o) => (o as string).trim().toLowerCase()),
  );
  if (uniqueOptions.size !== question.options.length) {
    throw new Error(
      `Invalid quiz question at index ${index}: answer options contain duplicates`,
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

  if (EXPLANATION_OPTION_REFERENCE_PATTERN.test(question.explanation)) {
    throw new Error(
      `Invalid quiz question at index ${index}: explanation must not reference options by number or letter`,
    );
  }

  if (typeof question.resultSentence !== "string") {
    throw new Error(
      `Invalid quiz question at index ${index}: resultSentence must be a string`,
    );
  }

  if (!question.resultSentence.trim()) {
    throw new Error(
      `Invalid quiz question at index ${index}: resultSentence is empty`,
    );
  }

  if (EXPLANATION_OPTION_REFERENCE_PATTERN.test(question.resultSentence)) {
    throw new Error(
      `Invalid quiz question at index ${index}: resultSentence must not reference options by number or letter`,
    );
  }

  if (typeof question.takeaway !== "string") {
    throw new Error(
      `Invalid quiz question at index ${index}: takeaway must be a string`,
    );
  }

  if (!question.takeaway.trim()) {
    throw new Error(
      `Invalid quiz question at index ${index}: takeaway is empty`,
    );
  }

  if (EXPLANATION_OPTION_REFERENCE_PATTERN.test(question.takeaway)) {
    throw new Error(
      `Invalid quiz question at index ${index}: takeaway must not reference options by number or letter`,
    );
  }

  if (
    question.commonMistake !== undefined &&
    typeof question.commonMistake !== "string"
  ) {
    throw new Error(
      `Invalid quiz question at index ${index}: commonMistake must be a string`,
    );
  }

  const commonMistake =
    typeof question.commonMistake === "string"
      ? question.commonMistake.trim()
      : undefined;

  // The wire format uses "" as the sentinel for "not applicable". Collapse
  // that back to the optional domain field so QuizQuestion stays string |
  // undefined instead of leaking wire-only semantics.
  if (
    commonMistake &&
    EXPLANATION_OPTION_REFERENCE_PATTERN.test(commonMistake)
  ) {
    throw new Error(
      `Invalid quiz question at index ${index}: commonMistake must not reference options by number or letter`,
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

  return {
    question: question.question,
    code: question.code,
    options: question.options,
    correctIndex,
    explanation: question.explanation,
    resultSentence: question.resultSentence,
    takeaway: question.takeaway,
    ...(commonMistake ? { commonMistake } : {}),
  };
}

function validateStructuredQuizQuestions(
  questions: unknown[],
  expectedCount: number,
): StructuredQuizQuestion[] {
  if (questions.length !== expectedCount) {
    throw new Error(
      `OpenAI returned ${questions.length} quiz questions, expected ${expectedCount}`,
    );
  }

  return questions.map((question, index) =>
    validateStructuredQuizQuestionFields(question, index),
  );
}

function validateStructuredMixedQuizQuestions(
  questions: unknown[],
  topicPlan: MixedQuizTopicPlanItem[],
): StructuredMixedQuizQuestion[] {
  const expectedCount = topicPlan.reduce(
    (sum, item) => sum + item.questionCount,
    0,
  );

  if (questions.length !== expectedCount) {
    throw new Error(
      `OpenAI returned ${questions.length} quiz questions, expected ${expectedCount}`,
    );
  }

  const allowedTopicIds = topicPlan.map((item) => item.topicId);
  const allowedTopicIdSet = new Set(allowedTopicIds);
  const actualCounts = new Map(topicPlan.map((item) => [item.topicId, 0]));

  const validatedQuestions = questions.map((rawQuestion, index) => {
    const question = rawQuestion as StructuredQuizQuestionWireCandidate | null;
    const topicId = question?.topicId;

    if (typeof topicId !== "string" || !allowedTopicIdSet.has(topicId)) {
      throw new Error(
        `Invalid mixed quiz question at index ${index}: topicId must be one of ${allowedTopicIds.join(", ")}`,
      );
    }

    actualCounts.set(topicId, (actualCounts.get(topicId) ?? 0) + 1);

    return {
      topicId,
      ...validateStructuredQuizQuestionFields(rawQuestion, index),
    };
  });

  for (const { topicId, questionCount } of topicPlan) {
    const actualCount = actualCounts.get(topicId) ?? 0;
    if (actualCount !== questionCount) {
      throw new Error(
        `OpenAI returned ${actualCount} questions for topic '${topicId}', expected ${questionCount}`,
      );
    }
  }

  return validatedQuestions;
}

function validateNormalizedQuizQuestions<T extends GeneratedQuizQuestion>(
  questions: T[],
): void {
  for (const [index, question] of questions.entries()) {
    if (question.code !== undefined && !question.code.trim()) {
      throw new Error(`Invalid quiz question at index ${index}: code is empty`);
    }
  }
}

function getSingleChoiceQualityRequirements(): string {
  return `- Have exactly 4 answer options
- Have exactly one objectively correct option and three objectively incorrect distractors
- For syntax questions, the three wrong options must contain actual syntax errors; never use alternative valid syntax as a distractor
- Never generate questions where more than one option could be syntactically valid, partially true, or context-dependent
- Avoid ambiguous or multi-select stems unless the other three options are unambiguously wrong
- Before finalizing each question, verify every option one by one and discard the question if more than one option could be defended as correct
- In the explanation, describe the correct answer by quoting its content rather than by option number or letter
- In the explanation, briefly state why each wrong option is incorrect`;
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

function normalizeEmbeddedMultilineText(text: string): string {
  const normalizedText = text.replace(/\r\n?/g, "\n");
  const embeddedLineBreakMatches = normalizedText.match(/\\r\\n|\\n|\\r/g);

  // OpenAI occasionally returns multiline content with literal escape
  // sequences. Decode only when the text looks like embedded multiline
  // content, not when it contains a single literal "\n" mention.
  if (!embeddedLineBreakMatches || embeddedLineBreakMatches.length < 2) {
    return normalizedText;
  }

  return normalizedText
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n");
}

function normalizeQuestionText(text: string): string {
  return normalizeEmbeddedMultilineText(text)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function normalizeCodeForComparison(code: string): string {
  return normalizeEmbeddedMultilineText(code)
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

function stripDuplicateCodeFromQuestion(
  questionText: string,
  code: string,
): string {
  const normalizedQuestion = normalizeEmbeddedMultilineText(questionText);
  const normalizedCode = normalizeCodeForComparison(code);
  const blocks = normalizedQuestion
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
  const filteredBlocks = blocks.filter(
    (block) => normalizeCodeForComparison(block) !== normalizedCode,
  );

  if (filteredBlocks.length > 0 && filteredBlocks.length !== blocks.length) {
    return normalizeQuestionText(filteredBlocks.join("\n\n"));
  }

  const duplicateCodeIndex = normalizedQuestion.lastIndexOf(normalizedCode);
  if (duplicateCodeIndex > 0) {
    const prefix = normalizedQuestion.slice(0, duplicateCodeIndex);
    if (/\n\s*$/.test(prefix)) {
      const trimmedPrefix = normalizeQuestionText(prefix);
      if (trimmedPrefix.length > 0) {
        return trimmedPrefix;
      }
    }
  }

  return normalizeQuestionText(normalizedQuestion);
}

function getDifficultyLabel(skillLevel: QuizDifficultyLevel): string {
  return skillLevel === 1
    ? "Beginner"
    : skillLevel === 2
      ? "Intermediate"
      : "Advanced";
}

function getDifficultyInstruction(skillLevel: QuizDifficultyLevel): string {
  return skillLevel === 1
    ? "Create BEGINNER level questions: Focus on basic syntax, simple examples, and fundamental concepts. Use straightforward code snippets under 5 lines."
    : skillLevel === 2
      ? "Create INTERMEDIATE level questions: Include more complex scenarios, edge cases, and require deeper understanding. Use code snippets of 5-8 lines with subtle behavior."
      : "Create ADVANCED level questions: Focus on tricky edge cases, performance considerations, and expert-level understanding. Use complex code with multiple concepts combined.";
}

function getLanguageInstruction(
  language: string,
  programmingLanguageName: string,
): string {
  return language === "de"
    ? `Write all questions, answer options, and explanations in German (Deutsch). Keep code examples and ${programmingLanguageName} syntax in English as they are programming terms.`
    : "Write all questions, answer options, and explanations in English.";
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

async function requestQuizResponseText(
  payload: Record<string, unknown>,
): Promise<string> {
  const response = await requestOpenAI(payload);
  assertOpenAIResponseIsUsable(response);

  const content = getResponseText(response);
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  return content;
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

async function addStableIds<T extends GeneratedQuizQuestion>(
  programmingLanguage: ProgrammingLanguageId,
  questions: T[],
  getTopicId: (question: T, index: number) => string,
): Promise<(T & { id: string })[]> {
  const withIds = await Promise.all(
    questions.map(async (question, index) => {
      const topicId = getTopicId(question, index);
      // Keep the index in the hash so duplicates within one generated quiz still
      // receive distinct IDs even if the model repeats the same payload.
      const contentHash = await sha256Hex(
        JSON.stringify({
          programmingLanguage,
          topicId,
          question: question.question,
          code: question.code ?? null,
          options: question.options,
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          resultSentence: question.resultSentence,
          takeaway: question.takeaway,
          // Canonicalize the optional domain field in the hash input. This keeps
          // stable IDs identical whether commonMistake is absent or came from
          // the wire as the empty-string sentinel.
          commonMistake: question.commonMistake ?? null,
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

function resolveProgrammingLanguageContext(
  programmingLanguage: ProgrammingLanguageId,
): ProgrammingLanguageContext {
  return {
    programmingLanguageName:
      LANGUAGE_NAMES[programmingLanguage] ?? programmingLanguage,
    contextExclusion: LANGUAGE_CONTEXT_EXCLUSIONS[programmingLanguage] ?? "",
  };
}

function resolveTopicDescription(
  programmingLanguage: ProgrammingLanguageId,
  programmingLanguageName: string,
  topicId: string,
): string {
  return (
    getTopicPrompt(programmingLanguage, topicId) ||
    `general ${programmingLanguageName} programming concepts`
  );
}

function resolveLanguageContext(
  programmingLanguage: ProgrammingLanguageId,
  topicId: string,
): ProgrammingLanguageContext & { topicDescription: string } {
  const { programmingLanguageName, contextExclusion } =
    resolveProgrammingLanguageContext(programmingLanguage);

  return {
    programmingLanguageName,
    contextExclusion,
    topicDescription: resolveTopicDescription(
      programmingLanguage,
      programmingLanguageName,
      topicId,
    ),
  };
}

function parseAndNormalizeQuizQuestions<
  T extends StructuredQuizQuestion | StructuredMixedQuizQuestion,
>(
  content: string,
  validateQuestions: (questions: unknown[]) => T[],
): (Omit<T, "code"> & { code?: string })[] {
  const structuredQuestions = validateQuestions(parseQuestions(content));
  const questions = normalizeStructuredQuizQuestions(structuredQuestions);
  validateNormalizedQuizQuestions(questions);
  return questions;
}

async function requestQuizQuestionBatch({
  programmingLanguageName,
  topicDescription,
  contextExclusion,
  count,
  language,
  skillLevel,
}: {
  programmingLanguageName: string;
  topicDescription: string;
  contextExclusion: string;
  count: number;
  language: string;
  skillLevel: QuizDifficultyLevel;
}): Promise<GeneratedQuizQuestion[]> {
  const languageInstruction = getLanguageInstruction(
    language,
    programmingLanguageName,
  );
  const difficultyInstruction = getDifficultyInstruction(skillLevel);
  const difficultyLabel = getDifficultyLabel(skillLevel);

  const prompt = `Generate ${count} multiple-choice quiz questions about ${topicDescription} for computer science students learning ${programmingLanguageName} programming.

${languageInstruction}

DIFFICULTY LEVEL: ${difficultyLabel}
${difficultyInstruction}

Each question should:
- Test understanding of the concept, not just memorization
- Include a short code snippet when appropriate (keep code under 10 lines)
- Use "code": null when a code snippet is not needed
- Do not include Markdown fences or code snippets in the question text; put code only in the code field
${getSingleChoiceQualityRequirements()}
- In the resultSentence, state the correct result in one short sentence (e.g. "Result: \`0\`"). Use inline code for values.
- In the takeaway, provide one memorable rule the learner should remember (e.g. "\`??\` only checks for \`null\` and \`undefined\`")
- In the commonMistake, briefly explain a common misconception relevant to this question if one exists; include a comparison if helpful; use an empty string if not applicable
- In the explanation, explain why the answer is correct in 2-3 sentences and do not repeat the resultSentence or takeaway.

Important:
- Make questions progressively challenging
- Use realistic code examples students would encounter
- The response schema already defines the JSON shape, so focus on the question content
${contextExclusion ? `- ${contextExclusion}` : ""}
- Do not include any keys other than question, code, options, correctIndex, explanation, resultSentence, takeaway, and commonMistake`;

  const content = await requestQuizResponseText({
    model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
    instructions: `You are a ${programmingLanguageName} programming tutor creating quiz questions. ${
      language === "de" ? "Respond in German." : "Respond in English."
    } Follow the provided response schema exactly.`,
    input: prompt,
    text: QUIZ_RESPONSE_FORMAT,
    max_output_tokens: quizMaxOutputTokens(count),
  });

  return parseAndNormalizeQuizQuestions(content, (questions) =>
    validateStructuredQuizQuestions(questions, count),
  );
}

async function requestMixedQuizQuestionBatch({
  programmingLanguage,
  topicPlan,
  language,
  skillLevel,
}: {
  programmingLanguage: ProgrammingLanguageId;
  topicPlan: MixedQuizTopicPlanItem[];
  language: string;
  skillLevel: QuizDifficultyLevel;
}): Promise<GeneratedMixedQuizQuestion[]> {
  const { programmingLanguageName, contextExclusion } =
    resolveProgrammingLanguageContext(programmingLanguage);
  const languageInstruction = getLanguageInstruction(
    language,
    programmingLanguageName,
  );
  const difficultyInstruction = getDifficultyInstruction(skillLevel);
  const difficultyLabel = getDifficultyLabel(skillLevel);
  const totalCount = topicPlan.reduce(
    (sum, item) => sum + item.questionCount,
    0,
  );
  const resolvedTopicPlan = topicPlan.map(({ topicId, questionCount }) => ({
    topicId,
    questionCount,
    topicDescription: resolveTopicDescription(
      programmingLanguage,
      programmingLanguageName,
      topicId,
    ),
  }));

  const prompt = `Generate ${totalCount} multiple-choice quiz questions for computer science students learning ${programmingLanguageName} programming.

${languageInstruction}

DIFFICULTY LEVEL: ${difficultyLabel}
${difficultyInstruction}

TOPIC PLAN:
${resolvedTopicPlan
  .map(
    ({ topicId, questionCount, topicDescription }) =>
      `- ${topicId}: exactly ${questionCount} question(s) about ${topicDescription}`,
  )
  .join("\n")}

Each question should:
- Stay primarily focused on its assigned topicId
- Test understanding of the concept, not just memorization
- Include a short code snippet when appropriate (keep code under 10 lines)
- Use "code": null when a code snippet is not needed
- Do not include Markdown fences or code snippets in the question text; put code only in the code field
${getSingleChoiceQualityRequirements()}
- In the resultSentence, state the correct result in one short sentence (e.g. "Result: \`0\`"). Use inline code for values.
- In the takeaway, provide one memorable rule the learner should remember (e.g. "\`??\` only checks for \`null\` and \`undefined\`")
- In the commonMistake, briefly explain a common misconception relevant to this question if one exists; include a comparison if helpful; use an empty string if not applicable
- In the explanation, explain why the answer is correct in 2-3 sentences and do not repeat the resultSentence or takeaway.

Important:
- Return exactly ${totalCount} questions total
- Produce exactly the requested number of questions for each topicId
- Include a topicId field on every question using only the topic IDs from the topic plan
- Avoid near-duplicate questions across the entire quiz
- Use realistic code examples students would encounter
- The response schema already defines the JSON shape, so focus on the question content
${contextExclusion ? `- ${contextExclusion}` : ""}
- Do not include any keys other than topicId, question, code, options, correctIndex, explanation, resultSentence, takeaway, and commonMistake`;

  const content = await requestQuizResponseText({
    model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
    instructions: `You are a ${programmingLanguageName} programming tutor creating mixed-topic quiz questions. ${
      language === "de" ? "Respond in German." : "Respond in English."
    } Follow the provided response schema exactly.`,
    input: prompt,
    text: buildMixedQuizResponseFormat(topicPlan.map((item) => item.topicId)),
    max_output_tokens: quizMaxOutputTokens(totalCount),
  });

  return parseAndNormalizeQuizQuestions(content, (questions) =>
    validateStructuredMixedQuizQuestions(questions, topicPlan),
  );
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

  const questions = await requestQuizQuestionBatch({
    programmingLanguageName,
    topicDescription,
    contextExclusion,
    count,
    language,
    skillLevel,
  });

  return addStableIds(programmingLanguage, questions, () => topicId);
}

export async function generateMixedQuizQuestions(
  programmingLanguage: ProgrammingLanguageId,
  topicPlan: MixedQuizTopicPlanItem[],
  language: string = "en",
  skillLevel: QuizDifficultyLevel = 1,
): Promise<QuizQuestion[]> {
  if (topicPlan.length === 0) {
    return [];
  }

  const uniqueTopicIds = new Set(topicPlan.map((item) => item.topicId));
  if (uniqueTopicIds.size !== topicPlan.length) {
    throw new Error("Mixed topic plan contains duplicate topicIds");
  }

  const questions = await requestMixedQuizQuestionBatch({
    programmingLanguage,
    topicPlan,
    language,
    skillLevel,
  });

  return addStableIds(
    programmingLanguage,
    questions,
    (question) => question.topicId,
  );
}
