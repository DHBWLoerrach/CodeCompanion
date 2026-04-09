import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsScreen from '@/screens/SettingsScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockRefreshTheme = jest.fn();
const mockRefreshLanguage = jest.fn();
const mockStorage = {
  getProfile: jest.fn(),
  getSettings: jest.fn(),
  setProfile: jest.fn(),
  setSettings: jest.fn(),
  clearAllData: jest.fn(),
};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    canDismiss: () => false,
    canGoBack: () => true,
  }),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.2.3',
    },
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/components/AppIcon', () => ({
  AppIcon: () => null,
}));

jest.mock('@react-native-segmented-control/segmented-control', () => {
  const ReactModule = jest.requireActual('react');
  const { View, Pressable, Text } = jest.requireActual('react-native');

  return ({
    values,
    onChange,
  }: {
    values: string[];
    onChange: (event: {
      nativeEvent: { selectedSegmentIndex: number };
    }) => void;
  }) =>
    ReactModule.createElement(
      View,
      null,
      values.map((value, index) =>
        ReactModule.createElement(
          Pressable,
          {
            key: `${value}-${index}`,
            onPress: () =>
              onChange({ nativeEvent: { selectedSegmentIndex: index } }),
          },
          ReactModule.createElement(Text, null, value)
        )
      )
    );
});

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    refreshTheme: mockRefreshTheme,
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
    getProfile: (...args: unknown[]) => mockStorage.getProfile(...args),
    getSettings: (...args: unknown[]) => mockStorage.getSettings(...args),
    setProfile: (...args: unknown[]) => mockStorage.setProfile(...args),
    setSettings: (...args: unknown[]) => mockStorage.setSettings(...args),
    clearAllData: (...args: unknown[]) => mockStorage.clearAllData(...args),
  },
}));

jest.mock('@/contexts/ProgrammingLanguageContext', () => ({
  useProgrammingLanguage: () => ({
    selectedLanguage: {
      id: 'javascript',
      name: { en: 'JavaScript', de: 'JavaScript' },
      shortName: 'JS',
      color: '#F7DF1E',
      categories: [],
    },
    selectedLanguageId: 'javascript',
    setSelectedLanguage: jest.fn(),
    isLoading: false,
    isLanguageSelected: true,
  }),
}));

describe('SettingsScreen integration', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockPush.mockReset();
    mockRefreshTheme.mockReset();
    mockRefreshLanguage.mockReset();
    mockStorage.getProfile.mockReset();
    mockStorage.getSettings.mockReset();
    mockStorage.setProfile.mockReset();
    mockStorage.setSettings.mockReset();
    mockStorage.clearAllData.mockReset();

    mockStorage.getProfile.mockResolvedValue({
      displayName: 'Student',
      avatarIndex: 0,
    });
    mockStorage.getSettings.mockResolvedValue({
      language: 'en',
      themeMode: 'auto',
    });
    mockStorage.setProfile.mockResolvedValue(undefined);
    mockStorage.setSettings.mockResolvedValue(undefined);
    mockRefreshTheme.mockResolvedValue(undefined);
    mockRefreshLanguage.mockResolvedValue(undefined);
  });

  it('opens language select with back navigation enabled', async () => {
    const screen = render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('changeTechnology')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('changeTechnology'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '../language-select',
      params: { origin: 'settings' },
    });
  });

  it('opens the current focus overview in read-only mode', async () => {
    const screen = render(<SettingsScreen />);

    const infoButton = await waitFor(() =>
      screen.getByTestId('settings-current-focus-info-button')
    );

    fireEvent.press(infoButton);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/language-overview',
      params: {
        languageId: 'javascript',
        mode: 'view',
        origin: 'settings',
      },
    });
  });

  it('flushes a pending profile save when leaving the screen before the debounce finishes', async () => {
    const screen = render(<SettingsScreen />);

    const input = await waitFor(() =>
      screen.getByTestId('settings-display-name-input')
    );

    fireEvent.changeText(input, 'Erik');
    screen.unmount();

    await waitFor(() => {
      expect(mockStorage.setProfile).toHaveBeenCalledWith({
        displayName: 'Erik',
        avatarIndex: 0,
      });
    });
  });

  it('applies language/theme immediately and autosaves profile changes', async () => {
    const screen = render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('preferences')).toBeTruthy();
    });

    expect(screen.queryByText('saveChanges')).toBeNull();

    fireEvent.press(screen.getByText('Deutsch'));
    await waitFor(() => {
      expect(mockStorage.setSettings).toHaveBeenCalledWith({
        language: 'de',
        themeMode: 'auto',
      });
      expect(mockRefreshLanguage).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByText('themeDark'));
    await waitFor(() => {
      expect(mockStorage.setSettings).toHaveBeenCalledWith({
        language: 'de',
        themeMode: 'dark',
      });
      expect(mockRefreshTheme).toHaveBeenCalled();
    });

    fireEvent.changeText(screen.getByDisplayValue('Student'), 'Erik');

    await waitFor(() => {
      expect(mockStorage.setProfile).toHaveBeenCalledWith({
        displayName: 'Erik',
        avatarIndex: 0,
      });
    });

    expect(mockBack).not.toHaveBeenCalled();
  });

  it('configures the display name input for dynamic type without a fixed height', async () => {
    const screen = render(<SettingsScreen />);

    const input = await waitFor(() =>
      screen.getByTestId('settings-display-name-input')
    );
    const style = StyleSheet.flatten(input.props.style);

    expect(input.props.allowFontScaling).toBe(true);
    expect(input.props.maxFontSizeMultiplier).toBe(1.6);
    expect(style.minHeight).toBe(48);
    expect(style.height).toBeUndefined();
  });
});
