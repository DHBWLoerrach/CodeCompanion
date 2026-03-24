# DHBW Code Companion

Mobile Lern- und Übungsapp für Programmiergrundlagen an der DHBW Lörrach.

## Überblick

Code Companion unterstützt Studierende beim selbstgesteuerten Lernen:

- Themenbasiertes Lernen mit Curricula für JavaScript, Python und Java
- KI-gestützte Quiz-Generierung pro Thema oder als Mixed Quiz
- KI-Erklärungen zu Themen als Markdown-Modal
- Fortschritt, Skill-Level und Lernstreaks pro Programmiersprache
- App-Lokalisierung (Deutsch/Englisch) und Theme-Modi (System/Hell/Dunkel)
- Produktfokus ausschließlich auf Android und iOS; keine geplante Webapp

Die App wurde am Studienzentrum IT-Management & Informatik (SZI) der DHBW Lörrach unter Leitung von Prof. Dr. Erik Behrends entwickelt.

- SZI: https://www.dhbw-loerrach.de/szi
- Quellcode: https://github.com/DHBWLoerrach/CodeCompanion
- Feedback: apps@dhbw-loerrach.de

## Datenschutz

- Es werden keine benutzerbezogenen Daten auf Servern gespeichert.
- Lernfortschritt, Profil und Einstellungen liegen ausschließlich lokal auf dem Gerät (AsyncStorage).

## Tech Stack

- Expo SDK 55 + React Native 0.83 + React 19.2
- Expo Router 6 (file-based routing)
- React Query
- Expo API Routes (`app/api/*`) über `web.output="server"` für serverseitige Endpunkte
- OpenAI Responses API (Server-seitig in `server/quiz.ts`)
- AsyncStorage (lokale Persistenz)

## Projektstruktur

```text
app/                            Expo Router Routen + API Routes
  (tabs)/                       Learn, Practice, Progress
  api/                          quiz + topic explain endpoints
  _layout.tsx                   globale Provider + Stack-Layout

client/
  components/                   UI-Bausteine
  screens/                      Screen-Implementierungen
  hooks/                        Hooks (z. B. useTranslation)
  contexts/                     Theme/Language/ProgrammingLanguage Contexts
  lib/                          storage, i18n, topics-Adapter, query-client
  constants/                    Design-Tokens

server/
  quiz.ts                       Prompting + OpenAI-Integration
  topic-prompts.ts              Topic-ID -> Prompt-Mapping je Sprache
  validation.ts                 Request-Validierung für API Routes
  logging.ts                    API-Error-Logging

shared/
  curriculum/                   JSON-Curricula + Loader/Validierung
  programming-language.ts       unterstützte Programmiersprachen
  skill-level.ts                Shared Types (Skill/Difficulty)

__tests__/
  unit/                         Unit Tests
  integration/                  Integrationstests

e2e/
  maestro/                      E2E Tests (Maestro)
```

## Voraussetzungen

- Node.js 20+
- npm 10+
- Expo Go App (optional, für schnelles Testen)

## Installation

```bash
npm ci
```

### Wichtig für das Team (macOS + Windows)

Für das initiale Setup immer `npm ci` verwenden, nicht `npm install`.
So werden exakt die Versionen aus `package-lock.json` installiert und unnötige Lockfile-Änderungen zwischen Betriebssystemen reduziert.

## Abhängigkeiten ändern (add/update/remove)

`npm ci` ist für ein reproduzierbares Setup gedacht.
Wenn Abhängigkeiten geändert werden sollen, erfolgt das bewusst mit `npm install` oder `npm uninstall`:

- Hinzufügen: `npm install <paket>` (bzw. `npm install -D <paket>` für Dev-Dependencies)
- Aktualisieren: `npm install <paket>@<version>` oder `npm update <paket>`
- Entfernen: `npm uninstall <paket>`

Dabei werden `package.json` und `package-lock.json` aktualisiert.
Beide Dateien müssen gemeinsam committed werden.

## Umgebungsvariablen

### Erforderlich für KI-Funktionen

- `OPENAI_API_KEY`
  - API-Key für `POST /v1/responses`.
  - Nur server-seitig verwenden.
  - In Produktion aus der EAS-Environment `production`.

### Optional

- `OPENAI_MODEL`
  - Modellname, Standard: `gpt-5.4-nano`.
- `EXPO_PUBLIC_API_URL`
  - Basis-URL für API-Calls im Client (für Deployments erforderlich).
- `API_QUOTA_ENABLED`
  - Aktiviert serverseitiges Rate Limiting für `POST /api/quiz/generate` und `POST /api/quiz/generate-mixed`.
  - Lokaler Standard: `false`.
- `SUPABASE_URL`
  - Nur erforderlich, wenn `API_QUOTA_ENABLED=true`.
  - URL der dedizierten Supabase-Instanz für Quota-Daten.
- `SUPABASE_SECRET_KEY`
  - Nur server-seitig verwenden.
  - Nur erforderlich, wenn `API_QUOTA_ENABLED=true`.
  - Verwendet den serverseitigen Zugriff auf `public.api_usage`.

### Sicherheitshinweise

- Niemals `EXPO_PUBLIC_OPENAI_API_KEY` verwenden.
- Niemals `EXPO_PUBLIC_SUPABASE_SECRET_KEY` oder andere Secrets mit `EXPO_PUBLIC_` versehen.
- OpenAI-Key als `Restricted` anlegen und nur `Responses: Write` erlauben.
- `.env` und `.env*.local` sind per `.gitignore` vom Commit ausgeschlossen.

