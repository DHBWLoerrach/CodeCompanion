# Onboarding & First-Run Experience – Implementierungsplan

## Zusammenfassung

Dieses Dokument beschreibt konkrete Verbesserungen am Einstieg in die App ("First-Run Experience"), die auf Basis eines User-Testing-Durchlaufs mit drei Nutzerperspektiven erarbeitet wurden. Das Kernergebnis: Die App erklärt sich beim ersten Start nicht selbst — es fehlt jeder Hinweis darauf, was CodeCompanion ist, was die App bietet und für wen sie gedacht ist. Die vorhandene "Über diese App"-Beschreibung liegt ausschließlich in den Einstellungen und ist für Erstnutzer unsichtbar.

Die Positionierung soll dabei nicht nur Anfänger adressieren. CodeCompanion ist auch für Programmierer jeder Erfahrungsstufe relevant, die ihr Wissen gelegentlich prüfen, auffrischen und langfristig erhalten oder vertiefen möchten. Gerade wenn im Alltag mehr Code durch KI-Systeme vorbereitet oder erzeugt wird, steigt der Bedarf an kurzen Formaten, mit denen Menschen ihr eigenes Verständnis aktiv scharf halten.

Die Verbesserungen sind bewusst minimal gehalten — kein aufwändiger Tutorial-Walkthrough, sondern gezielte Eingriffe, die die Selbsterklärungskraft der App deutlich erhöhen, ohne den bestehenden Flow grundlegend zu verändern.

### Hintergrund (User-Testing-Befunde)

Getestet wurde aus drei Perspektiven:

- **Zielgruppen-Nutzer** (lernt bereits Programmieren): Themenstruktur und Quiz-Flow sind vertraut und logisch, aber die Positionierung der App ("Lernapp" vs. "Übungsapp") ist unklar.
- **Anfänger** (will Programmieren lernen): Wird durch "JavaScript lernen" angezogen, findet aber Erklärungen, die eher Zusammenfassungen sind, und Quiz-Fragen, die Vorkenntnisse voraussetzen. Die App kommuniziert nicht, dass sie als Begleitübung konzipiert ist.
- **Andere Nutzer** (zufällig gelandet): Ohne Programmier-Kontext ist der Einstieg komplett unverständlich — "Technologie wählen" ohne jeden Rahmen.

Ergänzende Produkt-Perspektive:

- **Erfahrener Programmierer / gelegentlicher Auffrischer:** Will nicht zwingend "Programmieren lernen", sondern Wissen prüfen, Lücken erkennen und Skills langfristig aktiv halten. Die App sollte deshalb nicht nur wie ein Lernbegleiter für Anfänger wirken, sondern auch wie ein schlankes Tool zum regelmäßigen Skill-Check und zur Vertiefung.

## Ziele

- Beim ersten App-Start kommunizieren, was CodeCompanion ist und was der Nutzer erwarten kann.
- Die Zielgruppe klar benennen: begleitendes Üben, Skill-Check, Auffrischung und Vertiefung; kein eigenständiger Komplettkurs.
- Den bestehenden Navigation-Flow (Language Select → Learn) nicht brechen.
- Keine Registrierung, kein Account, kein mehrstufiges Onboarding.
- Welcome-Screen und Language Select beim ersten Start in Deutsch oder Englisch anzeigen; Standardsprache aus der Gerätesprache ableiten (`de`/`en`, sonst `en`).

## Nicht-Ziele

- Vollständiges Tutorial oder interaktiver Walkthrough.
- Neues Navigationskonzept oder Tab-Umstrukturierung.
- Inhaltliche Überarbeitung der Themen-Erklärungen.
- Änderungen am Quiz-Flow oder Fortschritts-System.

---

## Maßnahmen

### M1: Welcome-Screen beim ersten Start

**Problem:** Die App startet direkt mit "Technologie wählen" — ohne App-Name, Kontext oder Value Proposition. Der Nutzer trifft sofort eine Auswahlentscheidung, ohne zu wissen, wozu.

**Lösung:** Einmaliger Welcome-Screen vor der Sprach-Auswahl, der nur beim allerersten Start erscheint. Danach wird er nicht mehr angezeigt.

