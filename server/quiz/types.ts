import type { QuizQuestion } from "@shared/quiz-question";

export type GeneratedQuizQuestion = Omit<QuizQuestion, "id" | "code"> & {
  code?: string;
};

export type GeneratedMixedQuizQuestion = GeneratedQuizQuestion & {
  topicId: string;
};

export type StructuredQuizQuestion = Omit<GeneratedQuizQuestion, "code"> & {
  code: string | null;
};

export type StructuredMixedQuizQuestion = Omit<
  GeneratedMixedQuizQuestion,
  "code"
> & {
  code: string | null;
};

export type MixedQuizTopicPlanItem = {
  topicId: string;
  questionCount: number;
};

export type StructuredQuizQuestionWireCandidate = {
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

export type StructuredQuizQuestionFields = {
  question: string;
  code: string | null;
  options: string[];
  correctIndex: number;
  explanation: string;
  resultSentence: string;
  takeaway: string;
  commonMistake?: string;
};

export type ProgrammingLanguageContext = {
  programmingLanguageName: string;
  contextExclusion: string;
};
