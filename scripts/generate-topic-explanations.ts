import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.4-nano';
const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const SUPPORTED_LANGUAGES = ['en', 'de'] as const;

const programmingLanguageModule = await import(
  new URL('../shared/programming-language.ts', import.meta.url).href
);
const { SUPPORTED_PROGRAMMING_LANGUAGE_IDS } = programmingLanguageModule;

type ProgrammingLanguageId =
  (typeof programmingLanguageModule.SUPPORTED_PROGRAMMING_LANGUAGE_IDS)[number];
type ExplanationLanguage = (typeof SUPPORTED_LANGUAGES)[number];

type PromptMap = Record<string, string>;

type CurriculumFile = {
  languageId: ProgrammingLanguageId;
  languageName: {
    en: string;
    de: string;
  };
  contextExclusion?: string;
  categories: Array<{
    topics: Array<{
      id: string;
    }>;
  }>;
};

type OpenAIResponse = {
  output_text?: unknown;
  output?: unknown;
  status?: unknown;
  incomplete_details?: {
    reason?: unknown;
  } | null;
};

type CliOptions = {
  force: boolean;
  topicId?: string;
  programmingLanguage?: ProgrammingLanguageId;
  language?: ExplanationLanguage;
};

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const CURRICULUM_DIR = path.join(ROOT_DIR, 'shared', 'curriculum');
const EXPLANATIONS_DIR = path.join(ROOT_DIR, 'shared', 'explanations');
const TOPIC_PROMPTS_DIR = path.join(ROOT_DIR, 'shared', 'topic-prompts');

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = { force: false };

  for (const arg of argv) {
    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg.startsWith('--topic=')) {
      options.topicId = arg.slice('--topic='.length);
      continue;
    }

    if (arg.startsWith('--programming-language=')) {
      const value = arg.slice('--programming-language='.length);
      if (
        SUPPORTED_PROGRAMMING_LANGUAGE_IDS.includes(
          value as ProgrammingLanguageId
        )
      ) {
        options.programmingLanguage = value as ProgrammingLanguageId;
        continue;
      }

      throw new Error(
        `Unsupported programming language '${value}'. Expected one of: ${SUPPORTED_PROGRAMMING_LANGUAGE_IDS.join(', ')}`
      );
    }

    if (arg.startsWith('--language=')) {
      const value = arg.slice('--language='.length);
      if (SUPPORTED_LANGUAGES.includes(value as ExplanationLanguage)) {
        options.language = value as ExplanationLanguage;
        continue;
      }

      throw new Error(
        `Unsupported language '${value}'. Expected one of: ${SUPPORTED_LANGUAGES.join(', ')}`
      );
    }

    throw new Error(`Unknown argument '${arg}'`);
  }

  return options;
}

async function loadEnvFile(filePath: string): Promise<void> {
  let content = '';
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || key in process.env) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

async function writeJsonFile(
  filePath: string,
  value: Record<string, string>
): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function getTopicIds(curriculum: CurriculumFile): string[] {
  return curriculum.categories.flatMap((category) =>
    category.topics.map((topic) => topic.id)
  );
}

function getLanguageInstruction(
  language: ExplanationLanguage,
  programmingLanguageName: string
): string {
  return language === 'de'
    ? `Write the ENTIRE explanation in German (Deutsch), including ALL headings and section titles. Keep only code examples and ${programmingLanguageName} syntax in English as they are programming terms.`
    : 'Write the entire explanation in English.';
}

function getSectionHeadings(language: ExplanationLanguage): string {
  return language === 'de'
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
}

function buildOpenAIPayload(
  programmingLanguage: ProgrammingLanguageId,
  programmingLanguageName: string,
  topicDescription: string,
  language: ExplanationLanguage,
  contextExclusion: string
) {
  const languageInstruction = getLanguageInstruction(
    language,
    programmingLanguageName
  );
  const sectionHeadings = getSectionHeadings(language);
  const input = `Explain the following ${programmingLanguageName} topic for computer science students: ${topicDescription}

${languageInstruction}

Structure your explanation as follows:
${sectionHeadings}

Format the response in Markdown. Use code blocks with \`\`\`${programmingLanguage} for code examples.
Keep the total length to about 500-700 words.
${contextExclusion ? `${contextExclusion}.` : ''}`;

  return {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    instructions: `You are an experienced ${programmingLanguageName} programming tutor explaining concepts to university students. ${
      language === 'de' ? 'Respond in German.' : 'Respond in English.'
    } Use clear, concise language and practical examples.`,
    input,
    max_output_tokens: 2048,
  };
}

function getResponseText(response: OpenAIResponse): string {
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }

  if (!Array.isArray(response.output)) {
    return '';
  }

  const parts: string[] = [];

  for (const item of response.output) {
    const content = (item as { content?: unknown })?.content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const block of content) {
      const text = (block as { text?: unknown })?.text;
      if (typeof text === 'string') {
        parts.push(text);
      }
    }
  }

  return parts.join('');
}

