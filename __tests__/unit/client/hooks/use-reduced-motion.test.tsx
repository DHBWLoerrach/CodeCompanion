import { AccessibilityInfo } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  __resetAccessibilityPreferencesForTests,
  useReducedMotion,
} from '@/hooks/useReducedMotion';

describe('useReducedMotion', () => {
  const reduceMotionSpy = jest.spyOn(
    AccessibilityInfo,
    'isReduceMotionEnabled'
  );

  beforeEach(() => {
    __resetAccessibilityPreferencesForTests();
    reduceMotionSpy.mockResolvedValue(false);
  });

  afterAll(() => {
    reduceMotionSpy.mockRestore();
  });

  it('enables regular motion synchronously while the native preference loads', () => {
    reduceMotionSpy.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it('updates when the native reduced-motion preference is enabled', async () => {
    reduceMotionSpy.mockResolvedValue(true);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
