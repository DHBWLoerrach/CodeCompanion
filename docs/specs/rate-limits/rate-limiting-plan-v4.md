# Rate-Limiting mit Supabase (Light) - Implementierungsplan v4

## Zusammenfassung

Einfaches, serverseitiges Rate Limiting für zwei Expo API Routes, **ohne Registrierung** und **ohne Supabase Auth/JWT**. Supabase wird ausschließlich als Datenbank verwendet. Die Geräteidentifikation erfolgt über eine client-seitig generierte UUID, die vor dem Speichern im Backend **gehasht** wird.

Für die lokale Entwicklung gilt in v4 ein zweistufiges Modell:

- Default lokal **ohne** Supabase-Abhängigkeit
- gezielter Integrationsmodus **mit** dedizierter Supabase-Testinstanz

Damit bleibt der Alltag im DevMode leichtgewichtig, ohne das eigentliche Feature erst kurz vor Produktion real zu testen.

## Aktueller Scope im Repo

In Scope für v4:

- `POST /api/quiz/generate`
- `POST /api/quiz/generate-mixed`

Explizit nicht in Scope für v4:

- `/api/topic/explain`
- andere spätere AI-Endpunkte

Wenn später weitere AI-Routes dazukommen, werden sie bewusst separat in das Quota-Modell aufgenommen statt stillschweigend mitzuschwimmen.

## Ziele

- OpenAI-Aufrufe serverseitig begrenzen
- Kein Benutzerkonto nötig
- Sehr kleiner Implementierungsaufwand
- Schutz vor versehentlichen Schleifen, einfachem Script-Traffic und Budget-Spikes
- Keine Abhängigkeit von Supabase Auth
- Reibungsarme lokale Entwicklung ohne Pflicht zu externer Infrastruktur

## Nicht-Ziele

- Kein starker Schutz gegen gezielte, technisch versierte Angreifer
- Keine verlässliche Nutzeridentität
- Keine faire Multi-Device-Zuordnung über Accounts hinweg
- Keine App-Attestation in v4
- Keine Pflicht, dass jede lokale Entwicklung gegen echtes Supabase laufen muss

---

## Verifizierte Plattformannahmen

### Supabase

- Zielbild für diese Implementierung ist konsequent `SUPABASE_SECRET_KEY` auf Basis des neuen Secret-Key-Modells (`sb_secret_...`).
- Der neue Secret Key autorisiert über die eingebaute `service_role`-Rolle und **umgeht RLS**.
- Der Secret Key darf nur in **sicheren, entwicklerkontrollierten** Server-Komponenten verwendet werden.
- Legacy-Hinweis: Falls das bestehende Projekt noch auf dem alten `service_role` JWT-Key-Modell läuft, funktioniert das technisch weiterhin. Für diese Spec bleibt der neue `SUPABASE_SECRET_KEY` aber die einzige vorgesehene Zielkonfiguration.

### Expo / EAS

- Expo API Routes leben in Dateien mit `+api.ts` und laufen **serverseitig**.
- Dafür muss in Expo Router `web.output: "server"` gesetzt sein.
- EAS Hosting basiert auf Cloudflare Workers (V8 Isolates, kein Dateisystem, stateless).
- Für EAS Hosting können **plaintext**- und **sensitive**-Environment-Variablen deployed werden, **nicht** Variablen mit Sichtbarkeit **secret**.
- Für v4 wird im Web **same-origin** zwischen App und API angenommen. Ein separater API-Origin ist für v4 nicht Zielbild.

### Supabase Data API / RLS

- Tabellen im `public`-Schema sind über die Supabase Data API exponiert.
- Wird eine Tabelle per SQL angelegt, ist **RLS nicht automatisch aktiv**.
- Für `public.api_usage` muss **RLS explizit aktiviert** werden, ohne Policies anzulegen. So ist die Tabelle für reguläre Clients (`anon`, `authenticated`) gesperrt, während der serverseitige Zugriff über `SUPABASE_SECRET_KEY` weiterhin arbeiten kann.

