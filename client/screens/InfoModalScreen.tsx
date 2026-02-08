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
  const { t } = useTranslation();
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
            <Pressable style={styles.headerButton} onPress={handleClose} hitSlop={12}>
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
            resolvedType === "about" ? styles.contentCentered : null,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {resolvedType === "about" ? (
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="h4" style={styles.title}>
                {title}
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.tabIconDefault, textAlign: "center" }}>
                {t("aboutThisAppPlaceholder")}
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
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
                <Pressable onPress={() => void openEmail("info@dhbw-loerrach.de")} hitSlop={6}>
                  <ThemedText type="link" selectable style={styles.linkText}>
                    info@dhbw-loerrach.de
                  </ThemedText>
                </Pressable>
              </View>
              <Pressable onPress={() => void openWebsite("https://dhbw-loerrach.de")} hitSlop={6}>
                <ThemedText type="link" selectable style={styles.linkText}>
                  https://dhbw-loerrach.de
                </ThemedText>
              </Pressable>
              <ThemedText type="body" selectable>
                Die Duale Hochschule Baden-Württemberg ist eine rechtsfähige Körperschaft des
                öffentlichen Rechts. Sie wird gesetzlich vertreten durch die Präsidentin der
                Dualen Hochschule Baden-Württemberg, Frau Prof. Dr. Martina Klärle. Gesetzlicher
                Vertreter des Hochschulstandorts Lörrach ist der Rektor Herr Prof. Gerhard Jäger.
              </ThemedText>
              <ThemedText type="body" selectable>
                Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
                DE287664832
                {"\n"}
                Wirtschafts-Identifikationsnummer (W-IdNr.): DE287664832-00001
              </ThemedText>

              <ThemedText type="h4">Zuständige Aufsichtsbehörde</ThemedText>
              <ThemedText type="body" selectable>
                Ministerium für Wissenschaft, Forschung und Kunst des Landes Baden-Württemberg
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
                <Pressable onPress={() => void openEmail("poststelle@mwk.bwl.de")} hitSlop={6}>
                  <ThemedText type="link" selectable style={styles.linkText}>
                    poststelle@mwk.bwl.de
                  </ThemedText>
                </Pressable>
              </View>
              <Pressable onPress={() => void openWebsite("www.mwk.bwl.de")} hitSlop={6}>
                <ThemedText type="link" selectable style={styles.linkText}>
                  www.mwk.bwl.de
                </ThemedText>
              </Pressable>

              <ThemedText type="h4">Redaktionelle und technische Verantwortung</ThemedText>
              <ThemedText type="body" selectable>
                Inhaltlich sind die jeweils zuständigen Personen der Studiengänge,
                Studienrichtungen, Studienzentren oder Organisationseinheiten (Bibliothek,
                Prüfungsamt, StuV etc.) verantwortlich.
              </ThemedText>
              <ThemedText type="body" selectable>
                Die Homepage der DHBW Lörrach wurde in Typo3 entwickelt. Die Seiten werden in
                Zusammenarbeit zwischen IT.Services (Technik) und Hochschulkommunikation (Konzept,
                Design und Redaktion) umgesetzt:
              </ThemedText>
              <Pressable onPress={() => void openEmail("pr@dhbw-loerrach.de")} hitSlop={6}>
                <ThemedText type="link" selectable style={styles.linkText}>
                  pr@dhbw-loerrach.de
                </ThemedText>
              </Pressable>
              <ThemedText type="body" selectable>
                Sollten Sie auf den Seiten Fehler feststellen, wenden Sie sich bitte an die
                zuständigen Personen oder schicken uns Ihr Feedback.
              </ThemedText>

              <ThemedText type="h4">Haftungsbeschränkung</ThemedText>
              <ThemedText type="body" selectable>
                Die Inhalte dieser Seiten wurden mit größter Sorgfalt erstellt. Für die
                Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine
                Gewähr übernehmen. Die Duale Hochschule Baden-Württemberg behält sich das Recht
                vor, ohne vorherige Ankündigung, Änderungen oder Ergänzungen der bereitgestellten
                Informationen vorzunehmen. Unser Angebot enthält Links zu externen Webseiten
                Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für
                diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
                verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten
                verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf
                mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt
                der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten
                Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar.
                Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend
                entfernen. Die Duale Hochschule Baden-Württemberg begründet durch die
                Bereitstellung dieser Informationen kein Vertragsangebot über Auskünfte, Beratung
                oder ähnliche Vertragsbeziehungen. Jegliche Haftung für die Nutzung der Inhalte
                der Web Site oder die Richtigkeit der Inhalte oder die Erreichbarkeit der Web Site
                wird ausgeschlossen. Die Duale Hochschule Baden-Württemberg haftet daher nicht für
                konkrete, mittelbare und unmittelbare Schäden oder Schäden, die durch fehlende
                Nutzungsmöglichkeiten, Datenverluste oder entgangene Gewinne entstehen können, die
                im Zusammenhang mit der Nutzung von Dokumenten oder Informationen entstehen, die auf
                dieser Web Site zugänglich sind.
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
