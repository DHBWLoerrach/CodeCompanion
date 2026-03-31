import {
  parseInlineCodeSegments,
  type TextSegment,
} from '@/components/InlineCodeText';

describe('parseInlineCodeSegments', () => {
  it('returns a single text segment when there are no backticks', () => {
    expect(parseInlineCodeSegments('plain text')).toEqual<TextSegment[]>([
      { kind: 'text', content: 'plain text' },
    ]);
  });

  it('treats an unclosed backtick as plain text', () => {
    expect(parseInlineCodeSegments('Use `x')).toEqual<TextSegment[]>([
      { kind: 'text', content: 'Use `x' },
    ]);
  });

  it('keeps empty backticks as literal text', () => {
    expect(parseInlineCodeSegments('Value: ``')).toEqual<TextSegment[]>([
      { kind: 'text', content: 'Value: ' },
      { kind: 'text', content: '``' },
    ]);
  });

  it('parses inline code segments between plain text', () => {
    expect(parseInlineCodeSegments('Use `x` and `y`')).toEqual<TextSegment[]>([
      { kind: 'text', content: 'Use ' },
      { kind: 'code', content: 'x' },
      { kind: 'text', content: ' and ' },
      { kind: 'code', content: 'y' },
    ]);
  });

  it('treats nested backticks as alternating delimiters', () => {
    expect(parseInlineCodeSegments('`outer `inner``')).toEqual<TextSegment[]>([
      { kind: 'code', content: 'outer ' },
      { kind: 'text', content: 'inner' },
      { kind: 'text', content: '``' },
    ]);
  });

  it('preserves whitespace-only inline code content', () => {
    expect(parseInlineCodeSegments('Keep `   ` spacing')).toEqual<
      TextSegment[]
    >([
      { kind: 'text', content: 'Keep ' },
      { kind: 'code', content: '   ' },
      { kind: 'text', content: ' spacing' },
    ]);
  });
});
