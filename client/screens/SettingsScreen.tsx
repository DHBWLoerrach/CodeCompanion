import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import Constants from "expo-constants";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { AppIcon } from "@/components/AppIcon";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, Shadows, AvatarColors } from "@/constants/theme";
import {
  storage,
  type UserProfile,
  type SettingsData,
  type ThemeMode,
} from "@/lib/storage";

const AVATARS = ["monitor", "award", "code", "zap"] as const;

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
          <AppIcon name={icon} size={28} color="#FFFFFF" />
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
    <View style={[styles.settingRow, { backgroundColor: theme.backgroundDefault }]}>
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
  const { t, refreshLanguage } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const settingsScreenOptions = {
    title: t("settings"),
    headerTransparent: process.env.EXPO_OS === "ios",
  } as const;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aboutAppModalVisible, setAboutAppModalVisible] = useState(false);
  const [imprintModalVisible, setImprintModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, settingsData] = await Promise.all([
        storage.getProfile(),
        storage.getSettings(),
      ]);
      setProfile(profileData);
      setSettings(settingsData);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !settings) return;

    setSaving(true);
    try {
      await Promise.all([
        storage.setProfile(profile),
        storage.setSettings(settings),
      ]);
      await Promise.all([refreshLanguage(), refreshTheme()]);
      router.back();
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert(t("error"), t("failedToSaveSettings"));
    } finally {
      setSaving(false);
    }
  };

  const handleResetProgress = () => {
    Alert.alert(
      t("resetProgress"),
      t("resetProgressMessage"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("reset"),
          style: "destructive",
          onPress: async () => {
            await storage.clearAllData();
            router.back();
          },
        },
      ]
    );
  };

  const getThemeModeLabel = (mode: ThemeMode) => {
    switch (mode) {
      case "auto": return t("themeAuto");
      case "light": return t("themeLight");
      case "dark": return t("themeDark");
      default: return mode;
    }
  };

  const applyLanguage = async (newLanguage: "en" | "de") => {
    if (!settings) return;
    const newSettings: SettingsData = { ...settings, language: newLanguage };
    setSettings(newSettings);
    await storage.setSettings(newSettings);
    await refreshLanguage();
  };

  const applyThemeMode = async (mode: ThemeMode) => {
    if (!settings) return;
    const newSettings: SettingsData = { ...settings, themeMode: mode };
    setSettings(newSettings);
    await storage.setSettings(newSettings);
    await refreshTheme();
  };

  if (loading || !profile || !settings) {
    return (
      <>
        <Stack.Screen options={settingsScreenOptions} />
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </ThemedView>
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
            { paddingTop: Spacing.xl, paddingBottom: 100 + insets.bottom },
          ]}
        >
          <View style={styles.section}>
            <ThemedText type="label" style={[styles.sectionTitle, { color: theme.tabIconDefault }]}>
              {t("profile")}
            </ThemedText>
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="label" style={styles.fieldLabel}>
                {t("avatar")}
              </ThemedText>
              <AvatarSelector
                selectedIndex={profile.avatarIndex}
                onSelect={(index) => setProfile({ ...profile, avatarIndex: index })}
              />

              <ThemedText type="label" style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>
                {t("displayName")}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.cardBorder,
                  },
                ]}
                value={profile.displayName}
                onChangeText={(text) => setProfile({ ...profile, displayName: text })}
                placeholder={t("student")}
                placeholderTextColor={theme.tabIconDefault}
              />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="label" style={[styles.sectionTitle, { color: theme.tabIconDefault }]}>
              {t("preferences")}
            </ThemedText>
            <View style={styles.settingsGroup}>
              {(() => {
                const languageIndex = settings.language === "en" ? 0 : 1;
                const themeModes: ThemeMode[] = ["auto", "light", "dark"];
                const themeIndex = Math.max(0, themeModes.indexOf(settings.themeMode));

                return (
                  <>
                    <SettingRow icon="globe" label={t("language")}>
                      <SegmentedControl
                        values={[t("english"), t("german")]}
                        selectedIndex={languageIndex}
                        onChange={({ nativeEvent }) => {
                          const nextLanguage =
                            nativeEvent.selectedSegmentIndex === 0 ? "en" : "de";
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
                          const nextMode =
                            themeModes[nativeEvent.selectedSegmentIndex] ?? "auto";
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
            <ThemedText type="label" style={[styles.sectionTitle, { color: theme.tabIconDefault }]}>
              {t("about")}
            </ThemedText>
            <View style={styles.settingsGroup}>
              <Pressable
                style={[styles.aboutActionButton, { backgroundColor: theme.backgroundDefault }]}
                onPress={() => setAboutAppModalVisible(true)}
              >
                <View style={styles.settingLeft}>
                  <AppIcon name="info" size={20} color={theme.tabIconDefault} />
                  <ThemedText type="body">{t("aboutThisApp")}</ThemedText>
                </View>
                <AppIcon name="chevron-right" size={20} color={theme.tabIconDefault} />
              </Pressable>
              <Pressable
                style={[
                  styles.aboutActionButton,
                  styles.aboutActionButtonLast,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={() => setImprintModalVisible(true)}
              >
                <View style={styles.settingLeft}>
                  <AppIcon name="file-text" size={20} color={theme.tabIconDefault} />
                  <ThemedText type="body">{t("imprint")}</ThemedText>
                </View>
                <AppIcon name="chevron-right" size={20} color={theme.tabIconDefault} />
              </Pressable>
              <View style={[styles.settingRow, { backgroundColor: theme.backgroundDefault }]}>
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

          <Pressable
            style={[styles.dangerButton, { borderColor: theme.error }]}
            onPress={handleResetProgress}
          >
            <AppIcon name="trash-2" size={18} color={theme.error} />
            <ThemedText type="body" style={{ color: theme.error }}>
              {t("resetAllProgress")}
            </ThemedText>
          </Pressable>
        </KeyboardAwareScrollViewCompat>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.backgroundRoot },
          ]}
        >
          <Pressable
            style={[
              styles.saveButton,
              { backgroundColor: saving ? theme.disabled : theme.primary },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {t("saveChanges")}
              </ThemedText>
            )}
          </Pressable>
        </View>

        <Modal
          visible={aboutAppModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAboutAppModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setAboutAppModalVisible(false)}
            />
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="h4" style={styles.modalTitle}>
                {t("aboutThisApp")}
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.tabIconDefault, textAlign: "center" }}>
                {t("aboutThisAppPlaceholder")}
              </ThemedText>
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalPrimaryButton, { backgroundColor: theme.primary }]}
                  onPress={() => setAboutAppModalVisible(false)}
                >
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    {t("cancel")}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={imprintModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImprintModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setImprintModalVisible(false)}
            />
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="h4" style={styles.modalTitle}>
                {t("imprint")}
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.tabIconDefault, textAlign: "center" }}>
                {t("imprintPlaceholder")}
              </ThemedText>
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalPrimaryButton, { backgroundColor: theme.primary }]}
                  onPress={() => setImprintModalVisible(false)}
                >
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    {t("cancel")}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadows.card,
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
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  aboutActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  saveButton: {
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.card,
  },
  modalTitle: {
    textAlign: "center",
  },
  modalActions: {
    gap: Spacing.sm,
  },
  modalPrimaryButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
