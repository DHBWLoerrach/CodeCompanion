import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import QuizSessionScreen from "@/screens/QuizSessionScreen";

const mockReplace = jest.fn();
const mockApiRequest = jest.fn();
const mockStorage = {
  getSettings: jest.fn(),
  getTopicSkillLevel: jest.fn(),
  recordPractice: jest.fn(),
  updateTopicProgress: jest.fn(),
};
let mockSearchParams: { topicId?: string; topicIds?: string; count?: string } =
  {};

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    back: jest.fn(),
    canDismiss: () => false,
    canGoBack: () => false,
  }),
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
    refreshLanguage: jest.fn(),
  }),
}));

jest.mock("@/lib/query-client", () => ({
  getApiUrl: jest.fn(() => "http://localhost:8081/"),
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

jest.mock("@/lib/storage", () => ({
  storage: {
    getSettings: (...args: unknown[]) => mockStorage.getSettings(...args),
    getTopicSkillLevel: (...args: unknown[]) =>
      mockStorage.getTopicSkillLevel(...args),
    recordPractice: (...args: unknown[]) => mockStorage.recordPractice(...args),
    updateTopicProgress: (...args: unknown[]) =>
      mockStorage.updateTopicProgress(...args),
  },
}));

describe("QuizSessionScreen integration", () => {
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReplace.mockReset();
    mockApiRequest.mockReset();
    mockStorage.getSettings.mockReset();
    mockStorage.getTopicSkillLevel.mockReset();
    mockStorage.recordPractice.mockReset();
    mockStorage.updateTopicProgress.mockReset();

    mockSearchParams = { topicId: "variables", count: "1" };
    mockStorage.getSettings.mockResolvedValue({
      language: "en",
      themeMode: "auto",
    });
    mockStorage.getTopicSkillLevel.mockResolvedValue(2);
    mockStorage.recordPractice.mockResolvedValue(undefined);
    mockStorage.updateTopicProgress.mockResolvedValue(undefined);

    mockApiRequest.mockResolvedValue({
      json: async () => ({
        questions: [
          {
            id: "q1",
            question: "What is const?",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 1,
            explanation: "Because const creates block-scoped bindings.",
          },
        ],
      }),
    });

    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.99);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it("loads questions, submits answer, persists progress, and navigates to summary", async () => {
    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText("What is const?")).toBeTruthy();
    });

    expect(mockApiRequest).toHaveBeenCalledWith("POST", "/api/quiz/generate", {
      topicId: "variables",
      count: 1,
      language: "en",
      skillLevel: 2,
    });

    fireEvent.press(screen.getByText("Option A"));
    fireEvent.press(screen.getByText("submitAnswer"));

    await waitFor(() => {
      expect(
        screen.getByText("Because const creates block-scoped bindings."),
      ).toBeTruthy();
    });

    fireEvent.press(screen.getByText("viewResults"));

    await waitFor(() => {
      expect(mockStorage.recordPractice).toHaveBeenCalledTimes(1);
      expect(mockStorage.updateTopicProgress).toHaveBeenCalledWith(
        "variables",
        1,
        0,
      );
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    const replaceArgs = mockReplace.mock.calls[0][0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(replaceArgs.pathname).toBe("/session-summary");
    expect(replaceArgs.params.topicId).toBe("variables");
    expect(replaceArgs.params.total).toBe("1");
    expect(replaceArgs.params.score).toBe("0");
    expect(replaceArgs.params.answers).toContain('"questionId":"q1"');
  });
});