function getResponseRefusal(response: OpenAIResponse): string | null {
  if (!Array.isArray(response.output)) {
    return null;
  }

  for (const item of response.output) {
    const content = (item as { content?: unknown })?.content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const block of content) {
      if (
        (block as { type?: unknown })?.type === 'refusal' &&
        typeof (block as { refusal?: unknown })?.refusal === 'string'
      ) {
        return (block as { refusal: string }).refusal;
      }
    }
  }

  return null;
}

function assertOpenAIResponseIsUsable(response: OpenAIResponse): void {
  const refusal = getResponseRefusal(response);
  if (refusal) {
    throw new Error(`OpenAI refused the request: ${refusal}`);
  }

  if (response.status !== 'incomplete') {
    return;
  }

  const reason = response.incomplete_details?.reason;
  if (typeof reason === 'string' && reason.length > 0) {
    throw new Error(`OpenAI response incomplete: ${reason}`);
  }

  throw new Error('OpenAI response incomplete');
}

async function requestTopicExplanation(
  payload: Record<string, unknown>
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const configuredTimeout = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : DEFAULT_TIMEOUT_MS;

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const json = (await response.json()) as OpenAIResponse;
  assertOpenAIResponseIsUsable(json);

  const explanation = getResponseText(json).trim();
  if (!explanation) {
    throw new Error('Empty response from OpenAI');
  }

  return explanation;
}

function isRetryableOpenAIError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return true;
  }

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error);

  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('aborted due to timeout')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestTopicExplanationWithRetry(
  payload: Record<string, unknown>,
  resourceId: string
): Promise<string> {
  let attempt = 0;

  while (attempt < DEFAULT_MAX_ATTEMPTS) {
    attempt += 1;

    try {
      return await requestTopicExplanation(payload);
    } catch (error) {
      if (!isRetryableOpenAIError(error) || attempt >= DEFAULT_MAX_ATTEMPTS) {
        throw error;
      }

      const backoffMs = attempt * 2_000;
      console.warn(
        `retry ${resourceId}: attempt ${attempt} failed (${String(error)}), waiting ${backoffMs}ms`
      );
      await sleep(backoffMs);
    }
  }

  throw new Error(`Failed to generate explanation for ${resourceId}`);
}

function sortExplanations(
  topicIds: string[],
  explanations: Record<string, string>
): Record<string, string> {
  const sortedEntries = topicIds
    .filter((topicId) => typeof explanations[topicId] === 'string')
    .map((topicId) => [topicId, explanations[topicId]] as const);

  return Object.fromEntries(sortedEntries);
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  await loadEnvFile(path.join(ROOT_DIR, '.env.local'));

  const selectedProgrammingLanguages = options.programmingLanguage
    ? [options.programmingLanguage]
    : [...SUPPORTED_PROGRAMMING_LANGUAGE_IDS];
  const selectedLanguages = options.language
    ? [options.language]
    : [...SUPPORTED_LANGUAGES];

  for (const programmingLanguage of selectedProgrammingLanguages) {
    const curriculum = await readJsonFile<CurriculumFile>(
      path.join(CURRICULUM_DIR, `${programmingLanguage}.json`)
    );
    const promptMap = await readJsonFile<PromptMap>(
      path.join(TOPIC_PROMPTS_DIR, `${programmingLanguage}.json`)
    );
    const topicIds = getTopicIds(curriculum).filter((topicId) =>
      options.topicId ? topicId === options.topicId : true
    );

    if (topicIds.length === 0) {
      throw new Error(
        `No matching topics found for ${programmingLanguage}${options.topicId ? ` and topic '${options.topicId}'` : ''}`
      );
    }

    const programmingLanguageName = curriculum.languageName.en;
    const contextExclusion = curriculum.contextExclusion?.trim() ?? '';

    for (const language of selectedLanguages) {
      const explanationFilePath = path.join(
        EXPLANATIONS_DIR,
        `${programmingLanguage}.${language}.json`
      );
      const existingExplanations =
        await readJsonFile<Record<string, string>>(explanationFilePath);

      let generatedCount = 0;
      let skippedCount = 0;

      for (const topicId of topicIds) {
        const existingExplanation = existingExplanations[topicId]?.trim();
        if (existingExplanation && !options.force) {
          skippedCount += 1;
          console.log(
            `skip ${programmingLanguage}/${language}/${topicId} (already exists)`
          );
          continue;
        }

        const topicDescription =
          promptMap[topicId] ||
          `general ${programmingLanguageName} programming concepts`;
        const payload = buildOpenAIPayload(
          programmingLanguage,
          programmingLanguageName,
          topicDescription,
          language,
          contextExclusion
        );

        console.log(`generate ${programmingLanguage}/${language}/${topicId}`);
        const explanation = await requestTopicExplanationWithRetry(
          payload,
          `${programmingLanguage}/${language}/${topicId}`
        );
        existingExplanations[topicId] = explanation;
        generatedCount += 1;

        await writeJsonFile(
          explanationFilePath,
          sortExplanations(getTopicIds(curriculum), existingExplanations)
        );
      }

      console.log(
        `done ${programmingLanguage}/${language}: generated ${generatedCount}, skipped ${skippedCount}`
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
