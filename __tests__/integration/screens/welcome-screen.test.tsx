import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import WelcomeScreen from "@/screens/WelcomeScreen";

const mockReplace = jest.fn();
const mockMarkWelcomeSeen = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  FadeInUp: {
    duration: () => ({
      delay: () => ({}),
    }),
    delay: () => ({
      duration: () => ({}),
    }),
  },
  default: {
    View: require("react-native").View,
    createAnimatedComponent: <T,>(component: T) => component,
  },
}));

jest.mock("@/components/AppIcon", () => ({
  AppIcon: () => null,
}));

jest.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
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
      onColor: "#FFFFFF",
      link: "#4A90E2",
      backgroundSecondary: "#F0F0F0",
      backgroundTertiary: "#EBEBEB",
      cardBorderSubtle: "#DDDDDD",
      separator: "rgba(0, 0, 0, 0.08)",
    },
  }),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/hooks/usePressAnimation", () => ({
  usePressAnimation: () => ({
    animatedStyle: {},
    handlePressIn: jest.fn(),
    handlePressOut: jest.fn(),
  }),
}));

jest.mock("@/lib/storage", () => ({
  storage: {
    markWelcomeSeen: (...args: unknown[]) => mockMarkWelcomeSeen(...args),
  },
}));

describe("WelcomeScreen integration", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockMarkWelcomeSeen.mockReset();
    mockMarkWelcomeSeen.mockResolvedValue(undefined);
  });

  it("marks the welcome screen as seen and replaces to language select", async () => {
    const screen = render(<WelcomeScreen />);

    fireEvent.press(screen.getByTestId("welcome-get-started-button"));

    await waitFor(() => {
      expect(mockMarkWelcomeSeen).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/language-select");
    });
  });
});
