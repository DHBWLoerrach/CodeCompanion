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

__tests__/
  unit/                 Unit Tests
  integration/          Integrationstests

e2e/
  maestro/              E2E Tests (Maestro)
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
  In Produktion wird dieser Wert aus der EAS-Environment `production` gelesen.
  Lokal kann ein eigener Dev-Key genutzt werden.

### Optional

- `OPENAI_MODEL`  
  Modellname. Standard: `gpt-5.2`.
- `EXPO_PUBLIC_API_URL`
  Basis-URL für API-Calls aus dem Client. In der lokalen Entwicklung wird
  die URL automatisch über Expo Constants (`hostUri`) ermittelt. Für
  Deployments (z. B. EAS) muss diese Variable gesetzt werden.

### Empfohlene Trennung für Keys

- Lokal: eigener Dev-Key in `.env.local` (oder vor Start per Shell-Variable exportieren).
- Produktion: Key nur in EAS Environment `production`.
- Niemals `EXPO_PUBLIC_OPENAI_API_KEY` verwenden.
- Hinweis: `.env` und `.env*.local` sind per `.gitignore` vom Commit ausgeschlossen.

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
- `npm run lint` - ESLint
- `npm run lint:fix` - ESLint mit Auto-Fixes
- `npm run check:types` - TypeScript Check (`tsc --noEmit`)
- `npm run check:format` - Prettier Check
- `npm run format` - Prettier Write
- `npm test` - Alle Tests ausführen
- `npm run test:unit` - Unit Tests
- `npm run test:integration` - Integrationstests
- `npm run test:watch` - Tests im Watch-Modus
- `npm run test:coverage` - Tests mit Coverage-Report
- `npm run test:e2e` - E2E Tests (Maestro)
- `npm run test:e2e:ai` - E2E Tests mit AI-Tag (Maestro)
- `npm run ios` - iOS Build starten
- `npm run android` - Android Build starten

## API Routen

- `POST /api/quiz/generate`  
  Quiz für ein konkretes Topic (`topicId`, `count`, `language`, `skillLevel`).
- `POST /api/quiz/generate-mixed`  
  Gemischtes Quiz über mehrere Topics.
- `POST /api/topic/explain`  
  Erklärungstext für ein Topic.

Implementierung: `app/api/*`  
Prompt- und OpenAI-Logik: `shared/quiz.ts`

## Deployment (EAS Hosting)

### Manuell per GitHub Action

Deployment läuft nur manuell über `.github/workflows/deploy.yml`:

- Trigger: `workflow_dispatch` (kein Push-Trigger)
- Export: `eas env:exec production 'npx expo export --platform web --no-ssg' --non-interactive`
- Deploy: `eas deploy --environment production --prod --non-interactive`

Voraussetzungen:

1. GitHub Secret `EXPO_TOKEN` setzen
2. In EAS Environment `production` mindestens `OPENAI_API_KEY` setzen
3. Action starten: `GitHub -> Actions -> Manual EAS Deploy -> Run workflow`

### Wichtiges Verhalten von EAS-Env-Variablen

- Environment-Variablen sind pro Deployment gebunden.
- Deployments sind immutable.
- Wenn eine Variable (z. B. `OPENAI_API_KEY`) in EAS geändert oder gelöscht wird,
  wirkt das erst nach einem neuen Export + Deploy.

Offizielle Doku:

- https://docs.expo.dev/eas/environment-variables/usage/#using-environment-variables-with-eas-hosting
- https://docs.expo.dev/eas/hosting/environment-variables/

### Warum kein lokales `eas deploy`

Lokale Deploys können versehentlich lokale `.env`-Werte einbeziehen (z. B. wenn
`--environment production` vergessen wird). Deshalb erfolgt Deployment nur über CI.

## API-Key Rotation (OpenAI)

Empfohlener Ablauf:

1. Neuen OpenAI-Key erstellen.
2. In EAS Environment `production` `OPENAI_API_KEY` auf den neuen Wert setzen.
3. Manuellen Deploy-Workflow ausführen.
4. API-Route testen (`/api/quiz/generate`, `/api/topic/explain`).
5. Alten OpenAI-Key erst nach erfolgreichem Test deaktivieren.

Kurzregel: Key-Änderung ohne neuen Deploy hat keinen Effekt auf den laufenden Service.

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
npm run check:format
npm test
```

Formatierung automatisch anwenden:

```bash
npm run format
```

## Lizenz

MIT, siehe `LICENSE`.
