export interface QuizQuestion {
  id: string;
  question: string;
  code?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const TOPIC_PROMPTS: Record<string, string> = {
  variables:
    'JavaScript variable declarations using let and const only (do not include var), including block scope and when to use each',
  'data-types':
    'JavaScript primitive data types (string, number, boolean, null, undefined, symbol, bigint) and type checking',
  operators: 'JavaScript arithmetic, comparison, and logical operators',
  conditionals: 'JavaScript if/else statements and ternary operators',
  loops: 'JavaScript for, while, do-while, and for...of loops',
  switch: 'JavaScript switch statements and case handling',
  declarations: 'JavaScript function declarations and function expressions',
  'arrow-functions': 'JavaScript ES6 arrow function syntax and behavior',
  callbacks: 'JavaScript callback functions and callback patterns',
  objects: 'JavaScript object literals, properties, and methods',
  arrays: 'JavaScript array methods like map, filter, reduce, find, forEach',
  destructuring: 'JavaScript object and array destructuring syntax',
  promises: 'JavaScript Promises, then/catch chaining, and Promise.all',
  'async-await': 'JavaScript async/await syntax for handling asynchronous code',
  'error-handling': 'JavaScript try/catch blocks and error management',
  closures: 'JavaScript closures and lexical scope',
  prototypes: 'JavaScript prototype chain and prototype-based inheritance',
  classes: 'JavaScript ES6 class syntax, constructors, and methods',
  modules: 'JavaScript ES6 import/export and module patterns',
};

function getResponseText(response: unknown): string {
  if (
    typeof (response as { output_text?: unknown })?.output_text === 'string'
  ) {
    return (response as { output_text: string }).output_text;
  }

  const output = (response as { output?: unknown })?.output;
  if (!Array.isArray(output)) {
    return '';
  }

  const parts: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown })?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (
        (block as { type?: string })?.type === 'output_text' &&
        typeof (block as { text?: unknown })?.text === 'string'
      ) {
        parts.push((block as { text: string }).text);
      } else if (typeof (block as { text?: unknown })?.text === 'string') {
        parts.push((block as { text: string }).text);
      }
    }
  }

  return parts.join('');
}

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

function parseQuestions(content: string): QuizQuestion[] {
  const cleanContent = stripJsonFences(content);
  const parsed = JSON.parse(cleanContent) as unknown;

  if (Array.isArray(parsed)) {
    return parsed as QuizQuestion[];
  }

  const wrapped = parsed as { questions?: unknown } | null;
  if (wrapped?.questions && Array.isArray(wrapped.questions)) {
    return wrapped.questions as QuizQuestion[];
  }

  return [];
}

