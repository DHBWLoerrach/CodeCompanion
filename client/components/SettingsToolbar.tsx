import React, { useEffect, useState } from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@react-native-vector-icons/feather';

import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';

const IOS_SETTINGS_SYMBOL = 'gearshape';

// Android toolbar buttons only accept image sources, so the Feather glyph is
// rendered to an image once and shared by every screen that shows the toolbar.
type AndroidIconState = ImageSourcePropType | 'loading' | 'failed';

let androidIconState: AndroidIconState = 'loading';
let androidIconPromise: Promise<AndroidIconState> | null = null;

function loadAndroidSettingsIcon(): Promise<AndroidIconState> {
  androidIconPromise ??= Feather.getImageSource('settings', 24, 'white')
    .then((source): AndroidIconState => source)
    .catch((): AndroidIconState => 'failed')
    .then((state) => {
      androidIconState = state;
      return state;
    });
  return androidIconPromise;
}

export function __resetSettingsToolbarIconForTests() {
  androidIconState = 'loading';
  androidIconPromise = null;
}

function useAndroidSettingsIcon(enabled: boolean): AndroidIconState {
  const [state, setState] = useState<AndroidIconState>(androidIconState);

  useEffect(() => {
    if (!enabled || state !== 'loading') return;
    let active = true;
    loadAndroidSettingsIcon().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [enabled, state]);

  return state;
}

export function SettingsToolbar() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const isAndroid = Platform.OS === 'android';
  const androidIcon = useAndroidSettingsIcon(isAndroid);

  const icon = isAndroid
    ? typeof androidIcon === 'string'
      ? undefined
      : androidIcon
    : IOS_SETTINGS_SYMBOL;

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon={icon}
        accessibilityLabel={t('settings')}
        tintColor={theme.tabIconDefault}
        hidden={isAndroid && androidIcon === 'loading'}
        onPress={() => router.push('/settings')}
      >
        {t('settings')}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}
