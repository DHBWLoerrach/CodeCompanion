import React from "react";
import { View, ScrollView, StyleSheet, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { AppIcon } from "@/components/AppIcon";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

type InfoModalType = "about" | "imprint";

export default function InfoModalScreen() {
  const { theme } = useTheme();
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();

  const resolvedType: InfoModalType = type === "imprint" ? "imprint" : "about";
  const title = resolvedType === "imprint" ? "Impressum" : t("aboutThisApp");

  const openEmail = async (email: string) => {
    const url = `mailto:${email}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const openWebsite = async (website: string) => {
    const url = website.startsWith("http") ? website : `https://${website}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const handleClose = () => {
    if (router.canDismiss()) {
      router.dismiss();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/settings");
  };

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerLeft: () => (
            <Pressable
              style={styles.headerButton}
              onPress={handleClose}
              hitSlop={12}
            >
              <AppIcon name="x" size={20} color={theme.text} />
            </Pressable>
          ),
          headerBackVisible: false,
        }}
      />
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.xl, flexGrow: 1 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {resolvedType === "about" ? (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <ThemedText type="h3" style={styles.imprintMainTitle}>
                {title}
              </ThemedText>

              {language === "de" ? (
                <>
                  <ThemedText type="body" selectable>
                    CodeCompanion ist eine mobile Lern- und Übungsapp für
                    Studierende. Sie unterstützt dabei, Inhalte strukturiert zu
                    lernen, Wissen mit Quizfragen zu überprüfen und den eigenen
                    Fortschritt sichtbar zu machen.
                  </ThemedText>

                  <ThemedText type="h4">Funktionen</ThemedText>
                  <ThemedText type="body" selectable>
                    - Themenbasiertes Lernen mit kompakten Erklärungen{"\n"}-
                    KI-gestützte Quizfragen für gezieltes Üben{"\n"}-
                    Fortschrittsanzeige mit Kennzahlen und Lernverlauf{"\n"}-
                    Mehrsprachige Oberfläche (Deutsch/Englisch)
                  </ThemedText>

                  <ThemedText type="h4">Ziele</ThemedText>
                  <ThemedText type="body" selectable>
                    Ziel der App ist es, das selbstgesteuerte Lernen im Studium
                    zu verbessern, Wiederholung zu erleichtern und regelmäßiges
                    Üben alltagstauglich zu machen.
                  </ThemedText>

                  <ThemedText type="h4">Datenschutz</ThemedText>
                  <ThemedText type="body" selectable>
                    Es werden keine benutzerbezogenen Daten auf Servern
                    gespeichert. Nur der Lernfortschritt wird lokal auf dem
                    Gerät gespeichert.
                  </ThemedText>

                  <ThemedText type="h4">Entwicklung</ThemedText>
                  <ThemedText type="body" selectable>
                    Die App wurde am Studienzentrum IT-Management & Informatik
                    (SZI) der DHBW Lörrach unter Leitung von Prof. Dr. Erik
                    Behrends entwickelt.
                  </ThemedText>
                  <Pressable
                    onPress={() =>
                      void openWebsite("https://www.dhbw-loerrach.de/szi")
                    }
                    hitSlop={6}
                  >
                    <ThemedText type="link" selectable style={styles.linkText}>
                      https://www.dhbw-loerrach.de/szi
                    </ThemedText>
                  </Pressable>

                  <ThemedText type="h4">Quellcode</ThemedText>
                  <Pressable
                    onPress={() =>
                      void openWebsite(
                        "https://github.com/DHBWLoerrach/CodeCompanion",
                      )
                    }
                    hitSlop={6}
                  >
                    <ThemedText type="link" selectable style={styles.linkText}>
                      https://github.com/DHBWLoerrach/CodeCompanion
                    </ThemedText>
                  </Pressable>

                  <ThemedText type="h4">Feedback</ThemedText>
                  <Pressable
                    onPress={() => void openEmail("apps@dhbw-loerrach.de")}
                    hitSlop={6}
                  >
                    <ThemedText type="link" selectable style={styles.linkText}>
                      apps@dhbw-loerrach.de
                    </ThemedText>
                  </Pressable>
                </>
              ) : (
                <>
                  <ThemedText type="body" selectable>
                    CodeCompanion is a mobile learning and practice app for
                    students. It helps learners study topics in a structured
                    way, test knowledge with quizzes, and track their learning
                    progress over time.
                  </ThemedText>

                  <ThemedText type="h4">Features</ThemedText>
                  <ThemedText type="body" selectable>
                    - Topic-based learning with concise explanations{"\n"}-
                    AI-assisted quiz generation for targeted practice{"\n"}-
                    Progress tracking with key metrics and history{"\n"}-
                    Multilingual interface (German/English)
                  </ThemedText>

                  <ThemedText type="h4">Goals</ThemedText>
                  <ThemedText type="body" selectable>
                    The app is designed to support self-directed learning,
                    improve retention through repetition, and make regular
                    practice easier in day-to-day student life.
                  </ThemedText>

                  <ThemedText type="h4">Privacy</ThemedText>
                  <ThemedText type="body" selectable>
                    No user-related personal data is stored on servers. Only
                    learning progress is stored locally on the device.
                  </ThemedText>

                  <ThemedText type="h4">Development</ThemedText>
                  <ThemedText type="body" selectable>
                    The app is developed at the Studienzentrum IT-Management &
                    Informatik (SZI) at DHBW Lörrach under the supervision of
                    Prof. Dr. Erik Behrends.
                  </ThemedText>
                  <ThemedText type="body" selectable>
                    The official SZI page is provided in German:
                  </ThemedText>
                  <Pressable
                    onPress={() =>
                      void openWebsite("https://www.dhbw-loerrach.de/szi")
                    }
                    hitSlop={6}
                  >
                    <ThemedText type="link" selectable style={styles.linkText}>
                      https://www.dhbw-loerrach.de/szi
                    </ThemedText>
                  </Pressable>

                  <ThemedText type="h4">Source Code</ThemedText>
                  <Pressable
                    onPress={() =>
                      void openWebsite(
                        "https://github.com/DHBWLoerrach/CodeCompanion",
                      )
                    }
                    hitSlop={6}
                  >
                    <ThemedText type="link" selectable style={styles.linkText}>
                      https://github.com/DHBWLoerrach/CodeCompanion
                    </ThemedText>
                  </Pressable>

                  <ThemedText type="h4">Feedback</ThemedText>
                  <Pressable
                    onPress={() => void openEmail("apps@dhbw-loerrach.de")}
                    hitSlop={6}
                  >
                    <ThemedText type="link" selectable style={styles.linkText}>
                      apps@dhbw-loerrach.de
                    </ThemedText>
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <ThemedText type="h3" style={styles.imprintMainTitle}>
                Impressum
              </ThemedText>

              <ThemedText type="h4">Herausgeber</ThemedText>
              <ThemedText type="body" selectable>
                Duale Hochschule Baden-Württemberg Lörrach{"\n"}
                Baden-Württemberg Cooperative State University Lörrach{"\n"}
                Hangstraße 46 - 50{"\n"}
                D-79539 Lörrach
              </ThemedText>
              <ThemedText type="body" selectable>
                Telefon +49 7621 2071 0{"\n"}
              </ThemedText>
              <View style={styles.inlineRow}>
                <ThemedText type="body">E-Mail: </ThemedText>
                <Pressable
                  onPress={() => void openEmail("info@dhbw-loerrach.de")}
                  hitSlop={6}
                >
                  <ThemedText type="link" selectable style={styles.linkText}>
                    info@dhbw-loerrach.de
                  </ThemedText>
                </Pressable>
              </View>
              <Pressable
                onPress={() => void openWebsite("https://dhbw-loerrach.de")}
                hitSlop={6}
              >
                <ThemedText type="link" selectable style={styles.linkText}>
                  https://dhbw-loerrach.de
                </ThemedText>
              </Pressable>
              <ThemedText type="body" selectable>
                Die Duale Hochschule Baden-Württemberg ist eine rechtsfähige
                Körperschaft des öffentlichen Rechts. Sie wird gesetzlich
                vertreten durch die Präsidentin der Dualen Hochschule
                Baden-Württemberg, Frau Prof. Dr. Martina Klärle. Gesetzlicher
                Vertreter des Hochschulstandorts Lörrach ist der Rektor Herr
                Prof. Gerhard Jäger.
              </ThemedText>
              <ThemedText type="body" selectable>
                Umsatzsteuer-Identifikationsnummer gemäß § 27 a
                Umsatzsteuergesetz: DE287664832
                {"\n"}
                Wirtschafts-Identifikationsnummer (W-IdNr.): DE287664832-00001
              </ThemedText>

              <ThemedText type="h4">Zuständige Aufsichtsbehörde</ThemedText>
              <ThemedText type="body" selectable>
                Ministerium für Wissenschaft, Forschung und Kunst des Landes
                Baden-Württemberg
                {"\n"}
                Königstraße 46{"\n"}
                D-70173 Stuttgart
              </ThemedText>
              <ThemedText type="body" selectable>
                Telefon: +49 711 279 0{"\n"}
                Telefax: +49 711 279 3081{"\n"}
              </ThemedText>
              <View style={styles.inlineRow}>
                <ThemedText type="body">E-Mail: </ThemedText>
                <Pressable
                  onPress={() => void openEmail("poststelle@mwk.bwl.de")}
                  hitSlop={6}
                >
                  <ThemedText type="link" selectable style={styles.linkText}>
                    poststelle@mwk.bwl.de
                  </ThemedText>
                </Pressable>
              </View>
              <Pressable
                onPress={() => void openWebsite("www.mwk.bwl.de")}
                hitSlop={6}
              >
                <ThemedText type="link" selectable style={styles.linkText}>
                  www.mwk.bwl.de
                </ThemedText>
              </Pressable>

              <ThemedText type="h4">
                Redaktionelle und technische Verantwortung
              </ThemedText>
              <ThemedText type="body" selectable>
                Diese App wurde plattformübergreifend mit React Native und Expo
                entwickelt. Technische Leitung der Entwicklung: Prof. Dr. Erik
                Behrends.
              </ThemedText>
              <ThemedText type="body" selectable>
                Sollten Sie in der App Fehler feststellen, schicken uns Ihr
                Feedback:
              </ThemedText>
              <Pressable
                onPress={() => void openEmail("apps@dhbw-loerrach.de")}
                hitSlop={6}
              >
                <ThemedText type="link" selectable style={styles.linkText}>
                  apps@dhbw-loerrach.de
                </ThemedText>
              </Pressable>

              <ThemedText type="h4">Datenschutz</ThemedText>
              <ThemedText type="body" selectable>
                Es werden keine benutzerbezogenen Daten auf Servern gespeichert.
                Nur der Lernfortschritt wird lokal auf dem Gerät gespeichert.
              </ThemedText>

              <ThemedText type="h4">Haftungsbeschränkung</ThemedText>
              <ThemedText type="body" selectable>
                Die Duale Hochschule Baden-Württemberg begründet durch die
                Bereitstellung dieser Informationen kein Vertragsangebot über
                Auskünfte, Beratung oder ähnliche Vertragsbeziehungen. Jegliche
                Haftung für die Nutzung der Inhalte der App oder die Richtigkeit
                der Inhalte oder die Funktionalität der App wird ausgeschlossen.
                Die Duale Hochschule Baden-Württemberg haftet daher nicht für
                konkrete, mittelbare und unmittelbare Schäden oder Schäden, die
                durch fehlende Nutzungsmöglichkeiten, Datenverluste oder
                entgangene Gewinne entstehen können, die im Zusammenhang mit der
                Nutzung von Dokumenten oder Informationen entstehen, die in
                dieser App zugänglich sind.
              </ThemedText>
            </View>
          )}
        </ScrollView>
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
  content: {
    padding: Spacing.lg,
  },
  contentCentered: {
    justifyContent: "center",
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.card,
  },
  title: {
    textAlign: "center",
  },
  imprintMainTitle: {
    color: "#B00020",
  },
  headerButton: {
    padding: Spacing.sm,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  linkText: {
    textDecorationLine: "underline",
  },
});
