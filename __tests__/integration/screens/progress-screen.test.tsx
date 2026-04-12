import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ProgressScreen from '@/screens/ProgressScreen';

const mockPush = jest.fn();
const mockRefreshLanguage = jest.fn();
const mockStackScreen = jest.fn();
const mockGetProfile = jest.fn();
const mockGetProgress = jest.fn();
const mockGetStreak = jest.fn();
let mockLanguage: 'en' | 'de' = 'en';
const mockTranslations: Record<'en' | 'de', Record<string, string>> = {
  en: {
    sunday: 'Sun',
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
  },
  de: {
    sunday: 'So',
    monday: 'Mo',
    tuesday: 'Di',
    wednesday: 'Mi',
    thursday: 'Do',
    friday: 'Fr',
    saturday: 'Sa',
  },
};

jest.mock('expo-router', () => ({
  Stack: jest
    .requireActual<
      typeof import('../../../test/expo-router-stack')
    >('../../../test/expo-router-stack')
    .createMockExpoRouterStack({
      onScreen: (props) => mockStackScreen(props),
    }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactModule = jest.requireActual<typeof import('react')>('react');
    ReactModule.useEffect(() => callback(), [callback]);
  },
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
    t: (key: string) => mockTranslations[mockLanguage][key] ?? key,
    language: mockLanguage,
    refreshLanguage: mockRefreshLanguage,
  }),
}));

jest.mock('@/hooks/useAccessibilityLayout', () => ({
  useAccessibilityLayout: () => ({
    usesLargeLayout: false,
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

jest.mock('@/lib/storage', () => ({
  storage: {
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
    getProgress: (...args: unknown[]) => mockGetProgress(...args),
    getStreak: (...args: unknown[]) => mockGetStreak(...args),
    getTopicProgressForLanguage: () => ({}),
  },
}));

jest.mock('@/contexts/ProgrammingLanguageContext', () => ({
  useProgrammingLanguage: () => ({
    selectedLanguage: {
      id: 'javascript',
    },
  }),
}));

describe('ProgressScreen integration', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefreshLanguage.mockReset();
    mockStackScreen.mockReset();
    mockGetProfile.mockReset();
    mockGetProgress.mockReset();
    mockGetStreak.mockReset();
    mockLanguage = 'en';

    mockGetProfile.mockResolvedValue({
      displayName: 'Student',
      avatarIndex: 0,
    });
    mockGetProgress.mockResolvedValue({
      totalQuestions: 12,
      correctAnswers: 9,
      topicProgress: {},
    });
    mockGetStreak.mockResolvedValue({
      currentStreak: 3,
      bestStreak: 7,
      weekHistory: [true, false, true, false, true, false, false],
    });
  });

  it('configures the progress header options and renders loaded content', async () => {
    const screen = render(<ProgressScreen />);

    await waitFor(() => {
      expect(screen.getByText('Student')).toBeTruthy();
      expect(screen.getByText('totalQuestions')).toBeTruthy();
      expect(screen.getByText('dayStreak')).toBeTruthy();
    });

    expect(mockStackScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          headerLeft: expect.any(Function),
          headerTitle: '',
        }),
      })
    );
  });

  it('keeps the settings header action on the progress screen', async () => {
    render(<ProgressScreen />);

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

  it('starts the week display with Sunday in English', async () => {
    const screen = render(<ProgressScreen />);

    await waitFor(() => {
      expect(screen.getByText('Student')).toBeTruthy();
    });

    const weekdayLabels = screen
      .getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/)
      .map((item) => item.props.children);

    expect(weekdayLabels).toEqual([
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ]);
  });

  it('starts the week display with Monday in German', async () => {
    mockLanguage = 'de';

    const screen = render(<ProgressScreen />);

    await waitFor(() => {
      expect(screen.getByText('Student')).toBeTruthy();
    });

    const weekdayLabels = screen
      .getAllByText(/^(So|Mo|Di|Mi|Do|Fr|Sa)$/)
      .map((item) => item.props.children);

    expect(weekdayLabels).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
  });
});
