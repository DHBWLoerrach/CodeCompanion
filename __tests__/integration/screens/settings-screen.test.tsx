import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import SettingsScreen from "@/screens/SettingsScreen";

const mockBack = jest.fn();
const mockRefreshTheme = jest.fn();
const mockRefreshLanguage = jest.fn();
const mockStorage = {
  getProfile: jest.fn(),
  getSettings: jest.fn(),
  setProfile: jest.fn(),
  setSettings: jest.fn(),
  clearAllData: jest.fn(),
};

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
    replace: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    canDismiss: () => false,
    canGoBack: () => true,
  }),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: "1.2.3",
    },
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/components/AppIcon", () => ({
  AppIcon: () => null,
}));

jest.mock("@react-native-segmented-control/segmented-control", () => {
  const ReactModule = require("react");
  const { View, Pressable, Text } = require("react-native");

  return ({
    values,
    onChange,
  }: {
    values: string[];
    onChange: (event: { nativeEvent: { selectedSegmentIndex: number } }) => void;
  }) =>
    ReactModule.createElement(
      View,
      null,
      values.map((value, index) =>
        ReactModule.createElement(
          Pressable,
          {
            key: `${value}-${index}`,
            onPress: () => onChange({ nativeEvent: { selectedSegmentIndex: index } }),
          },
          ReactModule.createElement(Text, null, value),
        ),
      ),
    );
});

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    isDark: false,
    refreshTheme: mockRefreshTheme,
    theme: {
      primary: "#E2001A",
      secondary: "#4A90E2",
      success: "#34C759",
      accent: "#FFB800",
      error: "#E2001A",
      text: "#111111",
      tabIconDefault: "#666666",
      backgroundDefault: "#FFFFFF",
      backgroundRoot: "#FFFFFF",
      cardBorder: "#DDDDDD",
      codeBackground: "#F7F7F7",
      disabled: "#CCCCCC",
      buttonText: "#FFFFFF",
      link: "#4A90E2",
      backgroundSecondary: "#F0F0F0",
      backgroundTertiary: "#EBEBEB",
    },
  }),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: "en",
    refreshLanguage: mockRefreshLanguage,
  }),
}));

jest.mock("@/lib/storage", () => ({
  storage: {
    getProfile: (...args: unknown[]) => mockStorage.getProfile(...args),
    getSettings: (...args: unknown[]) => mockStorage.getSettings(...args),
    setProfile: (...args: unknown[]) => mockStorage.setProfile(...args),
    setSettings: (...args: unknown[]) => mockStorage.setSettings(...args),
    clearAllData: (...args: unknown[]) => mockStorage.clearAllData(...args),
  },
}));

describe("SettingsScreen integration", () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockRefreshTheme.mockReset();
    mockRefreshLanguage.mockReset();
    mockStorage.getProfile.mockReset();
    mockStorage.getSettings.mockReset();
    mockStorage.setProfile.mockReset();
    mockStorage.setSettings.mockReset();
    mockStorage.clearAllData.mockReset();

    mockStorage.getProfile.mockResolvedValue({
      displayName: "Student",
      avatarIndex: 0,
    });
    mockStorage.getSettings.mockResolvedValue({
      language: "en",
      themeMode: "auto",
    });
    mockStorage.setProfile.mockResolvedValue(undefined);
    mockStorage.setSettings.mockResolvedValue(undefined);
    mockRefreshTheme.mockResolvedValue(undefined);
    mockRefreshLanguage.mockResolvedValue(undefined);
  });

  it("applies language/theme immediately and saves profile/settings", async () => {
    const screen = render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText("saveChanges")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("german"));
    await waitFor(() => {
      expect(mockStorage.setSettings).toHaveBeenCalledWith({
        language: "de",
        themeMode: "auto",
      });
      expect(mockRefreshLanguage).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByText("themeDark"));
    await waitFor(() => {
      expect(mockStorage.setSettings).toHaveBeenCalledWith({
        language: "de",
        themeMode: "dark",
      });
      expect(mockRefreshTheme).toHaveBeenCalled();
    });

    fireEvent.changeText(screen.getByDisplayValue("Student"), "Erik");
    fireEvent.press(screen.getByText("saveChanges"));

    await waitFor(() => {
      expect(mockStorage.setProfile).toHaveBeenCalledWith({
        displayName: "Erik",
        avatarIndex: 0,
      });
      expect(mockStorage.setSettings).toHaveBeenCalledWith({
        language: "de",
        themeMode: "dark",
      });
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });
});
