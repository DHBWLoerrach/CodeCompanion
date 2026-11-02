import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { RNHostView } from '@expo/ui';

import { AppIcon } from '@/components/AppIcon';
import { useTheme } from '@/contexts/ThemeContext';

interface SettingsRowAccessoryProps {
  children: React.ReactElement;
}

/**
 * Hosts React Native content in a universal `ListItem` leading/trailing slot.
 *
 * The iOS `ListItem` already wraps slot content in an `RNHostView`, while the
 * Android one passes it straight to Compose, so only Android needs the host
 * here. Wrapping on iOS as well would nest two native hosts.
 */
export function SettingsRowAccessory({ children }: SettingsRowAccessoryProps) {
  if (Platform.OS === 'android') {
    return <RNHostView matchContents>{children}</RNHostView>;
  }
  return children;
}

export function SettingsRowIcon({
  name,
  color,
}: {
  name: string;
  color?: string;
}) {
  const { theme } = useTheme();

  return (
    <SettingsRowAccessory>
      <View style={styles.icon}>
        <AppIcon name={name} size={20} color={color ?? theme.tabIconDefault} />
      </View>
    </SettingsRowAccessory>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
});
