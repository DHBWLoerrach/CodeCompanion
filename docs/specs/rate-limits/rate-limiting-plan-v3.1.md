# Rate-Limiting mit Supabase (Light) — Implementierungsplan v3.1

## Zusammenfassung

Einfaches, serverseitiges Rate Limiting für zwei Expo API Routes, **ohne Registrierung** und **ohne Supabase Auth/JWT**. Supabase wird ausschließlich als Datenbank verwendet. Die Geräteidentifikation erfolgt über eine client-seitig generierte UUID, die vor dem Speichern im Backend **gehasht** wird.

## Ziele

- OpenAI-Aufrufe serverseitig begrenzen
- Kein Benutzerkonto nötig
- Sehr kleiner Implementierungsaufwand
- Schutz vor versehentlichen Schleifen, einfachem Script-Traffic und Budget-Spikes
- Keine Abhängigkeit von Supabase Auth

## Nicht-Ziele

- Kein starker Schutz gegen gezielte, technisch versierte Angreifer
- Keine verlässliche Nutzeridentität
- Keine faire Multi-Device-Zuordnung über Accounts hinweg
- Keine App-Attestation in v3.1

---

## Verifizierte Plattformannahmen

### Supabase

- Verwendet wird ein **neuer Secret Key** (`sb_secret_...`), nicht der legacy `service_role` JWT-Key.
- Secret Keys autorisieren über die eingebaute `service_role`-Rolle und **umgehen RLS**.
- Secret Keys dürfen nur in **sicheren, entwicklerkontrollierten** Server-Komponenten verwendet werden.
- Falls das bestehende Projekt noch auf dem alten Key-Modell läuft, funktioniert `service_role` technisch weiterhin — Zielzustand für neue Implementierung ist aber der **Secret Key**.

### Expo / EAS

- Expo API Routes leben in Dateien mit `+api.ts` und laufen **serverseitig**.
- Dafür muss in Expo Router `web.output: "server"` gesetzt sein.
- EAS Hosting basiert auf Cloudflare Workers (V8 Isolates, kein Dateisystem, stateless).
- Für EAS Hosting können **plaintext**- und **sensitive**-Environment-Variablen deployed werden, **nicht** Variablen mit Sichtbarkeit **secret**.

### Supabase Data API / RLS

- Tabellen im `public`-Schema sind über die Supabase Data API exponiert.
- Wird eine Tabelle per SQL angelegt, ist **RLS nicht automatisch aktiv**.
- Für `public.api_usage` muss **RLS explizit aktiviert** werden, ohne Policies anzulegen. So ist die Tabelle für reguläre Clients (`anon`, `authenticated`) gesperrt, während der serverseitige Secret Key weiterhin arbeiten kann.

---

## Eckdaten

| Parameter | Wert |
|---|---|
| Endpunkte | `quiz/generate`, `quiz/generate-mixed` |
| Geräte-Limit gesamt | **5 Requests / Gerät / Tag** |
| davon `quiz/generate` | **max. 4 / Tag** |
| davon `quiz/generate-mixed` | **max. 2 / Tag** |
| Globales Limit | **60 Requests / Tag** (alle Geräte, alle Endpunkte) |
| Geräte-ID | Client-generierte UUID v4 |
| Speicherung im Backend | **SHA-256-Hash** der Geräte-ID |
| Supabase-Zugriff | Serverseitig per Secret Key |
| Zusätzlicher Schutz | Harte Budgetgrenze beim KI-Anbieter (bereits aktiv) |

### Quota-Modell erklärt

Das Geräte-Limit arbeitet mit einem Gesamtbudget plus Teilkontingenten:

- Ein Nutzer hat **5 Requests pro Tag insgesamt**, egal welchen Endpunkt er nutzt.
- Davon dürfen **maximal 4** auf `quiz/generate` entfallen.
- Davon dürfen **maximal 2** auf `quiz/generate-mixed` entfallen.

Das verhindert, dass ein Endpunkt den anderen komplett blockiert, ohne das Budget zu verdoppeln.

**Beispiele gültiger Nutzung an einem Tag:**

