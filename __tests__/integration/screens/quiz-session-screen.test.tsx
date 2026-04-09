import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import QuizSessionScreen from '@/screens/QuizSessionScreen';
import { hasTopicExplanation } from '@shared/explanations';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockStackScreen = jest.fn();
const mockStackTitle = jest.fn();
const mockStackBackButton = jest.fn();
let mockHeaderOptions: { headerLeft?: () => React.ReactElement } | undefined;
const mockApiRequest = jest.fn();
const mockHasTopicExplanation = jest.mocked(hasTopicExplanation);
class MockApiRequestError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`Request failed (${status})`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
  }
}
const mockStorage = {
  getSettings: jest.fn(),
  getProgress: jest.fn(),
  getTopicProgressForLanguage: jest.fn(
    (topicProgress: Record<string, unknown>, languageId: string) => {
      const prefix = `${languageId}:`;
      const filtered: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(topicProgress)) {
        if (key.startsWith(prefix)) {
          filtered[key.slice(prefix.length)] = value;
        }
      }
      return filtered;
    }
  ),
  getTopicSkillLevel: jest.fn(),
  recordPractice: jest.fn(),
  updateTopicProgress: jest.fn(),
  updateTopicSkillLevel: jest.fn(),
};
let mockSearchParams: {
  topicId?: string;
  topicIds?: string;
  count?: string;
  programmingLanguage?: string;
  quizMode?: string;
  returnTo?: string;
} = {};

jest.mock('expo-router', () => ({
  Stack: jest
    .requireActual<
      typeof import('../../../test/expo-router-stack')
    >('../../../test/expo-router-stack')
    .createMockExpoRouterStack({
      onScreen: (props) => {
        mockStackScreen(props);
        mockHeaderOptions = props.options as
          | { headerLeft?: () => React.ReactElement }
          | undefined;
      },
      onTitle: (props) => mockStackTitle(props),
      onBackButton: (props) => mockStackBackButton(props),
    }),
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    back: jest.fn(),
    canDismiss: () => false,
    canGoBack: () => false,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/components/AppIcon', () => ({
  AppIcon: () => null,
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    refreshTheme: jest.fn(),
    theme: {
      primary: '#E2001A',
      secondary: '#4A90E2',
      success: '#34C759',
      accent: '#FFB800',
      error: '#E2001A',
      text: '#111111',
      tabIconDefault: '#666666',
      backgroundDefault: '#FFFFFF',
      backgroundRoot: '#FFFFFF',
      cardBorder: '#DDDDDD',
      codeBackground: '#F7F7F7',
      disabled: '#CCCCCC',
      buttonText: '#FFFFFF',
      onColor: '#FFFFFF',
      link: '#4A90E2',
      backgroundSecondary: '#F0F0F0',
      backgroundTertiary: '#EBEBEB',
      cardBorderSubtle: '#DDDDDD',
      separator: 'rgba(0, 0, 0, 0.08)',
    },
  }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'en',
    refreshLanguage: jest.fn(),
  }),
}));

