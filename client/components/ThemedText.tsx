import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { Typography } from '@/constants/theme';
import { getDefaultTextCap, type ThemedTextType } from '@/lib/accessibility';

type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemedTextType;
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'body',
  maxFontSizeMultiplier,
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();
  const resolvedMaxFontSizeMultiplier =
    maxFontSizeMultiplier ?? getDefaultTextCap(type);

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === 'link') {
      return theme.link;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case 'h1':
        return Typography.h1;
      case 'h2':
        return Typography.h2;
      case 'h3':
        return Typography.h3;
      case 'h4':
        return Typography.h4;
      case 'body':
        return Typography.body;
      case 'small':
        return Typography.small;
      case 'caption':
        return Typography.caption;
      case 'link':
        return Typography.link;
      case 'code':
        return Typography.code;
      case 'label':
        return Typography.label;
      default:
        return Typography.body;
    }
  };

  return (
    <Text
      maxFontSizeMultiplier={resolvedMaxFontSizeMultiplier}
      style={[{ color: getColor() }, getTypeStyle(), style]}
      {...rest}
    />
  );
}