**Inhalt des Welcome-Screens:**

- App-Name "CodeCompanion" (prominent)
- Ein Untertitel / Tagline, z.B.:
  - DE: "Prüfe, übe und vertiefe dein Programmierwissen mit KI-generierten Quizfragen"
  - EN: "Check, practice, and deepen your programming knowledge with AI-generated quizzes"
- Optionaler visueller Bereich (App-Icon oder einfache Illustration, kein aufwändiges Artwork)
- Ein Weiter-Button ("Los geht's" / "Get Started")
- Die Texte folgen beim ersten Start der initialen App-Sprache, die aus der Gerätesprache abgeleitet wird (`de`/`en`, sonst `en`)

**Positionierungsprinzip für alle neuen Texte:**

- Die App soll sprachlich sowohl für Lernende als auch für bereits erfahrene Entwickler verständlich und relevant wirken.
- Begriffe wie "lernen" dürfen im bestehenden UI bleiben, neue Kontexttexte sollen aber klar machen, dass es auch um Wiederholung, Skill-Check, Wissenspflege und Vertiefung geht.

**Verhalten:**

- Wird nur angezeigt, wenn `hasSeenWelcome` nicht in AsyncStorage gesetzt ist.
- Bevor Welcome-Screen oder `language-select` gerendert werden, wird beim ersten Start eine initiale App-Sprache bestimmt: Gerätesprache `de`/`en`, sonst Fallback `en`. Falls noch keine App-Sprache gespeichert ist, wird dieser Wert in den Settings persistiert.
- `app/index.tsx` wartet, bis `ProgrammingLanguageContext`, `LanguageContext` und der Welcome-Status geladen sind, damit es keinen Sprach-Flash beim ersten Render gibt.
- Nach Klick auf den Weiter-Button wird `hasSeenWelcome = true` persistiert und per `router.replace("/language-select")` zur bestehenden `language-select`-Route navigiert.
- Rückkehr zum Welcome-Screen ist nicht möglich; weder Header-Back noch Hardware-/Gesture-Back sollen nach dem Welcome wieder auf diesen Screen führen.
- Der Welcome-Screen wird **nicht** durch `storage.clearAllData()` zurückgesetzt (analog zu `deviceId`).

**Betroffene Dateien:**

- Neu: `client/screens/WelcomeScreen.tsx` – UI-Komponente
- Neu: `app/welcome.tsx` – Route (re-exportiert Screen)
- Ändern: `app/index.tsx` – Routing-Logik erweitern (Welcome → Language Select → Learn)
- Ändern: `app/_layout.tsx` – neue Route registrieren
- Ändern: `client/contexts/LanguageContext.tsx` – initiale App-Sprache beim ersten Start aus Geräte-Locale ableiten und laden
- Ändern: `client/lib/storage.ts` – neuer Schlüssel `hasSeenWelcome`, explizit von `clearAllData()` ausgenommen
- Ändern: `client/lib/i18n.ts` – neue Übersetzungsschlüssel
- Ggf. Ändern: `package.json` – Locale-API ergänzen, falls noch keine Geräte-Locale verfügbar ist (z.B. `expo-localization`)

**Design-Vorgaben:**

- Konsistent mit dem bestehenden Design-System (Theme-Tokens, `ThemedText`, `ThemedView`, `Spacing`, `BorderRadius`).
- Hintergrund: `theme.backgroundRoot`.
- Eingangsanimation analog zu `LanguageSelectScreen` (`FadeInUp` via `react-native-reanimated`).
- Kein Header / keine Navigation Bar auf diesem Screen.
- Vertikale Zentrierung des Inhalts.

### M2: Kontext-Untertitel auf dem Hauptscreen

**Problem:** Die Überschrift "JavaScript lernen" auf dem Lernen-Tab suggeriert einen Kurs, erklärt aber nicht, dass es um Quiz-basiertes Üben, Skill-Check und Wissensvertiefung geht.

**Lösung:** Untertitel direkt unter der Hauptüberschrift auf `LearnScreen`, der den Kontext herstellt.

**Inhalt:**

- DE: "Wähle ein Thema und teste dein Wissen"
- EN: "Pick a topic and test your knowledge"