---

## Eckdaten

| Parameter                   | Wert                                                |
| --------------------------- | --------------------------------------------------- |
| Endpunkte                   | `quiz/generate`, `quiz/generate-mixed`              |
| Geräte-Limit gesamt         | **5 Requests / Gerät / Tag**                        |
| davon `quiz/generate`       | **max. 4 / Tag**                                    |
| davon `quiz/generate-mixed` | **max. 2 / Tag**                                    |
| Globales Limit              | **60 Requests / Tag** (alle Geräte, alle Endpunkte) |
| Geräte-ID                   | Client-generierte UUID v4                           |
| Speicherung im Backend      | **SHA-256-Hash** der Geräte-ID                      |
| Supabase-Zugriff            | Serverseitig per `SUPABASE_SECRET_KEY`              |
| Zusätzlicher Schutz         | Harte Budgetgrenze beim KI-Anbieter (bereits aktiv) |

### Quota-Modell erklärt

Das Geräte-Limit arbeitet mit einem Gesamtbudget plus Teilkontingenten:

- Ein Nutzer hat **5 Requests pro Tag insgesamt**, egal welchen Endpunkt er nutzt.
- Davon dürfen **maximal 4** auf `quiz/generate` entfallen.
- Davon dürfen **maximal 2** auf `quiz/generate-mixed` entfallen.

Das verhindert, dass ein Endpunkt den anderen komplett blockiert, ohne das Budget zu verdoppeln.

**Beispiele gültiger Nutzung an einem Tag:**

| generate | mixed | gesamt | erlaubt?                 |
| -------- | ----- | ------ | ------------------------ |
| 4        | 1     | 5      | ja                       |
| 3        | 2     | 5      | ja                       |
| 5        | 0     | 5      | nein (`generate` max. 4) |
| 2        | 3     | 5      | nein (`mixed` max. 2)    |
| 4        | 2     | 6      | nein (gesamt max. 5)     |

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
  ├─ 1. Payload valide? → sonst 400 (kein Quota-Verbrauch)
  ├─ 2. API_QUOTA_ENABLED != true? → Quota-Zweig überspringen
  ├─ 3. X-Device-Id vorhanden und formal gültig (UUID v4)? → sonst 400
  ├─ 4. Device-ID hashen (SHA-256)
  ├─ 5. Globales Tageslimit prüfen → sonst 429
  ├─ 6. Geräte-Gesamtlimit prüfen → sonst 429
  ├─ 7. Geräte-Endpunktlimit prüfen → sonst 429
  ├─ 8. Quota-Zeile schreiben
  │
  ▼
