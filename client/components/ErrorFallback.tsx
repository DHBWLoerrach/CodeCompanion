import React from 'react';
import { reloadAppAsync } from 'expo';
import { StyleSheet, View, Pressable, Alert } from 'react-native';
import { AppIcon } from '@/components/AppIcon';
import { ThemedText } from '@/components/ThemedText';
import { getDenseControlTextCap } from '@/lib/accessibility';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

const fallbackTheme = Colors.light;

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const { t } = useTranslation();

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error('Failed to restart app:', restartError);
      resetError();
    }
  };

  const formatErrorDetails = (): string => {
    let details = `${t('error')}: ${error.message}\n\n`;
    if (error.stack) {
      details += `${t('stackTrace')}:\n${error.stack}`;
    }
    return details;
  };

  const handleShowDetails = () => {
    Alert.alert(t('errorDetails'), formatErrorDetails(), [
      { text: t('ok'), style: 'default' },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: fallbackTheme.backgroundRoot },
      ]}
    >
      {__DEV__ ? (
        <Pressable
          onPress={handleShowDetails}
          style={({ pressed }) => [
            styles.topButton,
            styles.topButtonInner,
            {
              backgroundColor: fallbackTheme.backgroundDefault,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <AppIcon name="alert-circle" size={20} color={fallbackTheme.text} />
        </Pressable>
      ) : null}

      <View style={styles.content}>
        <ThemedText
          type="h1"
          style={[styles.title, { color: fallbackTheme.text }]}
        >
          {t('errorFallbackTitle')}
        </ThemedText>

        <ThemedText
          type="body"
          style={[styles.message, { color: fallbackTheme.text }]}
        >
          {t('errorMessage')}
        </ThemedText>

        <Pressable
          onPress={handleRestart}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: fallbackTheme.primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <ThemedText
            type="body"
            maxFontSizeMultiplier={getDenseControlTextCap()}
            style={[styles.buttonText, { color: fallbackTheme.buttonText }]}
          >
            {t('backToLearning')}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 600,
  },
  title: {
    lineHeight: 40,
    textAlign: 'center',
  },
  message: {
    lineHeight: 24,
    opacity: 0.7,
    textAlign: 'center',
  },
  topButton: {
    position: 'absolute',
    top: Spacing['2xl'] + Spacing.lg,
    right: Spacing.lg,
    width: 44,
    height: 44,
    zIndex: 10,
  },
  topButtonInner: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing['2xl'],
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
