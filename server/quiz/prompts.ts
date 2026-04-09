import type { QuizDifficultyLevel } from '@shared/skill-level';
import type { MixedQuizTopicPlanItem } from './types';

function getSingleChoiceQualityRequirements(): string {
  return `- Have exactly 4 answer options
- Have exactly one objectively correct option and three objectively incorrect distractors
- Set correctAnswer to an exact copy of the single correct option; do not paraphrase it, reword it, or change letter case
- For syntax questions, the three wrong options must contain actual syntax errors; never use alternative valid syntax as a distractor
- Never generate questions where more than one option could be syntactically valid, partially true, or context-dependent
- Avoid ambiguous or multi-select stems unless the other three options are unambiguously wrong
- Before finalizing each question, verify every option one by one and discard the question if more than one option could be defended as correct
- In the explanation, describe the correct answer by quoting its content rather than by option number or letter
- In the explanation, briefly state why each wrong option is incorrect`;
}

function getDifficultyLabel(skillLevel: QuizDifficultyLevel): string {
  return skillLevel === 1
    ? 'Beginner'
    : skillLevel === 2
      ? 'Intermediate'
      : 'Advanced';
}

function getDifficultyInstruction(skillLevel: QuizDifficultyLevel): string {
  return skillLevel === 1
    ? 'Create BEGINNER level questions: Focus on basic syntax, simple examples, and fundamental concepts. Use straightforward code snippets under 5 lines.'
    : skillLevel === 2
      ? 'Create INTERMEDIATE level questions: Include more complex scenarios, edge cases, and require deeper understanding. Use code snippets of 5-8 lines with subtle behavior.'
      : 'Create ADVANCED level questions: Focus on tricky edge cases, performance considerations, and expert-level understanding. Use complex code with multiple concepts combined.';
}

function getLanguageInstruction(
  language: string,
  programmingLanguageName: string
): string {
  return language === 'de'
    ? `Write all questions, answer options, and explanations in German (Deutsch). Keep code examples and ${programmingLanguageName} syntax in English as they are programming terms.`
    : 'Write all questions, answer options, and explanations in English.';
}

export function buildQuizInstructions(
  programmingLanguageName: string,
  language: string
): string {
  return `You are a ${programmingLanguageName} programming tutor creating quiz questions. ${
    language === 'de' ? 'Respond in German.' : 'Respond in English.'
  } Follow the provided response schema exactly.`;
}

export function buildQuizPrompt({
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
}): string {
  const languageInstruction = getLanguageInstruction(
    language,
    programmingLanguageName
  );
  const difficultyInstruction = getDifficultyInstruction(skillLevel);
  const difficultyLabel = getDifficultyLabel(skillLevel);

  return `Generate ${count} multiple-choice quiz questions about ${topicDescription} for computer science students learning ${programmingLanguageName} programming.

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
${contextExclusion ? `- ${contextExclusion}` : ''}
- Do not include any keys other than question, code, options, correctAnswer, explanation, resultSentence, takeaway, and commonMistake`;
}

export function buildMixedQuizInstructions(
  programmingLanguageName: string,
  language: string
): string {
  return `You are a ${programmingLanguageName} programming tutor creating mixed-topic quiz questions. ${
    language === 'de' ? 'Respond in German.' : 'Respond in English.'
  } Follow the provided response schema exactly.`;
}

export function buildMixedQuizPrompt({
  programmingLanguageName,
  contextExclusion,
  language,
  skillLevel,
  resolvedTopicPlan,
}: {
  programmingLanguageName: string;
  contextExclusion: string;
  language: string;
  skillLevel: QuizDifficultyLevel;
  resolvedTopicPlan: (MixedQuizTopicPlanItem & {
    topicDescription: string;
  })[];
}): string {
  const languageInstruction = getLanguageInstruction(
    language,
    programmingLanguageName
  );
  const difficultyInstruction = getDifficultyInstruction(skillLevel);
  const difficultyLabel = getDifficultyLabel(skillLevel);
  const totalCount = resolvedTopicPlan.reduce(
    (sum, item) => sum + item.questionCount,
    0
  );

  return `Generate ${totalCount} multiple-choice quiz questions for computer science students learning ${programmingLanguageName} programming.

${languageInstruction}

DIFFICULTY LEVEL: ${difficultyLabel}
${difficultyInstruction}

TOPIC PLAN:
${resolvedTopicPlan
  .map(
    ({ topicId, questionCount, topicDescription }) =>
      `- ${topicId}: exactly ${questionCount} question(s) about ${topicDescription}`
  )
  .join('\n')}

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
${contextExclusion ? `- ${contextExclusion}` : ''}
- Do not include any keys other than topicId, question, code, options, correctAnswer, explanation, resultSentence, takeaway, and commonMistake`;
}
