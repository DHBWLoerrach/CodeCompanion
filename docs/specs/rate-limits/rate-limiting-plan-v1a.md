# Rate-Limiting mit Supabase (V1, budgettauglich)

## Zusammenfassung

Einfaches, serverseitiges Rate Limiting für zwei Expo API Routes, **ohne Registrierung** und **ohne App-Auth**.
Supabase wird nur als Datenbank genutzt. Die Geräteidentifikation bleibt zunächst eine client-seitig generierte UUID.

Zusätzlich zur Geräte-ID kommen zwei kleine Schutzschichten dazu:

* ein **globales Tageslimit**, das wirklich zu deinem Budget passt
* ein kleines **Burst-Limit**, damit nicht in wenigen Minuten alles verbrannt wird

Der Supabase-Zugriff bleibt ausschließlich serverseitig. Falls euer Projekt schon mit dem alten `service_role` arbeitet, ist das für V1 okay; Supabase weist aber darauf hin, dass `service_role`/Secret Keys nur in sicheren, entwicklerkontrollierten Server-Komponenten verwendet werden dürfen und dass die neueren Secret Keys langfristig vorzuziehen sind. ([Supabase][2])

---

## Eckdaten

| Parameter           | Wert                                             |
| ------------------- | ------------------------------------------------ |
| Endpunkte           | `quiz/generate`, `quiz/generate-mixed`           |
| Geräte-Limit        | **5 Requests / Gerät / Tag gesamt**              |
| Burst-Limit Gerät   | **2 Requests / 10 Minuten**                      |
| Globales Limit      | **60 Requests / Tag gesamt**                     |
| Optionales IP-Limit | **10 Requests / IP / Stunde**                    |
| Geräte-ID           | Client-generierte UUID (in AsyncStorage)         |
| Speicher            | Supabase Postgres                                |
| Zugriff             | Serverseitig via Supabase-Key                    |
| Zusätzlicher Schutz | Harte Budgetgrenze beim KI-Anbieter bleibt aktiv |

**Warum 5 pro Gerät pro Tag?**
Das ist für echte Nutzung noch okay, aber ein einzelnes Gerät kann damit selbst bei Vollausnutzung nur rund **$0.74 pro 30 Tage** verbrauchen; bei **3/Tag** wären es rund **$0.45 pro 30 Tage**.

---

## Architektur

```text
Mobile App (Expo)
  │
  │  POST /api/quiz/generate
  │  Header: X-Device-Id: <uuid>
  │
  ▼
EAS API Route (Cloudflare Worker / Server Route)
  │
  ├─ 1. Device-ID vorhanden und formal gültig? → sonst 400
  ├─ 2. Payload valide? → sonst 400 (kein Quota-Verbrauch)
  ├─ 3. Globales Tageslimit prüfen → sonst 429
  ├─ 4. Geräte-Tageslimit prüfen → sonst 429
  ├─ 5. Burst-Limit Gerät prüfen → sonst 429
  ├─ 6. Optional: IP-Limit prüfen → sonst 429
  ├─ 7. Zähler schreiben
  │
  ▼
OpenAI API (nur wenn 1–7 bestanden)
```

---

## Datenmodell

Ich würde **weiterhin nur eine Tabelle** nehmen, aber minimal erweitern:

```sql
create table public.api_usage (
  id bigint generated always as identity primary key,
  device_id text not null,
  endpoint text not null,
  usage_date date not null default (now() at time zone 'utc')::date,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index idx_api_usage_device_day
  on public.api_usage (device_id, usage_date);

create index idx_api_usage_global_day
  on public.api_usage (usage_date);

create index idx_api_usage_device_created
  on public.api_usage (device_id, created_at desc);

create index idx_api_usage_ip_created
  on public.api_usage (ip_hash, created_at desc);
```

### Warum so?

* **`usage_date`** für Tageslimits
* **`created_at`** für Burst-Limits
* **`ip_hash`** nur für ein optionales, schwaches IP-Limit
* **kein separates Counter-Table**, weil dein Volumen am Anfang klein bleibt

Ich würde die IP **nicht roh speichern**, sondern serverseitig gehasht. Für V1 reicht das.

---

## Limits

### 1. Globales Tageslimit

```ts
const GLOBAL_LIMIT_PER_DAY = 60;
```

Empfehlung:

* **60/Tag** als Standard
* **50/Tag**, wenn du extra konservativ starten willst

### 2. Geräte-Tageslimit

```ts
const DEVICE_LIMIT_PER_DAY = 5;
```

Wichtig:
**nicht pro Endpunkt**, sondern **über beide Endpunkte zusammen**.

