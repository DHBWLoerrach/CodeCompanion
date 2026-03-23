import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

import { MarkdownView } from "@/components/MarkdownView";

jest.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    isDark: false,
    refreshTheme: jest.fn(),
    theme: {
      primary: "#E2001A",
      text: "#111111",
      cardBorder: "#DDDDDD",
      codeBackground: "#F7F7F7",
      backgroundSecondary: "#F0F0F0",
    },
  }),
}));

describe("MarkdownView", () => {
  it("renders italic markdown without showing literal asterisks", () => {
    const screen = render(
      <MarkdownView content="This is *italic* text with **bold** and `code`." />,
    );

    expect(screen.queryByText("*italic*")).toBeNull();

    expect(StyleSheet.flatten(screen.getByText("italic").props.style)).toEqual(
      expect.objectContaining({ fontStyle: "italic" }),
    );
    expect(StyleSheet.flatten(screen.getByText("bold").props.style)).toEqual(
      expect.objectContaining({ fontWeight: "700" }),
    );
    expect(StyleSheet.flatten(screen.getByText("code").props.style)).toEqual(
      expect.objectContaining({ fontFamily: "monospace" }),
    );
  });
});
