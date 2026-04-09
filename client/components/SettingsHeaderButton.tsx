import React from 'react';
import { useRouter } from 'expo-router';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { useTheme } from '@/contexts/ThemeContext';

interface SettingsHeaderButtonProps {
  iconSize?: number;
}

export function SettingsHeaderButton({ iconSize }: SettingsHeaderButtonProps) {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <HeaderIconButton
      icon="settings"
      testID="open-settings-button"
      onPress={() => router.push('/settings')}
      hitSlop={8}
      color={theme.tabIconDefault}
      iconSize={iconSize}
    />
  );
}
