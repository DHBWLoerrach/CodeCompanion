import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { PrimaryButton } from '@/components/ActionButton';
import { StatusBadge } from '@/components/StatusBadge';
import { ThemedText } from '@/components/ThemedText';
import { getButtonHeight } from '@/constants/theme';

jest.mock('@/components/AppIcon', () => ({
  AppIcon: () => null,
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      primary: '#E2001A',
      secondary: '#4A90E2',
      success: '#34C759',
      accent: '#FFB800',
      error: '#E2001A',
      text: '#111111',
      tabIconDefault: '#666666',
      backgroundDefault: '#FFFFFF',
      backgroundRoot: '#FFFFFF',
      backgroundSecondary: '#F0F0F0',
      backgroundTertiary: '#EBEBEB',
      cardBorder: '#DDDDDD',
      cardBorderSubtle: '#DDDDDD',
      codeBackground: '#F7F7F7',
      disabled: '#CCCCCC',
      buttonText: '#FFFFFF',
      onColor: '#FFFFFF',
      link: '#4A90E2',
      separator: 'rgba(0, 0, 0, 0.08)',
    },
    isDark: false,
  }),
}));

describe('accessibility-aware controls', () => {
  it('applies the default cap to themed body text', () => {
    const screen = render(<ThemedText type="body">Body text</ThemedText>);

    expect(screen.getByText('Body text').props.maxFontSizeMultiplier).toBe(1.6);
  });

  it('caps status badge labels as dense controls', () => {
    const screen = render(<StatusBadge color="#000000" label="Dense badge" />);

    expect(screen.getByText('Dense badge').props.maxFontSizeMultiplier).toBe(
      1.2
    );
  });

  it('uses minHeight for buttons and caps the button label', () => {
    const screen = render(
      <PrimaryButton
        testID="primary-button"
        label="Continue"
        onPress={() => {}}
      />
    );

    const button = screen.getByTestId('primary-button');
    const style = StyleSheet.flatten(button.props.style);

    expect(style.minHeight).toBe(getButtonHeight());
    expect(style.height).toBeUndefined();
    expect(screen.getByText('Continue').props.maxFontSizeMultiplier).toBe(1.2);
  });
});
