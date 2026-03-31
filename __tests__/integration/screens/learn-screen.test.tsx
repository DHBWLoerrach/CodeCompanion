import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import LearnScreen from '@/screens/LearnScreen';

const mockPush = jest.fn();
const mockUseTopicProgress = jest.fn();

jest.mock('expo-router', () => ({
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
      categories: [
        {
          id: 'fundamentals',
          topics: [
            {
              id: 'variables',
            },
            {
              id: 'data-types',
            },
          ],
        },
      ],
    },
  }),
}));

jest.mock('@/lib/topics', () => ({
  getTopicName: (topic: { id: string }) =>
    topic.id === 'data-types' ? 'Data Types' : 'Variables',
  getCategoryName: () => 'Fundamentals',
}));

describe('LearnScreen integration', () => {
  beforeEach(() => {
    mockUseTopicProgress.mockReset();
    mockUseTopicProgress.mockReturnValue({
      topicProgress: {},
      loading: false,
      dueTopics: [],
    });
  });

  it('renders the contextual subtitle in screen content', async () => {
    const screen = render(<LearnScreen />);

    await waitFor(() => {
      expect(screen.getByText('learnScreenSubtitle')).toBeTruthy();
      expect(screen.getByText('Fundamentals')).toBeTruthy();
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
});
