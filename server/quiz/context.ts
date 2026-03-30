import type { ProgrammingLanguageId } from "@shared/programming-language";
import {
  getTopicPrompt,
  LANGUAGE_CONTEXT_EXCLUSIONS,
  LANGUAGE_NAMES,
} from "@shared/topic-prompts";
import type { ProgrammingLanguageContext } from "./types";

export function resolveProgrammingLanguageContext(
  programmingLanguage: ProgrammingLanguageId,
): ProgrammingLanguageContext {
  return {
    programmingLanguageName:
      LANGUAGE_NAMES[programmingLanguage] ?? programmingLanguage,
    contextExclusion: LANGUAGE_CONTEXT_EXCLUSIONS[programmingLanguage] ?? "",
  };
}

export function resolveTopicDescription(
  programmingLanguage: ProgrammingLanguageId,
  programmingLanguageName: string,
  topicId: string,
): string {
  return (
    getTopicPrompt(programmingLanguage, topicId) ||
    `general ${programmingLanguageName} programming concepts`
  );
}

export function resolveLanguageContext(
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
