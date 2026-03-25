import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import TopicDetailScreen from "@/screens/TopicDetailScreen";
import { hasTopicExplanation } from "@shared/explanations";

const mockPush = jest.fn();
const mockSetOptions = jest.fn();
const mockHasTopicExplanation = jest.mocked(hasTopicExplanation);
const mockRefreshLanguage = jest.fn().mockResolvedValue(undefined);
const mockGetSettings = jest.fn().mockResolvedValue({ language: "en" });
const mockGetProgress = jest.fn().mockResolvedValue({ topicProgress: {} });

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const ReactModule = require("react");
    ReactModule.useEffect(() => {
      const cleanup = callback();
      return cleanup;
    }, [callback]);
  },
  useNavigation: () => ({
    setOptions: mockSetOptions,
  }),
  useLocalSearchParams: () => ({
    topicId: "variables",
  }),
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
    View: require("react-native").View,
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
    refreshLanguage: mockRefreshLanguage,
  }),
}));

jest.mock("@/hooks/usePressAnimation", () => ({
  usePressAnimation: () => ({
    animatedStyle: {},
    handlePressIn: jest.fn(),
    handlePressOut: jest.fn(),
  }),
}));

jest.mock("@/lib/topics", () => ({
  getTopicById: () => ({
    id: "variables",
    category: "fundamentals",
    order: 1,
    prerequisites: [],
    optional: false,
    name: { en: "Variables", de: "Variablen" },
    shortDescription: {
      en: "let, const declarations",
      de: "let, const Deklarationen",
    },
  }),
  getTopicName: () => "Variables",
  getTopicDescription: () => "let, const declarations",
}));

jest.mock("@/lib/storage", () => ({
  storage: {
    getSettings: (...args: unknown[]) => mockGetSettings(...args),
    getProgress: (...args: unknown[]) => mockGetProgress(...args),
  },
  isTopicDue: () => false,
}));

jest.mock("@/contexts/ProgrammingLanguageContext", () => ({
  useProgrammingLanguage: () => ({
    selectedLanguage: {
      id: "javascript",
      categories: [],
    },
  }),
}));

jest.mock("@shared/explanations", () => ({
  hasTopicExplanation: jest.fn(),
  getTopicExplanation: jest
    .fn()
    .mockReturnValue(
      "# 1. Introduction\n\nSample explanation text for testing.",
    ),
}));

describe("TopicDetailScreen integration", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSetOptions.mockReset();
    mockHasTopicExplanation.mockReset();
    mockRefreshLanguage.mockClear();
    mockGetSettings.mockClear();
    mockGetProgress.mockClear();
  });

  it("navigates to the explanation screen when a static explanation exists", async () => {
    mockHasTopicExplanation.mockReturnValue(true);

    const screen = render(<TopicDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("Variables")).toBeTruthy();
    });

    const explainButton = screen.getByTestId("topic-explain-button");

    fireEvent.press(explainButton);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/topic-explanation",
      params: { topicId: "variables", programmingLanguage: "javascript" },
    });
  });

  it("disables the explanation button when no static explanation exists", async () => {
    mockHasTopicExplanation.mockReturnValue(false);

    const screen = render(<TopicDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("Variables")).toBeTruthy();
    });

    const explainButton = screen.getByTestId("topic-explain-button");

    fireEvent.press(explainButton);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("starts a quiz from the inline action when no progress exists", async () => {
    mockHasTopicExplanation.mockReturnValue(true);

    const screen = render(<TopicDetailScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("topic-start-quiz-button")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("topic-start-quiz-button"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/quiz-session",
      params: { topicId: "variables", programmingLanguage: "javascript" },
    });
  });
});
