import React from 'react';
import * as ReactNative from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LearnScreen from '@/screens/LearnScreen';

const mockPush = jest.fn();
const mockStackScreen = jest.fn();
const mockStackTitle = jest.fn();
const mockUseTopicProgress = jest.fn();
const mockUseWindowDimensions = jest.fn(() => ({
  width: 375,
  height: 812,
  scale: 3,
  fontScale: 1,
}));

jest.mock('expo-router', () => ({
  Stack: jest
    .requireActual<
      typeof import('../../../test/expo-router-stack')
    >('../../../test/expo-router-stack')
    .createMockExpoRouterStack({
      onScreen: (props) => mockStackScreen(props),
      onTitle: (props) => mockStackTitle(props),
    }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/components/AppIcon', () => ({
  AppIcon: () => null,
}));

jest.mock('@/components/LoadingScreen', () => ({
  LoadingScreen: () => null,
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
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

jest.mock('@/hooks/usePressAnimation', () => ({
  usePressAnimation: () => ({
    animate: {},
    transition: { type: 'spring' as const },
    handlePressIn: jest.fn(),
    handlePressOut: jest.fn(),
  }),
}));

jest.mock('@/hooks/useTopicProgress', () => ({
  useTopicProgress: () => mockUseTopicProgress(),
}));

jest.mock('@/contexts/ProgrammingLanguageContext', () => ({
  useProgrammingLanguage: () => ({
    selectedLanguage: {
      id: 'javascript',
      name: { en: 'JavaScript', de: 'JavaScript' },
      shortName: 'JS',
      color: '#F7DF1E',
      categories: [
        {
          id: 'fundamentals',
          order: 1,
          topics: [
            {
              id: 'variables',
              category: 'fundamentals',
              order: 1,
              prerequisites: [],
              optional: false,
            },
            {
              id: 'data-types',
              category: 'fundamentals',
              order: 2,
              prerequisites: ['variables'],
              optional: false,
            },
          ],
        },
        {
          id: 'control-flow',
          order: 2,
          topics: [
            {
              id: 'conditionals',
              category: 'control-flow',
              order: 7,
              prerequisites: ['operators'],
              optional: false,
            },
          ],
        },
      ],
    },
  }),
}));

jest.mock('@/lib/topics', () => ({
  getCategoriesByLanguage: () => [],
  getTopicName: (topic: { id: string }) =>
    topic.id === 'data-types'
      ? 'Data Types'
      : topic.id === 'conditionals'
        ? 'Conditionals'
        : 'Variables',
  getCategoryName: (category: { id: string }) =>
    category.id === 'control-flow' ? 'Control Flow' : 'Fundamentals',
}));

describe('LearnScreen integration', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockStackScreen.mockReset();
    mockStackTitle.mockReset();
    mockUseWindowDimensions.mockReturnValue({
      width: 375,
      height: 812,
      scale: 3,
      fontScale: 1,
    });
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockImplementation(() => mockUseWindowDimensions());
    mockUseTopicProgress.mockReset();
    mockUseTopicProgress.mockReturnValue({
      topicProgress: {},
      loading: false,
      dueTopics: [],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the contextual subtitle in screen content', async () => {
    const screen = render(<LearnScreen />);

    await waitFor(() => {
      expect(screen.getByText('learnScreenSubtitle')).toBeTruthy();
      expect(screen.getByText('Fundamentals')).toBeTruthy();
      expect(screen.getByText('Control Flow')).toBeTruthy();
    });
    expect(mockStackTitle).toHaveBeenCalledWith(
      expect.objectContaining({ children: 'JavaScript' })
    );
  });

  it('hides next-step cards for categories with unmet prerequisites', async () => {
    const screen = render(<LearnScreen />);

    await waitFor(() => {
      expect(screen.getAllByText('nextStep')).toHaveLength(1);
      expect(screen.getByText('Variables')).toBeTruthy();
      expect(screen.getByText('Conditionals')).toBeTruthy();
    });
  });

  it('recommends the next unmastered topic when the started topic is mastered', async () => {
    mockUseTopicProgress.mockReturnValue({
      topicProgress: {
        variables: {
          topicId: 'variables',
          questionsAnswered: 10,
          correctAnswers: 10,
          skillLevel: 5,
          lastPracticed: '2026-03-30T12:00:00.000Z',
        },
      },
      loading: false,
      dueTopics: [],
    });

    const screen = render(<LearnScreen />);

    await waitFor(() => {
      expect(screen.getByText('nextStep')).toBeTruthy();
      expect(screen.getByText('Data Types')).toBeTruthy();
    });
  });

  it('keeps the settings header action on the learn screen', async () => {
    render(<LearnScreen />);

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

  it('renders due-topic rows in a single column on compact accessibility layouts', async () => {
    mockUseWindowDimensions.mockReturnValue({
      width: 375,
      height: 812,
      scale: 3,
      fontScale: 1.35,
    });
    mockUseTopicProgress.mockReturnValue({
      topicProgress: {},
      loading: false,
      dueTopics: [
        {
          id: 'variables',
          category: 'fundamentals',
          order: 1,
          prerequisites: [],
          optional: false,
        },
        {
          id: 'data-types',
          category: 'fundamentals',
          order: 2,
          prerequisites: ['variables'],
          optional: false,
        },
      ],
    });

    const screen = render(<LearnScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('learn-due-row-variables')).toBeTruthy();
      expect(screen.getByTestId('learn-due-row-data-types')).toBeTruthy();
      expect(
        screen.queryByTestId('learn-due-row-variables-data-types')
      ).toBeNull();
    });
  });

  it('keeps multi-item due rows on wider portrait viewports', async () => {
    mockUseWindowDimensions.mockReturnValue({
      width: 768,
      height: 1024,
      scale: 2,
      fontScale: 1.35,
    });
    mockUseTopicProgress.mockReturnValue({
      topicProgress: {},
      loading: false,
      dueTopics: [
        {
          id: 'variables',
          category: 'fundamentals',
          order: 1,
          prerequisites: [],
          optional: false,
        },
        {
          id: 'data-types',
          category: 'fundamentals',
          order: 2,
          prerequisites: ['variables'],
          optional: false,
        },
      ],
    });

    const screen = render(<LearnScreen />);

    await waitFor(() => {
      expect(
        screen.getByTestId('learn-due-row-variables-data-types')
      ).toBeTruthy();
      expect(screen.queryByTestId('learn-due-row-variables')).toBeNull();
    });
  });
});
