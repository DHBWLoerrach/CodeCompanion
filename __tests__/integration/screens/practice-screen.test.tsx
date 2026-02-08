import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import PracticeScreen from "../../../app/(tabs)/practice/index";

const mockPush = jest.fn();
const mockGetProgress = jest.fn();
const mockIsTopicDue = jest.fn();
const mockRefreshLanguage = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    canDismiss: () => false,
    canGoBack: () => true,
  }),
  useFocusEffect: (callback: () => void) => {
    callback();
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/components/AppIcon", () => ({
  AppIcon: () => null,
}));

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    isDark: false,
    refreshTheme: jest.fn(),
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
    getProgress: (...args: unknown[]) => mockGetProgress(...args),
  },
  isTopicDue: (...args: unknown[]) => mockIsTopicDue(...args),
}));

describe("PracticeScreen integration", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockGetProgress.mockReset();
    mockIsTopicDue.mockReset();
    mockRefreshLanguage.mockReset();
  });

  it("shows due topics and starts review with due topic ids", async () => {
    mockGetProgress.mockResolvedValue({
      totalQuestions: 10,
      correctAnswers: 7,
      achievements: [],
      topicProgress: {
        variables: {
          topicId: "variables",
          questionsAnswered: 5,
          correctAnswers: 4,
          skillLevel: 2,
          lastPracticed: "2026-01-01T00:00:00.000Z",
        },
        loops: {
          topicId: "loops",
          questionsAnswered: 2,
          correctAnswers: 1,
          skillLevel: 1,
          lastPracticed: "2026-02-07T00:00:00.000Z",
        },
      },
    });
    mockIsTopicDue.mockImplementation(
      (progress?: { topicId?: string }) => progress?.topicId === "variables",
    );

    const screen = render(<PracticeScreen />);

    await waitFor(() => {
      expect(screen.getByText("dueForReview")).toBeTruthy();
      expect(screen.getByText("Variables")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("startReview"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/quiz-session",
      params: { topicIds: "variables" },
    });
  });

  it("navigates via mixed, quick, and category quiz actions", async () => {
    mockGetProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      achievements: [],
      topicProgress: {},
    });
    mockIsTopicDue.mockReturnValue(false);

    const screen = render(<PracticeScreen />);

    await waitFor(() => {
      expect(screen.getByText("quizModes")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("mixedQuiz"));
    fireEvent.press(screen.getByText("quickQuiz"));
    fireEvent.press(screen.getByText("Fundamentals"));

    expect(mockPush).toHaveBeenCalledWith("/quiz-session");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/quiz-session",
      params: { count: "5" },
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/quiz-session",
      params: { topicIds: "variables,data-types,operators" },
    });
  });
});
