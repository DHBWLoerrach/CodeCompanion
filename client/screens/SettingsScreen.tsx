import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import Constants from "expo-constants";

import { SecondaryButton } from "@/components/ActionButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { AppIcon } from "@/components/AppIcon";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SurfaceCard } from "@/components/SurfaceCard";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { getLanguageDisplayName } from "@/lib/languages";
import {
  Spacing,
  BorderRadius,
  Shadows,
  AvatarColors,
  AVATARS,
} from "@/constants/theme";
import {
  storage,
  type UserProfile,
  type SettingsData,
  type ThemeMode,
} from "@/lib/storage";
import { useProgrammingLanguage } from "@/contexts/ProgrammingLanguageContext";

interface AvatarSelectorProps {
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function AvatarSelector({ selectedIndex, onSelect }: AvatarSelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.avatarGrid}>
      {AVATARS.map((icon, index) => (
        <Pressable
          key={index}
          style={[
            styles.avatarOption,
            {
              backgroundColor: AvatarColors[index],
              borderWidth: selectedIndex === index ? 3 : 0,
              borderColor: theme.text,
            },
          ]}
          onPress={() => onSelect(index)}
        >
          <AppIcon name={icon} size={28} color={theme.onColor} />
        </Pressable>
      ))}
    </View>
  );
}

