import type { Language } from '@/lib/i18n';

export type ThemedTextType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'small'
  | 'caption'
  | 'link'
  | 'code'
  | 'label';

export type FontScaleCategory = 'default' | 'large' | 'accessibility';

export const LARGE_TEXT_MIN_FONT_SCALE = 1.15;
export const ACCESSIBILITY_TEXT_MIN_FONT_SCALE = 1.35;
export const COMPACT_VIEWPORT_MAX_WIDTH = 600;
export const DENSE_CONTROL_MAX_FONT_SCALE = 1.2;

export function getFontScaleCategory(fontScale: number): FontScaleCategory {
  if (fontScale >= ACCESSIBILITY_TEXT_MIN_FONT_SCALE) {
    return 'accessibility';
  }

  if (fontScale >= LARGE_TEXT_MIN_FONT_SCALE) {
    return 'large';
  }

  return 'default';
}

export function isCompactViewport(width: number) {
  return width < COMPACT_VIEWPORT_MAX_WIDTH;
}

export function shouldUseLargeLayout(fontScale: number, width: number) {
  return (
    isCompactViewport(width) && getFontScaleCategory(fontScale) !== 'default'
  );
}

export function shouldUseAccessibilityLayout(fontScale: number, width: number) {
  return (
    isCompactViewport(width) &&
    getFontScaleCategory(fontScale) === 'accessibility'
  );
}

export function getDefaultTextCap(type: ThemedTextType) {
  switch (type) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'body':
    case 'link':
      return 1.6;
    case 'small':
    case 'caption':
    case 'code':
    case 'label':
    default:
      return 1.4;
  }
}

export function getDenseControlTextCap() {
  return DENSE_CONTROL_MAX_FONT_SCALE;
}

type TabLabelKey = 'topicsTab' | 'practice' | 'progress';

export function getTabLabel(
  key: TabLabelKey,
  language: Language,
  compact: boolean
) {
  if (key === 'topicsTab') {
    return language === 'de' ? 'Themen' : 'Topics';
  }

  if (key === 'practice') {
    return language === 'de' ? 'Üben' : 'Practice';
  }

  if (compact && key === 'progress' && language === 'de') {
    return 'Verlauf';
  }

  return language === 'de' ? 'Fortschritt' : 'Progress';
}