jest.mock('@/lib/query-client', () => ({
  getApiUrl: jest.fn(() => 'http://localhost:8081/'),
  ApiRequestError: MockApiRequestError,
  isApiRequestError: (error: unknown) => error instanceof MockApiRequestError,
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

jest.mock('@/lib/storage', () => ({
  storage: {
    getSettings: (...args: unknown[]) => mockStorage.getSettings(...args),
    getProgress: (...args: unknown[]) => mockStorage.getProgress(...args),
    getTopicProgressForLanguage: (
      topicProgress: Record<string, unknown>,
      languageId: string
    ) => mockStorage.getTopicProgressForLanguage(topicProgress, languageId),
    getTopicSkillLevel: (...args: unknown[]) =>
      mockStorage.getTopicSkillLevel(...args),
    recordPractice: (...args: unknown[]) => mockStorage.recordPractice(...args),
    updateTopicProgress: (...args: unknown[]) =>
      mockStorage.updateTopicProgress(...args),
    updateTopicSkillLevel: (...args: unknown[]) =>
      mockStorage.updateTopicSkillLevel(...args),
  },
}));

jest.mock('@shared/explanations', () => ({
  hasTopicExplanation: jest.fn(),
}));

describe('QuizSessionScreen integration', () => {
  let randomSpy: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    mockStackScreen.mockReset();
    mockStackTitle.mockReset();
    mockStackBackButton.mockReset();
    mockHeaderOptions = undefined;
    mockApiRequest.mockReset();
    mockHasTopicExplanation.mockReset();
    mockStorage.getSettings.mockReset();
    mockStorage.getProgress.mockReset();
    mockStorage.getTopicProgressForLanguage.mockClear();
    mockStorage.getTopicSkillLevel.mockReset();
    mockStorage.recordPractice.mockReset();
    mockStorage.updateTopicProgress.mockReset();
    mockStorage.updateTopicSkillLevel.mockReset();

    mockSearchParams = {
      topicId: 'variables',
      count: '1',
      programmingLanguage: 'javascript',
    };
    mockStorage.getSettings.mockResolvedValue({
      language: 'en',
      themeMode: 'auto',
    });
    mockStorage.getTopicSkillLevel.mockResolvedValue(2);
    mockStorage.getProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      topicProgress: {},
      achievements: [],
    });
    mockStorage.recordPractice.mockResolvedValue(undefined);
    mockStorage.updateTopicProgress.mockResolvedValue(undefined);
    mockStorage.updateTopicSkillLevel.mockResolvedValue(undefined);
    mockHasTopicExplanation.mockReturnValue(false);

    mockApiRequest.mockResolvedValue({
      json: async () => ({
        questions: [
          {
            id: 'q1',
            question: 'What is const?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 1,
            explanation: 'Because const creates block-scoped bindings.',
            resultSentence: 'Result: Option B',
            takeaway: 'const creates block-scoped, non-reassignable bindings',
            commonMistake: '',
          },
        ],
      }),
    });

    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    randomSpy.mockRestore();
    alertSpy.mockRestore();
  });

  function pressHeaderCloseButton() {
    const headerLeft = mockHeaderOptions?.headerLeft;
    expect(headerLeft).toBeDefined();

    const headerButton = render(headerLeft!());
    fireEvent.press(headerButton.getByTestId('quiz-close-button'));
  }

  it('loads questions, submits answer, persists progress, and navigates to summary', async () => {
    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('What is const?')).toBeTruthy();
    });
    expect(mockStackTitle).toHaveBeenCalledWith(
      expect.objectContaining({ children: 'question 1 of 1' })
    );
    expect(mockStackBackButton).toHaveBeenCalledWith(
      expect.objectContaining({ hidden: true })
    );

    expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/quiz/generate', {
      topicId: 'variables',
      count: 1,
      language: 'en',
      skillLevel: 2,
      programmingLanguage: 'javascript',
    });

    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('submitAnswer'));

    await waitFor(() => {
      expect(
        screen.getByText('Because const creates block-scoped bindings.')
      ).toBeTruthy();
    });

    fireEvent.press(screen.getByText('viewResults'));

    await waitFor(() => {
      expect(mockStorage.recordPractice).toHaveBeenCalledTimes(1);
      expect(mockStorage.updateTopicProgress).toHaveBeenCalledWith(
        'javascript',
        'variables',
        1,
        0
      );
      expect(mockStorage.updateTopicSkillLevel).toHaveBeenCalledWith(
        'javascript',
        'variables',
        0
      );
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    const replaceArgs = mockReplace.mock.calls[0][0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(replaceArgs.pathname).toBe('/session-summary');
    expect(replaceArgs.params.topicId).toBe('variables');
    expect(replaceArgs.params.total).toBe('1');
    expect(replaceArgs.params.score).toBe('0');
    expect(replaceArgs.params.count).toBe('1');
    expect(replaceArgs.params.answers).toContain('"questionId":"q1"');
  });

  it('preserves the practice return target in summary params', async () => {
    mockSearchParams = {
      topicId: 'variables',
      count: '1',
      programmingLanguage: 'javascript',
      returnTo: 'practice',
    };

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('What is const?')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('submitAnswer'));

    await waitFor(() => {
      expect(
        screen.getByText('Because const creates block-scoped bindings.')
      ).toBeTruthy();
    });

    fireEvent.press(screen.getByText('viewResults'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    const replaceArgs = mockReplace.mock.calls[0][0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(replaceArgs.pathname).toBe('/session-summary');
    expect(replaceArgs.params.returnTo).toBe('practice');
  });

  it('opens the topic explanation from the quiz result when available', async () => {
    mockHasTopicExplanation.mockReturnValue(true);

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('What is const?')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('submitAnswer'));

    await waitFor(() => {
      expect(screen.getByTestId('quiz-topic-explanation-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('quiz-topic-explanation-button'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/topic-explanation',
      params: { topicId: 'variables', programmingLanguage: 'javascript' },
    });
  });

  it('uses the current question topic for mixed quiz explanation links', async () => {
    mockSearchParams = {
      topicIds: 'variables,loops',
      count: '1',
      programmingLanguage: 'javascript',
    };
    mockHasTopicExplanation.mockReturnValue(true);
    mockApiRequest.mockResolvedValueOnce({
      json: async () => ({
        questions: [
          {
            id: 'q1',
            topicId: 'loops',
            question: 'Question 1',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 1,
            explanation: 'Explanation 1',
            resultSentence: 'Result: Option B',
            takeaway: 'Takeaway 1',
            commonMistake: '',
          },
        ],
      }),
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('submitAnswer'));

    await waitFor(() => {
      expect(screen.getByTestId('quiz-topic-explanation-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('quiz-topic-explanation-button'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/topic-explanation',
      params: { topicId: 'loops', programmingLanguage: 'javascript' },
    });
  });

  it('renders inline code markers as styled text instead of raw backticks', async () => {
    mockApiRequest.mockResolvedValueOnce({
      json: async () => ({
        questions: [
          {
            id: 'q1',
            question: 'What is `x` after `let x;`?',
            options: ['`undefined`', '`null`', '`0`', '`NaN`'],
            correctIndex: 0,
            explanation: 'Because `let x;` leaves `x` as `undefined`.',
            resultSentence: 'Result: `undefined`',
            takeaway: 'Uninitialized `let` variables are `undefined`',
            commonMistake: '',
          },
        ],
      }),
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('What is x after let x;?')).toBeTruthy();
    });

    expect(screen.queryByText('What is `x` after `let x;`?')).toBeNull();
    const undefinedAnswer = screen.getByText('undefined');
    expect(undefinedAnswer).toBeTruthy();
    expect(screen.queryByText('`undefined`')).toBeNull();

    fireEvent.press(undefinedAnswer);
    expect(undefinedAnswer).toHaveStyle({
      color: '#FFFFFF',
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
    });
    fireEvent.press(screen.getByText('submitAnswer'));

    await waitFor(() => {
      expect(
        screen.getByText('Because let x; leaves x as undefined.')
      ).toBeTruthy();
    });
    expect(
      screen.queryByText('Because `let x;` leaves `x` as `undefined`.')
    ).toBeNull();
  });

  it('preserves the requested count when the API returns fewer questions', async () => {
    mockSearchParams = {
      topicId: 'variables',
      count: '3',
      programmingLanguage: 'javascript',
    };
    mockApiRequest.mockResolvedValueOnce({
      json: async () => ({
        questions: [
          {
            id: 'q1',
            question: 'Question 1',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 1,
            explanation: 'Explanation 1',
            resultSentence: 'Result: Option B',
            takeaway: 'Takeaway 1',
            commonMistake: '',
          },
          {
            id: 'q2',
            question: 'Question 2',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 1,
            explanation: 'Explanation 2',
            resultSentence: 'Result: Option B',
            takeaway: 'Takeaway 2',
            commonMistake: '',
          },
        ],
      }),
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeTruthy();
    });

    expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/quiz/generate', {
      topicId: 'variables',
      count: 3,
      language: 'en',
      skillLevel: 2,
      programmingLanguage: 'javascript',
    });

    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('submitAnswer'));
    await waitFor(() => {
      expect(screen.getByText('Explanation 1')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('nextQuestion'));

    await waitFor(() => {
      expect(screen.getByText('Question 2')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('submitAnswer'));
    await waitFor(() => {
      expect(screen.getByText('Explanation 2')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('viewResults'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });

    const replaceArgs = mockReplace.mock.calls[0][0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(replaceArgs.pathname).toBe('/session-summary');
    expect(replaceArgs.params.count).toBe('3');
    expect(replaceArgs.params.total).toBe('2');
  });

  it('sends mapped mixed skillLevel for provided topicIds', async () => {
    mockSearchParams = {
      topicIds: 'variables,loops',
      count: '2',
      programmingLanguage: 'javascript',
    };
    mockStorage.getProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      topicProgress: {
        'javascript:variables': {
          topicId: 'variables',
          questionsAnswered: 10,
          correctAnswers: 8,
          skillLevel: 5,
        },
        'javascript:loops': {
          topicId: 'loops',
          questionsAnswered: 4,
          correctAnswers: 2,
          skillLevel: 1,
        },
      },
      achievements: [],
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('What is const?')).toBeTruthy();
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      'POST',
      '/api/quiz/generate-mixed',
      {
        topicIds: ['variables', 'loops'],
        count: 2,
        language: 'en',
        skillLevel: 2,
        programmingLanguage: 'javascript',
      }
    );
  });

  it('preserves explore params for replay', async () => {
    mockSearchParams = {
      topicIds: 'operators,null-undefined,strings-template-literals',
      count: '5',
      programmingLanguage: 'javascript',
      quizMode: 'explore',
    };
    mockStorage.getProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      topicProgress: {
        'javascript:variables': {
          topicId: 'variables',
          questionsAnswered: 12,
          correctAnswers: 10,
          skillLevel: 5,
        },
        'javascript:data-types': {
          topicId: 'data-types',
          questionsAnswered: 9,
          correctAnswers: 8,
          skillLevel: 4,
        },
      },
      achievements: [],
    });
    mockApiRequest.mockResolvedValueOnce({
      json: async () => ({
        questions: [
          {
            id: 'q1',
            topicId: 'operators',
            question: 'Question 1',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 1,
            explanation: 'Explanation 1',
            resultSentence: 'Result: Option B',
            takeaway: 'Takeaway 1',
            commonMistake: '',
          },
          {
            id: 'q2',
            topicId: 'null-undefined',
            question: 'Question 2',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 0,
            explanation: 'Explanation 2',
            resultSentence: 'Result: Option A',
            takeaway: 'Takeaway 2',
            commonMistake: '',
          },
          {
            id: 'q3',
            topicId: 'strings-template-literals',
            question: 'Question 3',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 1,
            explanation: 'Explanation 3',
            resultSentence: 'Result: Option B',
            takeaway: 'Takeaway 3',
            commonMistake: '',
          },
        ],
      }),
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeTruthy();
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      'POST',
      '/api/quiz/generate-mixed',
      {
        topicIds: ['operators', 'null-undefined', 'strings-template-literals'],
        count: 5,
        language: 'en',
        skillLevel: 1,
        programmingLanguage: 'javascript',
      }
    );

    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('submitAnswer'));
    await waitFor(() => {
      expect(screen.getByText('Explanation 1')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('nextQuestion'));

    await waitFor(() => {
      expect(screen.getByText('Question 2')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('submitAnswer'));
    await waitFor(() => {
      expect(screen.getByText('Explanation 2')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('nextQuestion'));

    await waitFor(() => {
      expect(screen.getByText('Question 3')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Option A'));
    fireEvent.press(screen.getByText('submitAnswer'));
    await waitFor(() => {
      expect(screen.getByText('Explanation 3')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('viewResults'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
      expect(mockStorage.updateTopicProgress).toHaveBeenCalledWith(
        'javascript',
        'operators',
        1,
        0
      );
      expect(mockStorage.updateTopicProgress).toHaveBeenCalledWith(
        'javascript',
        'null-undefined',
        1,
        1
      );
      expect(mockStorage.updateTopicProgress).toHaveBeenCalledWith(
        'javascript',
        'strings-template-literals',
        1,
        0
      );
      expect(mockStorage.updateTopicSkillLevel).toHaveBeenCalledWith(
        'javascript',
        'operators',
        0
      );
      expect(mockStorage.updateTopicSkillLevel).toHaveBeenCalledWith(
        'javascript',
        'null-undefined',
        100
      );
      expect(mockStorage.updateTopicSkillLevel).toHaveBeenCalledWith(
        'javascript',
        'strings-template-literals',
        0
      );
    });

    const replaceArgs = mockReplace.mock.calls[0][0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(replaceArgs.pathname).toBe('/session-summary');
    expect(replaceArgs.params.topicIds).toBe(
      'operators,null-undefined,strings-template-literals'
    );
    expect(replaceArgs.params.quizMode).toBe('explore');
    expect(replaceArgs.params.count).toBe('5');
    expect(replaceArgs.params.total).toBe('3');
  });

  it('resolves a mixed topic pool client-side when no topicIds are provided', async () => {
    mockSearchParams = { programmingLanguage: 'javascript' };
    mockStorage.getProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      topicProgress: {
        'javascript:variables': {
          topicId: 'variables',
          questionsAnswered: 12,
          correctAnswers: 10,
          skillLevel: 1,
        },
        'javascript:loops': {
          topicId: 'loops',
          questionsAnswered: 7,
          correctAnswers: 6,
          skillLevel: 1,
        },
        'python:variables': {
          topicId: 'variables',
          questionsAnswered: 9,
          correctAnswers: 9,
          skillLevel: 5,
        },
      },
      achievements: [],
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('What is const?')).toBeTruthy();
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      'POST',
      '/api/quiz/generate-mixed',
      {
        topicIds: ['variables', 'loops'],
        count: 5,
        language: 'en',
        skillLevel: 1,
        programmingLanguage: 'javascript',
      }
    );
  });

  it('falls back to beginner mixed skillLevel when no progress exists', async () => {
    mockSearchParams = { programmingLanguage: 'javascript' };
    mockStorage.getProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      topicProgress: {},
      achievements: [],
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('What is const?')).toBeTruthy();
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      'POST',
      '/api/quiz/generate-mixed',
      {
        topicIds: ['variables', 'data-types', 'operators'],
        count: 5,
        language: 'en',
        skillLevel: 1,
        programmingLanguage: 'javascript',
      }
    );
  });

  it('shows the device quota message on structured 429 errors', async () => {
    mockApiRequest.mockRejectedValueOnce(
      new MockApiRequestError(429, {
        error: 'rate_limited',
        scope: 'device',
        reason: 'device_total',
        resetAtUtc: '2026-03-25T00:00:00.000Z',
      })
    );

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('quizRateLimitDevice')).toBeTruthy();
    });
  });

  it('shows the global quota message on structured 429 errors', async () => {
    mockApiRequest.mockRejectedValueOnce(
      new MockApiRequestError(429, {
        error: 'rate_limited',
        scope: 'global',
        reason: 'global_day',
        resetAtUtc: '2026-03-25T00:00:00.000Z',
      })
    );

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('quizRateLimitGlobal')).toBeTruthy();
    });
  });

  it('shows a user-friendly validation error on structured 422 errors', async () => {
    mockApiRequest.mockRejectedValueOnce(
      new MockApiRequestError(422, {
        error: 'quiz_validation_failed',
      })
    );

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('quizValidationFailedTitle')).toBeTruthy();
      expect(screen.getByText('quizValidationFailedMessage')).toBeTruthy();
    });
  });

  it('falls back to the generic load error on non-typed 500 errors', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockApiRequest.mockRejectedValueOnce(
      new MockApiRequestError(500, {
        error: 'Failed to generate quiz questions',
      })
    );

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getAllByText('unableToLoadQuiz')).toHaveLength(2);
    });

    errorSpy.mockRestore();
  });

  it('closes immediately when no quiz progress exists yet', async () => {
    render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(mockHeaderOptions?.headerLeft).toBeDefined();
    });

    pressHeaderCloseButton();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/learn');
  });

  it('asks for confirmation before closing when quiz progress would be lost', async () => {
    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText('What is const?')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Option A'));
    pressHeaderCloseButton();

    expect(mockReplace).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'quitQuizTitle',
      'quitQuizMessage',
      expect.arrayContaining([
        expect.objectContaining({ text: 'cancel', style: 'cancel' }),
        expect.objectContaining({
          text: 'quitQuizConfirm',
          style: 'destructive',
          onPress: expect.any(Function),
        }),
      ])
    );

    const alertButtons = alertSpy.mock.calls[0]?.[2] as {
      onPress?: () => void;
      text: string;
    }[];
    const confirmButton = alertButtons.find(
      (button) => button.text === 'quitQuizConfirm'
    );

    expect(confirmButton?.onPress).toBeDefined();
    confirmButton?.onPress?.();

    expect(mockReplace).toHaveBeenCalledWith('/learn');
  });
});
