import React from "react";
import { render } from "@testing-library/react-native";

import { ExplanationCard } from "@/components/ExplanationCard";

jest.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      success: "#34C759",
      error: "#E2001A",
      secondary: "#4A90E2",
      text: "#111111",
      backgroundDefault: "#FFFFFF",
      backgroundSecondary: "#F0F0F0",
      backgroundTertiary: "#EBEBEB",
      codeBackground: "#F7F7F7",
      cardBorder: "#DDDDDD",
      cardBorderSubtle: "#DDDDDD",
      tabIconDefault: "#666666",
      separator: "rgba(0, 0, 0, 0.08)",
      disabled: "#CCCCCC",
      onColor: "#FFFFFF",
    },
  }),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: "en",
  }),
}));

jest.mock("@/components/AppIcon", () => ({
  AppIcon: () => null,
}));

const baseProps = {
  isCorrect: true,
  correctAnswer: "`0`",
  resultSentence: "The expression evaluates to `0`.",
  explanation:
    "The `??` operator only falls back when left is `null` or `undefined`.",
  takeaway: "`??` only checks for `null` and `undefined`",
};

describe("ExplanationCard", () => {
  it("renders correct title when answer is correct", () => {
    const screen = render(<ExplanationCard {...baseProps} />);

    expect(screen.getByText(/correctTitle/)).toBeTruthy();
  });

  it("renders incorrect title when answer is wrong", () => {
    const screen = render(<ExplanationCard {...baseProps} isCorrect={false} />);

    expect(screen.getByText(/incorrectTitle/)).toBeTruthy();
  });

  it("displays resultSentence and explanation text", () => {
    const screen = render(<ExplanationCard {...baseProps} />);

    expect(screen.getByText(/The expression evaluates to/i)).toBeTruthy();
    expect(
      screen.getByText(/operator only falls back when left is/i),
    ).toBeTruthy();
  });

  it("hides resultSentence when it only repeats the correct answer", () => {
    const screen = render(
      <ExplanationCard {...baseProps} resultSentence="Result: `0`" />,
    );

    expect(screen.queryByText(/Result:/)).toBeNull();
    expect(
      screen.getByText(/operator only falls back when left is/i),
    ).toBeTruthy();
  });

  it("displays takeaway with label", () => {
    const screen = render(<ExplanationCard {...baseProps} />);

    expect(screen.getByText(/takeawayLabel/)).toBeTruthy();
  });

  it("shows commonMistake when provided", () => {
    const screen = render(
      <ExplanationCard
        {...baseProps}
        commonMistake="Many confuse `??` with `||`."
      />,
    );

    expect(screen.getByText(/commonMistakeLabel/)).toBeTruthy();
    expect(screen.getByText(/Many confuse/i)).toBeTruthy();
  });

  it("does not show commonMistake section when not provided", () => {
    const screen = render(<ExplanationCard {...baseProps} />);

    expect(screen.queryByText(/commonMistakeLabel/)).toBeNull();
  });

  it("shows topic explanation button when topicId is provided", () => {
    const onPressTopic = jest.fn();
    const screen = render(
      <ExplanationCard
        {...baseProps}
        topicId="nullish-coalescing"
        onPressTopic={onPressTopic}
      />,
    );

    expect(screen.getByTestId("quiz-topic-explanation-button")).toBeTruthy();
  });

  it("does not show topic explanation button when topicId is absent", () => {
    const screen = render(<ExplanationCard {...baseProps} />);

    expect(screen.queryByTestId("quiz-topic-explanation-button")).toBeNull();
  });
});
