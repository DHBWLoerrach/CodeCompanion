import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EaseView } from 'react-native-ease';

import { PrimaryButton } from '@/components/ActionButton';
import { DhbwLogo } from '@/components/DhbwLogo';
import { DhbwWordmark } from '@/components/DhbwWordmark';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BorderRadius, Shadows, Spacing, withOpacity } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { storage } from '@/lib/storage';

function getRandomRotationValue(range: number) {
  return (Math.random() * 2 - 1) * range;
}

function getRandomRotationDuration() {
  return 1400 + Math.floor(Math.random() * 1000);
}

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logoRotateX = useRef(new Animated.Value(0)).current;
  const logoRotateY = useRef(new Animated.Value(0)).current;
  const logoRotateZ = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isActive = true;
    let currentAnimation: Animated.CompositeAnimation | null = null;

    const animateLogo = () => {
      const duration = getRandomRotationDuration();

      currentAnimation = Animated.parallel([
        Animated.timing(logoRotateX, {
          toValue: getRandomRotationValue(1),
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(logoRotateY, {
          toValue: getRandomRotationValue(1),
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(logoRotateZ, {
          toValue: getRandomRotationValue(1),
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]);

      currentAnimation.start(({ finished }) => {
        if (!finished || !isActive) {
          return;
        }

        animateLogo();
      });
    };

    animateLogo();

    return () => {
      isActive = false;
      currentAnimation?.stop();
    };
  }, [logoRotateX, logoRotateY, logoRotateZ]);

  const logoRotateXDeg = logoRotateX.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-14deg', '14deg'],
  });
  const logoRotateYDeg = logoRotateY.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-18deg', '18deg'],
  });
  const logoRotateZDeg = logoRotateZ.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const handleGetStarted = async () => {
    await storage.markWelcomeSeen();
    router.replace('/language-select');
  };

  return (
    <ThemedView style={styles.container}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.ambientOrb,
            styles.ambientOrbTop,
            { backgroundColor: withOpacity(theme.secondary, 0.08) },
          ]}
        />
        <View
          style={[
            styles.ambientOrb,
            styles.ambientOrbBottom,
            { backgroundColor: withOpacity(theme.accent, 0.06) },
          ]}
        />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, Spacing['2xl']),
            paddingBottom: Math.max(insets.bottom, Spacing['2xl']),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'timing',
            duration: 450,
            easing: [0.455, 0.03, 0.515, 0.955],
          }}
          style={styles.heroSection}
        >
          <View style={styles.brandLockup}>
            <View
              style={[
                styles.logoShell,
                {
                  backgroundColor: withOpacity(theme.secondary, 0.08),
                  borderColor: withOpacity(theme.secondary, 0.14),
                },
              ]}
            >
              <Animated.View
                style={{
                  transform: [
                    { perspective: 900 },
                    { rotateX: logoRotateXDeg },
                    { rotateY: logoRotateYDeg },
                    { rotate: logoRotateZDeg },
                  ],
                }}
              >
                <DhbwLogo size={92} />
              </Animated.View>
            </View>
            <DhbwWordmark width={72} />
          </View>

          <View style={styles.textBlock}>
            <ThemedText type="h1" style={styles.title}>
              CodeCompanion
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.subtitle, { color: theme.tabIconDefault }]}
            >
              {t('welcomeTagline')}
            </ThemedText>
          </View>
        </EaseView>

        <EaseView
          initialAnimate={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'timing',
            duration: 450,
            easing: [0.455, 0.03, 0.515, 0.955],
            delay: 120,
          }}
          style={styles.ctaWrap}
        >
          <PrimaryButton
            testID="welcome-get-started-button"
            color={theme.secondary}
            icon="chevron-right"
            label={t('getStarted')}
            onPress={handleGetStarted}
            style={styles.ctaButton}
          />
        </EaseView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    gap: Spacing.xl,
    width: '100%',
  },
  brandLockup: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoShell: {
    width: 116,
    height: 116,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  textBlock: {
    alignItems: 'center',
    gap: Spacing.md,
    maxWidth: 440,
  },
  title: {
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  subtitle: {
    maxWidth: 360,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  ctaWrap: {
    width: '100%',
    maxWidth: 420,
  },
  ctaButton: {
    width: '100%',
  },
  ambientOrb: {
    position: 'absolute',
    borderRadius: BorderRadius.full,
  },
  ambientOrbTop: {
    width: 240,
    height: 240,
    top: 68,
    right: -72,
  },
  ambientOrbBottom: {
    width: 280,
    height: 280,
    left: -110,
    bottom: 96,
  },
});