| generate | mixed | gesamt | erlaubt? |
|---|---|---|---|
| 4 | 1 | 5 | ✓ |
| 3 | 2 | 5 | ✓ |
| 5 | 0 | 5 | ✗ (`generate` max. 4) |
| 2 | 3 | 5 | ✗ (`mixed` max. 2) |
| 4 | 2 | 6 | ✗ (gesamt max. 5) |

### Kostenrahmen

Bei ca. 60 Requests/Tag global und den üblichen Kosten pro Quiz-Generierung bleibt das grob im Bereich von rund 9 USD pro 30 Tage. Die harte Budgetgrenze beim KI-Anbieter fängt Abweichungen zusätzlich auf.

---

## Architektur

```text
Mobile App (Expo)
  │
  │  POST /api/quiz/generate
  │  Header: X-Device-Id: <uuid-v4>
  │
  ▼
Expo API Route (EAS Hosting)
  │
  ├─ 1. X-Device-Id vorhanden und formal gültig (UUID v4)? → sonst 400
  ├─ 2. Payload valide? → sonst 400 (kein Quota-Verbrauch)
  ├─ 3. Device-ID hashen (SHA-256)
  ├─ 4. Globales Tageslimit prüfen → sonst 429
  ├─ 5. Geräte-Gesamtlimit prüfen → sonst 429
  ├─ 6. Geräte-Endpunktlimit prüfen → sonst 429
  ├─ 7. Quota-Zeile schreiben
  │
  ▼
OpenAI API (nur wenn 1–7 bestanden)
```

### Wichtige Entscheidung: Quota vor dem Upstream-Call

Gültige, zugelassene Requests verbrauchen Quota **auch dann**, wenn der OpenAI-Call später fehlschlägt. Das hält das System einfach und erschwert Missbrauch per Retry-Schleife.

### Fail-Closed

Wenn Supabase für den Quota-Check nicht erreichbar ist oder der Insert fehlschlägt, wird **kein** OpenAI-Call gemacht. Stattdessen: `503 Service Unavailable`. Bei Budget-Schutz ist „fail closed" die sicherere Wahl.

---

## Environment-Variablen

### Serverseitig (EAS Hosting, Sichtbarkeit: sensitive)

```bash
SUPABASE_URL=...
SUPABASE_SECRET_KEY=sb_secret_...
OPENAI_API_KEY=...
API_QUOTA_ENABLED=true
```

### Regeln

- Nie `EXPO_PUBLIC_` für Secret Keys verwenden.
- Nie in Source Control committen.
- Nie in Fehlermeldungen oder Logs ausgeben.
- Nach Änderungen an Server-Variablen neu deployen.

---

## Datenmodell

Eine einzige, einfache Append-Tabelle:

```sql
create table public.api_usage (
  id bigint generated always as identity primary key,
  device_id_hash text not null,
  endpoint text not null check (endpoint in ('quiz/generate', 'quiz/generate-mixed')),
  usage_date date not null default ((now() at time zone 'utc')::date),
  created_at timestamptz not null default now()
);

-- Geräte-Abfragen: Gesamt pro Tag und pro Endpunkt pro Tag
create index idx_api_usage_device_day
  on public.api_usage (device_id_hash, usage_date);

-- Globale Abfrage: alle Requests pro Tag
create index idx_api_usage_global_day
  on public.api_usage (usage_date);

-- RLS aktivieren, keine Policies → für anon/authenticated gesperrt
alter table public.api_usage enable row level security;
```

Jeder erfolgreiche Request erzeugt eine Zeile. Die Zählung erfolgt per `count(*)`.

**Kein Upsert-Counter, keine RPC-Funktion nötig.** Bei 60 Requests/Tag sind die Datenmengen winzig. Theoretische Race Conditions können dazu führen, dass in seltenen Fällen 1–2 Requests über ein Limit rutschen — bei der aktiven Budgetgrenze beim Anbieter ist das akzeptabel.

---

## Quota-Konfiguration

```ts
// Geräte-Limits
const DEVICE_TOTAL_LIMIT_PER_DAY = 5;
const DEVICE_GENERATE_LIMIT_PER_DAY = 4;
const DEVICE_MIXED_LIMIT_PER_DAY = 2;

// Globales Limit
const GLOBAL_LIMIT_PER_DAY = 60;
```

---

## Implementierung

