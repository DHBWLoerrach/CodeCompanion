import React, { useCallback } from 'react';
import { Stack, useFocusEffect } from 'expo-router';

import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';

export default function PracticeStack() {
  const { theme } = useTheme();
  const { refreshLanguage } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      refreshLanguage();
    }, [refreshLanguage])
  );

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTitleStyle: { color: theme.text },
        headerStyle: { backgroundColor: theme.backgroundRoot },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
