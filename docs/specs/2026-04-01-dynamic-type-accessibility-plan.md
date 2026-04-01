# Dynamic-Type-Härtung für große Systemschrift

## Zusammenfassung

Dieses Dokument beschreibt die Umsetzung einer robusten Unterstützung großer Systemschrift in der App. Ziel ist, Accessibility nicht global abzuschalten, sondern die UI gezielt für große Schrift zu härten: über eine zentrale Text-Policy, width-aware Reflow-Regeln und klar begrenzte Caps für dichte Einzeilen-Controls.

Die erste Umsetzungswelle umfasst die zentrale Text-Infrastruktur, `Learn`, `Practice`, `Progress`, `Settings`, gemeinsame dichte UI-Komponenten sowie die Native Tab-Bar. Layout-Anpassungen sollen nur auf schmalen Viewports greifen, nicht pauschal auf allen Geräten, da die App zwar auf `portrait` gesperrt ist, aber iPad unterstützt.

## Ziele

- Große Systemschrift soll auf schmalen Geräten nicht mehr zu abgeschnittenen oder überlappenden Texten führen.
- Dynamic Type bleibt grundsätzlich aktiv; nur dichte Einzeilen-Controls werden stärker begrenzt.
- Reflow-Verhalten soll für Phones aggressiver greifen als für breite Portrait-Tablets.
- Die Lösung soll zentral konfigurierbar sein, damit Buckets, Caps und Tab-Label-Varianten später an einer Stelle nachgeschärft werden können.

## Nicht-Ziele

- Keine neue externe Bibliothek für Responsive Fonts oder Device Scaling.
- Keine Änderungen an Server-, API- oder Datenmodellen.
- Keine vollständige UI-Neugestaltung bestehender Screens.
- Keine screen-spezifische Reflow-Welle außerhalb von `Learn`, `Practice`, `Progress` und `Settings`, solange Shared-Änderungen dort keine sichtbaren Regressionen verursachen.

## Zentrale Accessibility-Policy

### Architektur

- Neue pure Policy-Datei in `client/lib` anlegen.
- Neuen Hook in `client/hooks` anlegen, der `useWindowDimensions()` kapselt.
- Die pure Policy exportiert:
  - `getFontScaleCategory(fontScale)`
  - `isCompactViewport(width)` mit Breakpoint `width < 600`
  - `shouldUseLargeLayout(fontScale, width)`
  - `shouldUseAccessibilityLayout(fontScale, width)`
  - `getDefaultTextCap(type)`
  - `getDenseControlTextCap()`
  - `getTabLabel(key, language, compact)`
- Der Hook liefert:
  - `fontScale`
  - `width`
  - `category`
  - `isCompactViewport`
  - `isLargeText`
  - `isAccessibilityText`

### Font-Scale-Buckets

- `default < 1.15`
- `large >= 1.15 && < 1.35`
- `accessibility >= 1.35`

### Begründung

- Android `1.15` soll bereits in den Reflow-Bereich fallen.
- `1.35` bleibt die Schwelle für die stärkeren Accessibility-Anpassungen.
- Reflow-Regeln hängen zusätzlich von der Viewport-Breite ab, damit breite Portrait-Tablets nicht unnötig auf Einspalten-Layouts zurückfallen.

## Text-Policy

### `ThemedText`

- `ThemedText` wird das primäre Safety-Net für app-eigene Texte.
- Default-`maxFontSizeMultiplier` pro Texttyp:
  - `h1`, `h2`, `h3`, `h4`, `body`, `link`: `1.6`
  - `small`, `label`, `caption`, `code`: `1.4`
- Prop-Override bleibt erlaubt, damit einzelne Screens oder Komponenten bewusst engere oder offenere Caps setzen können.

### Dichte Controls

- Dichte Einzeilen-Controls nutzen einen separaten Cap von `1.2`.
- Das gilt explizit für Badge- und Button-Labels.
- Diese niedrigere Grenze ist absichtlich container-basiert, nicht semantik-basiert:
  - freier Inhalts-Text darf stärker wachsen
  - horizontal enge Einzeilen-Controls bleiben visuell stabil und einzeilig

## Audit und Migration app-eigener Textstellen

### Audit-Regeln

- Zu Beginn einen repo-weiten Audit für app-eigene Textstellen ausführen:
  - Raw `<Text>`
  - `TextInput`
  - textnahe Wrapper oder Sonderfälle im App-Code
- Third-Party-Komponenten in `node_modules` werden nicht angepasst.

### Bereits identifizierte lokale Stellen

- `client/components/InlineCodeText.tsx`
- `client/components/ErrorFallback.tsx`
- `client/screens/SettingsScreen.tsx` mit `TextInput`

### Migration

- `InlineCodeText` bekommt für den inneren Code-`Text` denselben passenden Cap wie der umgebende Text-Kontext.
- `ErrorFallback` wird auf `ThemedText` umgestellt oder erhält identische Caps explizit auf den verwendeten `Text`-Elementen.
- Das Display-Name-`TextInput` in `SettingsScreen` wird Dynamic-Type-sicher gemacht:
  - `height` zu `minHeight`
  - passender `maxFontSizeMultiplier`
  - kein Text-Clippen bei großer Schrift

## Gemeinsame UI-Komponenten