**Betroffene Dateien:**

- Ändern: `client/screens/LearnScreen.tsx` – Untertitel unter dem Header-Bereich hinzufügen
- Ändern: `client/lib/i18n.ts` – neue Übersetzungsschlüssel

**Design-Vorgaben:**

- `ThemedText` mit `type="body"` und `color: theme.tabIconDefault` (gleicher Stil wie der Untertitel in `LanguageSelectScreen`).
- Platzierung im Screen-Content als erster Textblock des Scroll-Contents, oberhalb des ersten inhaltlichen Blocks (fällige Themen bzw. erste Kategorie), **nicht** im nativen Header.

### M3: Level-System-Erklärung auf TopicDetailScreen

**Problem:** "1/5 Level" auf der Themen-Detailseite wird nicht erklärt. Nutzer wissen nicht, was die Level bedeuten, wie man aufsteigt, und wann ein Thema als "geschafft" gilt.

**Lösung:** Tappbares Info-Element neben der Level-Anzeige, das eine kurze Erklärung einblendet.

**Inhalt:**

- DE: "Dein Level steigt, wenn du in einem Quiz zu diesem Thema mindestens 80 % erreichst, und sinkt wieder, wenn du unter 50 % bleibst. Ab Level 5 gilt das Thema als gemeistert."
- EN: "Your level increases when you score at least 80% in a quiz on this topic, and drops again if you score below 50%. At level 5, the topic is considered mastered."

**Betroffene Dateien:**

- Ändern: `client/screens/TopicDetailScreen.tsx` – Info-Icon neben Level-Anzeige, Tooltip/Popover oder expandierbarer Text
- Ändern: `client/lib/i18n.ts` – neue Übersetzungsschlüssel

**Design-Vorgaben:**

- Kleines Info-Icon (`ⓘ`) neben "1/5 Level", tappbar.
- Das Info-Element ist in beiden Zuständen der Topic-Detail-Seite sichtbar: in der Meta-Card ohne Fortschritt und im Progress-Block mit Fortschritt. Falls die Level-Anzeige im Zuge der Umsetzung vereinheitlicht wird, bleibt genau ein Info-Toggle sichtbar.
- Bei Tap: Inline-Text direkt unterhalb der jeweiligen Level-Anzeige einblenden (Toggle-Verhalten, kein Modal).
- Animation: `FadeIn` / `FadeOut` via `react-native-reanimated`.

### M4: Unterscheidung "Lernen" vs. "Üben" klarer machen

**Problem:** Die Tabs "Lernen" und "Üben" überschneiden sich im wahrgenommenen Zweck. Auf beiden geht es um Quizzes. Der Unterschied (themengebunden vs. Modi-basiert/Wiederholung) ist nicht ersichtlich. Zusätzlich wird nicht klar genug kommuniziert, dass die App auch für erfahrene Nutzer gedacht ist, die ihr Wissen regelmäßig auffrischen oder schärfen wollen.

**Lösung:** Kurze kontextuelle Beschreibung in beiden Tabs, die den jeweiligen Zweck erklärt.

**Lernen-Tab (bereits durch M2 adressiert):** "Wähle ein Thema und teste dein Wissen."

**Üben-Tab:** Zusätzlicher Hinweistext im oberen Bereich.
- DE: "Wiederhole, überprüfe und festige dein Wissen mit verschiedenen Quiz-Modi"
- EN: "Review, check, and consolidate your knowledge with different quiz modes"

**Betroffene Dateien:**

- Ändern: `app/(tabs)/practice/index.tsx` – Untertitel im oberen Bereich
- Ändern: `client/lib/i18n.ts` – neue Übersetzungsschlüssel

**Design-Vorgaben:**

- Gleicher Stil wie M2 (`ThemedText`, `type="body"`, `color: theme.tabIconDefault`).
- Platzierung: im Screen-Content oberhalb des ersten inhaltlichen Blocks (Due-Section oder Empty State), **nicht** im nativen Header.

---

## Umsetzungsplan (PR-Sequenz)

### PR 1: Storage-Schlüssel, App-Sprach-Bootstrap und Routing-Vorbereitung

