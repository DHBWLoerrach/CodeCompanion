# Rate-Limiting mit Supabase (Light) — Implementierungsplan

## Zusammenfassung

Einfaches, serverseitiges Rate Limiting für zwei Expo API Routes, ohne Authentifizierung. Supabase wird ausschließlich als Datenbank genutzt (kein Auth SDK, kein JWT). Die Geräteidentifikation erfolgt über eine client-seitig generierte UUID.

## Eckdaten

| Parameter | Wert |
|---|---|
| Endpunkte | `quiz/generate`, `quiz/generate-mixed` |
| Geräte-Limit | 10 Requests / Gerät / Tag / Endpunkt |
| Globales Limit | 500 Requests / Tag (alle Geräte, alle Endpunkte) |
| Geräte-ID | Client-generierte UUID (in AsyncStorage) |
| Speicher | Supabase Postgres (bestehendes Projekt) |
| Zugriff | `service_role`-Key aus API Route (serverseitig) |
| Zusätzlicher Schutz | Harte Budgetgrenze beim KI-Anbieter (bereits aktiv) |

## Architektur

```
Mobile App (Expo)
  │
  │  POST /api/quiz/generate
  │  Header: X-Device-Id: <uuid>
  │
  ▼
EAS API Route (Cloudflare Worker)
  │
  ├─ 1. Device-ID vorhanden? → sonst 400
  ├─ 2. Payload valide? → sonst 400 (kein Quota-Verbrauch)
  ├─ 3. Globales Tageslimit prüfen → sonst 429
  ├─ 4. Geräte-Tageslimit prüfen → sonst 429
  ├─ 5. Beide Zähler inkrementieren
  │
  ▼
OpenAI API (nur wenn 1–5 bestanden)
```

## Datenmodell

Eine einzige Tabelle, bewusst einfach gehalten:

```sql
create table public.api_usage (
  id bigint generated always as identity primary key,
  device_id text not null,
  endpoint text not null,
  usage_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now()
);

-- Index für Geräte-Abfrage (pro Gerät + Tag + Endpunkt)
create index idx_api_usage_device
  on public.api_usage (device_id, usage_date, endpoint);

-- Index für globale Abfrage (pro Tag)
create index idx_api_usage_global
  on public.api_usage (usage_date);
```

Jeder erfolgreiche API-Request erzeugt eine Zeile. Die Zählung erfolgt per `count(*)`.

**Warum kein atomarer Upsert wie in der ursprünglichen Spec?**
Für euren Anwendungsfall (max. wenige hundert Requests/Tag, kein paralleler Hochlast-Traffic) reicht ein einfaches Insert-Modell. Race Conditions sind bei eurem Volumen praktisch irrelevant — im schlimmsten Fall rutschen 1–2 Requests über das Limit, was bei der aktiven Budgetgrenze beim Anbieter kein Problem ist.

## Aufräum-Job

Alte Daten regelmäßig löschen (z. B. wöchentlich manuell oder per Supabase Cron):

```sql
delete from public.api_usage
where usage_date < (now() at time zone 'utc')::date - interval '30 days';
```

## Implementierung

### Phase 1 — Datenbank (Human)

**Aufwand:** 5 Minuten

1. Im Supabase SQL Editor die Tabelle und Indizes anlegen (SQL oben).
2. Prüfen, dass die Tabelle unter `public.api_usage` sichtbar ist.

**Abnahme:** Tabelle existiert, Indizes sind aktiv.

---

### Phase 2 — Server: Quota-Helfer (Coding-Agent)

**Aufwand:** ca. 30 Minuten

**Neue Datei:** `app/api/_lib/quota.ts`

Aufgaben:
1. Supabase-Client mit `service_role`-Key initialisieren (reiner HTTP-Client, kein Auth SDK nötig — `@supabase/supabase-js` genügt für DB-Zugriff).
2. Funktion `checkAndConsumeQuota(deviceId, endpoint)` implementieren:
   - Globalen Tageszähler abfragen (`count(*)` für heute).
   - Geräte-Tageszähler abfragen (`count(*)` für heute + device_id + endpoint).
   - Wenn beide unter Limit → Insert und `{ allowed: true }` zurückgeben.
   - Wenn eines erreicht → `{ allowed: false, reason: 'device' | 'global' }` zurückgeben.
3. Hilfsfunktion für einheitliche 429-Response mit Headern:
   - `Retry-After` (Sekunden bis Mitternacht UTC)
   - `X-RateLimit-Limit`
   - `X-RateLimit-Remaining`
   - `X-RateLimit-Reset` (UTC-Timestamp)

**Konfiguration über Konstanten** (oder Environment-Variablen):

```ts
const DEVICE_LIMIT_PER_DAY = 10;   // pro Gerät pro Endpunkt
const GLOBAL_LIMIT_PER_DAY = 500;  // über alles
```

