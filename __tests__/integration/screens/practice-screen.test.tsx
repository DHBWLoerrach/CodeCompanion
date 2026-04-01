import React from 'react';
import * as ReactNative from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { getCategoriesByLanguage } from '@/lib/topics';
import PracticeScreen from '../../../app/(tabs)/practice/index';

const mockPush = jest.fn();
const mockGetProgress = jest.fn();
const mockIsTopicDue = jest.fn();
const mockRefreshLanguage = jest.fn();
const mockUseWindowDimensions = jest.fn(() => ({
  width: 375,
  height: 812,
  scale: 3,
  fontScale: 1,
}));
const mockJavascriptCategories = getCategoriesByLanguage('javascript');
const fundamentalsTopicIds = (
  mockJavascriptCategories.find(
    (category: { id: string }) => category.id === 'fundamentals'
  )?.topics ?? []
).map((topic: { id: string }) => topic.id);

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    canDismiss: () => false,
    canGoBack: () => true,
  }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = jest.requireActual('react');
    React.useEffect(() => callback(), [callback]);
  },
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
    refreshLanguage: mockRefreshLanguage,
  }),
}));

jest.mock('@/lib/storage', () => ({
  storage: {
    getProgress: (...args: unknown[]) => mockGetProgress(...args),
    getTopicProgressForLanguage: (
      topicProgress: Record<string, unknown>,
      languageId: string
    ) => {
      const prefix = `${languageId}:`;
      const filtered: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(topicProgress)) {
        if (key.startsWith(prefix)) {
          filtered[key.slice(prefix.length)] = value;
        }
      }
      return filtered;
    },
  },
  isTopicDue: (...args: unknown[]) => mockIsTopicDue(...args),
}));

jest.mock('@/contexts/ProgrammingLanguageContext', () => ({
  useProgrammingLanguage: () => ({
    selectedLanguage: {
      id: 'javascript',
      nameKey: 'javascript',
      shortName: 'JS',
      color: '#F7DF1E',
      categories: mockJavascriptCategories,
    },
    selectedLanguageId: 'javascript',
    setSelectedLanguage: jest.fn(),
    isLoading: false,
    isLanguageSelected: true,
  }),
}));

describe('PracticeScreen integration', () => {
  beforeEach(() => {
    mockUseWindowDimensions.mockReturnValue({
      width: 375,
      height: 812,
      scale: 3,
      fontScale: 1,
    });
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockImplementation(() => mockUseWindowDimensions());
    mockPush.mockReset();
    mockGetProgress.mockReset();
    mockIsTopicDue.mockReset();
    mockRefreshLanguage.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows due topics and starts review with due topic ids', async () => {
    mockGetProgress.mockResolvedValue({
      totalQuestions: 10,
      correctAnswers: 7,
      achievements: [],
      topicProgress: {
        'javascript:variables': {
          topicId: 'variables',
          questionsAnswered: 5,
          correctAnswers: 4,
          skillLevel: 2,
          lastPracticed: '2026-01-01T00:00:00.000Z',
        },
        'javascript:loops': {
          topicId: 'loops',
          questionsAnswered: 2,
          correctAnswers: 1,
          skillLevel: 1,
          lastPracticed: '2026-02-07T00:00:00.000Z',
        },
      },
    });
    mockIsTopicDue.mockImplementation(
      (progress?: { topicId?: string }) => progress?.topicId === 'variables'
    );

    const screen = render(<PracticeScreen />);

    await waitFor(() => {
      expect(screen.getByText('practiceScreenSubtitle')).toBeTruthy();
      expect(screen.getByText('dueForReview')).toBeTruthy();
      expect(screen.getByText('Variables')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('practice-mode-due'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/quiz-session',
      params: { topicIds: 'variables', programmingLanguage: 'javascript' },
    });

    mockPush.mockClear();
    fireEvent.press(screen.getByText('startReview'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/quiz-session',
      params: { topicIds: 'variables', programmingLanguage: 'javascript' },
    });
  });

  it('navigates via mixed, quick, and category quiz actions', async () => {
    mockGetProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      achievements: [],
      topicProgress: {},
    });
    mockIsTopicDue.mockReturnValue(false);

    const screen = render(<PracticeScreen />);

    await waitFor(() => {
      expect(screen.getByText('practiceScreenSubtitle')).toBeTruthy();
      expect(screen.getByText('quizModes')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('mixedQuiz'));
    fireEvent.press(screen.getByText('quickQuiz'));
    fireEvent.press(screen.getByText('Fundamentals'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/quiz-session',
      params: { programmingLanguage: 'javascript' },
    });

    const quickCall = mockPush.mock.calls.find(([call]) => {
      const route = call as {
        pathname?: string;
        params?: { quizMode?: string };
      };
      return (
        route.pathname === '/quiz-session' && route.params?.quizMode === 'quick'
      );
    });
    expect(quickCall).toBeDefined();

    const quickRoute = quickCall?.[0] as {
      pathname: string;
      params: {
        count: string;
        programmingLanguage: string;
        quizMode: string;
        topicIds?: string;
      };
    };
    expect(quickRoute).toEqual({
      pathname: '/quiz-session',
      params: expect.objectContaining({
        count: '3',
        programmingLanguage: 'javascript',
        quizMode: 'quick',
      }),
    });
    expect(quickRoute.params.topicIds).toBeDefined();
    expect(new Set(quickRoute.params.topicIds?.split(',')).size).toBe(2);

    const categoryCall = mockPush.mock.calls.find(([call]) => {
      const route = call as {
        pathname?: string;
        params?: { topicIds?: string; quizMode?: string };
      };
      return (
        route.pathname === '/quiz-session' &&
        typeof route.params?.topicIds === 'string' &&
        route.params.quizMode !== 'quick'
      );
    });
    expect(categoryCall).toBeDefined();

    const route = categoryCall?.[0] as { params: { topicIds: string } };
    expect(route.params.topicIds.split(',')).toEqual(fundamentalsTopicIds);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/quiz-session',
      params: {
        topicIds: route.params.topicIds,
        programmingLanguage: 'javascript',
      },
    });
  });

  it('shows a first-time empty state when no quiz history exists', async () => {
    mockGetProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      achievements: [],
      topicProgress: {},
    });
    mockIsTopicDue.mockReturnValue(false);

    const screen = render(<PracticeScreen />);

    await waitFor(() => {
      expect(screen.getByText('noPracticeYet')).toBeTruthy();
      expect(screen.getByText('noPracticeYetDesc')).toBeTruthy();
    });
  });

  it('shows the caught-up empty state when quiz history exists but nothing is due', async () => {
    mockGetProgress.mockResolvedValue({
      totalQuestions: 5,
      correctAnswers: 4,
      achievements: [],
      topicProgress: {
        'javascript:variables': {
          topicId: 'variables',
          questionsAnswered: 5,
          correctAnswers: 4,
          skillLevel: 3,
          lastPracticed: '2026-03-24T00:00:00.000Z',
        },
      },
    });
    mockIsTopicDue.mockReturnValue(false);

    const screen = render(<PracticeScreen />);

    await waitFor(() => {
      expect(screen.getByText('noDueTopics')).toBeTruthy();
      expect(screen.getByText('noDueTopicsDesc')).toBeTruthy();
    });
  });
});