### `StatusBadge`

- Bleibt einzeilig.
- Wird shrink-sicher gemacht.
- Nutzt den dichten Control-Cap `1.2`.

### `ActionButton`

- Bleibt einzeilig.
- Feste `height` wird zu `minHeight`.
- Nutzt den dichten Control-Cap `1.2`.
- Zweizeilige Buttons sind in diesem Pass explizit ausgeschlossen.

## Screen-Reflows

### Learn

- Reflow greift nur bei `large/accessibility` und `compact viewport`.
- Die bestehende Zeichenlängen-Heuristik für breite Tiles bleibt außerhalb dieses Falls erhalten.
- Innerhalb dieses Falls wird die Heuristik vollständig umgangen und die Themenliste konsequent einspaltig gerendert.
- Kategorie-Header werden bei großem Text auf schmalen Geräten gestapelt.
- Fortschritts- und Statusbereiche werden wrap-fähig.
- Next-Step-Metadaten werden bei großem Text auf schmalen Geräten vertikal statt inline dargestellt.
- Dieselbe Logik gilt für den „Due for review“-Bereich.

### Practice

- Due-Header darf umbrechen.
- Quiz-Mode-Karten werden bei großem Text auf schmalen Geräten einspaltig.
- Category-Row stapelt Text- und Fortschrittsbereich bei großem Text auf schmalen Geräten.

### Progress

- Stats-Grid wird nur bei `accessibility` und `compact viewport` einspaltig.
- Achievements-Header darf umbrechen.
- Achievement-Karten werden nur bei `accessibility` und `compact viewport` vollbreit.

### Settings

- Das Display-Name-`TextInput` wird height-safe und Dynamic-Type-sicher gemacht.
- Weitere Screen-spezifische Reflow-Anpassungen in `Settings` sind in diesem Pass nicht geplant.

## Native Tab-Bar

- Die NativeTabs werden separat behandelt, weil dort kein `maxFontSizeMultiplier` verfügbar ist.
- Mechanik:
  - kompakte Labels nur bei `accessibility` und `compact viewport`
  - zusätzlich kleinere explizite `labelStyle.fontSize`
- Bedeutungen bleiben erhalten.
- Deutsche kompakte Labels:
  - `Themen`
  - `Üben`
  - `Verlauf`
- Englische Labels bleiben unverändert:
  - `Topics`
  - `Practice`
  - `Progress`

## Umsetzungsreihenfolge

1. Accessibility-Policy und Hook anlegen.
2. Audit der app-eigenen `Text`- und `TextInput`-Stellen durchführen und die bekannten Sonderfälle migrieren.
3. `ThemedText` auf Default-Caps umstellen.
4. `StatusBadge` und `ActionButton` härten.
5. `Learn` auf width-aware Reflow umbauen.
6. `Practice`, `Progress` und das `Settings`-`TextInput` anpassen.
7. NativeTabs auf kompakte Labels und kleinere Label-Font umstellen.
8. Unit-, Komponenten-, Integrations- und manuelle QA ausführen.

## Testplan

### Unit-Tests

- Font-Scale-Buckets:
  - `1.0`, `1.14`, `1.15`, `1.3`, `1.34`, `1.35`, `1.8`, `2.0`
- Width-Grenzen:
  - mindestens `375`, `430`, `768`
- Kombinationslogik:
  - `fontScale + width` für `shouldUseLargeLayout` und `shouldUseAccessibilityLayout`
- Text-Caps:
  - Default-Caps pro `ThemedText`-Typ
  - dichter Control-Cap
- Tab-Bar:
  - Auswahl kompakter Labels abhängig von Sprache und Layoutzustand

### Komponenten-Tests

- `StatusBadge` bleibt einzeilig und clippt nicht durch starre Breite.
- `ActionButton` bleibt einzeilig und clippt nicht durch starre Höhe.
- `SettingsScreen`-`TextInput` clippt nicht bei großer Schrift.

### Integrations-Tests

- `LearnScreen`-Tests mocken immer `fontScale` und `width`.
- Pflichtfälle:
  - schmaler Worst-Case: `width = 375`, `fontScale = 1.35`
  - breiter Tablet-Portrait-Fall: `width = 768`, `fontScale = 1.35`
- Erwartete Ergebnisse:
  - auf schmalem Viewport einspaltiges Topic-Layout
  - gestapelter Kategorie-Header
  - reflowende Next-Step-Metadaten
  - auf breitem Viewport kein unnötiger Einspalten-Zwang

### Manuelle QA

- iOS:
  - `375 / 1.0`
  - `375 / 1.2`
  - `375 / 1.35`
  - `768 / 1.35`
- Android:
  - `375 / 1.0`
  - `375 / 1.15`
  - `375 / 1.3`
  - `375 / 1.8`
  - `375 / 2.0`

## Annahmen und Defaults

- Die App bleibt auf `portrait` gesperrt, unterstützt aber iPad; deshalb ist Viewport-Breite Teil der Reflow-Entscheidung.
- Keine Feature-Flag-Einführung im ersten Schritt; Buckets, Caps und kompakte Labels bleiben zentral konfigurierbar.
- Keine neue externe Bibliothek; die Umsetzung basiert auf React-Native- und Expo-Bordmitteln.
