import { AccessibilityInfo } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

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

  it('enables regular motion synchronously while the native preference loads', async () => {
    reduceMotionSpy.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it('updates when the native reduced-motion preference is enabled', async () => {
    // `await renderHook` flushes resolved promises, so keep the load pending to
    // observe the initial value.
    let resolvePreference: (value: boolean) => void = () => {};
    reduceMotionSpy.mockReturnValue(
      new Promise((resolve) => {
        resolvePreference = resolve;
      })
    );

    const { result } = await renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);

    await act(async () => {
      resolvePreference(true);
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
