import React from "react";
import { Linking, StyleSheet } from "react-native";
import {
  EnrichedMarkdownText,
  type MarkdownStyle,
} from "react-native-enriched-markdown";

import { useTheme } from "@/contexts/ThemeContext";
import {
  BorderRadius,
  Fonts,
  Spacing,
  Typography,
} from "@/constants/theme";

interface MarkdownViewProps {
  content: string;
}

export function MarkdownView({ content }: MarkdownViewProps) {
  const { theme, isDark } = useTheme();

  const markdownStyle: MarkdownStyle = {
    paragraph: {
      color: theme.text,
      fontSize: Typography.body.fontSize,
      lineHeight: 24,
      marginBottom: Spacing.sm,
    },
    h1: {
      color: theme.text,
      fontSize: 24,
      fontWeight: "700",
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    h2: {
      color: theme.text,
      fontSize: 20,
      fontWeight: "700",
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    h3: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "600",
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
    },
    list: {
      color: theme.text,
      fontSize: Typography.body.fontSize,
      lineHeight: 24,
      gapWidth: Spacing.sm,
      marginLeft: Spacing.sm,
      markerColor: theme.primary,
      markerFontWeight: "600",
    },
    strong: {
      color: theme.text,
    },
    em: {
      color: theme.text,
    },
    link: {
      color: theme.link,
      underline: true,
    },
    code: {
      backgroundColor: isDark
        ? theme.backgroundSecondary
        : theme.codeBackground,
      borderColor: theme.cardBorder,
      color: isDark ? theme.text : theme.primary,
      fontFamily: Fonts.mono,
      fontSize: Typography.code.fontSize,
    },
    codeBlock: {
      backgroundColor: theme.codeBackground,
      borderColor: theme.cardBorder,
      borderRadius: BorderRadius.md,
      borderWidth: StyleSheet.hairlineWidth,
      color: theme.text,
      fontFamily: Fonts.mono,
      fontSize: Typography.code.fontSize,
      lineHeight: 20,
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
      padding: Spacing.md,
    },
  };

  return (
    <EnrichedMarkdownText
      markdown={content}
      markdownStyle={markdownStyle}
      onLinkPress={({ url }) => {
        void Linking.openURL(url);
      }}
    />
  );
}
