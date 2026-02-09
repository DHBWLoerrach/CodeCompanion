# DHBW Code Companion

Mobile Lern- und Übungsapp für JavaScript-Themen an der DHBW Lörrach.

## Überblick

Code Companion unterstützt Studierende beim selbstgesteuerten Lernen:

- Themenbasiertes Lernen (z. B. Variablen, Funktionen, Async/Await)
- KI-gestützte Quiz-Generierung
- Erklärungen zu Themen als Modal-Ansicht
- Fortschritt, Skill-Level und Lernstreaks
- Deutsch/Englisch und Light/Dark/System Theme

Die App wurde am Studienzentrum IT-Management & Informatik (SZI) der DHBW Lörrach unter Leitung von Prof. Dr. Erik Behrends entwickelt.

SZI: https://www.dhbw-loerrach.de/szi  
Quellcode: https://github.com/DHBWLoerrach/CodeCompanion  
Feedback: apps@dhbw-loerrach.de

## Datenschutz

- Es werden keine benutzerbezogenen Daten auf Servern gespeichert.
- Nur der Lernfortschritt wird lokal auf dem Gerät gespeichert (AsyncStorage).

## Tech Stack

- Expo SDK 54 + React Native 0.81
- Expo Router (file-based routing)
- React Query
- Expo API Routes (`app/api/*`)
- OpenAI Responses API (über HTTP in `shared/quiz.ts`)
- AsyncStorage (lokale Persistenz)

## Projektstruktur

```text
app/                    Expo Router Routen + API Routes
  (tabs)/               Learn/Practice/Progress
  api/                  quiz + topic explain endpoints
  _layout.tsx           globales Stack-Layout

client/
  components/           UI-Bausteine
  screens/              Screen-Implementierungen
  hooks/                Theme, i18n, Screen Options
  lib/                  storage, topics, query-client, i18n
  constants/            Farben, Spacing, Typografie

shared/
  quiz.ts               Prompting + OpenAI-Integration
```

## Voraussetzungen

- Node.js 20+
- npm 10+
- Expo Go App (optional, empfohlen für schnelles Testen)

## Installation

```bash
npm install
```

## Umgebungsvariablen

### Erforderlich für KI-Funktionen

- `OPENAI_API_KEY`  
  API-Key für den Aufruf von `POST /v1/responses` in `shared/quiz.ts`.

### Optional

- `OPENAI_MODEL`  
  Modellname. Standard: `gpt-5.2`.
- `EXPO_PUBLIC_API_URL`  
  Explizite Basis-URL für API-Calls aus dem Client.

## Entwicklung starten

```bash
npm run start
```

Dann:

- in Expo Go öffnen (QR)
- iOS Simulator (`i`)
- Android Emulator (`a`)
- Web (`w`)

## Verfügbare Skripte

- `npm run start` - Expo Dev Server starten
- `npm run expo:dev` - Replit-angepasster Start
- `npm run lint` - ESLint
- `npm run lint:fix` - ESLint mit Auto-Fixes
- `npm run check:types` - TypeScript Check (`tsc --noEmit`)
- `npm run check:format` - Prettier Check
- `npm run format` - Prettier Write

## API Routen

- `POST /api/quiz/generate`  
  Quiz für ein konkretes Topic (`topicId`, `count`, `language`, `skillLevel`).
- `POST /api/quiz/generate-mixed`  
  Gemischtes Quiz über mehrere Topics.
- `POST /api/topic/explain`  
  Erklärungstext für ein Topic.

Implementierung: `app/api/*`  
Prompt- und OpenAI-Logik: `shared/quiz.ts`

## Navigation & Modals

- Hauptnavigation über `app/(tabs)/_layout.tsx`
- Globale Stack-Konfiguration in `app/_layout.tsx`
- Reusable Modal-Ansicht für "Über diese App" / "Impressum":  
  `app/info-modal.tsx` + `client/screens/InfoModalScreen.tsx`

## Typische Änderungen für Devs

### Neues Lernthema hinzufügen

1. Topic in `client/lib/topics.ts` ergänzen
2. Übersetzungen in `client/lib/i18n.ts` ergänzen
3. Prompt-Mapping in `shared/quiz.ts` (`TOPIC_PROMPTS`) ergänzen

### Styling/Theme anpassen

- Farben und Tokens in `client/constants/theme.ts`
- Header/Stack-Defaults in `client/hooks/useScreenOptions.ts`

### Lokale Datenlogik anpassen

- Storage und Progress in `client/lib/storage.ts`

## Qualitätssicherung

Vor PR/Commit mindestens ausführen:

```bash
npm run check:types
npm run lint
```

Optional zusätzlich:

```bash
npm run check:format
```

## Lizenz

MIT, siehe `LICENSE`.