**Abnahme:** Helfer lässt sich isoliert testen (Quota verbrauchen, Limit erreichen, Reset nach Tageswechsel).

---

### Phase 3 — Server: Integration in API Routes (Coding-Agent)

**Aufwand:** ca. 20 Minuten

**Dateien:**
- `app/api/quiz/generate+api.ts`
- `app/api/quiz/generate-mixed+api.ts`

Anpassungen pro Route:
1. `X-Device-Id`-Header auslesen. Fehlt er oder ist er kein valides UUID-Format → 400.
2. Request-Body parsen und validieren → bei Fehler 400 (kein Quota-Verbrauch).
3. `checkAndConsumeQuota(deviceId, endpoint)` aufrufen.
4. Bei `allowed: false` → 429 mit Rate-Limit-Headern zurückgeben.
5. Erst dann den OpenAI-Call ausführen.

**Abnahme:**
- Ohne `X-Device-Id` → 400
- Mit Device-ID, ungültige Payload → 400 (Quota unverändert)
- Mit Device-ID, 11. Request am selben Tag → 429
- Request 501 global → 429

---

### Phase 4 — Client: Device-ID erzeugen und mitsenden (Coding-Agent)

**Aufwand:** ca. 15 Minuten

**Dateien:**
- Neu: `client/lib/device-id.ts`
- Anpassung: `client/lib/query-client.ts`

Schritte:
1. Beim ersten App-Start eine UUID v4 generieren und in AsyncStorage speichern.
2. Bei jedem API-Request den Header `X-Device-Id: <uuid>` mitsenden.
3. Bei 429-Response den Nutzer informieren ("Tageslimit erreicht, morgen geht's weiter").

**Abnahme:** Bestehende Quiz-Flows funktionieren wie bisher, Header wird mitgesendet.

---

### Phase 5 — EAS Deployment (Human)

**Aufwand:** 10 Minuten

1. Environment-Variablen in EAS setzen (falls nicht schon vorhanden):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Deployment über bestehenden GitHub-Workflow anstoßen.
3. Smoke-Test:
   - Request ohne Device-ID → 400
   - Normaler Request → 200
   - 11. Request vom selben Gerät → 429

**Abnahme:** Alle drei Statuscodes kommen korrekt zurück.

## Vergleich zur ursprünglichen Spezifikation

| Aspekt | Ursprüngliche Spec | Dieser Plan |
|---|---|---|
| Authentifizierung | Supabase Anonymous Auth + JWT | Keine (Device-UUID) |
| Datenmodell | 2 Tabellen + Enum + PL/pgSQL-Funktion | 1 einfache Tabelle |
| Token-Management | JWT + Refresh + SecureStore | Kein Token |
| Phasen | 8 | 5 |
| Neue Abhängigkeiten | supabase-js, secure-store, url-polyfill | supabase-js (nur Server) |
| Schutz gegen Scripts | Stark (JWT-Verifizierung) | Schwach (UUID fälschbar) |
| Geschätzter Aufwand | Mehrere Tage | 2–3 Stunden |

## Spätere Erweiterungspfade

Alle unabhängig nachrüstbar, ohne Umbau des bestehenden Systems:

1. **@expo/app-integrity:** Attestation-Token als zusätzlichen Guard vor dem Quota-Check. Verifizierter Geräte-Identifier kann die UUID ablösen.
2. **Supabase Anonymous Auth:** Falls stärkere Identität nötig wird, JWT-basierte Identifikation nachrüsten. Die Quota-Tabelle bleibt, nur die `device_id`-Spalte wird durch `user_id` ersetzt.
3. **Gewichtete Quotas:** Statt einfacher Request-Zählung unterschiedliche Kosten pro Endpunkt, falls ein Endpunkt deutlich teurer ist.
4. **Individuelle Limits:** Zusätzliche Tabelle für User-spezifische Limits oder temporäre Sperren.

## Testmatrix

| # | Szenario | Ergebnis |
|---|---|---|
| 1 | Kein `X-Device-Id`-Header | 400 |
| 2 | Ungültiges UUID-Format | 400 |
| 3 | Gültige ID, unter Limit | 200 |
| 4 | Gültige ID, 11. Request (Geräte-Limit) | 429 |
| 5 | Gültige ID, 501. Request global | 429 |
| 6 | Ungültige Payload, gültige ID | 400 (kein Quota-Verbrauch) |
| 7 | 429-Response enthält Retry-After-Header | ✓ |
| 8 | Nächster Tag → Zähler zurückgesetzt | 200 |

## Rollback

1. **Schnell:** Environment-Variable `API_QUOTA_ENABLED=false` setzen, in der Quota-Funktion prüfen → Quota-Check wird übersprungen, App läuft ohne Limits weiter.
2. **Sicherheitsnetz:** Budgetgrenze beim KI-Anbieter bleibt immer aktiv und greift unabhängig.
