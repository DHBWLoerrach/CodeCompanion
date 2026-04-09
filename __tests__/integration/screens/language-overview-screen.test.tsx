import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LanguageOverviewScreen from '@/screens/LanguageOverviewScreen';
import { getLanguageById } from '@/lib/languages';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockDismissTo = jest.fn();
const mockSetSelectedLanguage = jest.fn();

let mockCanGoBack = true;
let mockSelectedLanguageId: string | null = null;
let mockSearchParams: { languageId?: string; mode?: string; origin?: string } =
  {
    languageId: 'javascript',
  };

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    dismissTo: mockDismissTo,
    back: mockBack,
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    canDismiss: () => false,
    canGoBack: () => mockCanGoBack,
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

jest.mock('@/contexts/ProgrammingLanguageContext', () => ({
  useProgrammingLanguage: () => ({
    selectedLanguage: null,
    selectedLanguageId: mockSelectedLanguageId,
    setSelectedLanguage: mockSetSelectedLanguage,
    isLoading: false,
    isLanguageSelected: mockSelectedLanguageId !== null,
  }),
}));

describe('LanguageOverviewScreen integration', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockBack.mockReset();
    mockDismissTo.mockReset();
    mockSetSelectedLanguage.mockReset();
    mockSetSelectedLanguage.mockResolvedValue(undefined);
    mockCanGoBack = true;
    mockSelectedLanguageId = null;
    mockSearchParams = { languageId: 'javascript' };
  });

  it('renders overview data from the route parameter and curriculum metadata', async () => {
    const screen = render(<LanguageOverviewScreen />);
    const javascript = getLanguageById('javascript');
    const topicCount =
      javascript?.categories.reduce(
        (sum, category) => sum + category.topics.length,
        0
      ) ?? 0;

    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeTruthy();
      expect(
        screen.getByTestId('language-overview-categories-value').props.children
      ).toBe(javascript?.categories.length);
      expect(
        screen.getByTestId('language-overview-topics-value').props.children
      ).toBe(topicCount);
    });
  });

  it('saves a new language and replaces to learn during onboarding', async () => {
    mockSelectedLanguageId = 'javascript';
    mockSearchParams = { languageId: 'python' };

    const screen = render(<LanguageOverviewScreen />);

    fireEvent.press(screen.getByTestId('language-overview-confirm-button'));

    await waitFor(() => {
      expect(mockSetSelectedLanguage).toHaveBeenCalledWith('python');
      expect(mockReplace).toHaveBeenCalledWith('/learn');
    });
  });

  it('returns to settings without persisting again when the same language is confirmed', async () => {
    mockSelectedLanguageId = 'javascript';
    mockSearchParams = { languageId: 'javascript', origin: 'settings' };

    const screen = render(<LanguageOverviewScreen />);

    fireEvent.press(screen.getByTestId('language-overview-confirm-button'));

    await waitFor(() => {
      expect(mockSetSelectedLanguage).not.toHaveBeenCalled();
      expect(mockDismissTo).toHaveBeenCalledWith('/settings');
    });
  });

  it('returns to the language list when choosing another language', async () => {
    const screen = render(<LanguageOverviewScreen />);

    fireEvent.press(
      screen.getByTestId('language-overview-choose-another-button')
    );

    expect(mockBack).toHaveBeenCalled();
  });

  it('opens as a read-only view from settings and closes without saving', () => {
    mockSelectedLanguageId = 'javascript';
    mockSearchParams = {
      languageId: 'javascript',
      mode: 'view',
      origin: 'settings',
    };

    const screen = render(<LanguageOverviewScreen />);

    expect(screen.queryByTestId('language-overview-confirm-button')).toBeNull();

    fireEvent.press(screen.getByTestId('language-overview-close-button'));

    expect(mockSetSelectedLanguage).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it('replaces invalid routes with language select while preserving settings origin', async () => {
    mockCanGoBack = false;
    mockSearchParams = { languageId: 'unknown', origin: 'settings' };

    render(<LanguageOverviewScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/language-select',
          params: expect.objectContaining({ origin: 'settings' }),
        })
      );
    });
  });

  it('dismisses invalid read-only routes back to settings', async () => {
    mockCanGoBack = false;
    mockSearchParams = {
      languageId: 'unknown',
      mode: 'view',
      origin: 'settings',
    };

    render(<LanguageOverviewScreen />);

    await waitFor(() => {
      expect(mockDismissTo).toHaveBeenCalledWith('/settings');
    });
  });
});
