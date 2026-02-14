import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface MarkdownViewProps {
  content: string;
}

export function MarkdownView({ content }: MarkdownViewProps) {
  const { theme, isDark } = useTheme();

  const parseMarkdown = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let key = 0;

    const renderInlineText = (
      line: string,
      baseStyle: any = {},
    ): React.ReactNode => {
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let partKey = 0;

      while (remaining.length > 0) {
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        const codeMatch = remaining.match(/`([^`]+)`/);

        let firstMatch: {
          index: number;
          length: number;
          content: string;
          type: string;
        } | null = null;

        if (boldMatch && boldMatch.index !== undefined) {
          firstMatch = {
            index: boldMatch.index,
            length: boldMatch[0].length,
            content: boldMatch[1],
            type: "bold",
          };
        }
        if (codeMatch && codeMatch.index !== undefined) {
          if (!firstMatch || codeMatch.index < firstMatch.index) {
            firstMatch = {
              index: codeMatch.index,
              length: codeMatch[0].length,
              content: codeMatch[1],
              type: "code",
            };
          }
        }

        if (firstMatch) {
          if (firstMatch.index > 0) {
            parts.push(
              <Text
                key={partKey++}
                style={[styles.text, { color: theme.text }, baseStyle]}
              >
                {remaining.slice(0, firstMatch.index)}
              </Text>,
            );
          }

          if (firstMatch.type === "bold") {
            parts.push(
              <Text
                key={partKey++}
                style={[
                  styles.text,
                  styles.bold,
                  { color: theme.text },
                  baseStyle,
                ]}
              >
                {firstMatch.content}
              </Text>,
            );
          } else if (firstMatch.type === "code") {
            parts.push(
              <Text
                key={partKey++}
                style={[
                  styles.inlineCode,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundSecondary
                      : theme.codeBackground,
                    borderColor: theme.cardBorder,
                    color: isDark ? theme.text : theme.primary,
                  },
                ]}
              >
                {firstMatch.content}
              </Text>,
            );
          }

          remaining = remaining.slice(firstMatch.index + firstMatch.length);
        } else {
          parts.push(
            <Text
              key={partKey++}
              style={[styles.text, { color: theme.text }, baseStyle]}
            >
              {remaining}
            </Text>,
          );
          break;
        }
      }

      return parts.length === 1 ? parts[0] : <Text>{parts}</Text>;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <View
              key={key++}
              style={[
                styles.codeBlock,
                {
                  backgroundColor: theme.codeBackground,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.codeText, { color: theme.text }]}>
                {codeBlockContent.join("\n")}
              </Text>
            </View>,
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      if (line.trim() === "") {
        elements.push(<View key={key++} style={styles.spacer} />);
        continue;
      }

      if (line.startsWith("## ")) {
        const headingMatch = line.match(/^##\s*(\d+\.?\s*)?\*?\*?(.+?)\*?\*?$/);
        const headingText = headingMatch ? headingMatch[2] : line.slice(3);
        elements.push(
          <Text key={key++} style={[styles.h2, { color: theme.text }]}>
            {headingText.replace(/\*\*/g, "")}
          </Text>,
        );
        continue;
      }

      if (line.startsWith("### ")) {
        elements.push(
          <Text key={key++} style={[styles.h3, { color: theme.text }]}>
            {line.slice(4).replace(/\*\*/g, "")}
          </Text>,
        );
        continue;
      }

      if (line.startsWith("# ")) {
        elements.push(
          <Text key={key++} style={[styles.h1, { color: theme.text }]}>
            {line.slice(2).replace(/\*\*/g, "")}
          </Text>,
        );
        continue;
      }

      if (line.match(/^[\-\*]\s/)) {
        elements.push(
          <View key={key++} style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.primary }]}>•</Text>
            <Text style={[styles.text, { color: theme.text, flex: 1 }]}>
              {renderInlineText(line.slice(2))}
            </Text>
          </View>,
        );
        continue;
      }

      if (line.match(/^\d+\.\s/)) {
        const numMatch = line.match(/^(\d+)\.\s(.*)$/);
        if (numMatch) {
          elements.push(
            <View key={key++} style={styles.listItem}>
              <Text style={[styles.listNumber, { color: theme.primary }]}>
                {numMatch[1]}.
              </Text>
              <Text style={[styles.text, { color: theme.text, flex: 1 }]}>
                {renderInlineText(numMatch[2])}
              </Text>
            </View>,
          );
          continue;
        }
      }

      elements.push(
        <Text key={key++} style={[styles.paragraph, { color: theme.text }]}>
          {renderInlineText(line)}
        </Text>,
      );
    }

    return elements;
  };

  return <View style={styles.container}>{parseMarkdown(content)}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  bold: {
    fontWeight: "700",
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
  },
  h1: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  h2: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  codeBlock: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 14,
    lineHeight: 20,
  },
  inlineCode: {
    fontFamily: "monospace",
    fontSize: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listItem: {
    flexDirection: "row",
    paddingLeft: Spacing.sm,
    gap: Spacing.sm,
  },
  bullet: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
  },
  listNumber: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    minWidth: 20,
  },
  spacer: {
    height: Spacing.sm,
  },
});
