# Maestro E2E

## Voraussetzungen

- Installiertes `maestro` CLI
- Laufender iOS Simulator oder Android Emulator
- App installiert mit App-ID `de.dhbwloe.loerrach.CodeCompanion`

## Flows

- `smoke_navigation.yaml`: Tab-Navigation Learn/Practice/Progress
- `smoke_settings_persistence.yaml`: Einstellungen speichern und Persistenz pruefen
- `smoke_quiz_open_close.yaml`: Quiz-Modal oeffnen und sauber schliessen (ohne AI-Abhaengigkeit)
- `ai_quiz_happy_path.yaml`: Quiz erfolgreich bis Session-Summary (benoetigt AI-Backend)

## Ausfuehrung

- Smoke (offline-sicher):
  - `npm run test:e2e`
- AI-Happy-Path:
  - `npm run test:e2e:ai`

## Hinweise

- Die Smoke-Flows nutzen `clearState: true` und sind damit voneinander isoliert.
- Der AI-Flow ist absichtlich separat getaggt, damit CI ohne externe API stabil bleibt.
