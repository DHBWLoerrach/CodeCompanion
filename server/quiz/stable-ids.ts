import type { ProgrammingLanguageId } from '@shared/programming-language';
import { sha256Hex } from '@server/crypto';
import type { GeneratedQuizQuestion } from './types';

export async function addStableIds<T extends GeneratedQuizQuestion>(
  programmingLanguage: ProgrammingLanguageId,
  questions: T[],
  getTopicId: (question: T, index: number) => string
): Promise<(T & { id: string })[]> {
  const withIds = await Promise.all(
    questions.map(async (question, index) => {
      const topicId = getTopicId(question, index);
      // Keep the index in the hash so duplicates within one generated quiz still
      // receive distinct IDs even if the model repeats the same payload.
      const contentHash = await sha256Hex(
        JSON.stringify({
          programmingLanguage,
          topicId,
          question: question.question,
          code: question.code ?? null,
          options: question.options,
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          resultSentence: question.resultSentence,
          takeaway: question.takeaway,
          // Canonicalize the optional domain field in the hash input. This keeps
          // stable IDs identical whether commonMistake is absent or came from
          // the wire as the empty-string sentinel.
          commonMistake: question.commonMistake ?? null,
          index,
        })
      );
      return {
        ...question,
        id: `${topicId}-${contentHash.substring(0, 12)}`,
      };
    })
  );

  return withIds;
}