async function requestOpenAI(payload: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const response = await fetch(`https://api.openai.com/v1/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function sha256Hex(input: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('crypto.subtle is not available');
  }

  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function addStableIds(
  topicId: string,
  questions: QuizQuestion[],
): Promise<QuizQuestion[]> {
  const withIds = await Promise.all(
    questions.map(async (question, index) => {
      const contentHash = await sha256Hex(
        `${topicId}-${question.question}-${JSON.stringify(question.options)}-${index}`,
      );
      return {
        ...question,
        id: `${topicId}-${contentHash.substring(0, 12)}`,
      };
    }),
  );

  return withIds;
}

export async function generateQuizQuestions(
  topicId: string,
  count: number = 5,
  language: string = 'en',
  skillLevel: 1 | 2 | 3 = 1,
): Promise<QuizQuestion[]> {
  const topicDescription =
    TOPIC_PROMPTS[topicId] || 'general JavaScript programming concepts';

  const languageInstruction =
    language === 'de'
      ? 'Write all questions, answer options, and explanations in German (Deutsch). Keep code examples and JavaScript syntax in English as they are programming terms.'
      : 'Write all questions, answer options, and explanations in English.';

  const difficultyInstruction =
    skillLevel === 1
      ? 'Create BEGINNER level questions: Focus on basic syntax, simple examples, and fundamental concepts. Use straightforward code snippets under 5 lines.'
      : skillLevel === 2
        ? 'Create INTERMEDIATE level questions: Include more complex scenarios, edge cases, and require deeper understanding. Use code snippets of 5-8 lines with subtle behavior.'
        : 'Create ADVANCED level questions: Focus on tricky edge cases, performance considerations, and expert-level understanding. Use complex code with multiple concepts combined.';

  const prompt = `Generate ${count} multiple-choice quiz questions about ${topicDescription} for computer science students learning JavaScript programming.

${languageInstruction}

DIFFICULTY LEVEL: ${skillLevel === 1 ? 'Beginner' : skillLevel === 2 ? 'Intermediate' : 'Advanced'}
${difficultyInstruction}

Each question should:
- Test understanding of the concept, not just memorization
- Include a short code snippet when appropriate (keep code under 10 lines)
- Have exactly 4 answer options
- Have only one correct answer
- Include a brief explanation of why the correct answer is right

Return a JSON array with this exact structure:
[
  {
    "id": "unique-id-1",
    "question": "What will be the output of this code?",
    "code": "const x = 5;\\nlet y = x;\\ny = 10;\\nconsole.log(x);",
    "options": ["5", "10", "undefined", "Error"],
    "correctIndex": 0,
    "explanation": "Primitives are copied by value, so changing y doesn't affect x."
  }
]

Important:
- Make questions progressively challenging
- Use realistic code examples students would encounter
- Avoid web/HTML/CSS context - focus purely on JavaScript language concepts
- Return ONLY valid JSON, no markdown or extra text`;

  const response = await requestOpenAI({
    model: process.env.OPENAI_MODEL || 'gpt-5.2',
    instructions: `You are a JavaScript programming tutor creating quiz questions. ${
      language === 'de' ? 'Respond in German.' : 'Respond in English.'
    } Always respond with valid JSON containing a 'questions' array.`,
    input: prompt,
    max_output_tokens: 4096,
  });

  const content = getResponseText(response);
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  let questions = parseQuestions(content);
  questions = await addStableIds(topicId, questions);

  return questions;
}

export async function generateTopicExplanation(
  topicId: string,
  language: string = 'en',
): Promise<string> {
  const topicDescription =
    TOPIC_PROMPTS[topicId] || 'general JavaScript programming concepts';

  const languageInstruction =
    language === 'de'
      ? 'Write the ENTIRE explanation in German (Deutsch), including ALL headings and section titles. Keep only code examples and JavaScript syntax in English as they are programming terms.'
      : 'Write the entire explanation in English.';

  const sectionHeadings =
    language === 'de'
      ? `1. **Einfuhrung** - Ein kurzer Uberblick, was dieses Konzept ist und warum es wichtig ist
2. **Kernkonzepte** - Die wichtigsten Punkte, die Studierende verstehen mussen
3. **Code-Beispiele** - 2-3 praktische Code-Beispiele mit Erklarungen
4. **Haufige Fehler** - Was man bei diesem Konzept vermeiden sollte
5. **Best Practices** - Tipps fur den effektiven Einsatz dieses Konzepts`
      : `1. **Introduction** - A brief overview of what this concept is and why it's important
2. **Key Concepts** - The main points students need to understand
3. **Code Examples** - 2-3 practical code examples with explanations
4. **Common Mistakes** - Things to avoid when using this concept
5. **Best Practices** - Tips for using this concept effectively`;

  const prompt = `Explain the following JavaScript topic for computer science students: ${topicDescription}

${languageInstruction}

Structure your explanation as follows:
${sectionHeadings}

Format the response in Markdown. Use code blocks with \`\`\`javascript for code examples.
Keep the total length to about 500-700 words.
Focus purely on JavaScript language concepts - avoid web/HTML/CSS context.`;

  const response = await requestOpenAI({
    model: process.env.OPENAI_MODEL || 'gpt-5.2',
    instructions: `You are an experienced JavaScript programming tutor explaining concepts to university students. ${
      language === 'de' ? 'Respond in German.' : 'Respond in English.'
    } Use clear, concise language and practical examples.`,
    input: prompt,
    max_output_tokens: 2048,
  });

  const explanation = getResponseText(response);
  if (!explanation) {
    throw new Error('Empty response from OpenAI');
  }

  return explanation;
}
