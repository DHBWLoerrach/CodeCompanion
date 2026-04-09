import React from 'react';
import { View, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useCloseHandler } from '@/hooks/useCloseHandler';
import { useTranslation } from '@/hooks/useTranslation';

type InfoModalType = 'about' | 'imprint';
type AboutAction = {
  kind: 'email' | 'website';
  label: string;
  value: string;
  detail?: string;
};
type AboutSection = {
  heading: string;
  body?: string;
  bullets?: string[];
  actions?: AboutAction[];
};

const ABOUT_CONTENT = {
  de: {
    eyebrow: 'Programmieren lernen',
    intro:
      'CodeCompanion ist eine mobile Lern- und Übungsapp für Programmierinhalte. Die App verbindet strukturierte Lernpfade, kompakte Erklärungen und Quiz-Training für JavaScript, Python und Java.',
    sections: [
      {
        heading: 'Lernkonzept',
        body: 'CodeCompanion unterstützt Studierende dabei, Themen Schritt für Schritt zu erarbeiten, Wissen direkt zu überprüfen und Lernfortschritte im Alltag sichtbar zu machen.',
      },
      {
        heading: 'Was die App bietet',
        bullets: [
          'Strukturierte Curricula mit aufeinander aufbauenden Themen',
          'Kompakte Erklärungen zu zentralen Konzepten und Begriffen',
          'KI-gestützte Quizfragen für gezieltes Üben und Wiederholen',
          'Lokale Speicherung von Profil, Einstellungen, Fortschritt und Lernserie',
          'Mehrsprachige Oberfläche in Deutsch und Englisch',
        ],
      },
      {
        heading: 'KI und Datenschutz',
        body: 'Für die KI-gestützte Quizerstellung werden Anfragen serverseitig verarbeitet. Dabei werden nur die für die Generierung notwendigen Inhalte übertragen.',
        bullets: [
          'Die App verwendet kein Benutzerkonto.',
          'Lernhistorie, Fortschritt, Einstellungen und Streaks bleiben lokal auf dem Gerät gespeichert.',
          'Es wird keine serverseitige Lernhistorie für die App geführt.',
        ],
      },
      {
        heading: 'Entwicklung',
        body: 'Die App wird am Studienzentrum IT-Management & Informatik (SZI) der DHBW Lörrach unter Leitung von Prof. Dr. Erik Behrends entwickelt.',
        actions: [
          {
            kind: 'website',
            label: 'SZI der DHBW Lörrach',
            value: 'https://www.dhbw-loerrach.de/szi',
            detail: 'https://www.dhbw-loerrach.de/szi',
          },
        ],
      },
      {
        heading: 'Open Source und Feedback',
        body: 'Der Quellcode ist öffentlich verfügbar. Fragen, Feedback und Fehlermeldungen können direkt an das App-Team geschickt werden.',
        actions: [
          {
            kind: 'website',
            label: 'GitHub-Repository',
            value: 'https://github.com/DHBWLoerrach/CodeCompanion',
            detail: 'https://github.com/DHBWLoerrach/CodeCompanion',
          },
          {
            kind: 'email',
            label: 'apps@dhbw-loerrach.de',
            value: 'apps@dhbw-loerrach.de',
          },
        ],
      },
    ] satisfies AboutSection[],
  },
  en: {
    eyebrow: 'Learn programming',
    intro:
      'CodeCompanion is a mobile learning and practice app for programming topics. It combines structured learning paths, concise explanations, and quiz-based practice for JavaScript, Python, and Java.',
    sections: [
      {
        heading: 'Learning approach',
        body: 'CodeCompanion helps students work through topics step by step, check understanding immediately, and keep learning progress visible in everyday study.',
      },
      {
        heading: 'What the app offers',
        bullets: [
          'Structured curricula with topics that build on each other',
          'Concise explanations for core concepts and terminology',
          'AI-assisted quizzes for targeted practice and revision',
          'Local storage for profile, settings, progress, and streak data',
          'A multilingual interface in German and English',
        ],
      },
      {
        heading: 'AI and privacy',
        body: 'Requests for AI-assisted quiz generation are processed server-side. Only the content required to generate quiz questions is transmitted.',
        bullets: [
          'The app does not require a user account.',
          'Learning history, progress, settings, and streaks remain stored locally on the device.',
          'No server-side learning history is maintained for the app.',
        ],
      },
      {
        heading: 'Development',
        body: 'The app is developed at the Studienzentrum IT-Management & Informatik (SZI) at DHBW Lörrach under the supervision of Prof. Dr. Erik Behrends.',
        actions: [
          {
            kind: 'website',
            label: 'SZI at DHBW Lörrach',
            value: 'https://www.dhbw-loerrach.de/szi',
            detail: 'https://www.dhbw-loerrach.de/szi',
          },
        ],
      },
      {
        heading: 'Open source and feedback',
        body: 'The source code is publicly available. Questions, feedback, and bug reports can be sent directly to the app team.',
        actions: [
          {
            kind: 'website',
            label: 'GitHub repository',
            value: 'https://github.com/DHBWLoerrach/CodeCompanion',
            detail: 'https://github.com/DHBWLoerrach/CodeCompanion',
          },
          {
            kind: 'email',
            label: 'apps@dhbw-loerrach.de',
            value: 'apps@dhbw-loerrach.de',
          },
        ],
      },
    ] satisfies AboutSection[],
  },
} as const;

