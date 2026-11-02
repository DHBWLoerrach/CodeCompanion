import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Column,
  FieldGroup,
  Host,
  ListItem,
  RNHostView,
  Text,
  TextInput,
} from '@expo/ui';
import Constants from 'expo-constants';
import { EaseView } from 'react-native-ease';

import { ThemedText } from '@/components/ThemedText';
import { AppIcon } from '@/components/AppIcon';
import { LoadingScreen } from '@/components/LoadingScreen';
import {
  SettingsRowAccessory,
  SettingsRowIcon,
} from '@/components/settings/SettingsRowAccessory';
import { SettingsPickerRow } from '@/components/settings/SettingsPickerRow';
import { useTheme } from '@/contexts/ThemeContext';
import { usePressAnimation } from '@/hooks/usePressAnimation';
import { useTranslation } from '@/hooks/useTranslation';
import { getLanguageDisplayName } from '@/lib/languages';
import { Spacing, AvatarColors, AVATARS } from '@/constants/theme';
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
  const { t } = useTranslation();
  const { animate, transition, handlePressIn, handlePressOut } =
    usePressAnimation(0.96);

  return (
    <EaseView animate={animate} transition={transition}>
      <Pressable
        accessibilityLabel={`${t('avatar')} ${index + 1}`}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
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
  const { t } = useTranslation();

  return (
    <View
      accessibilityLabel={t('avatar')}
      accessibilityRole="radiogroup"
      style={styles.avatarGrid}
    >
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

export default function SettingsScreen() {
  const { theme, isDark, refreshTheme } = useTheme();
  const { t, language, refreshLanguage } = useTranslation();
  const { selectedLanguage } = useProgrammingLanguage();
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

  const themeModes: ThemeMode[] = ['auto', 'light', 'dark'];

  return (
    <>
      <Stack.Screen.Title>{t('settings')}</Stack.Screen.Title>
      <Host style={styles.container} colorScheme={isDark ? 'dark' : 'light'}>
        <FieldGroup>
          <FieldGroup.Section title={t('profile')}>
            <RNHostView matchContents={{ vertical: true }}>
              <View style={styles.avatarRow}>
                <AvatarSelector
                  selectedIndex={profile.avatarIndex}
                  onSelect={(index) =>
                    setProfile({ ...profile, avatarIndex: index })
                  }
                />
              </View>
            </RNHostView>
            <Column spacing={4}>
              <Text textStyle={{ fontSize: 13, color: theme.tabIconDefault }}>
                {t('displayName')}
              </Text>
              <TextInput
                testID="settings-display-name-input"
                defaultValue={profile.displayName}
                placeholder={t('student')}
                placeholderTextColor={theme.tabIconDefault}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onChangeText={(text) =>
                  setProfile((current) =>
                    current ? { ...current, displayName: text } : current
                  )
                }
                style={{ width: '100%', paddingVertical: Spacing.xs }}
              />
            </Column>
          </FieldGroup.Section>

          <FieldGroup.Section title={t('preferences')}>
            <ListItem
              testID="settings-change-technology-button"
              onPress={() =>
                router.push({
                  pathname: '/language-select',
                  params: { origin: 'settings' },
                })
              }
              leading={<SettingsRowIcon name="code" />}
              supportingText={t('changeTechnology')}
              trailing={
                <SettingsRowAccessory>
                  <View style={styles.trailingRow}>
                    {selectedLanguage ? (
                      <Pressable
                        testID="settings-current-focus-info-button"
                        accessibilityRole="button"
                        accessibilityLabel={t('viewCurrentFocusInfo').replace(
                          '{name}',
                          selectedLanguageName
                        )}
                        hitSlop={8}
                        style={styles.accessoryButton}
                        onPress={() =>
                          router.push({
                            pathname: './language-overview',
                            params: {
                              languageId: selectedLanguage.id,
                              mode: 'view',
                              origin: 'settings',
                            },
                          })
                        }
                      >
                        <AppIcon
                          name="info"
                          size={20}
                          color={theme.tabIconDefault}
                        />
                      </Pressable>
                    ) : null}
                    <AppIcon
                      name="chevron-right"
                      size={18}
                      color={theme.tabIconDefault}
                    />
                  </View>
                </SettingsRowAccessory>
              }
            >
              {selectedLanguageName}
            </ListItem>
            <SettingsPickerRow<'en' | 'de'>
              icon="globe"
              sfSymbol="globe"
              label={t('appLanguage')}
              options={[
                { label: 'English', value: 'en' },
                { label: 'Deutsch', value: 'de' },
              ]}
              selectedValue={settings.language}
              onValueChange={applyLanguage}
              testID="settings-app-language-picker"
            />
            <SettingsPickerRow<ThemeMode>
              icon="moon"
              sfSymbol="circle.lefthalf.filled"
              label={t('theme')}
              options={themeModes.map((mode) => ({
                label: getThemeModeLabel(mode),
                value: mode,
              }))}
              selectedValue={settings.themeMode}
              onValueChange={applyThemeMode}
              testID="settings-theme-picker"
            />
          </FieldGroup.Section>

          <FieldGroup.Section title={t('about')}>
            <ListItem
              onPress={() =>
                router.push({
                  pathname: '/info-modal',
                  params: { type: 'about' },
                })
              }
              leading={<SettingsRowIcon name="info" />}
              trailing={<SettingsRowChevron />}
            >
              {t('aboutThisApp')}
            </ListItem>
            <ListItem
              onPress={() =>
                router.push({
                  pathname: '/info-modal',
                  params: { type: 'imprint' },
                })
              }
              leading={<SettingsRowIcon name="file-text" />}
              trailing={<SettingsRowChevron />}
            >
              {t('imprint')}
            </ListItem>
            <ListItem
              leading={<SettingsRowIcon name="tag" />}
              trailing={
                <SettingsRowAccessory>
                  <ThemedText
                    type="body"
                    style={{ color: theme.tabIconDefault }}
                  >
                    {Constants.expoConfig?.version ?? '1.0.0'}
                  </ThemedText>
                </SettingsRowAccessory>
              }
            >
              {t('version')}
            </ListItem>
          </FieldGroup.Section>

          <FieldGroup.Section>
            <ListItem
              testID="settings-reset-progress-button"
              onPress={handleResetProgress}
              leading={<SettingsRowIcon name="trash-2" color={theme.error} />}
            >
              <Text textStyle={{ color: theme.error }}>
                {t('resetAllProgress')}
              </Text>
            </ListItem>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </>
  );
}

function SettingsRowChevron() {
  const { theme } = useTheme();

  return (
    <SettingsRowAccessory>
      <AppIcon name="chevron-right" size={18} color={theme.tabIconDefault} />
    </SettingsRowAccessory>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarRow: {
    paddingVertical: Spacing.sm,
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
  trailingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  accessoryButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
});