interface SettingRowProps {
  icon: string;
  label: string;
  children?: React.ReactNode;
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
  const settingsScreenOptions = {
    title: t("settings"),
    headerTransparent: process.env.EXPO_OS === "ios",
  } as const;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const settingsRef = useRef<SettingsData | null>(null);
  const settingsUpdateInFlightRef = useRef(false);
  const skipNextProfilePersistRef = useRef(true);

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
      console.error("Error loading settings:", error);
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
        console.error("Error saving profile:", error);
        Alert.alert(t("error"), t("failedToSaveSettings"));
        await loadData();
      }
    },
    [loadData, t],
  );

  useEffect(() => {
    if (!profile) return;

    if (skipNextProfilePersistRef.current) {
      skipNextProfilePersistRef.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      void persistProfile(profile);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [persistProfile, profile]);

  const handleResetProgress = () => {
    Alert.alert(t("resetProgress"), t("resetProgressMessage"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("reset"),
        style: "destructive",
        onPress: async () => {
          await storage.clearAllData();
          router.back();
        },
      },
    ]);
  };

  const getThemeModeLabel = (mode: ThemeMode) => {
    switch (mode) {
      case "auto":
        return t("themeAuto");
      case "light":
        return t("themeLight");
      case "dark":
        return t("themeDark");
      default:
        return mode;
    }
  };

  const applyLanguage = async (newLanguage: "en" | "de") => {
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
      console.error("Error updating language:", error);
      Alert.alert(t("error"), t("failedToSaveSettings"));
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
      console.error("Error updating theme:", error);
      Alert.alert(t("error"), t("failedToSaveSettings"));
      await loadData();
    } finally {
      settingsUpdateInFlightRef.current = false;
    }
  };

  if (loading || !profile || !settings) {
    return (
      <>
        <Stack.Screen options={settingsScreenOptions} />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={settingsScreenOptions} />
      <ThemedView style={styles.container}>
        <KeyboardAwareScrollViewCompat
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Spacing.xl,
              paddingBottom: Spacing["3xl"] + insets.bottom,
            },
          ]}
        >
          <View style={styles.section}>
            <ThemedText
              type="label"
              style={[styles.sectionTitle, { color: theme.tabIconDefault }]}
            >
              {t("profile")}
            </ThemedText>
            <SurfaceCard style={styles.card}>
              <ThemedText type="label" style={styles.fieldLabel}>
                {t("avatar")}
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
                {t("displayName")}
              </ThemedText>
              <TextInput
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
                placeholder={t("student")}
                placeholderTextColor={theme.tabIconDefault}
              />
            </SurfaceCard>
          </View>

          <View style={styles.section}>
            <ThemedText
              type="label"
              style={[styles.sectionTitle, { color: theme.tabIconDefault }]}
            >
              {t("preferences")}
            </ThemedText>
            <View style={styles.settingsGroup}>
              {(() => {
                const languageIndex = settings.language === "en" ? 0 : 1;
                const themeModes: ThemeMode[] = ["auto", "light", "dark"];
                const themeIndex = Math.max(
                  0,
                  themeModes.indexOf(settings.themeMode),
                );

                return (
                  <>
                    <Pressable
                      style={[
                        styles.aboutActionButton,
                        {
                          backgroundColor: theme.backgroundDefault,
                          borderBottomColor: theme.separator,
                        },
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "../language-select",
                          params: { allowBack: "1" },
                        })
                      }
                    >
                      <View style={styles.settingLeft}>
                        <AppIcon
                          name="code"
                          size={20}
                          color={theme.tabIconDefault}
                        />
                        <ThemedText type="body">
                          {t("changeTechnology")}
                        </ThemedText>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: Spacing.sm,
                        }}
                      >
                        <ThemedText
                          type="body"
                          style={{ color: theme.tabIconDefault }}
                        >
                          {selectedLanguage
                            ? getLanguageDisplayName(selectedLanguage, language)
                            : t("javascript")}
                        </ThemedText>
                        <AppIcon
                          name="chevron-right"
                          size={20}
                          color={theme.tabIconDefault}
                        />
                      </View>
                    </Pressable>
                    <SettingRow icon="globe" label={t("appLanguage")}>
                      <SegmentedControl
                        values={["English", "Deutsch"]}
                        selectedIndex={languageIndex}
                        onChange={({ nativeEvent }) => {
                          if (settingsUpdateInFlightRef.current) return;
                          const nextLanguage =
                            nativeEvent.selectedSegmentIndex === 0
                              ? "en"
                              : "de";
                          applyLanguage(nextLanguage);
                        }}
                        style={styles.segmentedControl}
                      />
                    </SettingRow>
                    <SettingRow icon="moon" label={t("theme")}>
                      <SegmentedControl
                        values={[
                          getThemeModeLabel("auto"),
                          getThemeModeLabel("light"),
                          getThemeModeLabel("dark"),
                        ]}
                        selectedIndex={themeIndex}
                        onChange={({ nativeEvent }) => {
                          if (settingsUpdateInFlightRef.current) return;
                          const nextMode =
                            themeModes[nativeEvent.selectedSegmentIndex] ??
                            "auto";
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
              {t("about")}
            </ThemedText>
            <View style={styles.settingsGroup}>
              <Pressable
                style={[
                  styles.aboutActionButton,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderBottomColor: theme.separator,
                  },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/info-modal",
                    params: { type: "about" },
                  })
                }
              >
                <View style={styles.settingLeft}>
                  <AppIcon name="info" size={20} color={theme.tabIconDefault} />
                  <ThemedText type="body">{t("aboutThisApp")}</ThemedText>
                </View>
                <AppIcon
                  name="chevron-right"
                  size={20}
                  color={theme.tabIconDefault}
                />
              </Pressable>
              <Pressable
                style={[
                  styles.aboutActionButton,
                  styles.aboutActionButtonLast,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/info-modal",
                    params: { type: "imprint" },
                  })
                }
              >
                <View style={styles.settingLeft}>
                  <AppIcon
                    name="file-text"
                    size={20}
                    color={theme.tabIconDefault}
                  />
                  <ThemedText type="body">{t("imprint")}</ThemedText>
                </View>
                <AppIcon
                  name="chevron-right"
                  size={20}
                  color={theme.tabIconDefault}
                />
              </Pressable>
              <View
                style={[
                  styles.settingRow,
                  { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <View style={styles.settingLeft}>
                  <AppIcon name="tag" size={20} color={theme.tabIconDefault} />
                  <ThemedText type="body">{t("version")}</ThemedText>
                </View>
                <ThemedText type="body" style={{ color: theme.tabIconDefault }}>
                  {Constants.expoConfig?.version ?? "1.0.0"}
                </ThemedText>
              </View>
            </View>
          </View>

          <SecondaryButton
            testID="settings-reset-progress-button"
            color={theme.error}
            icon="trash-2"
            label={t("resetAllProgress")}
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
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    marginBottom: Spacing.sm,
  },
  avatarGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "center",
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    height: 48,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  settingsGroup: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    ...Shadows.card,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aboutActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aboutActionButtonLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  segmentedControl: {
    minWidth: 160,
    maxWidth: 200,
    alignSelf: "flex-end",
    flexShrink: 1,
  },
  segmentedControlWide: {
    minWidth: 200,
    maxWidth: 240,
    alignSelf: "flex-end",
    flexShrink: 1,
  },
  dangerButton: {
    marginTop: Spacing.sm,
  },
});
