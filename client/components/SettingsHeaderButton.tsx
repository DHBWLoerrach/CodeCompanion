import React from 'react';
import { useRouter } from 'expo-router';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';

interface SettingsHeaderButtonProps {
  iconSize?: number;
}

export function SettingsHeaderButton({ iconSize }: SettingsHeaderButtonProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <HeaderIconButton
      accessibilityLabel={t('settings')}
      icon="settings"
      testID="open-settings-button"
      onPress={() => router.push('/settings')}
      hitSlop={8}
      color={theme.tabIconDefault}
      iconSize={iconSize}
    />
  );
}
