import React from 'react';
import * as ReactNative from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { getCategoriesByLanguage } from '@/lib/topics';
import PracticeScreen from '@/screens/PracticeScreen';

const mockPush = jest.fn();
const mockStackScreen = jest.fn();
const mockGetProgress = jest.fn();
const mockIsTopicDue = jest.fn();
const mockRefreshLanguage = jest.fn();
const mockUseWindowDimensions = jest.fn(() => ({
  width: 375,
  height: 812,
  scale: 3,
  fontScale: 1,
}));
const mockTranslationOverrides: Record<string, string> = {
  completedLabel: 'completed',
  level: 'Level',
  of: 'of',
};
const mockJavascriptCategories = getCategoriesByLanguage('javascript');
const fundamentalsTopicIds = (
  mockJavascriptCategories.find(
    (category: { id: string }) => category.id === 'fundamentals'
  )?.topics ?? []
).map((topic: { id: string }) => topic.id);

jest.mock('expo-router', () => ({
  Stack: jest
    .requireActual<
      typeof import('../../../test/expo-router-stack')
    >('../../../test/expo-router-stack')
    .createMockExpoRouterStack({
      onScreen: (props) => mockStackScreen(props),
    }),
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
    t: (key: string) => mockTranslationOverrides[key] ?? key,
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
    mockStackScreen.mockReset();
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
    expect(screen.getByTestId('practice-due-topic-variables').props).toEqual(
      expect.objectContaining({
        accessibilityLabel: 'Variables, Level 2 of 5',
        accessibilityRole: 'button',
      })
    );
    expect(mockStackScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          headerLeft: expect.any(Function),
          headerTitle: '',
        }),
      })
    );

    fireEvent.press(screen.getByTestId('practice-mode-due'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/quiz-session',
      params: {
        topicIds: 'variables',
        programmingLanguage: 'javascript',
        returnTo: 'practice',
      },
    });

    mockPush.mockClear();
    fireEvent.press(screen.getByText('startReview'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/quiz-session',
      params: {
        topicIds: 'variables',
        programmingLanguage: 'javascript',
        returnTo: 'practice',
      },
    });
  });

  it('navigates via mixed, explore, and category quiz actions', async () => {
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
    fireEvent.press(screen.getByText('exploreQuiz'));
    fireEvent.press(screen.getByText('Fundamentals'));

    const mixedCall = mockPush.mock.calls.find(([call]) => {
      const route = call as {
        pathname?: string;
        params?: { quizMode?: string };
      };
      return (
        route.pathname === '/quiz-session' && route.params?.quizMode === 'mixed'
      );
    });
    expect(mixedCall).toBeDefined();

    const mixedRoute = mixedCall?.[0] as {
      pathname: string;
      params: {
        count: string;
        programmingLanguage: string;
        quizMode: string;
        topicIds: string;
      };
    };
    expect(mixedRoute).toEqual({
      pathname: '/quiz-session',
      params: {
        count: '5',
        programmingLanguage: 'javascript',
        quizMode: 'mixed',
        returnTo: 'practice',
        topicIds: 'variables,data-types,operators',
      },
    });

    const exploreCall = mockPush.mock.calls.find(([call]) => {
      const route = call as {
        pathname?: string;
        params?: { quizMode?: string };
      };
      return (
        route.pathname === '/quiz-session' &&
        route.params?.quizMode === 'explore'
      );
    });
    expect(exploreCall).toBeDefined();

    const exploreRoute = exploreCall?.[0] as {
      pathname: string;
      params: {
        count: string;
        programmingLanguage: string;
        quizMode: string;
        topicIds: string;
      };
    };
    expect(exploreRoute).toEqual({
      pathname: '/quiz-session',
      params: {
        count: '5',
        programmingLanguage: 'javascript',
        quizMode: 'explore',
        returnTo: 'practice',
        topicIds: 'variables',
      },
    });

    const categoryCall = mockPush.mock.calls.find(([call]) => {
      const route = call as {
        pathname?: string;
        params?: { topicIds?: string; quizMode?: string };
      };
      return (
        route.pathname === '/quiz-session' &&
        typeof route.params?.topicIds === 'string' &&
        !route.params.quizMode
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
        returnTo: 'practice',
      },
    });
  });

  it('adds accessibility metadata to quiz modes and category tiles', async () => {
    mockGetProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      achievements: [],
      topicProgress: {},
    });
    mockIsTopicDue.mockReturnValue(false);

    const screen = render(<PracticeScreen />);

    await waitFor(() => {
      expect(screen.getByText('mixedQuiz')).toBeTruthy();
      expect(screen.getByText('Fundamentals')).toBeTruthy();
    });

    expect(screen.getByTestId('practice-mode-mixed').props).toEqual(
      expect.objectContaining({
        accessibilityLabel: 'mixedQuiz, mixedQuizDesc',
        accessibilityRole: 'button',
        accessibilityState: { disabled: false },
      })
    );
    expect(screen.getByTestId('practice-mode-due').props).toEqual(
      expect.objectContaining({
        accessibilityRole: 'button',
        accessibilityState: { disabled: true },
      })
    );
    expect(screen.getByTestId('practice-category-fundamentals').props).toEqual(
      expect.objectContaining({
        accessibilityLabel: `Fundamentals, 0% completed, ${fundamentalsTopicIds.length} topics`,
        accessibilityRole: 'button',
      })
    );
  });

  it('disables explore quiz when no eligible topics remain', async () => {
    const allProgressEntries = Object.fromEntries(
      mockJavascriptCategories.flatMap((category) =>
        category.topics.map((topic: { id: string }) => [
          `javascript:${topic.id}`,
          {
            topicId: topic.id,
            questionsAnswered: 3,
            correctAnswers: 2,
            skillLevel: 2,
            lastPracticed: '2026-03-24T00:00:00.000Z',
          },
        ])
      )
    );
    mockGetProgress.mockResolvedValue({
      totalQuestions: 99,
      correctAnswers: 70,
      achievements: [],
      topicProgress: allProgressEntries,
    });
    mockIsTopicDue.mockReturnValue(false);

    const screen = render(<PracticeScreen />);

    await waitFor(() => {
      expect(screen.getByText('exploreQuiz')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('practice-mode-explore'));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('keeps category titles full width on compact large-text layouts', async () => {
    mockUseWindowDimensions.mockReturnValue({
      width: 375,
      height: 812,
      scale: 3,
      fontScale: 1.35,
    });
    mockGetProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      achievements: [],
      topicProgress: {},
    });
    mockIsTopicDue.mockReturnValue(false);

    const screen = render(<PracticeScreen />);

    await waitFor(() => {
      expect(screen.getByText('Fundamentals')).toBeTruthy();
    });

    const titleStyle = ReactNative.StyleSheet.flatten(
      screen.getByText('Fundamentals').props.style
    );

    expect(titleStyle.alignSelf).toBe('stretch');
    expect(titleStyle.width).toBe('100%');
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

  it('keeps the settings header action on the practice screen', async () => {
    mockGetProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      achievements: [],
      topicProgress: {},
    });
    mockIsTopicDue.mockReturnValue(false);

    render(<PracticeScreen />);

    await waitFor(() => {
      expect(mockStackScreen).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            headerRight: expect.any(Function),
          }),
        })
      );
    });

    const headerRight =
      mockStackScreen.mock.calls.at(-1)?.[0]?.options?.headerRight;
    expect(headerRight).toBeDefined();

    const headerButton = render(headerRight!());
    fireEvent.press(headerButton.getByTestId('open-settings-button'));

    expect(mockPush).toHaveBeenCalledWith('/settings');
  });
});
