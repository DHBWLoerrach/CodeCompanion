import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BorderRadius, withOpacity } from '@/constants/theme';
import { useProgrammingLanguage } from '@/contexts/ProgrammingLanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export function ProgrammingLanguageHeaderBadge() {
  const { theme } = useTheme();
  const { selectedLanguage } = useProgrammingLanguage();
  const badgeColor = selectedLanguage?.color ?? theme.primary;
  const shortName = selectedLanguage?.shortName ?? 'JS';

  return (
    <View style={styles.headerBrand}>
      <View
        style={[
          styles.headerBadge,
          {
            backgroundColor: withOpacity(badgeColor, 0.1),
            borderColor: withOpacity(badgeColor, 0.18),
          },
        ]}
      >
        <ThemedText
          type="label"
          style={[styles.headerBadgeText, { color: badgeColor }]}
        >
          {shortName}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBrand: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  headerBadgeText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
