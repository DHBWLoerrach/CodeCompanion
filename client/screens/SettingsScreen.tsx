import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import Constants from 'expo-constants';
import { EaseView } from 'react-native-ease';

import { SecondaryButton } from '@/components/ActionButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppIcon } from '@/components/AppIcon';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTheme } from '@/contexts/ThemeContext';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { useTranslation } from '@/hooks/useTranslation';
import { getDefaultTextCap } from '@/lib/accessibility';
import { getLanguageDisplayName } from '@/lib/languages';
import {
  Spacing,
  BorderRadius,
  Shadows,
  AvatarColors,
  AVATARS,
} from '@/constants/theme';
import {
  storage,
  type UserProfile,
  type SettingsData,
  type ThemeMode,
} from '@/lib/storage';
import { useProgrammingLanguage } from '@/contexts/ProgrammingLanguageContext';

interface AvatarSelectorProps {
  selectedIndex: number;
  onSelect: (index: number) => void;
}

interface AvatarOptionProps {
  icon: string;
  index: number;
  selected: boolean;
  onSelect: (index: number) => void;
}

function AvatarOption({ icon, index, selected, onSelect }: AvatarOptionProps) {
  const { theme } = useTheme();
  const { animate, transition, handlePressIn, handlePressOut } =
    usePressAnimation(0.96);

  return (
    <EaseView animate={animate} transition={transition}>
      <Pressable
        style={[
          styles.avatarOption,
          {
            backgroundColor: AvatarColors[index],
            borderWidth: selected ? 3 : 0,
            borderColor: theme.text,
          },
        ]}
        onPress={() => onSelect(index)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <AppIcon name={icon} size={28} color={theme.onColor} />
      </Pressable>
    </EaseView>
  );
}

function AvatarSelector({ selectedIndex, onSelect }: AvatarSelectorProps) {
  return (
    <View style={styles.avatarGrid}>
      {AVATARS.map((icon, index) => (
        <AvatarOption
          key={index}
          icon={icon}
          index={index}
          selected={selectedIndex === index}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

interface SettingRowProps {
  icon: string;
  label: string;
  children?: React.ReactNode;
}

interface SettingsActionRowProps {
  accessoryAction?: {
    accessibilityLabel?: string;
    icon: string;
    onPress: () => void;
    testID?: string;
    variant?: 'default' | 'subtle';
  };
  icon: string;
  label: string;
  onPress: () => void;
  rightContent?: React.ReactNode;
  showChevron?: boolean;
  isLast?: boolean;
  testID?: string;
}

function SettingsActionRow({
  accessoryAction,
  icon,
  label,
  onPress,
  rightContent,
  showChevron = false,
  isLast = false,
  testID,
}: SettingsActionRowProps) {
  const { theme } = useTheme();
  const { animate, transition, handlePressIn, handlePressOut } =
    usePressAnimation(0.985);
  const accessoryVariant = accessoryAction?.variant ?? 'default';
  const accessoryIconColor =
    accessoryVariant === 'subtle' ? theme.tabIconDefault : theme.secondary;

  return (
    <EaseView animate={animate} transition={transition}>
      <Pressable
        testID={testID}
        style={[
          styles.aboutActionButton,
          isLast ? styles.aboutActionButtonLast : null,
          {
            backgroundColor: theme.backgroundDefault,
            borderBottomColor: theme.separator,
          },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.settingLeft}>
          <AppIcon name={icon} size={20} color={theme.tabIconDefault} />
          <ThemedText type="body">{label}</ThemedText>
        </View>
        <View style={styles.settingsActionRight}>
          {rightContent}
          {accessoryAction ? (
            <Pressable
              testID={accessoryAction.testID}
              accessibilityRole="button"
              accessibilityLabel={accessoryAction.accessibilityLabel}
              hitSlop={8}
              onPress={(event) => {
                event?.stopPropagation?.();
                accessoryAction.onPress();
              }}
              style={[
                styles.settingsAccessoryButton,
                accessoryVariant === 'subtle'
                  ? null
                  : { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <AppIcon
                name={accessoryAction.icon}
                size={18}
                color={accessoryIconColor}
              />
            </Pressable>
          ) : null}
          {showChevron ? (
            <AppIcon
              name="chevron-right"
              size={20}
              color={theme.tabIconDefault}
            />
          ) : null}
        </View>
      </Pressable>
    </EaseView>
  );
}

function SettingRow({ icon, label, children }: SettingRowProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.settingRow,
        {
          backgroundColor: theme.backgroundDefault,
          borderBottomColor: theme.separator,
        },
      ]}
    >
      <View style={styles.settingLeft}>
        <AppIcon name={icon} size={20} color={theme.tabIconDefault} />
        <ThemedText type="body">{label}</ThemedText>
      </View>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { theme, refreshTheme } = useTheme();
  const { t, language, refreshLanguage } = useTranslation();
  const { selectedLanguage } = useProgrammingLanguage();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const settingsRef = useRef<SettingsData | null>(null);
  const settingsUpdateInFlightRef = useRef(false);
  const skipNextProfilePersistRef = useRef(true);
  const pendingProfilePersistRef = useRef<UserProfile | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [profileData, settingsData] = await Promise.all([
        storage.getProfile(),
        storage.getSettings(),
      ]);
      skipNextProfilePersistRef.current = true;
      setProfile(profileData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const persistProfile = useCallback(
    async (nextProfile: UserProfile) => {
      try {
        await storage.setProfile(nextProfile);
      } catch (error) {
        console.error('Error saving profile:', error);
        Alert.alert(t('error'), t('failedToSaveSettings'));
        await loadData();
      }
    },
    [loadData, t]
  );

  useEffect(() => {
    if (!profile) return;

    if (skipNextProfilePersistRef.current) {
      skipNextProfilePersistRef.current = false;
      return;
    }

    pendingProfilePersistRef.current = profile;

    const timeoutId = setTimeout(() => {
      pendingProfilePersistRef.current = null;
      void persistProfile(profile);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [persistProfile, profile]);

  useEffect(() => {
    return () => {
      const pendingProfile = pendingProfilePersistRef.current;

      if (!pendingProfile) {
        return;
      }

      pendingProfilePersistRef.current = null;
      void persistProfile(pendingProfile);
    };
  }, [persistProfile]);

  const handleResetProgress = () => {
    Alert.alert(t('resetProgress'), t('resetProgressMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('reset'),
        style: 'destructive',
        onPress: async () => {
          await storage.clearAllData();
          router.back();
        },
      },
    ]);
  };

  const getThemeModeLabel = (mode: ThemeMode) => {
    switch (mode) {
      case 'auto':
        return t('themeAuto');
      case 'light':
        return t('themeLight');
      case 'dark':
        return t('themeDark');
      default:
        return mode;
    }
  };

  const applyLanguage = async (newLanguage: 'en' | 'de') => {
    const currentSettings = settingsRef.current;
    if (!currentSettings || settingsUpdateInFlightRef.current) return;

    const newSettings: SettingsData = {
      ...currentSettings,
      language: newLanguage,
    };
    settingsUpdateInFlightRef.current = true;
    settingsRef.current = newSettings;
    setSettings(newSettings);

    try {
      await storage.setSettings(newSettings);
      await refreshLanguage();
    } catch (error) {
      console.error('Error updating language:', error);
      Alert.alert(t('error'), t('failedToSaveSettings'));
      await loadData();
    } finally {
      settingsUpdateInFlightRef.current = false;
    }
  };

  const applyThemeMode = async (mode: ThemeMode) => {
    const currentSettings = settingsRef.current;
    if (!currentSettings || settingsUpdateInFlightRef.current) return;

    const newSettings: SettingsData = {
      ...currentSettings,
      themeMode: mode,
    };
    settingsUpdateInFlightRef.current = true;
    settingsRef.current = newSettings;
    setSettings(newSettings);

    try {
      await storage.setSettings(newSettings);
      await refreshTheme();
    } catch (error) {
      console.error('Error updating theme:', error);
      Alert.alert(t('error'), t('failedToSaveSettings'));
      await loadData();
    } finally {
      settingsUpdateInFlightRef.current = false;
    }
  };

  const selectedLanguageName = selectedLanguage
    ? getLanguageDisplayName(selectedLanguage, language)
    : t('javascript');

  if (loading || !profile || !settings) {
    return (
      <>
        <Stack.Screen.Title>{t('settings')}</Stack.Screen.Title>
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <Stack.Screen.Title>{t('settings')}</Stack.Screen.Title>
      <ThemedView style={styles.container}>
        <KeyboardAwareScrollViewCompat
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Spacing.xl,
              paddingBottom: Spacing['3xl'] + insets.bottom,
            },
          ]}
        >
          <View style={styles.section}>
            <ThemedText
              type="label"
              style={[styles.sectionTitle, { color: theme.tabIconDefault }]}
            >
              {t('profile')}
            </ThemedText>
            <SurfaceCard style={styles.card}>
              <ThemedText type="label" style={styles.fieldLabel}>
                {t('avatar')}
              </ThemedText>
              <AvatarSelector
                selectedIndex={profile.avatarIndex}
                onSelect={(index) =>
                  setProfile({ ...profile, avatarIndex: index })
                }
              />

              <ThemedText
                type="label"
                style={[styles.fieldLabel, { marginTop: Spacing.lg }]}
              >
                {t('displayName')}
              </ThemedText>
              <TextInput
                allowFontScaling
                maxFontSizeMultiplier={getDefaultTextCap('body')}
                testID="settings-display-name-input"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.cardBorder,
                  },
                ]}
                value={profile.displayName}
                onChangeText={(text) =>
                  setProfile({ ...profile, displayName: text })
                }
                placeholder={t('student')}
                placeholderTextColor={theme.tabIconDefault}
              />
            </SurfaceCard>
          </View>

          <View style={styles.section}>
            <ThemedText
              type="label"
              style={[styles.sectionTitle, { color: theme.tabIconDefault }]}
            >
              {t('preferences')}
            </ThemedText>
            <View style={styles.settingsGroup}>
              {(() => {
                const languageIndex = settings.language === 'en' ? 0 : 1;
                const themeModes: ThemeMode[] = ['auto', 'light', 'dark'];
                const themeIndex = Math.max(
                  0,
                  themeModes.indexOf(settings.themeMode)
                );

                return (
                  <>
                    <SettingsActionRow
                      accessoryAction={
                        selectedLanguage
                          ? {
                              accessibilityLabel: t(
                                'viewCurrentFocusInfo'
                              ).replace('{name}', selectedLanguageName),
                              icon: 'info',
                              onPress: () =>
                                router.push({
                                  pathname: './language-overview',
                                  params: {
                                    languageId: selectedLanguage.id,
                                    mode: 'view',
                                    origin: 'settings',
                                  },
                                }),
                              testID: 'settings-current-focus-info-button',
                              variant: 'subtle',
                            }
                          : undefined
                      }
                      icon="code"
                      label={t('changeTechnology')}
                      showChevron
                      testID="settings-change-technology-button"
                      onPress={() =>
                        router.push({
                          pathname: '/language-select',
                          params: { origin: 'settings' },
                        })
                      }
                      rightContent={
                        <View style={styles.languageValueGroup}>
                          <ThemedText
                            type="body"
                            style={[
                              styles.languageValueText,
                              { color: theme.text },
                            ]}
                          >
                            {selectedLanguageName}
                          </ThemedText>
                        </View>
                      }
                    />
                    <SettingRow icon="globe" label={t('appLanguage')}>
                      <SegmentedControl
                        values={['English', 'Deutsch']}
                        selectedIndex={languageIndex}
                        onChange={({ nativeEvent }) => {
                          if (settingsUpdateInFlightRef.current) return;
                          const nextLanguage =
                            nativeEvent.selectedSegmentIndex === 0
                              ? 'en'
                              : 'de';
                          applyLanguage(nextLanguage);
                        }}
                        style={styles.segmentedControl}
                      />
                    </SettingRow>
                    <SettingRow icon="moon" label={t('theme')}>
                      <SegmentedControl
                        values={[
                          getThemeModeLabel('auto'),
                          getThemeModeLabel('light'),
                          getThemeModeLabel('dark'),
                        ]}
                        selectedIndex={themeIndex}
                        onChange={({ nativeEvent }) => {
                          if (settingsUpdateInFlightRef.current) return;
                          const nextMode =
                            themeModes[nativeEvent.selectedSegmentIndex] ??
                            'auto';
                          applyThemeMode(nextMode);
                        }}
                        style={styles.segmentedControlWide}
                      />
                    </SettingRow>
                  </>
                );
              })()}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText
              type="label"
              style={[styles.sectionTitle, { color: theme.tabIconDefault }]}
            >
              {t('about')}
            </ThemedText>
            <View style={styles.settingsGroup}>
              <SettingsActionRow
                icon="info"
                label={t('aboutThisApp')}
                showChevron
                onPress={() =>
                  router.push({
                    pathname: '/info-modal',
                    params: { type: 'about' },
                  })
                }
              />
              <SettingsActionRow
                icon="file-text"
                label={t('imprint')}
                showChevron
                onPress={() =>
                  router.push({
                    pathname: '/info-modal',
                    params: { type: 'imprint' },
                  })
                }
                isLast
              />
              <View
                style={[
                  styles.settingRow,
                  { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <View style={styles.settingLeft}>
                  <AppIcon name="tag" size={20} color={theme.tabIconDefault} />
                  <ThemedText type="body">{t('version')}</ThemedText>
                </View>
                <ThemedText type="body" style={{ color: theme.tabIconDefault }}>
                  {Constants.expoConfig?.version ?? '1.0.0'}
                </ThemedText>
              </View>
            </View>
          </View>

          <SecondaryButton
            testID="settings-reset-progress-button"
            color={theme.error}
            icon="trash-2"
            label={t('resetAllProgress')}
            onPress={handleResetProgress}
            style={styles.dangerButton}
          />
        </KeyboardAwareScrollViewCompat>
      </ThemedView>
    </>
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
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    marginBottom: Spacing.sm,
  },
  avatarGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  settingsGroup: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aboutActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aboutActionButtonLast: {
    borderBottomWidth: 0,
  },
  settingsAccessoryButton: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: BorderRadius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  settingsActionRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  languageValueGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  languageValueText: {
    flexShrink: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  segmentedControl: {
    minWidth: 160,
    maxWidth: 200,
    alignSelf: 'flex-end',
    flexShrink: 1,
  },
  segmentedControlWide: {
    minWidth: 200,
    maxWidth: 240,
    alignSelf: 'flex-end',
    flexShrink: 1,
  },
  dangerButton: {
    marginTop: Spacing.sm,
  },
});
