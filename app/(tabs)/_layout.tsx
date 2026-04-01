import React, { useCallback } from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/contexts/ThemeContext';
import { useAccessibilityLayout } from '@/hooks/useAccessibilityLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { getTabLabel } from '@/lib/accessibility';

export default function TabsLayout() {
  const { theme, isDark } = useTheme();
  const { language, refreshLanguage } = useTranslation();
  const { usesAccessibilityLayout } = useAccessibilityLayout();
  const activeIndicatorColor = isDark
    ? `${theme.primary}4D`
    : `${theme.primary}1A`;
  const compactTabLabels = usesAccessibilityLayout;
  const tabLabelStyle = compactTabLabels ? { fontSize: 10 } : {};

  useFocusEffect(
    useCallback(() => {
      refreshLanguage();
    }, [refreshLanguage])
  );

  return (
    <NativeTabs
      tintColor={theme.primary}
      backgroundColor={theme.backgroundRoot}
      indicatorColor={activeIndicatorColor}
      iconColor={{ default: theme.tabIconDefault, selected: theme.primary }}
      labelStyle={{
        default: { color: theme.tabIconDefault, ...tabLabelStyle },
        selected: { color: theme.primary, ...tabLabelStyle },
      }}
    >
      <NativeTabs.Trigger name="learn">
        <NativeTabs.Trigger.Label>
          {getTabLabel('topicsTab', language, compactTabLabels)}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="book"
          src={
            <NativeTabs.Trigger.VectorIcon family={Feather} name="book-open" />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="practice">
        <NativeTabs.Trigger.Label>
          {getTabLabel('practice', language, compactTabLabels)}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="questionmark.circle"
          src={
            <NativeTabs.Trigger.VectorIcon
              family={Feather}
              name="help-circle"
            />
          }
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>
          {getTabLabel('progress', language, compactTabLabels)}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="chart.bar"
          src={
            <NativeTabs.Trigger.VectorIcon
              family={Feather}
              name="bar-chart-2"
            />
          }
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