OpenAI API (nur wenn 1-8 bestanden)
```

### Wichtige Entscheidung: Quota vor dem Upstream-Call

Gültige, zugelassene Requests verbrauchen Quota **auch dann**, wenn der OpenAI-Call später fehlschlägt. Das hält das System einfach und erschwert Missbrauch per Retry-Schleife.

### Fail-Closed

Wenn Supabase für den Quota-Check nicht erreichbar ist oder der Insert fehlschlägt, wird **kein** OpenAI-Call gemacht. Stattdessen: `503 Service Unavailable`. Bei Budget-Schutz ist "fail closed" die sicherere Wahl.

Bewusster Tradeoff: Eine Supabase-Störung blockiert damit sofort alle betroffenen Quiz-Generierungen. Für v4 ist das akzeptiert, weil Budget-Schutz hier höher priorisiert wird als maximale Verfügbarkeit der KI-Funktionen.

### Dev-Bypass

Wenn `API_QUOTA_ENABLED` lokal oder in einer Testumgebung **nicht** auf `true` steht, wird der komplette Quota-Zweig übersprungen:

- kein Zwang zu `X-Device-Id`
- kein Supabase-Zugriff
- kein lokaler Setup-Zwang für Frontend- oder Content-Arbeit

Die Client-Seite darf den Header trotzdem immer auf den beiden Quiz-POSTs mitsenden; entscheidend ist, dass nur der Server über die Aktivierung des Features entscheidet.

---

## Environment-Variablen

### Produktion / gehostete Umgebung

```bash
SUPABASE_URL=...
SUPABASE_SECRET_KEY=sb_secret_...
OPENAI_API_KEY=...
API_QUOTA_ENABLED=true
```

### Lokale Entwicklung - Default

```bash
OPENAI_API_KEY=...
API_QUOTA_ENABLED=false
```

In diesem Modus ist **kein** lokales Supabase nötig.

### Lokaler oder CI-Integrationsmodus

```bash
SUPABASE_URL=...
SUPABASE_SECRET_KEY=sb_secret_...
OPENAI_API_KEY=...
API_QUOTA_ENABLED=true
```

In diesem Modus wird gegen eine **dedizierte Dev-/Test-Supabase-Instanz** getestet, nie gegen Produktion.

### Regeln

- Nie `EXPO_PUBLIC_` für `SUPABASE_SECRET_KEY` oder andere Secrets verwenden.
- Nie in Source Control committen.
- Nie in Fehlermeldungen oder Logs ausgeben.
- Verhalten nicht implizit nur an `__DEV__` koppeln, sondern explizit an `API_QUOTA_ENABLED`.
- Wenn `API_QUOTA_ENABLED=true`, aber `SUPABASE_URL` oder `SUPABASE_SECRET_KEY` fehlen, **fail fast**: kein OpenAI-Call.
- Dev/Test und Produktion nutzen getrennte Supabase-Projekte.
- Nach Änderungen an Server-Variablen neu deployen.

---

## Entwicklungsstrategie

### Modus A - Normaler lokaler Dev-Alltag

Empfohlener Standard:

```bash
API_QUOTA_ENABLED=false
```

Gedacht für:

- UI-Arbeit
- Content-Änderungen
- allgemeine App-Entwicklung
- Debugging außerhalb des Quota-Features

Erwartetes Verhalten:

- keine Supabase-Abhängigkeit
- keine lokalen Blocker durch fehlende Tabellen oder Keys
- der Quota-Teil blockiert die Entwicklung nicht
- für echte Quiz-Generierung bleibt `OPENAI_API_KEY` weiterhin erforderlich

### Modus B - Lokaler Integrationsmodus

Gezielt einschalten für:

- Entwicklung des Quota-Features selbst
- Smoke-Tests vor Merge
- Verifikation von `429`-, `503`- und Header-Verhalten
- Prüfung von RLS, Tabelle und Secret-Key-Setup

Empfohlener Standard:

```bash
API_QUOTA_ENABLED=true
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
```

Anforderungen:

- eigene Dev-/Test-Supabase-Instanz
- identisches Schema wie in Produktion
- keine Verbindung zur Produktionsinstanz

### Modus C - Produktion

Produktionsumgebung läuft immer mit:

```bash
API_QUOTA_ENABLED=true
```

### Team-Regel

- Lokaler Default ist **ohne** Supabase.
- Vor Merge oder Produktionsfreigabe wird mindestens ein gezielter Smoke-Test im Integrationsmodus ausgeführt.
- Produktionsprobleme dürfen nie nur deshalb auftauchen, weil das Feature vorher ausschließlich im Bypass gelaufen ist.

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

-- Geräte-Endpunkt-Abfrage: pro Gerät, Tag und Endpunkt
create index idx_api_usage_device_day_endpoint
  on public.api_usage (device_id_hash, usage_date, endpoint);

-- Globale Abfrage: alle Requests pro Tag
create index idx_api_usage_global_day
  on public.api_usage (usage_date);

-- RLS aktivieren, keine Policies -> für anon/authenticated gesperrt
alter table public.api_usage enable row level security;
```

