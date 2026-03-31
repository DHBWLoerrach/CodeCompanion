import { getTopicExplanation, hasTopicExplanation } from '@shared/explanations';
import javascriptDe from '@shared/explanations/javascript.de.json';
import javascriptEn from '@shared/explanations/javascript.en.json';
import javaDe from '@shared/explanations/java.de.json';
import javaEn from '@shared/explanations/java.en.json';
import pythonDe from '@shared/explanations/python.de.json';
import pythonEn from '@shared/explanations/python.en.json';
import { getTopicIdsByLanguage } from '@shared/curriculum';
import {
  SUPPORTED_PROGRAMMING_LANGUAGE_IDS,
  type ProgrammingLanguageId,
} from '@shared/programming-language';

const SUPPORTED_EXPLANATION_LANGUAGES = ['en', 'de'] as const;

const EXPLANATION_FILES = {
  javascript: {
    en: javascriptEn,
    de: javascriptDe,
  },
  python: {
    en: pythonEn,
    de: pythonDe,
  },
  java: {
    en: javaEn,
    de: javaDe,
  },
} as const satisfies Record<
  ProgrammingLanguageId,
  Record<
    (typeof SUPPORTED_EXPLANATION_LANGUAGES)[number],
    Record<string, string>
  >
>;

function getCoverageIssues(): string[] {
  const issues: string[] = [];

  for (const programmingLanguage of SUPPORTED_PROGRAMMING_LANGUAGE_IDS) {
    const expectedTopicIds = new Set(
      getTopicIdsByLanguage(programmingLanguage)
    );

    for (const language of SUPPORTED_EXPLANATION_LANGUAGES) {
      const explanations = EXPLANATION_FILES[programmingLanguage][language];

      for (const topicId of expectedTopicIds) {
        if (!getTopicExplanation(programmingLanguage, topicId, language)) {
          issues.push(`missing ${programmingLanguage}/${language}/${topicId}`);
        }
      }

      for (const topicId of Object.keys(explanations)) {
        if (!expectedTopicIds.has(topicId)) {
          issues.push(`orphan ${programmingLanguage}/${language}/${topicId}`);
        }
      }
    }
  }

  return issues;
}

describe('shared/explanations', () => {
  it('covers all curriculum topics in both app languages', () => {
    expect(getCoverageIssues()).toEqual([]);
  });

  it('returns markdown explanations for known topics', () => {
    expect(getTopicExplanation('javascript', 'variables', 'en')).toContain(
      '##'
    );
    expect(getTopicExplanation('javascript', 'variables', 'de')).toContain(
      '##'
    );
    expect(getTopicExplanation('java', 'variables-constants', 'en')).toContain(
      '##'
    );
    expect(getTopicExplanation('java', 'variables-constants', 'de')).toContain(
      '##'
    );
  });

  it('returns undefined when a static explanation is not present', () => {
    expect(getTopicExplanation('java', 'does-not-exist', 'de')).toBe(undefined);
  });

  it('reports availability as a boolean helper', () => {
    expect(hasTopicExplanation('javascript', 'variables', 'en')).toBe(true);
    expect(hasTopicExplanation('java', 'does-not-exist', 'de')).toBe(false);
  });
});
