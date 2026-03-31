// The strict wire schema always includes commonMistake as a string because
// OpenAI structured outputs require all declared properties when
// additionalProperties is false. An empty string means "not applicable" and
// is collapsed back to the optional QuizQuestion.commonMistake field during
// validation.
export const QUIZ_RESPONSE_FORMAT = {
  format: {
    type: 'json_schema',
    name: 'quiz_questions',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              code: { type: ['string', 'null'] },
              options: {
                type: 'array',
                items: { type: 'string' },
              },
              correctIndex: { type: 'integer' },
              explanation: { type: 'string' },
              resultSentence: { type: 'string' },
              takeaway: { type: 'string' },
              commonMistake: { type: 'string' },
            },
            required: [
              'question',
              'code',
              'options',
              'correctIndex',
              'explanation',
              'resultSentence',
              'takeaway',
              'commonMistake',
            ],
            additionalProperties: false,
          },
        },
      },
      required: ['questions'],
      additionalProperties: false,
    },
  },
} as const;

export function buildMixedQuizResponseFormat(topicIds: string[]) {
  return {
    format: {
      type: 'json_schema',
      name: 'mixed_quiz_questions',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topicId: {
                  type: 'string',
                  enum: topicIds,
                },
                question: { type: 'string' },
                code: { type: ['string', 'null'] },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                },
                correctIndex: { type: 'integer' },
                explanation: { type: 'string' },
                resultSentence: { type: 'string' },
                takeaway: { type: 'string' },
                commonMistake: { type: 'string' },
              },
              required: [
                'topicId',
                'question',
                'code',
                'options',
                'correctIndex',
                'explanation',
                'resultSentence',
                'takeaway',
                'commonMistake',
              ],
              additionalProperties: false,
            },
          },
        },
        required: ['questions'],
        additionalProperties: false,
      },
    },
  };
}