Jeder erfolgreiche Request erzeugt eine Zeile. Die Zählung erfolgt per `count(*)`.

**Kein Upsert-Counter, keine RPC-Funktion nötig.** Bei 60 Requests/Tag sind die Datenmengen winzig. Theoretische Race Conditions können dazu führen, dass in seltenen Fällen 1-2 Requests über ein Limit rutschen - bei der aktiven Budgetgrenze beim Anbieter ist das akzeptabel.

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

### Phase 1 - Datenbank vorbereiten (Human)

**Aufwand:** 5 Minuten

1. SQL im Supabase SQL Editor ausführen (Tabelle, Indizes, RLS).
2. Prüfen: Tabelle `public.api_usage` existiert, RLS ist aktiv.
3. `SUPABASE_SECRET_KEY` bereithalten (`sb_secret_...`).
4. Optional, aber empfohlen: separate Dev-/Testinstanz parallel vorbereiten.

**Abnahme:** Tabelle existiert, RLS aktiv, Key liegt nur serverseitig vor.

---

### Phase 2 - Server: Supabase-Client + Quota-Helfer (Coding-Agent)

**Aufwand:** ca. 30 Minuten

**Neue Dateien:**

- `app/api/_lib/supabase.ts`
- `app/api/_lib/quota.ts`

#### Supabase-Client

- Vor der Server-Implementierung `@supabase/supabase-js` als Runtime-Dependency ergänzen; die Bibliothek ist aktuell noch nicht im Projekt vorhanden.
- `createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)`
- Optionen: `persistSession: false`, `autoRefreshToken: false`
- Nur in serverseitigem Code importieren
- Client und Env-Validierung **nicht** beim Modulimport ausführen
- Stattdessen einen lazy Helper wie `getSupabaseAdminClient()` bereitstellen, der nur innerhalb des aktiven Quota-Pfads aufgerufen wird
- Ziel: lokaler Dev-Bypass und bestehende Route-Tests dürfen ohne Supabase-Env weiter importierbar bleiben

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
      scope: 'global' | 'device';
      retryAfterSeconds: number;
      resetAtUtc: string;
    };