### Lokale Modi

- Standardmodus:
  - `API_QUOTA_ENABLED=false`
  - Keine lokale Supabase-Abhängigkeit
- Integrationsmodus:
  - `API_QUOTA_ENABLED=true`
  - `SUPABASE_URL` und `SUPABASE_SECRET_KEY` müssen gesetzt sein
  - Nur gegen eine dedizierte Dev-/Test-Supabase-Instanz testen, nie gegen Produktion

## Entwicklung starten

```bash
npm run start
```

Danach in Expo:

- iOS Simulator (`i`)
- Android Emulator (`a`)

Hinweis:

- `web.output="server"` wird in diesem Projekt nur genutzt, um Expo API Routes auf EAS Hosting bereitzustellen.
- Eine produktive Webapp ist aktuell nicht geplant.
- `w` ist daher kein regulärer Produktpfad, höchstens ein lokaler Debug-/Testpfad für API-Route-nahe Entwicklung.

## Verfügbare Skripte

- `npm run start` - Expo Dev Server starten
- `npm run ios` - iOS Build starten
- `npm run android` - Android Build starten
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
- `npm run test:e2e` - E2E Smoke Tests (Maestro)
- `npm run test:e2e:ai` - E2E AI-Tests (Maestro)

## API Routen

### `POST /api/quiz/generate`

Erzeugt ein Quiz für ein einzelnes Topic.

Wenn `API_QUOTA_ENABLED=true`, muss der Client zusätzlich den Header `X-Device-Id` mit einer persistierten UUID v4 mitsenden.

Request-Body:

- `topicId` (string, required)
- `count` (number, optional, 1-20, default 5)
- `language` (`en` | `de`, optional, default `en`)
- `skillLevel` (number, optional, default 1)
- `programmingLanguage` (`javascript` | `python` | `java`, optional, default `javascript`)

### `POST /api/quiz/generate-mixed`

Erzeugt ein gemischtes Quiz über mehrere Topics.

Wenn `API_QUOTA_ENABLED=true`, muss der Client zusätzlich den Header `X-Device-Id` mit einer persistierten UUID v4 mitsenden.

Request-Body:

- `count` (number, optional, 1-20, default 10)
- `language` (`en` | `de`, optional, default `en`)
- `skillLevel` (number, optional, default 1)
- `programmingLanguage` (`javascript` | `python` | `java`, optional, default `javascript`)
- `topicIds` (string[], optional, max 20; wenn leer, zufällige Topics)

## Curricula und Inhalte

- Source of truth für Lerninhalte: `shared/curriculum/<language>.json`
- Loader/Validierung: `shared/curriculum/index.ts`
- UI-Adapter: `client/lib/topics.ts`
- Statische Erklärungen: `shared/explanations/*.json`
- Prompt-Mapping: `shared/topic-prompts/*.json`

Beim Start wird die Konsistenz zwischen Topic-IDs und Prompt-Mapping geprüft.

## Deployment (EAS Hosting)

EAS Hosting wird in diesem Projekt für die serverseitigen Expo API Routes genutzt, nicht für eine eigenständige Webapp.

### Verbindliche Deployment-Policy

- Deployments sind ausschließlich über GitHub Actions erlaubt.
- Lokales `eas deploy` ist nicht erlaubt.
- Produktion läuft über `.github/workflows/deploy.yml` (manueller Trigger `workflow_dispatch`).

### Ablauf über GitHub Action

Voraussetzungen:

1. GitHub Secret `EXPO_TOKEN` ist gesetzt.
2. In EAS-Environment `production` ist mindestens `OPENAI_API_KEY` gesetzt.
3. Für aktives Quota-Feature zusätzlich `API_QUOTA_ENABLED=true`, `SUPABASE_URL` und `SUPABASE_SECRET_KEY` setzen.

Workflow-Schritte (vereinfacht):

1. `npm ci`
2. `eas env:exec production 'npx expo export --platform web --no-ssg' --non-interactive`
3. `eas deploy --environment production --prod --non-interactive`

### Wichtiges Verhalten von EAS-Variablen

- Variablen sind pro Deployment gebunden (immutable Deployments).
- Änderungen an Variablen wirken erst nach neuem Export + Deploy.
- EAS Hosting unterstützt für diese Server-Variablen `plaintext` und `sensitive`, aber keine `secret`-Sichtbarkeit.

## Typische Änderungen für Entwickler:innen

### Neues Thema hinzufügen

1. Topic in `shared/curriculum/<language>.json` ergänzen.
2. Prompt in `shared/topic-prompts/<language>.json` ergänzen.
3. Auf gültige `prerequisites` und eindeutige IDs achten.

### Neue Programmiersprache hinzufügen

1. ID in `shared/programming-language.ts` ergänzen.
2. Neues Curriculum in `shared/curriculum/` anlegen.
3. Prompt-Mapping in `shared/topic-prompts/` ergänzen.

### UI-Übersetzungen anpassen

- App-Texte in `client/lib/i18n.ts` pflegen.
- Themen-/Kategorie-Texte bevorzugt im Curriculum (`shared/curriculum/*.json`) pflegen.

### Styling/Theme anpassen

- Farben/Tokens in `client/constants/theme.ts`
- Header/Stack-Defaults in `client/hooks/useScreenOptions.ts`

### Lokale Datenlogik anpassen

- Storage, Settings, Progress in `client/lib/storage.ts`

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
