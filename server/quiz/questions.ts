import type {
  GeneratedQuizQuestion,
  MixedQuizTopicPlanItem,
  StructuredMixedQuizQuestion,
  StructuredQuizQuestion,
  StructuredQuizQuestionFields,
  StructuredQuizQuestionWireCandidate,
} from './types';

const EXPLANATION_OPTION_REFERENCE_PATTERN =
  /\b(?:option|antwort|answer|choice|möglichkeit)\s*[1-4abcd]\b/i;
const MARKDOWN_CODE_BLOCK_PATTERN = /```(?:[^\n\r`]*)\r?\n([\s\S]*?)```/g;

function stripJsonFences(content: string): string {
  let cleanContent = content.trim();
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.slice(7);
  }
  if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.slice(3);
  }
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.slice(0, -3);
  }
  return cleanContent.trim();
}

function parseJsonValue(content: string): unknown {
  try {
    return JSON.parse(stripJsonFences(content)) as unknown;
  } catch {
    throw new Error('Invalid JSON content from OpenAI');
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
      return '\n\n';
    }
  );

  const normalizedText =
    textWithoutCode
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+\n/g, '\n')
      .trim() || questionText.trim();

  return {
    text: normalizedText,
    code: blocks.length > 0 ? blocks.join('\n\n') : null,
  };
}

function normalizeEmbeddedMultilineText(text: string): string {
  const normalizedText = text.replace(/\r\n?/g, '\n');
  const embeddedLineBreakMatches = normalizedText.match(/\\r\\n|\\n|\\r/g);

  // OpenAI occasionally returns multiline content with literal escape
  // sequences. Decode only when the text looks like embedded multiline
  // content, not when it contains a single literal "\n" mention.
  if (!embeddedLineBreakMatches || embeddedLineBreakMatches.length < 2) {
    return normalizedText;
  }

  return normalizedText
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');
}

function normalizeQuestionText(text: string): string {
  return normalizeEmbeddedMultilineText(text)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function normalizeCodeForComparison(code: string): string {
  return normalizeEmbeddedMultilineText(code)
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();
}

function stripDuplicateCodeFromQuestion(
  questionText: string,
  code: string
): string {
  const normalizedQuestion = normalizeEmbeddedMultilineText(questionText);
  const normalizedCode = normalizeCodeForComparison(code);
  const blocks = normalizedQuestion
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
  const filteredBlocks = blocks.filter(
    (block) => normalizeCodeForComparison(block) !== normalizedCode
  );

  if (filteredBlocks.length > 0 && filteredBlocks.length !== blocks.length) {
    return normalizeQuestionText(filteredBlocks.join('\n\n'));
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

function normalizeStructuredQuizQuestions<
  T extends StructuredQuizQuestion | StructuredMixedQuizQuestion,
>(questions: T[]): (Omit<T, 'code'> & { code?: string })[] {
  return questions.map(({ code, ...question }) => {
    const { text, code: extractedCode } = extractMarkdownCodeFromQuestion(
      question.question
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

function normalizeOptionMatchText(value: string): string {
  return value.trim();
}

function validateStructuredQuizQuestionFields(
  rawQuestion: unknown,
  index: number
): StructuredQuizQuestionFields {
  const question = rawQuestion as StructuredQuizQuestionWireCandidate | null;

  if (!question || typeof question !== 'object') {
    throw new Error(
      `Invalid quiz question at index ${index}: question must be an object`
    );
  }

  if (typeof question.question !== 'string') {
    throw new Error(
      `Invalid quiz question at index ${index}: question text must be a string`
    );
  }

  if (!question.question.trim()) {
    throw new Error(
      `Invalid quiz question at index ${index}: question text is empty`
    );
  }

  if (!(typeof question.code === 'string' || question.code === null)) {
    throw new Error(
      `Invalid quiz question at index ${index}: code must be a string or null`
    );
  }

  if (!Array.isArray(question.options)) {
    throw new Error(
      `Invalid quiz question at index ${index}: options must be an array`
    );
  }

  if (question.options.length !== 4) {
    throw new Error(
      `Invalid quiz question at index ${index}: expected exactly 4 options`
    );
  }

  if (
    question.options.some(
      (option) => typeof option !== 'string' || option.trim().length === 0
    )
  ) {
    throw new Error(
      `Invalid quiz question at index ${index}: answer options must be non-empty strings`
    );
  }

  const uniqueOptions = new Set(
    question.options.map((option) => (option as string).trim().toLowerCase())
  );
  if (uniqueOptions.size !== question.options.length) {
    throw new Error(
      `Invalid quiz question at index ${index}: answer options contain duplicates`
    );
  }

  if (typeof question.explanation !== 'string') {
    throw new Error(
      `Invalid quiz question at index ${index}: explanation must be a string`
    );
  }

  if (!question.explanation.trim()) {
    throw new Error(
      `Invalid quiz question at index ${index}: explanation is empty`
    );
  }

  if (EXPLANATION_OPTION_REFERENCE_PATTERN.test(question.explanation)) {
    throw new Error(
      `Invalid quiz question at index ${index}: explanation must not reference options by number or letter`
    );
  }

  if (typeof question.resultSentence !== 'string') {
    throw new Error(
      `Invalid quiz question at index ${index}: resultSentence must be a string`
    );
  }

  if (!question.resultSentence.trim()) {
    throw new Error(
      `Invalid quiz question at index ${index}: resultSentence is empty`
    );
  }

  if (EXPLANATION_OPTION_REFERENCE_PATTERN.test(question.resultSentence)) {
    throw new Error(
      `Invalid quiz question at index ${index}: resultSentence must not reference options by number or letter`
    );
  }

  if (typeof question.takeaway !== 'string') {
    throw new Error(
      `Invalid quiz question at index ${index}: takeaway must be a string`
    );
  }

  if (!question.takeaway.trim()) {
    throw new Error(
      `Invalid quiz question at index ${index}: takeaway is empty`
    );
  }

  if (EXPLANATION_OPTION_REFERENCE_PATTERN.test(question.takeaway)) {
    throw new Error(
      `Invalid quiz question at index ${index}: takeaway must not reference options by number or letter`
    );
  }

  if (
    question.commonMistake !== undefined &&
    typeof question.commonMistake !== 'string'
  ) {
    throw new Error(
      `Invalid quiz question at index ${index}: commonMistake must be a string`
    );
  }

  const commonMistake =
    typeof question.commonMistake === 'string'
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
      `Invalid quiz question at index ${index}: commonMistake must not reference options by number or letter`
    );
  }

  if (typeof question.correctAnswer !== 'string') {
    throw new Error(
      `Invalid quiz question at index ${index}: correctAnswer must be a string`
    );
  }

  const normalizedCorrectAnswer = normalizeOptionMatchText(
    question.correctAnswer
  );
  if (!normalizedCorrectAnswer) {
    throw new Error(
      `Invalid quiz question at index ${index}: correctAnswer is empty`
    );
  }

  const matchingOptions = question.options
    .map((option, optionIndex) => ({
      optionIndex,
      normalizedOption: normalizeOptionMatchText(option as string),
    }))
    .filter(
      ({ normalizedOption }) => normalizedOption === normalizedCorrectAnswer
    );

  if (matchingOptions.length !== 1) {
    throw new Error(
      `Invalid quiz question at index ${index}: correctAnswer ${JSON.stringify(question.correctAnswer)} must match exactly one option`
    );
  }

  const correctIndex = matchingOptions[0].optionIndex;

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

export function validateStructuredQuizQuestions(
  questions: unknown[],
  expectedCount: number
): StructuredQuizQuestion[] {
  if (questions.length !== expectedCount) {
    throw new Error(
      `OpenAI returned ${questions.length} quiz questions, expected ${expectedCount}`
    );
  }

  return questions.map((question, index) =>
    validateStructuredQuizQuestionFields(question, index)
  );
}

export function validateStructuredMixedQuizQuestions(
  questions: unknown[],
  topicPlan: MixedQuizTopicPlanItem[]
): StructuredMixedQuizQuestion[] {
  const expectedCount = topicPlan.reduce(
    (sum, item) => sum + item.questionCount,
    0
  );

  if (questions.length !== expectedCount) {
    throw new Error(
      `OpenAI returned ${questions.length} quiz questions, expected ${expectedCount}`
    );
  }

  const allowedTopicIds = topicPlan.map((item) => item.topicId);
  const allowedTopicIdSet = new Set(allowedTopicIds);
  const actualCounts = new Map(topicPlan.map((item) => [item.topicId, 0]));

  const validatedQuestions = questions.map((rawQuestion, index) => {
    const question = rawQuestion as StructuredQuizQuestionWireCandidate | null;
    const topicId = question?.topicId;

    if (typeof topicId !== 'string' || !allowedTopicIdSet.has(topicId)) {
      throw new Error(
        `Invalid mixed quiz question at index ${index}: topicId must be one of ${allowedTopicIds.join(', ')}`
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
        `OpenAI returned ${actualCount} questions for topic '${topicId}', expected ${questionCount}`
      );
    }
  }

  return validatedQuestions;
}

function validateNormalizedQuizQuestions<T extends GeneratedQuizQuestion>(
  questions: T[]
): void {
  for (const [index, question] of questions.entries()) {
    if (question.code !== undefined && !question.code.trim()) {
      throw new Error(`Invalid quiz question at index ${index}: code is empty`);
    }
  }
}

export function parseAndNormalizeQuizQuestions<
  T extends StructuredQuizQuestion | StructuredMixedQuizQuestion,
>(
  content: string,
  validateQuestions: (questions: unknown[]) => T[]
): (Omit<T, 'code'> & { code?: string })[] {
  const structuredQuestions = validateQuestions(parseQuestions(content));
  const questions = normalizeStructuredQuizQuestions(structuredQuestions);
  validateNormalizedQuizQuestions(questions);
  return questions;
}