```

Hilfsfunktion für 429-Responses mit Headern:

- `Retry-After` (Sekunden bis Mitternacht UTC)
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- JSON-Body: `{ error: 'rate_limited', reason: 'global_day' | 'device_total' | 'device_endpoint', scope: 'global' | 'device', resetAtUtc: string }`

Mapping für die UI:

- `global_day` -> `scope: 'global'`
- `device_total` -> `scope: 'device'`
- `device_endpoint` -> `scope: 'device'`

Zusätzlicher Client-Vertrag für Fehler:

- `client/lib/query-client.ts` darf für die betroffenen Quiz-POSTs Nicht-`2xx`-Responses nicht nur als generisches `Error("Request failed (...)")` weiterreichen.
- Stattdessen muss der Client einen strukturierten Fehler propagieren, der mindestens `status` und den geparsten JSON-Body enthält.
- Die UI darf `429` gezielt über `status === 429` und `body.scope` unterscheiden; andere Fehler können weiterhin generisch behandelt werden.
- `body.reason` wird zusätzlich mitgegeben, damit die UI später zwischen Geräte-Gesamtlimit und Endpunktlimit unterscheiden kann, ohne den Serververtrag erneut zu ändern.

Bei Supabase-Fehler: `503 Service Unavailable`, kein OpenAI-Call.

**Abnahme:** Helfer lässt sich isoliert testen (unter Limit, Endpunkt-Limit, Gesamtlimit, globales Limit, DB-Fehler).

---

### Phase 3 - Server: Integration in API Routes (Coding-Agent)

**Aufwand:** ca. 20 Minuten

**Dateien:**

- `app/api/quiz/generate+api.ts`
- `app/api/quiz/generate-mixed+api.ts`

Reihenfolge in jeder Route:

1. Request-Body parsen und validieren -> ungültig -> `400` (kein Quota-Verbrauch)
2. Wenn `API_QUOTA_ENABLED !== 'true'` -> Quota komplett überspringen und direkt zum OpenAI-Call
3. `X-Device-Id`-Header lesen -> fehlt oder kein UUID-v4-Format -> `400`
4. Device-ID mit SHA-256 hashen
5. `checkAndConsumeQuota(deviceIdHash, endpoint)` aufrufen
6. Bei `allowed: false` -> `429` mit Rate-Limit-Headern und stabilem Response-Body für den Client
7. Bei DB-Fehler -> `503`
8. Erst dann OpenAI-Call ausführen

Keine Secrets in Fehlermeldungen oder Logs.

**Abnahme:** OpenAI wird nie ohne erfolgreiche Quota-Freigabe aufgerufen, im lokalen Dev-Bypass aber bewusst ohne Supabase-Abhängigkeit.

---

### Phase 4 - Client: Device-ID erzeugen und mitsenden (Coding-Agent)

**Aufwand:** ca. 15 Minuten

**Dateien:**

- Neu: `client/lib/device-id.ts`
- Anpassung: `client/lib/query-client.ts`

Schritte:

1. Für die Geräte-ID eine klare Implementierungsbasis festlegen:
   - bevorzugt eine kleine dedizierte UUID-v4-Lösung
   - alternativ eine gleichwertige UUID-v4-Hilfsfunktion
   - wichtig: **kein** clientseitiges SHA-256; das Hashing bleibt ausschließlich im Server-/Quota-Pfad
2. Fehlende Dependency bewusst ergänzen; aktuell ist dafür noch keine passende UUID-Lösung im Projekt vorhanden.
3. Beim ersten App-Start UUID v4 generieren und unter einem eigenen AsyncStorage-Key speichern.
4. Die Geräte-ID ist **nicht** Teil von `storage.clearAllData()` oder "Fortschritt zurücksetzen":
   - Lernfortschritt, Streaks und Profileinstellungen dürfen gelöscht werden
   - die Quota-Identität des Geräts bleibt bestehen
   - Ziel: Das Tageslimit darf nicht durch lokales Zurücksetzen umgangen werden
5. Header `X-Device-Id: <uuid>` bei `POST /api/quiz/generate` und `POST /api/quiz/generate-mixed` mitsenden.
6. Andere Requests und bestehende Query-Reads bleiben unverändert.
7. `apiRequest()` für die betroffenen Quiz-POSTs so erweitern, dass bei Nicht-`2xx` ein strukturierter Fehler mit `status` und geparstem Body geworfen wird.
8. Bestehende Unit-Tests für `client/lib/query-client.ts` und die Quiz-Flows an das neue Header- und Fehlerverhalten anpassen.
9. Bei `429` dem Nutzer eine verständliche Meldung anzeigen, basierend auf `scope` im Response-Body:
   - keine Hardcoded-Texte im Screen
   - stattdessen neue i18n-Keys in `client/lib/i18n.ts`, z. B. `quizRateLimitDevice` und `quizRateLimitGlobal`
   - Geräte-Limit nutzt den Geräte-Key, globales Limit den globalen Key
   - `reason` wird im MVP noch nicht zwingend für unterschiedliche Texte genutzt, steht aber für spätere feinere UX bereit
10. Web-Annahme für v4 festhalten:
   - `EXPO_PUBLIC_API_URL` zeigt in Deployments auf denselben Origin wie die App oder wird so aufgelöst, dass kein Cross-Origin-Browser-Request entsteht
   - falls später bewusst ein separater API-Origin genutzt werden soll, ist das **nicht** mehr v4-Light und erfordert zusätzliche `OPTIONS`-/CORS-Behandlung für `X-Device-Id`

**Abnahme:** Bestehende Quiz-Flows funktionieren wie bisher, Header wird auf den beiden Quiz-POSTs mitgesendet, `429` wird über einen strukturierten Fehler sauber aufgefangen und die UI nutzt i18n-Keys statt Hardcoded-Strings.

---

### Phase 5 - Dev- und Integrationsmodus prüfen (Coding-Agent + Human)

**Aufwand:** ca. 15 Minuten

1. Lokal mit `API_QUOTA_ENABLED=false` prüfen:
   - kein Supabase notwendig
   - Quiz-Flows laufen weiter
2. Lokal oder in CI mit `API_QUOTA_ENABLED=true` gegen Dev-Supabase prüfen:
   - `400` bei fehlender oder ungültiger Device-ID
   - `429` bei überschrittenen Limits
   - `503` bei Supabase-Ausfall
3. Sicherstellen, dass nie gegen die Produktionsinstanz getestet wird.
4. Unit- und Integrationstests nicht vom Umgebungszustand abhängig machen:
   - bestehende Route-Unit-Tests setzen `API_QUOTA_ENABLED` explizit auf `false`, wenn sie nicht gezielt den Quota-Pfad prüfen
   - neue Quota-Tests setzen `API_QUOTA_ENABLED` explizit auf `true`
5. Entwickler-Onboarding für die neuen Variablen ergänzen:
   - `README.md` um `SUPABASE_URL`, `SUPABASE_SECRET_KEY` und `API_QUOTA_ENABLED` erweitern
   - lokale Modi klar dokumentieren: Default ohne Supabase, Integrationsmodus mit Dev-/Test-Supabase
   - eine `.env.example` mit Platzhaltern für die neuen Variablen anlegen, ohne echte Secrets

**Abnahme:** Beide Betriebsmodi verhalten sich wie geplant.

---

### Phase 6 - Deployment (Human)

**Aufwand:** 10 Minuten

1. Environment-Variablen für die Zielumgebung setzen:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `OPENAI_API_KEY`
   - `API_QUOTA_ENABLED=true`
2. Server Output prüfen (`web.output: "server"` in App-Config)
3. Produktions-Deployment über den bestehenden manuellen GitHub-Workflow `.github/workflows/deploy.yml` anstoßen
4. Smoke-Test:
   - Request ohne Device-ID -> `400`
   - Normaler Request -> `200`
   - 5. `generate`-Request desselben Geräts -> `429`
   - 3. `generate-mixed`-Request desselben Geräts -> `429`
   - 6. Request gesamt desselben Geräts -> `429`

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

**Loggen:** Statuscode, Endpoint, Grund für `429`, Hash der Device-ID, Dauer des Upstream-Calls.

**Nicht loggen:** Roher `SUPABASE_SECRET_KEY`, roher API Key, rohe Geräte-UUID, vollständiger Request-Body.

---

## Testmatrix

| #   | Szenario                                                               | Ergebnis                      |
| --- | ---------------------------------------------------------------------- | ----------------------------- |
| 1   | Kein `X-Device-Id`-Header bei aktivem Quota-Mode                       | 400                           |
| 2   | Ungültiges UUID-Format bei aktivem Quota-Mode                          | 400                           |
| 3   | Gültige ID, gültige Payload, unter Limit                               | 200                           |
| 4   | Ungültige Payload, gültige ID                                          | 400, kein Quota-Verbrauch     |
| 5   | 5. `generate`-Request am selben Tag                                    | 429                           |
| 6   | 3. `generate-mixed`-Request am selben Tag                              | 429                           |
| 7   | 6. Request gesamt am selben Tag                                        | 429                           |
| 8   | 61. globaler Request am selben Tag                                     | 429                           |
| 9   | Supabase nicht erreichbar                                              | 503, kein OpenAI-Call         |
| 10  | `429` enthält `Retry-After`-Header                                     | ja                            |
| 11  | `429`-Body bei globalem Limit enthält `scope: global`                  | ja                            |
| 12  | `429`-Body bei Geräte-Limit enthält `scope: device`                    | ja                            |
| 12a | `429`-Body enthält den konkreten `reason`                              | ja                            |
| 13  | Nächster UTC-Tag -> Zähler zurückgesetzt                               | 200                           |
| 14  | RLS aktiv, anonyme Abfrage auf `api_usage`                             | kein Zugriff                  |
| 15  | Lokaler Dev mit `API_QUOTA_ENABLED=false` funktioniert ohne Supabase   | ja                            |
| 16  | Integrationsmodus mit Dev-Supabase zeigt echtes `429`-/`503`-Verhalten | ja                            |
| 17  | `API_QUOTA_ENABLED=true`, aber Supabase-Env fehlt                      | fail closed, kein OpenAI-Call |
| 18  | `apiRequest()` propagiert bei `429` einen strukturierten Fehler        | Status + Body verfügbar       |
| 19  | Quiz-UI mappt `scope: device` auf einen i18n-Key                       | ja                            |
| 20  | Quiz-UI mappt `scope: global` auf einen i18n-Key                       | ja                            |
| 21  | Route-Tests setzen `API_QUOTA_ENABLED` explizit je Testmodus           | ja                            |
| 22  | "Fortschritt zurücksetzen" löscht Lernstand, aber nicht die Geräte-ID  | ja                            |
| 23  | Route-Module bleiben ohne Supabase-Env importierbar, wenn Quota aus ist | ja                           |
| 24  | Web-Deployment nutzt keinen Cross-Origin-Request für Quiz-POSTs        | ja                            |
| 25  | README und `.env.example` dokumentieren die neuen Variablen            | ja                            |

---

## Rollback

**Soft Rollback:** `API_QUOTA_ENABLED=false` setzen -> Quota-Check wird übersprungen, App läuft ohne Limits.

**Sicherheitsnetz:** Harte Budgetgrenze beim KI-Anbieter bleibt unabhängig aktiv.

---

## Bewusste Grenzen

- Geräte-ID ist fälschbar und per Reinstall zurücksetzbar
- Kein Schutz gegen gezieltes Reverse Engineering
- Count-then-insert ist nicht streng atomar (1-2 Requests können über Limits rutschen)
- Im lokalen Dev-Bypass wird das eigentliche Quota-Feature bewusst nicht mitgeprüft

Für den Start vertretbar, weil: globales Budget eng gedeckelt, Tageslimits bremsen Kostenwellen, Budgetgrenze beim Anbieter fängt den Rest, Implementierung bleibt klein, und der Integrationsmodus schließt die größten Realitätslücken.

---

## Spätere Erweiterungspfade

Alle unabhängig nachrüstbar, ohne Umbau des bestehenden Systems:

1. **`@expo/app-integrity`:** Attestation-Token als zusätzlichen Guard vor dem Quota-Check. Auf iOS kann App Attest einen persistenten `keyId` pro Installation liefern; auf Android ist es eher ein Vertrauensnachweis pro Request als ein direkter Ersatz für eine dauerhafte Geräte-ID.
2. **Burst-Schutz:** Kleines Zeitfenster-Limit ergänzen, z. B. `2 Requests / 10 Minuten` pro Gerät, falls ihr frühe Tages-Spikes oder Script-Traffic in den Logs seht.
3. **Supabase Anonymous Auth:** JWT-basierte Identität nachrüsten, falls stärkere Zuordnung nötig wird. Die Quota-Tabelle bleibt, `device_id_hash` wird durch `user_id` ersetzt.
4. **Caching:** Vorab generierte Fragen für häufige Quiz-Kombinationen, um API-Kosten zu senken.
5. **Gewichtete Quotas:** Unterschiedliche Kosten pro Endpunkt, falls einer deutlich teurer wird.
6. **Atomare DB-Funktion (RPC):** Falls das Volumen deutlich steigt und Race Conditions relevant werden.
