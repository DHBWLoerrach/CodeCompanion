import javascriptDe from './javascript.de.json';
import javascriptEn from './javascript.en.json';
import javaDe from './java.de.json';
import javaEn from './java.en.json';
import pythonDe from './python.de.json';
import pythonEn from './python.en.json';
import type { ProgrammingLanguageId } from '@shared/programming-language';

export type ExplanationLanguage = 'en' | 'de';

type ExplanationMap = Record<string, string>;

function toExplanationMap(value: unknown): ExplanationMap {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, explanation]) => typeof explanation === 'string'
  );

  return Object.fromEntries(entries) as ExplanationMap;
}

const TOPIC_EXPLANATIONS = {
  javascript: {
    en: toExplanationMap(javascriptEn),
    de: toExplanationMap(javascriptDe),
  },
  python: {
    en: toExplanationMap(pythonEn),
    de: toExplanationMap(pythonDe),
  },
  java: {
    en: toExplanationMap(javaEn),
    de: toExplanationMap(javaDe),
  },
} as const satisfies Record<
  ProgrammingLanguageId,
  Record<ExplanationLanguage, ExplanationMap>
>;

export function getTopicExplanation(
  programmingLanguage: ProgrammingLanguageId,
  topicId: string,
  language: ExplanationLanguage = 'en'
): string | undefined {
  const explanation =
    TOPIC_EXPLANATIONS[programmingLanguage]?.[language]?.[topicId];

  if (typeof explanation !== 'string') {
    return undefined;
  }

  const trimmed = explanation.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function hasTopicExplanation(
  programmingLanguage: ProgrammingLanguageId,
  topicId: string,
  language: ExplanationLanguage = 'en'
): boolean {
  return (
    getTopicExplanation(programmingLanguage, topicId, language) !== undefined
  );
}
