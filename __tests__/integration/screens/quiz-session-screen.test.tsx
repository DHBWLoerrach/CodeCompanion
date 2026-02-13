import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import QuizSessionScreen from "@/screens/QuizSessionScreen";

const mockReplace = jest.fn();
const mockApiRequest = jest.fn();
const mockStorage = {
  getSettings: jest.fn(),
  getProgress: jest.fn(),
  getTopicProgressForLanguage: jest.fn(
    (topicProgress: Record<string, unknown>, languageId: string) => {
      const prefix = `${languageId}:`;
      const filtered: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(topicProgress)) {
        if (key.startsWith(prefix)) {
          filtered[key.slice(prefix.length)] = value;
        }
      }
      return filtered;
    },
  ),
  getTopicSkillLevel: jest.fn(),
  recordPractice: jest.fn(),
  updateTopicProgress: jest.fn(),
};
let mockSearchParams: {
  topicId?: string;
  topicIds?: string;
  count?: string;
  programmingLanguage?: string;
} = {};

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
    getProgress: (...args: unknown[]) => mockStorage.getProgress(...args),
    getTopicProgressForLanguage: (
      topicProgress: Record<string, unknown>,
      languageId: string,
    ) => mockStorage.getTopicProgressForLanguage(topicProgress, languageId),
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
    mockStorage.getProgress.mockReset();
    mockStorage.getTopicProgressForLanguage.mockClear();
    mockStorage.getTopicSkillLevel.mockReset();
    mockStorage.recordPractice.mockReset();
    mockStorage.updateTopicProgress.mockReset();

    mockSearchParams = {
      topicId: "variables",
      count: "1",
      programmingLanguage: "javascript",
    };
    mockStorage.getSettings.mockResolvedValue({
      language: "en",
      themeMode: "auto",
    });
    mockStorage.getTopicSkillLevel.mockResolvedValue(2);
    mockStorage.getProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      topicProgress: {},
      achievements: [],
    });
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
      programmingLanguage: "javascript",
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
        "javascript",
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

  it("sends mapped mixed skillLevel for provided topicIds", async () => {
    mockSearchParams = {
      topicIds: "variables,loops",
      count: "2",
      programmingLanguage: "javascript",
    };
    mockStorage.getProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      topicProgress: {
        "javascript:variables": {
          topicId: "variables",
          questionsAnswered: 10,
          correctAnswers: 8,
          skillLevel: 5,
        },
        "javascript:loops": {
          topicId: "loops",
          questionsAnswered: 4,
          correctAnswers: 2,
          skillLevel: 1,
        },
      },
      achievements: [],
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText("What is const?")).toBeTruthy();
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/quiz/generate-mixed",
      {
        topicIds: ["variables", "loops"],
        count: 2,
        language: "en",
        skillLevel: 2,
        programmingLanguage: "javascript",
      },
    );
  });

  it("sends mapped mixed skillLevel from global progress for random mix", async () => {
    mockSearchParams = { programmingLanguage: "javascript" };
    mockStorage.getProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      topicProgress: {
        "javascript:variables": {
          topicId: "variables",
          questionsAnswered: 12,
          correctAnswers: 10,
          skillLevel: 1,
        },
        "javascript:loops": {
          topicId: "loops",
          questionsAnswered: 7,
          correctAnswers: 6,
          skillLevel: 1,
        },
        "python:variables": {
          topicId: "variables",
          questionsAnswered: 9,
          correctAnswers: 9,
          skillLevel: 5,
        },
      },
      achievements: [],
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText("What is const?")).toBeTruthy();
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/quiz/generate-mixed",
      {
        count: 10,
        language: "en",
        skillLevel: 1,
        programmingLanguage: "javascript",
      },
    );
  });

  it("falls back to beginner mixed skillLevel when no progress exists", async () => {
    mockSearchParams = { programmingLanguage: "javascript" };
    mockStorage.getProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      topicProgress: {},
      achievements: [],
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText("What is const?")).toBeTruthy();
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/quiz/generate-mixed",
      {
        count: 10,
        language: "en",
        skillLevel: 1,
        programmingLanguage: "javascript",
      },
    );
  });
});
