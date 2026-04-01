import {
  getDefaultTextCap,
  getDenseControlTextCap,
  getFontScaleCategory,
  getTabLabel,
  shouldUseAccessibilityLayout,
  shouldUseLargeLayout,
} from '@/lib/accessibility';

describe('accessibility helpers', () => {
  it('classifies font scales into the expected buckets', () => {
    expect(getFontScaleCategory(1.0)).toBe('default');
    expect(getFontScaleCategory(1.14)).toBe('default');
    expect(getFontScaleCategory(1.15)).toBe('large');
    expect(getFontScaleCategory(1.34)).toBe('large');
    expect(getFontScaleCategory(1.35)).toBe('accessibility');
    expect(getFontScaleCategory(2.0)).toBe('accessibility');
  });

  it('enables large layouts only on compact viewports', () => {
    expect(shouldUseLargeLayout(1.15, 375)).toBe(true);
    expect(shouldUseLargeLayout(1.35, 375)).toBe(true);
    expect(shouldUseLargeLayout(1.35, 768)).toBe(false);
    expect(shouldUseLargeLayout(1.0, 375)).toBe(false);
  });

  it('enables accessibility layouts only for accessibility text on compact viewports', () => {
    expect(shouldUseAccessibilityLayout(1.35, 375)).toBe(true);
    expect(shouldUseAccessibilityLayout(1.8, 430)).toBe(true);
    expect(shouldUseAccessibilityLayout(1.2, 375)).toBe(false);
    expect(shouldUseAccessibilityLayout(1.35, 768)).toBe(false);
  });

  it('returns text caps for content and dense controls', () => {
    expect(getDefaultTextCap('body')).toBe(1.6);
    expect(getDefaultTextCap('h4')).toBe(1.6);
    expect(getDefaultTextCap('caption')).toBe(1.4);
    expect(getDefaultTextCap('label')).toBe(1.4);
    expect(getDenseControlTextCap()).toBe(1.2);
  });

  it('returns compact German progress labels while keeping English labels unchanged', () => {
    expect(getTabLabel('topicsTab', 'de', false)).toBe('Themen');
    expect(getTabLabel('practice', 'de', true)).toBe('Üben');
    expect(getTabLabel('progress', 'de', true)).toBe('Verlauf');
    expect(getTabLabel('progress', 'de', false)).toBe('Fortschritt');
    expect(getTabLabel('progress', 'en', true)).toBe('Progress');
  });
});