export default function InfoModalScreen() {
  const { theme } = useTheme();
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type?: string }>();

  const resolvedType: InfoModalType = type === 'imprint' ? 'imprint' : 'about';
  const title = resolvedType === 'imprint' ? 'Impressum' : t('aboutThisApp');
  const aboutContent = language === 'de' ? ABOUT_CONTENT.de : ABOUT_CONTENT.en;

  const openEmail = async (email: string) => {
    const url = `mailto:${email}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const openWebsite = async (website: string) => {
    const url = website.startsWith('http') ? website : `https://${website}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const handleClose = useCloseHandler('/settings');

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <HeaderIconButton icon="x" onPress={handleClose} />,
        }}
      />
      <Stack.Screen.Title>{title}</Stack.Screen.Title>
      <Stack.Screen.BackButton hidden />
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
          {resolvedType === 'about' ? (
            <SurfaceCard style={styles.card}>
              <ThemedText
                type="h3"
                style={[styles.imprintMainTitle, { color: theme.primary }]}
              >
                {title}
              </ThemedText>

              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.separator,
                  },
                ]}
              >
                <ThemedText
                  type="label"
                  style={[styles.summaryEyebrow, { color: theme.primary }]}
                >
                  {aboutContent.eyebrow}
                </ThemedText>
                <ThemedText type="body" selectable style={styles.bodyText}>
                  {aboutContent.intro}
                </ThemedText>
              </View>

              {aboutContent.sections.map((section) => (
                <View key={section.heading} style={styles.sectionBlock}>
                  <ThemedText type="h4">{section.heading}</ThemedText>
                  {section.body ? (
                    <ThemedText type="body" selectable style={styles.bodyText}>
                      {section.body}
                    </ThemedText>
                  ) : null}
                  {section.bullets?.map((bullet) => (
                    <View key={bullet} style={styles.bulletRow}>
                      <View
                        style={[
                          styles.bulletDot,
                          { backgroundColor: theme.primary },
                        ]}
                      />
                      <ThemedText
                        type="body"
                        selectable
                        style={styles.bulletText}
                      >
                        {bullet}
                      </ThemedText>
                    </View>
                  ))}
                  {section.actions?.map((action) => (
                    <Pressable
                      key={action.value}
                      accessibilityRole="link"
                      hitSlop={6}
                      onPress={() =>
                        action.kind === 'email'
                          ? void openEmail(action.value)
                          : void openWebsite(action.value)
                      }
                      style={styles.actionLink}
                    >
                      <ThemedText
                        type="link"
                        selectable
                        style={styles.linkText}
                      >
                        {action.label}
                      </ThemedText>
                      {action.detail && action.detail !== action.label ? (
                        <ThemedText
                          type="small"
                          selectable
                          style={[
                            styles.actionDetail,
                            { color: theme.tabIconDefault },
                          ]}
                        >
                          {action.detail}
                        </ThemedText>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ))}
            </SurfaceCard>
          ) : (
            <SurfaceCard style={styles.card}>
              <ThemedText
                type="h3"
                style={[styles.imprintMainTitle, { color: theme.primary }]}
              >
                Impressum
              </ThemedText>

              <ThemedText type="h4">Herausgeber</ThemedText>
              <ThemedText type="body" selectable>
                Duale Hochschule Baden-Württemberg Lörrach{'\n'}
                Baden-Württemberg Cooperative State University Lörrach{'\n'}
                Hangstraße 46 - 50{'\n'}
                D-79539 Lörrach
              </ThemedText>
              <ThemedText type="body" selectable>
                Telefon +49 7621 2071 0{'\n'}
              </ThemedText>
              <View style={styles.inlineRow}>
                <ThemedText type="body">E-Mail: </ThemedText>
                <Pressable
                  onPress={() => void openEmail('info@dhbw-loerrach.de')}
                  hitSlop={6}
                >
                  <ThemedText type="link" selectable style={styles.linkText}>
                    info@dhbw-loerrach.de
                  </ThemedText>
                </Pressable>
              </View>
              <Pressable
                onPress={() => void openWebsite('https://dhbw-loerrach.de')}
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
                {'\n'}
                Wirtschafts-Identifikationsnummer (W-IdNr.): DE287664832-00001
              </ThemedText>

              <ThemedText type="h4">Zuständige Aufsichtsbehörde</ThemedText>
              <ThemedText type="body" selectable>
                Ministerium für Wissenschaft, Forschung und Kunst des Landes
                Baden-Württemberg
                {'\n'}
                Königstraße 46{'\n'}
                D-70173 Stuttgart
              </ThemedText>
              <ThemedText type="body" selectable>
                Telefon: +49 711 279 0{'\n'}
                Telefax: +49 711 279 3081{'\n'}
              </ThemedText>
              <View style={styles.inlineRow}>
                <ThemedText type="body">E-Mail: </ThemedText>
                <Pressable
                  onPress={() => void openEmail('poststelle@mwk.bwl.de')}
                  hitSlop={6}
                >
                  <ThemedText type="link" selectable style={styles.linkText}>
                    poststelle@mwk.bwl.de
                  </ThemedText>
                </Pressable>
              </View>
              <Pressable
                onPress={() => void openWebsite('www.mwk.bwl.de')}
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
                onPress={() => void openEmail('apps@dhbw-loerrach.de')}
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
            </SurfaceCard>
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
  card: {
    gap: Spacing.md,
  },
  summaryCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  summaryEyebrow: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  imprintMainTitle: {
    lineHeight: 32,
  },
  sectionBlock: {
    gap: Spacing.sm,
  },
  bodyText: {
    lineHeight: 24,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bulletDot: {
    borderRadius: BorderRadius.full,
    height: 6,
    marginTop: 9,
    width: 6,
  },
  bulletText: {
    flex: 1,
    lineHeight: 24,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  actionLink: {
    gap: 2,
  },
  actionDetail: {
    lineHeight: 20,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});