**Scope:** Grundlagen legen, ohne sichtbare UI-Änderung.

Änderungen:

- `client/lib/storage.ts`: neuen Schlüssel `WELCOME_SEEN_KEY` anlegen, Lese-/Schreib-Funktionen (`hasSeenWelcome`, `markWelcomeSeen`), explizit von `clearAllData()` ausschließen.
- `client/contexts/LanguageContext.tsx`: Initialsprache beim ersten Start aus der Geräte-Locale ableiten (`de`/`en`, sonst `en`) und persistierte Settings weiterhin priorisieren.
- `client/lib/i18n.ts`: alle neuen Übersetzungsschlüssel für M1–M4 hinzufügen (Welcome-Screen, LearnScreen-Untertitel, Level-Erklärung, Practice-Untertitel).
- Ggf. `package.json`: Locale-API ergänzen, falls erforderlich.

Akzeptanzkriterien:

- `hasSeenWelcome()` gibt `false` zurück, wenn der Schlüssel nicht gesetzt ist.
- `markWelcomeSeen()` persistiert den Wert korrekt.
- `clearAllData()` löscht den Welcome-Schlüssel **nicht**.
- Wenn noch keine App-Sprache gespeichert ist, wird beim ersten Start `de` oder `en` aus der Geräte-Locale übernommen; alle anderen Locales fallen auf `en` zurück.
- Alle neuen i18n-Schlüssel sind in Deutsch und Englisch vorhanden.
- Unit-Tests decken `hasSeenWelcome`, `markWelcomeSeen`, `clearAllData()` und die Initialsprachen-Ableitung ab.
- Bestehende Tests laufen durch (`npm test`).

### PR 2: Welcome-Screen (M1)

**Scope:** Den Welcome-Screen implementieren und in den Routing-Flow integrieren.

Änderungen:

- Neu: `client/screens/WelcomeScreen.tsx`.
- Neu: `app/welcome.tsx` (re-exportiert den Screen).
- Ändern: `app/_layout.tsx` – neue `welcome`-Route registrieren (`headerShown: false`).
- Ändern: `app/index.tsx` – Routing-Logik:
  1. Laden: `isLoading` aus `ProgrammingLanguageContext`, `isLoading` aus `LanguageContext` und `hasSeenWelcome` prüfen.
  2. Wenn `!hasSeenWelcome` → Redirect zu `/welcome`.
  3. Wenn `!isLanguageSelected` → Redirect zu `/language-select`.
  4. Sonst → Redirect zu `/learn`.
- `client/screens/WelcomeScreen.tsx`: CTA markiert Welcome als gesehen und navigiert per `router.replace("/language-select")`.

Akzeptanzkriterien:

- Beim allerersten Start wird der Welcome-Screen angezeigt.
- Nach Tippen auf "Los geht's" erscheint der Language-Select-Screen.
- Bei jedem weiteren Start wird der Welcome-Screen übersprungen.
- Zurück-Navigation zum Welcome-Screen ist nicht möglich, auch nicht per Hardware-Back/Geste nach dem Wechsel zu `language-select`.
- Light Mode und Dark Mode sind korrekt gestylt.
- Lokalisierung (DE/EN) funktioniert beim ersten Start anhand der Geräte-Locale.
- Tests decken Root-Redirects (`/welcome` vs. `/language-select` vs. `/learn`) und den Welcome-Weiter-Flow ab.
- `npm run check:types && npm run lint && npm run check:format && npm test` bestehen.

### PR 3: Kontext-Untertitel auf LearnScreen und PracticeScreen (M2 + M4)

**Scope:** Beschreibende Untertitel auf den zwei Haupt-Tabs.

Änderungen:

- `client/screens/LearnScreen.tsx`: Untertitel "Wähle ein Thema und teste dein Wissen" unterhalb des Headers.
- `app/(tabs)/practice/index.tsx`: Untertitel "Wiederhole und festige dein Wissen mit verschiedenen Quiz-Modi" im oberen Bereich.

Akzeptanzkriterien:

- Beide Untertitel sind sichtbar und korrekt lokalisiert.
- Beide Untertitel sitzen im Screen-Content und nicht im nativen Header.
- Layout bricht nicht bei langen Übersetzungen.
- Kein visueller Bruch mit dem bestehenden Design.
- Light/Dark Mode korrekt.

