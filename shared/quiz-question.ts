export interface QuizQuestion {
  id: string;
  topicId?: string;
  question: string;
  code?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
