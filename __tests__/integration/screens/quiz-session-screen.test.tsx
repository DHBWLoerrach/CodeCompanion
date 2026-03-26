import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import QuizSessionScreen from "@/screens/QuizSessionScreen";

const mockReplace = jest.fn();
const mockStackScreen = jest.fn();
let mockHeaderOptions: { headerLeft?: () => React.ReactElement } | undefined;
const mockApiRequest = jest.fn();
class MockApiRequestError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`Request failed (${status})`);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}
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
  updateTopicSkillLevel: jest.fn(),
};
let mockSearchParams: {
  topicId?: string;
  topicIds?: string;
  count?: string;
  programmingLanguage?: string;
  quizMode?: string;
} = {};

jest.mock("expo-router", () => ({
  Stack: {
    Screen: (props: {
      options?: { headerLeft?: () => React.ReactElement };
    }) => {
      mockStackScreen(props);
      mockHeaderOptions = props.options;
      return null;
    },
  },
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

jest.mock("@/contexts/ThemeContext", () => ({
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

jest.mock("@/lib/query-client", () => ({
  getApiUrl: jest.fn(() => "http://localhost:8081/"),
  ApiRequestError: MockApiRequestError,
  isApiRequestError: (error: unknown) => error instanceof MockApiRequestError,
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
    updateTopicSkillLevel: (...args: unknown[]) =>
      mockStorage.updateTopicSkillLevel(...args),
  },
}));

describe("QuizSessionScreen integration", () => {
  let randomSpy: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReplace.mockReset();
    mockStackScreen.mockReset();
    mockHeaderOptions = undefined;
    mockApiRequest.mockReset();
    mockStorage.getSettings.mockReset();
    mockStorage.getProgress.mockReset();
    mockStorage.getTopicProgressForLanguage.mockClear();
    mockStorage.getTopicSkillLevel.mockReset();
    mockStorage.recordPractice.mockReset();
    mockStorage.updateTopicProgress.mockReset();
    mockStorage.updateTopicSkillLevel.mockReset();

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
    mockStorage.updateTopicSkillLevel.mockResolvedValue(undefined);

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
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    randomSpy.mockRestore();
    alertSpy.mockRestore();
  });

  function pressHeaderCloseButton() {
    const headerLeft = mockHeaderOptions?.headerLeft;
    expect(headerLeft).toBeDefined();

    const headerButton = render(headerLeft!());
    fireEvent.press(headerButton.getByTestId("quiz-close-button"));
  }

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
      expect(mockStorage.updateTopicSkillLevel).toHaveBeenCalledWith(
        "javascript",
        "variables",
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
    expect(replaceArgs.params.count).toBe("1");
    expect(replaceArgs.params.answers).toContain('"questionId":"q1"');
  });

  it("renders inline code markers as styled text instead of raw backticks", async () => {
    mockApiRequest.mockResolvedValueOnce({
      json: async () => ({
        questions: [
          {
            id: "q1",
            question: "What is `x` after `let x;`?",
            options: ["`undefined`", "`null`", "`0`", "`NaN`"],
            correctIndex: 0,
            explanation: "Because `let x;` leaves `x` as `undefined`.",
          },
        ],
      }),
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText("What is x after let x;?")).toBeTruthy();
    });

    expect(screen.queryByText("What is `x` after `let x;`?")).toBeNull();
    const undefinedAnswer = screen.getByText("undefined");
    expect(undefinedAnswer).toBeTruthy();
    expect(screen.queryByText("`undefined`")).toBeNull();

    fireEvent.press(undefinedAnswer);
    expect(undefinedAnswer).toHaveStyle({
      color: "#FFFFFF",
      backgroundColor: "rgba(255, 255, 255, 0.18)",
    });
    fireEvent.press(screen.getByText("submitAnswer"));

    await waitFor(() => {
      expect(
        screen.getByText("Because let x; leaves x as undefined."),
      ).toBeTruthy();
    });
    expect(
      screen.queryByText("Because `let x;` leaves `x` as `undefined`."),
    ).toBeNull();
  });

  it("preserves the requested count when the API returns fewer questions", async () => {
    mockSearchParams = {
      topicId: "variables",
      count: "3",
      programmingLanguage: "javascript",
    };
    mockApiRequest.mockResolvedValueOnce({
      json: async () => ({
        questions: [
          {
            id: "q1",
            question: "Question 1",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 1,
            explanation: "Explanation 1",
          },
          {
            id: "q2",
            question: "Question 2",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 1,
            explanation: "Explanation 2",
          },
        ],
      }),
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText("Question 1")).toBeTruthy();
    });

    expect(mockApiRequest).toHaveBeenCalledWith("POST", "/api/quiz/generate", {
      topicId: "variables",
      count: 3,
      language: "en",
      skillLevel: 2,
      programmingLanguage: "javascript",
    });

    fireEvent.press(screen.getByText("Option A"));
    fireEvent.press(screen.getByText("submitAnswer"));
    await waitFor(() => {
      expect(screen.getByText("Explanation 1")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("nextQuestion"));

    await waitFor(() => {
      expect(screen.getByText("Question 2")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Option A"));
    fireEvent.press(screen.getByText("submitAnswer"));
    await waitFor(() => {
      expect(screen.getByText("Explanation 2")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("viewResults"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });

    const replaceArgs = mockReplace.mock.calls[0][0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(replaceArgs.pathname).toBe("/session-summary");
    expect(replaceArgs.params.count).toBe("3");
    expect(replaceArgs.params.total).toBe("2");
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

  it("caps quick quiz difficulty and preserves quick params for replay", async () => {
    mockSearchParams = {
      topicIds: "variables,loops",
      count: "3",
      programmingLanguage: "javascript",
      quizMode: "quick",
    };
    mockStorage.getProgress.mockResolvedValue({
      totalQuestions: 0,
      correctAnswers: 0,
      topicProgress: {
        "javascript:variables": {
          topicId: "variables",
          questionsAnswered: 12,
          correctAnswers: 10,
          skillLevel: 5,
        },
        "javascript:loops": {
          topicId: "loops",
          questionsAnswered: 9,
          correctAnswers: 8,
          skillLevel: 4,
        },
      },
      achievements: [],
    });
    mockApiRequest.mockResolvedValueOnce({
      json: async () => ({
        questions: [
          {
            id: "q1",
            topicId: "variables",
            question: "Question 1",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 1,
            explanation: "Explanation 1",
          },
          {
            id: "q2",
            topicId: "loops",
            question: "Question 2",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 0,
            explanation: "Explanation 2",
          },
          {
            id: "q3",
            topicId: "variables",
            question: "Question 3",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 1,
            explanation: "Explanation 3",
          },
        ],
      }),
    });

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText("Question 1")).toBeTruthy();
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/quiz/generate-mixed",
      {
        topicIds: ["variables", "loops"],
        count: 3,
        language: "en",
        skillLevel: 2,
        programmingLanguage: "javascript",
      },
    );

    fireEvent.press(screen.getByText("Option A"));
    fireEvent.press(screen.getByText("submitAnswer"));
    await waitFor(() => {
      expect(screen.getByText("Explanation 1")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("nextQuestion"));

    await waitFor(() => {
      expect(screen.getByText("Question 2")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Option A"));
    fireEvent.press(screen.getByText("submitAnswer"));
    await waitFor(() => {
      expect(screen.getByText("Explanation 2")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("nextQuestion"));

    await waitFor(() => {
      expect(screen.getByText("Question 3")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Option A"));
    fireEvent.press(screen.getByText("submitAnswer"));
    await waitFor(() => {
      expect(screen.getByText("Explanation 3")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("viewResults"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
      expect(mockStorage.updateTopicProgress).toHaveBeenCalledWith(
        "javascript",
        "variables",
        2,
        0,
      );
      expect(mockStorage.updateTopicProgress).toHaveBeenCalledWith(
        "javascript",
        "loops",
        1,
        1,
      );
      expect(mockStorage.updateTopicSkillLevel).toHaveBeenCalledWith(
        "javascript",
        "variables",
        0,
      );
      expect(mockStorage.updateTopicSkillLevel).toHaveBeenCalledWith(
        "javascript",
        "loops",
        100,
      );
    });

    const replaceArgs = mockReplace.mock.calls[0][0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(replaceArgs.pathname).toBe("/session-summary");
    expect(replaceArgs.params.topicIds).toBe("variables,loops");
    expect(replaceArgs.params.quizMode).toBe("quick");
    expect(replaceArgs.params.count).toBe("3");
    expect(replaceArgs.params.total).toBe("3");
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
        count: 5,
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
        count: 5,
        language: "en",
        skillLevel: 1,
        programmingLanguage: "javascript",
      },
    );
  });

  it("shows the device quota message on structured 429 errors", async () => {
    mockApiRequest.mockRejectedValueOnce(
      new MockApiRequestError(429, {
        error: "rate_limited",
        scope: "device",
        reason: "device_total",
        resetAtUtc: "2026-03-25T00:00:00.000Z",
      }),
    );

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText("quizRateLimitDevice")).toBeTruthy();
    });
  });

  it("shows the global quota message on structured 429 errors", async () => {
    mockApiRequest.mockRejectedValueOnce(
      new MockApiRequestError(429, {
        error: "rate_limited",
        scope: "global",
        reason: "global_day",
        resetAtUtc: "2026-03-25T00:00:00.000Z",
      }),
    );

    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText("quizRateLimitGlobal")).toBeTruthy();
    });
  });

  it("closes immediately when no quiz progress exists yet", async () => {
    render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(mockHeaderOptions?.headerLeft).toBeDefined();
    });

    pressHeaderCloseButton();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/learn");
  });

  it("asks for confirmation before closing when quiz progress would be lost", async () => {
    const screen = render(<QuizSessionScreen />);

    await waitFor(() => {
      expect(screen.getByText("What is const?")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Option A"));
    pressHeaderCloseButton();

    expect(mockReplace).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "quitQuizTitle",
      "quitQuizMessage",
      expect.arrayContaining([
        expect.objectContaining({ text: "cancel", style: "cancel" }),
        expect.objectContaining({
          text: "quitQuizConfirm",
          style: "destructive",
          onPress: expect.any(Function),
        }),
      ]),
    );

    const alertButtons = alertSpy.mock.calls[0]?.[2] as Array<{
      onPress?: () => void;
      text: string;
    }>;
    const confirmButton = alertButtons.find(
      (button) => button.text === "quitQuizConfirm",
    );

    expect(confirmButton?.onPress).toBeDefined();
    confirmButton?.onPress?.();

    expect(mockReplace).toHaveBeenCalledWith("/learn");
  });
});