### PR 4: Level-Info auf TopicDetailScreen (M3)

**Scope:** Info-Element neben der Level-Anzeige.

Änderungen:

- `client/screens/TopicDetailScreen.tsx`: tappbares Info-Icon neben "1/5 Level" mit toggle-barem Erklärungstext.

Akzeptanzkriterien:

- Info-Icon ist sichtbar neben der Level-Anzeige, sowohl ohne Fortschritt als auch mit vorhandenem Fortschritt.
- Tap blendet den Erklärungstext ein/aus.
- Animation ist flüssig.
- Text ist korrekt lokalisiert.
- Tests decken das Toggle-Verhalten in beiden UI-Zuständen ab.
- Bestehende Topic-Detail-Tests laufen noch durch.

---

## Verifikationsplan

### Automatisierte Checks

- `npm run check:types`
- `npm run lint`
- `npm run check:format`
- `npm test`
- Neue oder angepasste Tests für Storage-Persistenz, Initialsprachen-Ableitung, Root-Redirects, Welcome-Flow, Untertitel und Level-Info sind enthalten.

### Manuelle Checks

- **Erster Start (frische Installation, Gerät auf Deutsch):** Welcome-Screen → Language Select → Learn (mit Untertitel).
- **Erster Start (frische Installation, Gerät auf Englisch):** Welcome-Screen und `language-select` erscheinen auf Englisch.
- **Zweiter Start:** Welcome-Screen wird übersprungen, direkt zum Learn-Tab.
- **Fortschritt zurücksetzen:** Welcome-Screen wird trotzdem nicht erneut angezeigt.
- **Sprachwechsel:** Alle neuen Texte wechseln korrekt zwischen DE und EN.
- **Dark Mode:** Alle neuen Screens und Texte sind korrekt gestylt.
- **TopicDetail ohne Fortschritt:** Level-Info ein-/ausblenden funktioniert.
- **TopicDetail mit Fortschritt:** Level-Info ein-/ausblenden funktioniert.
- **Practice-Tab:** Untertitel ist sichtbar und korrekt positioniert.
- **Back-Verhalten nach Welcome:** Von `language-select` führt Back nicht zurück zum Welcome-Screen.

### Flow-Checks

- Kompletter Erstnutzer-Flow: Welcome → Language Select → Learn → Topic Detail (Level-Info) → Quiz → Practice (Untertitel)
- Wiederkehrender Nutzer: App öffnen → direkt Learn (Untertitel sichtbar)
- Technologie-Wechsel: Settings → Technologie wechseln → Language Select (kein Welcome-Screen)

---

## Betroffene Dateien (Übersicht)

Neue Dateien:

- `client/screens/WelcomeScreen.tsx`
- `app/welcome.tsx`

Geänderte Dateien:

- `app/index.tsx`
- `app/_layout.tsx`
- `client/contexts/LanguageContext.tsx`
- `client/lib/storage.ts`
- `client/lib/i18n.ts`
- `client/screens/LearnScreen.tsx`
- `client/screens/TopicDetailScreen.tsx`
- `app/(tabs)/practice/index.tsx`
- Ggf. `package.json`

## Definition of Done

- Beim ersten Start ist sofort erkennbar, was CodeCompanion ist und was die App bietet.
- Die Zielgruppe wird klar kommuniziert: sowohl Lernende als auch erfahrene Entwickler erkennen die App als Werkzeug zum Üben, Überprüfen, Auffrischen und Vertiefen.
- Der bestehende Navigationsflow ist intakt und fühlt sich nicht "aufgebläht" an.
- Der Welcome-Screen ist ein einmaliger, schneller Einstieg — kein Blocker.
- Alle Texte sind in Deutsch und Englisch vorhanden.
- Das Level-System ist für Erstnutzer auf dem TopicDetailScreen verständlich.
- Die Unterscheidung zwischen "Lernen" und "Üben" Tabs ist durch kontextuelle Beschreibungen klarer.
- Keine Regressionen in bestehenden Tests oder visuellen Flows.
