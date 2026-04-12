import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LanguageSelectScreen from '@/screens/LanguageSelectScreen';

const mockPush = jest.fn();
const mockStackScreen = jest.fn();
const mockStackTitle = jest.fn();
const mockStackBackButton = jest.fn();
let mockSelectedLanguageId: string | null = null;
let mockSearchParams: { origin?: string } = {};

jest.mock('expo-router', () => ({
  Stack: jest
    .requireActual<
      typeof import('../../../test/expo-router-stack')
    >('../../../test/expo-router-stack')
    .createMockExpoRouterStack({
      onScreen: (props) => mockStackScreen(props),
      onTitle: (props) => mockStackTitle(props),
      onBackButton: (props) => mockStackBackButton(props),
    }),
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    dismissTo: jest.fn(),
    back: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    canDismiss: () => false,
    canGoBack: () => true,
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@/components/AppIcon', () => ({
  AppIcon: () => null,
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

jest.mock('@/contexts/ProgrammingLanguageContext', () => ({
  useProgrammingLanguage: () => ({
    selectedLanguage: null,
    selectedLanguageId: mockSelectedLanguageId,
    setSelectedLanguage: jest.fn(),
    isLoading: false,
    isLanguageSelected: mockSelectedLanguageId !== null,
  }),
}));

describe('LanguageSelectScreen integration', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockStackScreen.mockReset();
    mockStackTitle.mockReset();
    mockStackBackButton.mockReset();
    mockSelectedLanguageId = null;
    mockSearchParams = {};
  });

  it('opens the overview screen with the selected language id', async () => {
    const screen = render(<LanguageSelectScreen />);

    fireEvent.press(screen.getByTestId('language-select-option-javascript'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: './language-overview',
          params: expect.objectContaining({ languageId: 'javascript' }),
        })
      );
    });
  });

  it('preserves the settings origin when opening the overview screen', async () => {
    mockSelectedLanguageId = 'javascript';
    mockSearchParams = { origin: 'settings' };

    const screen = render(<LanguageSelectScreen />);

    fireEvent.press(screen.getByTestId('language-select-option-python'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: './language-overview',
          params: expect.objectContaining({
            languageId: 'python',
            origin: 'settings',
          }),
        })
      );
    });
  });

  it('shows the back button and enables gestures only in settings mode', () => {
    mockSearchParams = { origin: 'settings' };

    render(<LanguageSelectScreen />);

    expect(mockStackScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          gestureEnabled: true,
          headerBackVisible: true,
        }),
      })
    );
    expect(mockStackTitle).toHaveBeenCalledWith(
      expect.objectContaining({ children: 'selectTechnology' })
    );
  });

  it('disables the current language in settings mode', () => {
    mockSelectedLanguageId = 'javascript';
    mockSearchParams = { origin: 'settings' };

    const screen = render(<LanguageSelectScreen />);
    const currentOption = screen.getByTestId(
      'language-select-option-javascript'
    );

    fireEvent.press(currentOption);

    expect(currentOption.props.accessibilityState).toEqual({ disabled: true });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('hides the back button outside the settings flow', () => {
    render(<LanguageSelectScreen />);

    expect(mockStackScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          gestureEnabled: false,
          headerBackVisible: false,
        }),
      })
    );
  });
});
