import React from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import { BottomActionBar } from '@/components/BottomActionBar';
import { __resetAccessibilityPreferencesForTests } from '@/hooks/useReducedMotion';

jest.mock('expo-blur', () => ({
  BlurView: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactModule = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View: MockView } = require('react-native');
    const { children, ...rest } = props;

    return ReactModule.createElement(
      MockView,
      { ...rest, accessibilityLabel: 'blur-material' },
      children
    );
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    theme: {
      backgroundRoot: '#FFFFFF',
      separator: 'rgba(0, 0, 0, 0.08)',
      tabIconDefault: '#687076',
    },
  }),
}));

describe('BottomActionBar material', () => {
  const reduceTransparencySpy = jest.spyOn(
    AccessibilityInfo,
    'isReduceTransparencyEnabled'
  );
  const highContrastSpy = jest.spyOn(
    AccessibilityInfo,
    'isHighTextContrastEnabled'
  );
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    __resetAccessibilityPreferencesForTests();
    reduceTransparencySpy.mockResolvedValue(false);
    highContrastSpy.mockResolvedValue(false);
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });
  });

  afterAll(() => {
    reduceTransparencySpy.mockRestore();
    highContrastSpy.mockRestore();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    });
  });

  it('uses blur without a hard separator in the standard iOS path', async () => {
    const screen = render(
      <BottomActionBar>
        <Text>Action</Text>
      </BottomActionBar>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('blur-material')).toBeTruthy();
    });
    const style = StyleSheet.flatten(
      screen.getByTestId('bottom-action-bar').props.style
    );
    expect(style.borderTopWidth).toBe(0);
  });

  it('keeps a subtle separator for the translucent Android fallback', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    const screen = render(
      <BottomActionBar>
        <Text>Action</Text>
      </BottomActionBar>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('blur-material')).toBeTruthy();
    });
    const style = StyleSheet.flatten(
      screen.getByTestId('bottom-action-bar').props.style
    );
    expect(style.borderTopWidth).toBe(StyleSheet.hairlineWidth);
    expect(style.borderTopColor).toBe('rgba(0, 0, 0, 0.08)');
  });

  it('uses a solid surface when reduced transparency is enabled', async () => {
    reduceTransparencySpy.mockResolvedValue(true);

    const screen = render(
      <BottomActionBar>
        <Text>Action</Text>
      </BottomActionBar>
    );

    await waitFor(() => {
      expect(screen.queryByLabelText('blur-material')).toBeNull();
    });
    const style = StyleSheet.flatten(
      screen.getByTestId('bottom-action-bar').props.style
    );
    expect(style.backgroundColor).toBe('#FFFFFF');
  });

  it('uses a solid surface and strong separator for high contrast', async () => {
    highContrastSpy.mockResolvedValue(true);

    const screen = render(
      <BottomActionBar>
        <Text>Action</Text>
      </BottomActionBar>
    );

    await waitFor(() => {
      expect(screen.queryByLabelText('blur-material')).toBeNull();
    });
    const style = StyleSheet.flatten(
      screen.getByTestId('bottom-action-bar').props.style
    );
    expect(style.borderTopWidth).toBe(StyleSheet.hairlineWidth);
    expect(style.borderTopColor).toBe('#687076');
  });
});
