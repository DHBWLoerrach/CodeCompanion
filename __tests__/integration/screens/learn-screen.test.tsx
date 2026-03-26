import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import LearnScreen from "@/screens/LearnScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: {
    createAnimatedComponent: <T,>(component: T) => component,
  },
}));

jest.mock("@/components/AppIcon", () => ({
  AppIcon: () => null,
}));

jest.mock("@/components/LoadingScreen", () => ({
  LoadingScreen: () => null,
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
    language: "en",
    refreshLanguage: jest.fn(),
  }),
}));

jest.mock("@/hooks/usePressAnimation", () => ({
  usePressAnimation: () => ({
    animatedStyle: {},
    handlePressIn: jest.fn(),
    handlePressOut: jest.fn(),
  }),
}));

jest.mock("@/hooks/useTopicProgress", () => ({
  useTopicProgress: () => ({
    topicProgress: {},
    loading: false,
    dueTopics: [],
  }),
}));

jest.mock("@/contexts/ProgrammingLanguageContext", () => ({
  useProgrammingLanguage: () => ({
    selectedLanguage: {
      id: "javascript",
      categories: [
        {
          id: "fundamentals",
          topics: [
            {
              id: "variables",
            },
          ],
        },
      ],
    },
  }),
}));

jest.mock("@/lib/topics", () => ({
  getTopicName: () => "Variables",
  getCategoryName: () => "Fundamentals",
}));

describe("LearnScreen integration", () => {
  it("renders the contextual subtitle in screen content", async () => {
    const screen = render(<LearnScreen />);

    await waitFor(() => {
      expect(screen.getByText("learnScreenSubtitle")).toBeTruthy();
      expect(screen.getByText("Fundamentals")).toBeTruthy();
    });
  });
});