### Phase 1 — Datenbank vorbereiten (Human)

**Aufwand:** 5 Minuten

1. SQL im Supabase SQL Editor ausführen (Tabelle, Indizes, RLS).
2. Prüfen: Tabelle `public.api_usage` existiert, RLS ist aktiv.
3. Secret Key bereithalten (`sb_secret_...`).

**Abnahme:** Tabelle existiert, RLS aktiv, Key liegt nur serverseitig vor.

---

### Phase 2 — Server: Supabase-Client + Quota-Helfer (Coding-Agent)

**Aufwand:** ca. 30 Minuten

**Neue Dateien:**
- `app/api/_lib/supabase.ts`
- `app/api/_lib/quota.ts`

#### Supabase-Client

- `createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)`
- Optionen: `persistSession: false`, `autoRefreshToken: false`
- Nur in serverseitigem Code importieren

#### Quota-Helfer

Funktion `checkAndConsumeQuota(deviceIdHash, endpoint)`:

1. Globalen Tageszähler abfragen (`count(*)` für `usage_date = heute`)
2. Geräte-Gesamtzähler abfragen (`count(*)` für `device_id_hash + usage_date = heute`)
3. Geräte-Endpunktzähler abfragen (`count(*)` für `device_id_hash + usage_date + endpoint = heute`)
4. Gegen alle drei Limits prüfen
5. Wenn erlaubt: Zeile in `api_usage` schreiben und Ergebnis zurückgeben
6. Wenn nicht erlaubt: Ablehnungsgrund zurückgeben

Rückgabetyp:

```ts
type QuotaResult =
  | {
      allowed: true;
      remainingDevice: number;
      remainingGlobal: number;
      resetAtUtc: string;
    }
  | {
      allowed: false;
      reason: 'global_day' | 'device_total' | 'device_endpoint';
      retryAfterSeconds: number;
      resetAtUtc: string;
    };
```

Hilfsfunktion für 429-Responses mit Headern:
- `Retry-After` (Sekunden bis Mitternacht UTC)
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

Bei Supabase-Fehler: `503 Service Unavailable`, kein OpenAI-Call.

**Abnahme:** Helfer lässt sich isoliert testen (unter Limit, Endpunkt-Limit, Gesamtlimit, globales Limit, DB-Fehler).

---

### Phase 3 — Server: Integration in API Routes (Coding-Agent)

**Aufwand:** ca. 20 Minuten

**Dateien:**
- `app/api/quiz/generate+api.ts`
- `app/api/quiz/generate-mixed+api.ts`

Reihenfolge in jeder Route:

1. `X-Device-Id`-Header lesen → fehlt oder kein UUID-v4-Format → `400`
2. Request-Body parsen und validieren → ungültig → `400` (kein Quota-Verbrauch)
3. Device-ID mit SHA-256 hashen
4. `checkAndConsumeQuota(deviceIdHash, endpoint)` aufrufen
5. Bei `allowed: false` → `429` mit Rate-Limit-Headern
6. Bei DB-Fehler → `503`
7. Erst dann OpenAI-Call ausführen

Keine Secrets in Fehlermeldungen oder Logs.

**Abnahme:** OpenAI wird nie ohne erfolgreiche Quota-Freigabe aufgerufen.

---

### Phase 4 — Client: Device-ID erzeugen und mitsenden (Coding-Agent)

**Aufwand:** ca. 15 Minuten

**Dateien:**
- Neu: `client/lib/device-id.ts`
- Anpassung: `client/lib/query-client.ts`

Schritte:

1. Beim ersten App-Start UUID v4 generieren, in AsyncStorage speichern.
2. Bei jedem Quiz-Request Header `X-Device-Id: <uuid>` mitsenden.
3. Bei `429` dem Nutzer eine verständliche Meldung anzeigen:
   - Tageslimit: „Tageslimit erreicht. Morgen geht's weiter."
   - Globales Limit: „Die App ist heute ausgelastet. Morgen geht's weiter."

**Abnahme:** Bestehende Quiz-Flows funktionieren wie bisher, Header wird mitgesendet, 429 wird sauber aufgefangen.

---

### Phase 5 — EAS Deployment (Human)

**Aufwand:** 10 Minuten

