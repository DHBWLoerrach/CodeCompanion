import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsScreen from '@/screens/SettingsScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockRefreshTheme = jest.fn();
const mockRefreshLanguage = jest.fn();
const mockStackTitle = jest.fn();
const mockStorage = {
  getProfile: jest.fn(),
  getSettings: jest.fn(),
  setProfile: jest.fn(),
  setSettings: jest.fn(),
  clearAllData: jest.fn(),
};

jest.mock('expo-router', () => ({
  Stack: jest
    .requireActual<typeof import('../../../test/expo-router-stack')>(
      '../../../test/expo-router-stack'
    )
    .createMockExpoRouterStack({
      onTitle: (props) => mockStackTitle(props),
    }),
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

// Native Expo UI views are replaced with plain React Native equivalents so the
// screen's wiring (callbacks, test IDs, initial values) can be exercised in Jest.
jest.mock('@expo/ui', () => {
  const ReactModule = jest.requireActual('react');
  const {
    View,
    Pressable,
    Text: RNText,
    TextInput: RNTextInput,
  } = jest.requireActual('react-native');
  const h = ReactModule.createElement;
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    h(View, null, children);
  const renderText = (node: React.ReactNode) =>
    typeof node === 'string' ? h(RNText, null, node) : node;

  const FieldGroup = Object.assign(passthrough, {
    Section: ({
      title,
      children,
    }: {
      title?: string;
      children?: React.ReactNode;
    }) => h(View, null, title ? h(RNText, null, title) : null, children),
  });

  return {
    Host: passthrough,
    Column: passthrough,
    RNHostView: passthrough,
    FieldGroup,
    Text: ({ children }: { children?: string }) => h(RNText, null, children),
    TextInput: ({
      testID,
      defaultValue,
      placeholder,
      onChangeText,
    }: {
      testID?: string;
      defaultValue?: string;
      placeholder?: string;
      onChangeText?: (text: string) => void;
    }) => h(RNTextInput, { testID, defaultValue, placeholder, onChangeText }),
    ListItem: ({
      testID,
      onPress,
      leading,
      trailing,
      supportingText,
      children,
    }: {
      testID?: string;
      onPress?: () => void;
      leading?: React.ReactNode;
      trailing?: React.ReactNode;
      supportingText?: React.ReactNode;
      children?: React.ReactNode;
    }) =>
      h(
        View,
        null,
        h(
          Pressable,
          { testID, onPress, accessibilityRole: 'button' },
          leading,
          renderText(children),
          renderText(supportingText)
        ),
        trailing
      ),
  };
});

jest.mock('@/components/settings/SettingsPickerRow', () => {
  const ReactModule = jest.requireActual('react');
  const { View, Pressable, Text } = jest.requireActual('react-native');
  const h = ReactModule.createElement;

  return {
    SettingsPickerRow: ({
      label,
      options,
      selectedValue,
      onValueChange,
      testID,
    }: {
      label: string;
      options: { label: string; value: string }[];
      selectedValue: string;
      onValueChange: (value: string) => void;
      testID?: string;
    }) =>
      h(
        View,
        {
          testID,
          accessibilityLabel: label,
          accessibilityValue: { text: selectedValue },
        },
        options.map((option) =>
          h(
            Pressable,
            { key: option.value, onPress: () => onValueChange(option.value) },
            h(Text, null, option.label)
          )
        )
      ),
  };
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
    mockStackTitle.mockReset();
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
    const screen = await render(<SettingsScreen />);

    const changeTechnologyButton = await waitFor(() =>
      screen.getByTestId('settings-change-technology-button')
    );
    expect(screen.getByText('JavaScript')).toBeTruthy();
    expect(mockStackTitle).toHaveBeenCalledWith(
      expect.objectContaining({ children: 'settings' })
    );
    const avatarOptions = screen.getAllByRole('radio');
    expect(avatarOptions).toHaveLength(4);
    expect(avatarOptions[0].props.accessibilityLabel).toBe('avatar 1');
    expect(avatarOptions[0].props.accessibilityState).toEqual({
      selected: true,
    });

    await fireEvent.press(changeTechnologyButton);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/language-select',
      params: { origin: 'settings' },
    });
  });

  it('opens the current focus overview in read-only mode', async () => {
    const screen = await render(<SettingsScreen />);

    const infoButton = await waitFor(() =>
      screen.getByTestId('settings-current-focus-info-button')
    );

    await fireEvent.press(infoButton);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: './language-overview',
      params: {
        languageId: 'javascript',
        mode: 'view',
        origin: 'settings',
      },
    });
  });

  it('flushes a pending profile save when leaving the screen before the debounce finishes', async () => {
    const screen = await render(<SettingsScreen />);

    const input = await waitFor(() =>
      screen.getByTestId('settings-display-name-input')
    );

    await fireEvent.changeText(input, 'Erik');
    await screen.unmount();

    await waitFor(() => {
      expect(mockStorage.setProfile).toHaveBeenCalledWith({
        displayName: 'Erik',
        avatarIndex: 0,
      });
    });
  });

  it('applies language/theme immediately and autosaves profile changes', async () => {
    const screen = await render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('preferences')).toBeTruthy();
    });

    expect(screen.queryByText('saveChanges')).toBeNull();

    await fireEvent.press(screen.getByText('Deutsch'));
    await waitFor(() => {
      expect(mockStorage.setSettings).toHaveBeenCalledWith({
        language: 'de',
        themeMode: 'auto',
      });
      expect(mockRefreshLanguage).toHaveBeenCalled();
    });

    await fireEvent.press(screen.getByText('themeDark'));
    await waitFor(() => {
      expect(mockStorage.setSettings).toHaveBeenCalledWith({
        language: 'de',
        themeMode: 'dark',
      });
      expect(mockRefreshTheme).toHaveBeenCalled();
    });

    await fireEvent.changeText(screen.getByDisplayValue('Student'), 'Erik');

    await waitFor(() => {
      expect(mockStorage.setProfile).toHaveBeenCalledWith({
        displayName: 'Erik',
        avatarIndex: 0,
      });
    });

    expect(mockBack).not.toHaveBeenCalled();
  });

  it('shows the current language and theme in the native picker rows', async () => {
    mockStorage.getSettings.mockResolvedValue({
      language: 'de',
      themeMode: 'dark',
    });

    const screen = await render(<SettingsScreen />);

    const languagePicker = await waitFor(() =>
      screen.getByTestId('settings-app-language-picker')
    );
    const themePicker = screen.getByTestId('settings-theme-picker');

    expect(languagePicker.props.accessibilityLabel).toBe('appLanguage');
    expect(languagePicker.props.accessibilityValue).toEqual({ text: 'de' });
    expect(themePicker.props.accessibilityLabel).toBe('theme');
    expect(themePicker.props.accessibilityValue).toEqual({ text: 'dark' });
    expect(screen.getByText('themeAuto')).toBeTruthy();
    expect(screen.getByText('themeLight')).toBeTruthy();
  });

  it('prefills the display name input from the stored profile', async () => {
    const screen = await render(<SettingsScreen />);

    const input = await waitFor(() =>
      screen.getByTestId('settings-display-name-input')
    );

    expect(input.props.defaultValue).toBe('Student');
    expect(input.props.placeholder).toBe('student');
  });

  it('confirms before resetting all progress', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockStorage.clearAllData.mockResolvedValue(undefined);

    try {
      const screen = await render(<SettingsScreen />);

      const resetButton = await waitFor(() =>
        screen.getByTestId('settings-reset-progress-button')
      );
      await fireEvent.press(resetButton);

      expect(alertSpy).toHaveBeenCalledWith(
        'resetProgress',
        'resetProgressMessage',
        expect.any(Array)
      );
      expect(mockStorage.clearAllData).not.toHaveBeenCalled();

      const buttons = alertSpy.mock.calls[0][2] as {
        style?: string;
        onPress?: () => Promise<void>;
      }[];
      const destructive = buttons.find(
        (button) => button.style === 'destructive'
      );
      await destructive?.onPress?.();

      expect(mockStorage.clearAllData).toHaveBeenCalled();
      expect(mockBack).toHaveBeenCalled();
    } finally {
      alertSpy.mockRestore();
    }
  });
});
