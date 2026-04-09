import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EaseView } from 'react-native-ease';

import { AppIcon } from '@/components/AppIcon';
import { ProgrammingLanguageHeaderBadge } from '@/components/ProgrammingLanguageHeaderBadge';
import { ThemedText } from '@/components/ThemedText';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { useProgrammingLanguage } from '@/contexts/ProgrammingLanguageContext';
import { useTranslation } from '@/hooks/useTranslation';
import { type LanguageFlowReturnTarget } from '@/lib/language-flow';
import { getLanguageDisplayName } from '@/lib/languages';

interface ProgrammingLanguageHeaderTitleProps {
  returnTo: LanguageFlowReturnTarget;
}

export function ProgrammingLanguageHeaderTitle({
  returnTo,
}: ProgrammingLanguageHeaderTitleProps) {
  const { language, t } = useTranslation();
  const { selectedLanguage } = useProgrammingLanguage();
  const router = useRouter();
  const { animate, transition, handlePressIn, handlePressOut } =
    usePressAnimation(0.97);
  const title = selectedLanguage
    ? getLanguageDisplayName(selectedLanguage, language)
    : t('javascript');

  return (
    <EaseView animate={animate} transition={transition}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('selectTechnology')}
        accessibilityHint={t('selectFocusHint').replace('{name}', title)}
        hitSlop={8}
        onPress={() =>
          router.push({
            pathname: '/language-select',
            params: { origin: 'header', returnTo },
          })
        }
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <View style={styles.container}>
          <ProgrammingLanguageHeaderBadge />
          <ThemedText type="body" numberOfLines={1} style={styles.title}>
            {title}
          </ThemedText>
          <AppIcon name="chevron-down" size={14} style={styles.chevron} />
        </View>
      </Pressable>
    </EaseView>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minWidth: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  title: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 2,
  },
});