1. Environment-Variablen in EAS setzen (Sichtbarkeit: sensitive):
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `OPENAI_API_KEY`
   - `API_QUOTA_ENABLED=true`
2. Server Output prüfen (`web.output: "server"` in App-Config)
3. Deployment anstoßen
4. Smoke-Test:
   - Request ohne Device-ID → `400`
   - Normaler Request → `200`
   - 5. `generate`-Request desselben Geräts → `429`
   - 3. `generate-mixed`-Request desselben Geräts → `429`
   - 6. Request gesamt desselben Geräts → `429`

**Abnahme:** Statuscodes und Limits verhalten sich wie erwartet.

---

## Aufräum-Job

Alte Daten regelmäßig löschen (manuell oder per Supabase Cron):

```sql
delete from public.api_usage
where usage_date < ((now() at time zone 'utc')::date - interval '60 days');
```

---

## Logging

**Loggen:** Statuscode, Endpoint, Grund für 429, Hash der Device-ID, Dauer des Upstream-Calls.

**Nicht loggen:** Roher Secret Key, roher API Key, rohe Geräte-UUID, vollständiger Request-Body.

---

## Testmatrix

| # | Szenario | Ergebnis |
|---|---|---|
| 1 | Kein `X-Device-Id`-Header | 400 |
| 2 | Ungültiges UUID-Format | 400 |
| 3 | Gültige ID, gültige Payload, unter Limit | 200 |
| 4 | Ungültige Payload, gültige ID | 400, kein Quota-Verbrauch |
| 5 | 5. `generate`-Request am selben Tag | 429 |
| 6 | 3. `generate-mixed`-Request am selben Tag | 429 |
| 7 | 6. Request gesamt am selben Tag | 429 |
| 8 | 61. globaler Request am selben Tag | 429 |
| 9 | Supabase nicht erreichbar | 503, kein OpenAI-Call |
| 10 | 429 enthält `Retry-After`-Header | ✓ |
| 11 | Nächster UTC-Tag → Zähler zurückgesetzt | 200 |
| 12 | RLS aktiv, anonyme Abfrage auf `api_usage` | kein Zugriff |

---

## Rollback

**Soft Rollback:** `API_QUOTA_ENABLED=false` in EAS setzen → Quota-Check wird übersprungen, App läuft ohne Limits.

**Sicherheitsnetz:** Harte Budgetgrenze beim KI-Anbieter bleibt unabhängig aktiv.

---

## Bewusste Grenzen

- Geräte-ID ist fälschbar und per Reinstall zurücksetzbar
- Kein Schutz gegen gezieltes Reverse Engineering
- Count-then-insert ist nicht streng atomar (1–2 Requests können über Limits rutschen)

Für den Start vertretbar, weil: globales Budget eng gedeckelt, Tageslimits bremsen Kostenwellen, Budgetgrenze beim Anbieter fängt den Rest, Implementierung bleibt klein.

---

## Spätere Erweiterungspfade

Alle unabhängig nachrüstbar, ohne Umbau des bestehenden Systems:

1. **`@expo/app-integrity`:** Attestation-Token als zusätzlichen Guard vor dem Quota-Check. Auf iOS kann App Attest einen persistenten `keyId` pro Installation liefern; auf Android ist es eher ein Vertrauensnachweis pro Request als ein direkter Ersatz für eine dauerhafte Geräte-ID.
2. **Burst-Schutz:** Kleines Zeitfenster-Limit ergänzen, z. B. `2 Requests / 10 Minuten` pro Gerät, falls ihr frühe Tages-Spikes oder Script-Traffic in den Logs seht.
3. **Supabase Anonymous Auth:** JWT-basierte Identität nachrüsten, falls stärkere Zuordnung nötig wird. Die Quota-Tabelle bleibt, `device_id_hash` wird durch `user_id` ersetzt.
4. **Caching:** Vorab generierte Fragen für häufige Quiz-Kombinationen, um API-Kosten zu senken.
5. **Gewichtete Quotas:** Unterschiedliche Kosten pro Endpunkt, falls einer deutlich teurer wird.
6. **Atomare DB-Funktion (RPC):** Falls das Volumen deutlich steigt und Race Conditions relevant werden.
