import {
  getCurriculumByLanguage,
  getTopicIdsByLanguage,
} from "@shared/curriculum";
import {
  SUPPORTED_PROGRAMMING_LANGUAGE_IDS,
  type ProgrammingLanguageId,
} from "@shared/programming-language";
import javascriptTopicPrompts from "./javascript.json";
import javaTopicPrompts from "./java.json";
import pythonTopicPrompts from "./python.json";

const LANGUAGE_TOPIC_PROMPTS: Record<
  ProgrammingLanguageId,
  Record<string, string>
> = {
  javascript: javascriptTopicPrompts,
  python: pythonTopicPrompts,
  java: javaTopicPrompts,
};

export const LANGUAGE_NAMES = Object.fromEntries(
  SUPPORTED_PROGRAMMING_LANGUAGE_IDS.map((languageId) => [
    languageId,
    getCurriculumByLanguage(languageId).languageName.en,
  ]),
) as Record<ProgrammingLanguageId, string>;

export const LANGUAGE_CONTEXT_EXCLUSIONS = Object.fromEntries(
  SUPPORTED_PROGRAMMING_LANGUAGE_IDS.map((languageId) => [
    languageId,
    getCurriculumByLanguage(languageId).contextExclusion ?? "",
  ]),
) as Record<ProgrammingLanguageId, string>;

function assertPromptCoverage(): void {
  for (const languageId of SUPPORTED_PROGRAMMING_LANGUAGE_IDS) {
    const curriculumTopicIds = new Set(getTopicIdsByLanguage(languageId));
    const promptTopicIds = new Set(
      Object.keys(LANGUAGE_TOPIC_PROMPTS[languageId] ?? {}),
    );

    const missingTopicPrompts = [...curriculumTopicIds].filter(
      (topicId) => !promptTopicIds.has(topicId),
    );
    const orphanPromptTopicIds = [...promptTopicIds].filter(
      (topicId) => !curriculumTopicIds.has(topicId),
    );

    if (missingTopicPrompts.length === 0 && orphanPromptTopicIds.length === 0) {
      continue;
    }

    const details = [
      missingTopicPrompts.length > 0
        ? `missing prompts: ${missingTopicPrompts.join(", ")}`
        : null,
      orphanPromptTopicIds.length > 0
        ? `orphan prompts: ${orphanPromptTopicIds.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("; ");

    throw new Error(
      `Topic prompt mapping mismatch for '${languageId}' (${details})`,
    );
  }
}

assertPromptCoverage();

export function getTopicPrompt(
  languageId: ProgrammingLanguageId,
  topicId: string,
): string | undefined {
  return LANGUAGE_TOPIC_PROMPTS[languageId]?.[topicId];
}