### 3. Burst-Limit pro Gerät

```ts
const DEVICE_BURST_LIMIT = 2;
const DEVICE_BURST_WINDOW_MINUTES = 10;
```

### 4. Optionales IP-Limit

```ts
const IP_LIMIT_PER_HOUR = 10;
```

Das ist nur eine Zusatzbremse.
Wenn ihr viele Nutzer im selben Uni-Netz habt und es zu Fehlalarmen kommt, kann man dieses Limit zuerst auch deaktiviert lassen.

---

## Implementierung

## Phase 1 — Datenbank

1. Tabelle und Indizes anlegen
2. Sichtprüfung in Supabase

**Abnahme:** Tabelle vorhanden, Inserts funktionieren.

---

## Phase 2 — Server: Quota-Helfer

**Neue Datei:** `app/api/_lib/quota.ts`

### Aufgaben

1. Supabase-Client serverseitig initialisieren
2. `checkAndConsumeQuota(deviceId, endpoint, ipHash?)` implementieren
3. In dieser Reihenfolge prüfen:

   * global heute
   * Gerät heute
   * Gerät letzte 10 Minuten
   * optional IP letzte Stunde
4. Nur wenn alles erlaubt ist:

   * Insert in `api_usage`
5. Rückgabe:

   * `{ allowed: true, remaining: ... }`
   * oder `{ allowed: false, reason: 'global' | 'device_day' | 'device_burst' | 'ip' }`

### Header für 429

* `Retry-After`
* `X-RateLimit-Limit`
* `X-RateLimit-Remaining`
* `X-RateLimit-Reset`

---

## Phase 3 — Server: Integration in API Routes

**Dateien**

* `app/api/quiz/generate+api.ts`
* `app/api/quiz/generate-mixed+api.ts`

### Ablauf

1. `X-Device-Id` lesen
2. UUID-Format validieren
3. Payload validieren
4. Client-IP lesen und optional hashen
5. `checkAndConsumeQuota(...)`
6. Bei Limit → `429`
7. Sonst OpenAI-Call

### Wichtig

Das Limit wird **erst nach erfolgreicher Request-Validierung** verbraucht.
Ungültige Payloads zählen nicht.

---

## Phase 4 — Client

**Dateien**

* `client/lib/device-id.ts`
* `client/lib/query-client.ts`

### Schritte

1. Beim ersten Start UUID v4 generieren
2. In AsyncStorage speichern
3. Bei jedem Quiz-Request als `X-Device-Id` mitsenden
4. Bei `429` UI-Meldung:

   * „Limit erreicht“
   * optional mit Hinweis, ob Tageslimit oder kurze Wartezeit

---

## Phase 5 — Deployment

### Env Vars

* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`
  oder langfristig ein neuerer Supabase Secret Key, falls ihr den schon verwendet. Supabase empfiehlt Secret Keys, wo möglich, gegenüber dem alten JWT-basierten `service_role`-Key. ([Supabase][2])

### Smoke Tests

1. Kein Header → `400`
2. Ungültige UUID → `400`
3. Gültige Request unter Limit → `200`
4. 6. Request am selben Tag → `429`
5. 3. Request in 10 Minuten → `429`
6. 61. globaler Tagesrequest → `429`

---

## Testmatrix

| # | Szenario                                  | Erwartung                 |
| - | ----------------------------------------- | ------------------------- |
| 1 | Kein `X-Device-Id`                        | 400                       |
| 2 | Ungültige UUID                            | 400                       |
| 3 | Gültige ID, gültige Payload, unter Limit  | 200                       |
| 4 | 6. Request desselben Geräts am selben Tag | 429                       |
| 5 | 3. Request desselben Geräts in 10 Minuten | 429                       |
| 6 | 61. Request global am Tag                 | 429                       |
| 7 | Ungültige Payload                         | 400, kein Quota-Verbrauch |
| 8 | 429 enthält `Retry-After`                 | ja                        |
| 9 | Nächster UTC-Tag                          | Zähler zurückgesetzt      |

---

## Rollback

```ts
const API_QUOTA_ENABLED = process.env.API_QUOTA_ENABLED !== 'false';
```

Wenn `false`, wird der komplette Quota-Check übersprungen.

Zusätzlich bleibt die harte Budgetgrenze beim KI-Anbieter aktiv.

---

## Nächster sinnvoller Ausbau

**Phase 2 nach Launch:**

1. `@expo/app-integrity` vor den Quota-Check setzen
2. optional echtes Konto oder Anonymous Auth (Zugang für DHBW-Studierende via E-Mail-Link?)
3. später Cache für häufige Quiz-Kombinationen
