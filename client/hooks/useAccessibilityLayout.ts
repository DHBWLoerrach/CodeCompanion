import * as ReactNative from 'react-native';

import {
  getFontScaleCategory,
  isCompactViewport,
  shouldUseAccessibilityLayout,
  shouldUseLargeLayout,
} from '@/lib/accessibility';

export function useAccessibilityLayout() {
  const { width, fontScale } = ReactNative.useWindowDimensions();
  const category = getFontScaleCategory(fontScale);

  return {
    width,
    fontScale,
    category,
    isCompactViewport: isCompactViewport(width),
    isLargeText: category !== 'default',
    isAccessibilityText: category === 'accessibility',
    usesLargeLayout: shouldUseLargeLayout(fontScale, width),
    usesAccessibilityLayout: shouldUseAccessibilityLayout(fontScale, width),
  };
}
