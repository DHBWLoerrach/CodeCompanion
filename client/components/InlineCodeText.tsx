import React, { useMemo, type ComponentProps } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { BorderRadius, Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';

type InlineCodeTextProps = Omit<
  ComponentProps<typeof ThemedText>,
  'children'
> & {
  text: string;
  codeStyle?: StyleProp<TextStyle>;
};

export type TextSegment =
  | { kind: 'text'; content: string }
  | { kind: 'code'; content: string };

export function parseInlineCodeSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const codeStart = text.indexOf('`', cursor);
    if (codeStart === -1) {
      segments.push({ kind: 'text', content: text.slice(cursor) });
      break;
    }

    const codeEnd = text.indexOf('`', codeStart + 1);
    if (codeEnd === -1) {
      segments.push({ kind: 'text', content: text.slice(cursor) });
      break;
    }

    if (codeStart > cursor) {
      segments.push({ kind: 'text', content: text.slice(cursor, codeStart) });
    }

    const codeContent = text.slice(codeStart + 1, codeEnd);
    if (codeContent.length === 0) {
      segments.push({
        kind: 'text',
        content: text.slice(codeStart, codeEnd + 1),
      });
    } else {
      segments.push({ kind: 'code', content: codeContent });
    }

    cursor = codeEnd + 1;
  }

  return segments.length > 0 ? segments : [{ kind: 'text', content: text }];
}

export function InlineCodeText({
  text,
  codeStyle,
  ...props
}: InlineCodeTextProps) {
  const { theme } = useTheme();
  const segments = useMemo(() => parseInlineCodeSegments(text), [text]);

  return (
    <ThemedText {...props}>
      {segments.map((segment, index) =>
        segment.kind === 'code' ? (
          <Text
            key={`code-${index}`}
            style={[
              {
                fontFamily: Fonts?.mono || 'monospace',
                backgroundColor: theme.codeBackground,
                borderRadius: BorderRadius.xs,
                paddingHorizontal: Spacing.xs,
              },
              codeStyle,
            ]}
          >
            {segment.content}
          </Text>
        ) : (
          <React.Fragment key={`text-${index}`}>
            {segment.content}
          </React.Fragment>
        )
      )}
    </ThemedText>
  );
}
