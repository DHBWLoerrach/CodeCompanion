import React from "react";
import { Linking } from "react-native";
import { render } from "@testing-library/react-native";

import { MarkdownView } from "@/components/MarkdownView";

const mockEnrichedMarkdownText = jest.fn();

jest.mock("react-native-enriched-markdown", () => {
  const ReactModule = require("react");
  const { Text: NativeText } = require("react-native");

  return {
    EnrichedMarkdownText: (props: Record<string, unknown>) => {
      mockEnrichedMarkdownText(props);
      return ReactModule.createElement(
        NativeText,
        { testID: "enriched-markdown" },
        props.markdown as string,
      );
    },
  };
});

jest.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    isDark: false,
    refreshTheme: jest.fn(),
    theme: {
      primary: "#E2001A",
      link: "#4A90E2",
      text: "#111111",
      cardBorder: "#DDDDDD",
      codeBackground: "#F7F7F7",
      backgroundSecondary: "#F0F0F0",
    },
  }),
}));

describe("MarkdownView", () => {
  it("passes markdown content, styles, and link handling to EnrichedMarkdownText", () => {
    const openURLSpy = jest
      .spyOn(Linking, "openURL")
      .mockResolvedValueOnce(true as never);

    const screen = render(
      <MarkdownView content="This is *italic* text with **bold** and `code`." />,
    );

    expect(screen.getByTestId("enriched-markdown")).toBeTruthy();
    expect(screen.getByText("This is *italic* text with **bold** and `code`.")).toBeTruthy();

    expect(mockEnrichedMarkdownText).toHaveBeenCalledTimes(1);

    const props = mockEnrichedMarkdownText.mock.calls[0][0] as {
      markdown: string;
      markdownStyle: {
        paragraph: { fontSize: number; lineHeight: number; color: string };
        h2: { fontSize: number; fontWeight: string };
        code: { fontFamily: string; color: string; fontSize: number };
        codeBlock: { borderRadius: number; padding: number };
        link: { color: string; underline: boolean };
      };
      onLinkPress: ({ url }: { url: string }) => void;
    };

    expect(props.markdown).toBe(
      "This is *italic* text with **bold** and `code`.",
    );
    expect(props.markdownStyle.paragraph).toEqual(
      expect.objectContaining({
        color: "#111111",
        fontSize: 16,
        lineHeight: 24,
      }),
    );
    expect(props.markdownStyle.h2).toEqual(
      expect.objectContaining({
        fontSize: 20,
        fontWeight: "700",
      }),
    );
    expect(props.markdownStyle.code).toEqual(
      expect.objectContaining({
        color: "#E2001A",
        fontSize: 14,
      }),
    );
    expect(props.markdownStyle.code.fontFamily).toBeTruthy();
    expect(props.markdownStyle.codeBlock).toEqual(
      expect.objectContaining({
        borderRadius: 12,
        padding: 12,
      }),
    );
    expect(props.markdownStyle.link).toEqual(
      expect.objectContaining({
        color: "#4A90E2",
        underline: true,
      }),
    );

    props.onLinkPress({ url: "https://example.com" });

    expect(openURLSpy).toHaveBeenCalledWith("https://example.com");
  });
});
