import { getCurriculumByLanguage } from '@shared/curriculum';
import {
  SUPPORTED_PROGRAMMING_LANGUAGE_IDS,
  type ProgrammingLanguageId,
} from '@shared/programming-language';
import type { LocalizedText } from '@shared/curriculum/types';

export interface ProgrammingLanguageOverview {
  summary: LocalizedText;
  keyFacts: LocalizedText[];
  useCases: LocalizedText[];
  contentNotes: LocalizedText[];
  isPlaceholder: boolean;
}

function localized(en: string, de: string): LocalizedText {
  return { en, de };
}

function createPlaceholderOverview(
  languageId: ProgrammingLanguageId
): ProgrammingLanguageOverview {
  const { languageName } = getCurriculumByLanguage(languageId);

  return {
    summary: localized(
      `${languageName.en} overview placeholder. Final language-specific copy will be added later.`,
      `Platzhalter-Überblick für ${languageName.de}. Eine sprachspezifische Beschreibung wird später ergänzt.`
    ),
    keyFacts: [
      localized(
        'Placeholder for core properties and learning-relevant characteristics.',
        'Platzhalter für zentrale Eigenschaften und lernrelevante Merkmale.'
      ),
      localized(
        'Placeholder for syntax, execution model, or tooling notes.',
        'Platzhalter für Syntax, Ausführungsmodell oder Tooling-Hinweise.'
      ),
      localized(
        'Placeholder for how learners should approach this language.',
        'Platzhalter dafür, wie Lernende diese Sprache einordnen sollten.'
      ),
    ],
    useCases: [
      localized(
        'Placeholder for typical professional or academic use cases.',
        'Platzhalter für typische berufliche oder akademische Einsatzbereiche.'
      ),
      localized(
        'Placeholder for common project contexts and workflows.',
        'Platzhalter für typische Projektkontexte und Arbeitsabläufe.'
      ),
      localized(
        'Placeholder for where this language usually appears in practice.',
        'Platzhalter dafür, wo diese Sprache in der Praxis typischerweise vorkommt.'
      ),
    ],
    contentNotes: [
      localized(
        'Placeholder for the scope of the curriculum in this app.',
        'Platzhalter für den Umfang der Inhalte in dieser App.'
      ),
      localized(
        'Placeholder for exclusions, simplifications, or missing areas.',
        'Platzhalter für Auslassungen, Vereinfachungen oder fehlende Themenbereiche.'
      ),
      localized(
        'Placeholder for how far the current learning path goes.',
        'Platzhalter dafür, wie weit der aktuelle Lernpfad reicht.'
      ),
    ],
    isPlaceholder: true,
  };
}

export const LANGUAGE_OVERVIEWS = Object.fromEntries(
  SUPPORTED_PROGRAMMING_LANGUAGE_IDS.map((languageId) => [
    languageId,
    createPlaceholderOverview(languageId),
  ])
) as Record<ProgrammingLanguageId, ProgrammingLanguageOverview>;

export function getLanguageOverviewById(
  languageId: string | null | undefined
): ProgrammingLanguageOverview | undefined {
  if (!languageId) {
    return undefined;
  }

  return LANGUAGE_OVERVIEWS[languageId as ProgrammingLanguageId];
}
