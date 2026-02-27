import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import TopicExplanationScreen from "@/screens/TopicExplanationScreen";

const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const mockTranslate = (key: string) => key;
let mockSearchParams: { topicId?: string; programmingLanguage?: string } = {};

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({
    replace: jest.fn(),
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

jest.mock("@/components/MarkdownView", () => {
  const ReactModule = require("react");
  const { Text } = require("react-native");
  return {
    MarkdownView: ({ content }: { content: string }) =>
      ReactModule.createElement(Text, null, content),
  };
});

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
      link: "#4A90E2",
      backgroundSecondary: "#F0F0F0",
      backgroundTertiary: "#EBEBEB",
    },
  }),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: mockTranslate,
    language: "en",
    refreshLanguage: jest.fn(),
  }),
}));

jest.mock("@/lib/query-client", () => ({
  getApiUrl: jest.fn(() => "http://localhost:8081/"),
}));

describe("TopicExplanationScreen integration", () => {
  const originalFetch = global.fetch;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockSearchParams = {
      topicId: "variables",
      programmingLanguage: "javascript",
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("shows retry button on error and retries explanation request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ explanation: "## Retry success" }),
    } as Response);

    const screen = render(<TopicExplanationScreen />);

    await waitFor(() => {
      expect(screen.getByText("failedToLoadExplanation")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("topic-explanation-retry-button"));

    await waitFor(() => {
      expect(screen.getByText("## Retry success")).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    const firstCallBody = JSON.parse(
      String((mockFetch.mock.calls[0][1] as RequestInit).body),
    ) as {
      topicId: string;
      language: string;
      programmingLanguage: string;
    };
    const secondCallBody = JSON.parse(
      String((mockFetch.mock.calls[1][1] as RequestInit).body),
    ) as {
      topicId: string;
      language: string;
      programmingLanguage: string;
    };

    expect(firstCallBody).toEqual({
      topicId: "variables",
      language: "en",
      programmingLanguage: "javascript",
    });
    expect(secondCallBody).toEqual(firstCallBody);
  });
});
