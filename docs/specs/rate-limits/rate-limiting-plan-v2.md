# Rate-Limiting mit Supabase (Light) — Implementierungsplan v2

## Zusammenfassung

Einfaches, serverseitiges Rate Limiting für zwei Expo API Routes, **ohne Registrierung** und **ohne Supabase Auth/JWT**.
Supabase wird ausschließlich als Datenbank verwendet. Die Geräteidentifikation erfolgt über eine client-seitig generierte UUID, die auf dem Gerät gespeichert und vor dem Speichern im Backend **gehasht** wird.

Die API Routes laufen serverseitig in Expo Router (`+api.ts`). Dafür muss das Projekt mit **Server Output** gebaut werden (`web.output: "server"`). API Routes sind für serverseitige Logik und sensible Schlüssel gedacht. Auf EAS Hosting lassen sich Requests, Logs und Crashes für diese API Routes im Dashboard einsehen. ([Expo Documentation][3])

Supabase verwendet in v2 **einen neuen Secret Key (`sb_secret_...`)** statt des legacy JWT-basierten `service_role`-Schlüssels. Secret Keys sind gegenüber `service_role` der empfohlene Ansatz, müssen aber weiterhin **streng serverseitig** behandelt werden. Sie dürfen **nie** in den Client, nie in `EXPO_PUBLIC_*`, nie in Source Control und nie in unredigierte Logs. Außerdem sind die neuen Secret Keys **keine JWTs**; sie gehören nicht manuell als `Authorization: Bearer ...` verarbeitet, sondern normal als Server-Umgebungsvariable an `createClient(...)`. ([Supabase][1])

## Ziele

* OpenAI-Aufrufe serverseitig begrenzen
* Kein Benutzerkonto für v1
* Sehr kleiner Implementierungsaufwand
* Schutz vor versehentlichen Schleifen, einfachem Script-Traffic und Budget-Spikes
* Keine Abhängigkeit von Supabase Auth

## Nicht-Ziele

* Kein starker Schutz gegen gezielte, technisch versierte Angreifer
* Keine verlässliche Nutzeridentität
* Keine faire Multi-Device-Zuordnung über Accounts hinweg
* Keine App-Attestation in v2

---

## Verifizierte Plattformannahmen

### Supabase

* Verwendet wird ein **neuer Secret Key** (`sb_secret_...`), nicht der legacy `service_role` JWT-Key.
* Secret Keys und `service_role` autorisieren über die eingebaute `service_role`-Rolle und **umgehen RLS**.
* Supabase empfiehlt die neuen Publishable/Secret Keys gegenüber den alten JWT-basierten `anon`-/`service_role`-Keys.
* Secret Keys dürfen nur in **sicheren, entwicklerkontrollierten** Server-Komponenten verwendet werden. ([Supabase][1])

### Expo / EAS

* Expo API Routes leben in Dateien mit `+api.ts` und laufen **serverseitig**.
* Dafür muss in Expo Router `web.output: "server"` gesetzt sein.
* Mit EAS Hosting können API Routes deployed und im Hosting-Dashboard beobachtet werden.
* Für EAS Hosting können nur **plaintext**- und **sensitive**-Environment-Variablen deployed werden, **nicht** Expo-Variablen mit Sichtbarkeit **secret**. Serverseitige Variablen stehen den API Routes zur Verfügung, Client-Variablen müssen mit `EXPO_PUBLIC_` beginnen und werden in den Client gebundlet. ([Expo Documentation][3])

### Supabase-Data-API / RLS

* Tabellen im `public`-Schema sind über die Supabase Data API exponiert.
* Wird eine Tabelle per **SQL Editor / Migration / raw SQL** angelegt, ist **RLS nicht automatisch aktiv**.
* Deshalb muss für `public.api_usage` in v2 **RLS explizit aktiviert** werden. Ohne RLS wäre die Tabelle über die `anon`-Rolle angreifbar. ([Supabase][4])

---

## Eckdaten

| Parameter              | Wert                                             |
| ---------------------- | ------------------------------------------------ |
| Endpunkte              | `quiz/generate`, `quiz/generate-mixed`           |
| Geräte-Limit           | **5 Requests / Gerät / Tag gesamt**              |
| Burst-Limit Gerät      | **2 Requests / 10 Minuten**                      |
| Globales Limit         | **60 Requests / Tag gesamt**                     |
| Optionales IP-Limit    | **10 Requests / IP / Stunde**                    |
| Geräte-ID              | Client-generierte UUID v4                        |
| Speicherung im Backend | **SHA-256 Hash** der Geräte-ID                   |
| Speicher               | Supabase Postgres                                |
| Supabase-Zugriff       | Serverseitig per **`sb_secret_...` Secret Key**  |
| Zusätzlicher Schutz    | Harte Budgetgrenze beim KI-Anbieter bleibt aktiv |

### Warum diese Limits?

Diese Limits sind auf den kleinen Budgetrahmen zugeschnitten. Bei der groben Kostenannahme aus oben bleibt **60 neue Quizzes/Tag** im Bereich von rund **$8.91 pro 30 Tage**. 75/Tag wäre bereits über 10 €. ([OpenAI Developers][2])

---

## Architektur

```text
Mobile App (Expo)
  │
  │  POST /api/quiz/generate
  │  Header: X-Device-Id: <uuid-v4>
  │
  ▼
Expo API Route (EAS Hosting / Server Runtime)
  │
  ├─ 1. X-Device-Id vorhanden und formal gültig? → sonst 400
  ├─ 2. Payload valide? → sonst 400 (kein Quota-Verbrauch)
  ├─ 3. deviceId hashen
  ├─ 4. optional IP aus Header lesen, hashen
  ├─ 5. Globales Tageslimit prüfen → sonst 429
  ├─ 6. Geräte-Tageslimit prüfen → sonst 429
  ├─ 7. Geräte-Burst-Limit prüfen → sonst 429
  ├─ 8. Optional IP-Limit prüfen → sonst 429
  ├─ 9. Quota-Zeile schreiben
  │
  ▼
OpenAI API
```

### Wichtige Entscheidung

Die Quota wird **nach erfolgreicher Header-/Payload-Validierung, aber vor dem Upstream-Call** verbraucht.

Das bedeutet:

* ungültige Requests verbrauchen **keine** Quota
* gültige, zugelassene Requests verbrauchen Quota **auch dann**, wenn der OpenAI-Call später fehlschlägt

Das ist für v2 bewusst so gewählt, weil es das System klein hält und Missbrauch per Retry-Schleife erschwert.

---

## Environment-Variablen

### Serverseitig in EAS Hosting

**Wichtig:**
Für EAS Hosting darf der Supabase-Schlüssel **nicht** als Expo-Variable mit Sichtbarkeit **secret** hinterlegt werden, weil diese nicht in API-Route-Deployments mitgegeben werden. Stattdessen soll die Variable in EAS als **sensitive** angelegt werden. Sie darf selbstverständlich **nicht** mit `EXPO_PUBLIC_` beginnen. ([Expo Documentation][5])

Empfohlene Variablen:

```bash
SUPABASE_URL=...
SUPABASE_SECRET_KEY=sb_secret_...
OPENAI_API_KEY=...
API_QUOTA_ENABLED=true
```

### Nicht verwenden

```bash
EXPO_PUBLIC_SUPABASE_SECRET_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Migrationshinweis

Während der Umstellung können alte und neue Supabase-Schlüssel parallel aktiv sein. Nach erfolgreicher Umstellung sollte der alte JWT-basierte `service_role`-Key in Supabase deaktiviert werden. ([Supabase][1])

---

## Datenmodell

Die Tabelle bleibt bewusst einfach. In v2 werden aber **Hashwerte** statt roher stabiler Identifikatoren gespeichert.

```sql
create table public.api_usage (
  id bigint generated always as identity primary key,
  device_id_hash text not null,
  endpoint text not null check (endpoint in ('quiz/generate', 'quiz/generate-mixed')),
  usage_date date not null default ((now() at time zone 'utc')::date),
  ip_hash text,
  created_at timestamptz not null default now()
);

create index idx_api_usage_device_day
  on public.api_usage (device_id_hash, usage_date);

create index idx_api_usage_global_day
  on public.api_usage (usage_date);

create index idx_api_usage_device_created
  on public.api_usage (device_id_hash, created_at desc);

create index idx_api_usage_ip_created
  on public.api_usage (ip_hash, created_at desc);

alter table public.api_usage enable row level security;
```

### Wichtiger Hinweis zu RLS

Da die Tabelle per SQL angelegt wird und im `public`-Schema liegt, ist `enable row level security` **Pflicht**. Ohne RLS wäre die Tabelle über die Supabase Data API exponiert. In v2 werden **keine Policies** für `anon` oder `authenticated` angelegt; dadurch ist die Tabelle für reguläre Clients unzugänglich, während der serverseitige Secret Key weiterhin arbeiten kann, da er RLS umgeht. ([Supabase][4])

### Warum kein Upsert-Counter / keine RPC-Funktion?

Für euren Startvolumenbereich reicht eine einfache Append-Tabelle mit `count(*)`.
Selbst bei 60 globalen Requests pro Tag sind die Datenmengen sehr klein. Theoretische Race Conditions können dazu führen, dass in seltenen Fällen 1–2 Requests über ein Limit rutschen. Das ist im Verhältnis zum manuellen Budget-Stopp akzeptabel.

---

## Quota-Regeln

```ts
const DEVICE_LIMIT_PER_DAY = 5;
const DEVICE_BURST_LIMIT = 2;
const DEVICE_BURST_WINDOW_MINUTES = 10;

const GLOBAL_LIMIT_PER_DAY = 60;

const ENABLE_IP_LIMIT = false;
const IP_LIMIT_PER_HOUR = 10;
```

### Semantik

* **Geräte-Tageslimit** gilt **gesamt** über beide Endpunkte
* **Globales Tageslimit** gilt über alle Geräte und beide Endpunkte
* **Burst-Limit** schützt gegen schnelle Wiederholungen
* **IP-Limit** ist optional und nur eine zusätzliche Bremse

### Empfehlung für den Start

* `ENABLE_IP_LIMIT = false` initial
* erst aktivieren, wenn ihr in den Logs echten Missbrauch seht

Grund: In Uni- oder Firmennetzen können viele Nutzer hinter derselben IP sitzen.

---

## Server-Implementierung

## Phase 1 — Supabase vorbereiten

1. Im Supabase Dashboard einen **neuen Secret Key** erzeugen.
2. In EAS die Variable `SUPABASE_SECRET_KEY` als **sensitive** anlegen.
3. Legacy `service_role` zunächst noch aktiv lassen.
4. Tabelle `public.api_usage` anlegen.
5. RLS aktivieren.
6. Keine Policies für die Tabelle anlegen.

**Abnahme:**

* Tabelle existiert
* RLS ist aktiv
* Secret Key liegt nur serverseitig vor

---

## Phase 2 — Server: Supabase-Client

**Neue Datei:** `app/api/_lib/supabase.ts`

### Anforderungen

* `createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)`
* nur in serverseitigem Code importieren
* keine Nutzung in Client-Dateien
* keine Logs mit vollständigem Key

Supabase weist ausdrücklich darauf hin, Secret Keys nicht öffentlich zu machen und selbst in Logs nur extrem sparsam mit Schlüsselteilen umzugehen. ([Supabase][1])

### Empfohlene Client-Optionen

* `persistSession: false`
* `autoRefreshToken: false`

---

## Phase 3 — Server: Quota-Helfer

**Neue Datei:** `app/api/_lib/quota.ts`

### Funktion

`checkAndConsumeQuota(input)`

### Input

```ts
type CheckAndConsumeQuotaInput = {
  deviceId: string;
  endpoint: 'quiz/generate' | 'quiz/generate-mixed';
  ip?: string | null;
};
```

### Verhalten

1. `deviceId` mit SHA-256 hashen
2. optional `ip` mit SHA-256 hashen
3. globalen Tageszähler abfragen
4. Geräte-Tageszähler abfragen
5. Geräte-Burst-Zähler für letzte 10 Minuten abfragen
6. optional IP-Zähler für letzte Stunde abfragen
7. wenn erlaubt: eine Zeile in `api_usage` schreiben
8. Ergebnis zurückgeben

### Rückgabe

```ts
type QuotaResult =
  | {
      allowed: true;
      remainingDeviceDay: number;
      remainingGlobalDay: number;
      resetAtUtc: string;
    }
  | {
      allowed: false;
      reason: 'global_day' | 'device_day' | 'device_burst' | 'ip_hour';
      retryAfterSeconds: number;
      resetAtUtc: string;
    };
```

### Header bei 429

* `Retry-After`
* `X-RateLimit-Limit`
* `X-RateLimit-Remaining`
* `X-RateLimit-Reset`

### Fail-Closed

Wenn Supabase für den Quota-Check nicht erreichbar ist oder der Insert fehlschlägt:

* **kein** OpenAI-Call
* `503 Service Unavailable`

Begründung: Bei Budget-Schutz ist „fail closed“ sinnvoller als „fail open“.

---

## Phase 4 — Server: Integration in API Routes

**Dateien:**

* `app/api/quiz/generate+api.ts`
* `app/api/quiz/generate-mixed+api.ts`

### Reihenfolge

1. `X-Device-Id` lesen
2. UUID v4 formal validieren
3. Request-Body parsen
4. Payload validieren
5. optionale Client-IP lesen
6. Quota prüfen und verbrauchen
7. bei Limit: `429`
8. sonst OpenAI aufrufen

### IP-Ermittlung

Wenn EAS Hosting verwendet wird, kann für das optionale IP-Limit die Client-IP aus `X-Real-IP` gelesen werden. Expo dokumentiert außerdem `X-Forwarded-For` und `Forwarded`. Für v2 reicht `X-Real-IP`. ([Expo Documentation][6])

### Beispiel für IP-Lesen

```ts
const ip = request.headers.get('X-Real-IP');
```

### Wichtig

Die Route darf **nie** den Supabase Secret Key oder OpenAI Key in Fehlermeldungen, Logs oder Responses ausgeben.

---

## Phase 5 — Client

**Dateien:**

* `client/lib/device-id.ts`
* `client/lib/query-client.ts`

### Schritte

1. Beim ersten App-Start UUID v4 generieren
2. In AsyncStorage speichern
3. Bei jedem Quiz-Request mitschicken:

   * `X-Device-Id: <uuid>`
4. Bei `429` Nutzerhinweis anzeigen

### Verhalten bei 429

* bei Tageslimit:

  * „Tageslimit erreicht. Morgen geht’s weiter.“
* bei Burst-Limit:

  * „Bitte kurz warten und dann erneut versuchen.“

### Wichtige Grenzen

Die client-seitige UUID ist **keine starke Identität**:

* kann auf manipulierten Clients gefälscht werden
* kann durch Neuinstallation verloren gehen
* ist nur eine weiche Bremse für v2

---

## Phase 6 — Deployment

### Expo / Router

Sicherstellen, dass Server Output aktiv ist:

```json
{
  "web": {
    "output": "server"
  }
}
```

Expo dokumentiert diesen Schritt explizit für API Routes. ([Expo Documentation][3])

### EAS

Deployment in der Praxis:

```bash
eas deploy --environment production
```

Wenn ihr sowohl Client- als auch Server-Variablen nutzt, dann in der dokumentierten Reihenfolge:

```bash
eas env:pull --environment production
npx expo export --platform web
eas deploy --environment production
```

So werden Client- und Server-Variablen korrekt in Build und Deployment übernommen. ([Expo Documentation][5])

---

## Cleanup

Wöchentlicher Cleanup genügt.

```sql
delete from public.api_usage
where usage_date < ((now() at time zone 'utc')::date - interval '60 days');
```

60 Tage Retention reichen für Debugging und einfache Trendanalyse.

---

## Logging

### Loggen

* Statuscode
* Endpoint
* Grund für 429
* Hash der Device-ID
* optional Hash der IP
* Dauer des Upstream-Calls

### Nicht loggen

* roher Supabase Secret Key
* roher OpenAI API Key
* rohe Geräte-ID
* rohe IP-Adresse
* kompletter Request-Body mit sensiblen Inhalten

Supabase empfiehlt generell, Secret Keys nicht roh zu loggen; wenn überhaupt, nur minimal redigiert oder gehasht. ([Supabase][1])

---

## Testmatrix

| #  | Szenario                                          | Erwartung                 |
| -- | ------------------------------------------------- | ------------------------- |
| 1  | Kein `X-Device-Id`                                | 400                       |
| 2  | Ungültiges UUID-Format                            | 400                       |
| 3  | Gültige ID, gültige Payload, unter Limit          | 200                       |
| 4  | Ungültige Payload, gültige ID                     | 400, kein Quota-Verbrauch |
| 5  | 6. Request desselben Geräts am selben UTC-Tag     | 429                       |
| 6  | 3. Request desselben Geräts in 10 Minuten         | 429                       |
| 7  | 61. globaler Request am selben UTC-Tag            | 429                       |
| 8  | Supabase während Quota-Check nicht erreichbar     | 503, kein OpenAI-Call     |
| 9  | 429 enthält `Retry-After`                         | ja                        |
| 10 | Nächster UTC-Tag                                  | Zähler zurückgesetzt      |
| 11 | RLS aktiv, anonyme Client-Abfrage auf `api_usage` | kein Zugriff              |

---

## Rollback

### Soft Rollback

```ts
const API_QUOTA_ENABLED = process.env.API_QUOTA_ENABLED !== 'false';
```

Wenn `false`, wird der Quota-Check übersprungen.

### Sicherheitsnetz

Die harte Budgetgrenze beim KI-Anbieter bleibt unabhängig aktiv.

### Supabase-Rollback

Wenn ihr den neuen Secret Key erfolgreich umgestellt habt, kann der alte `service_role`-Key später deaktiviert werden. Während der Migration können beide vorübergehend parallel existieren. ([Supabase][1])

---

## Bewusste Grenzen von v2

* Geräte-ID ist fälschbar
* Geräte-ID ist per Reinstall zurücksetzbar
* kein Schutz gegen gezielte Reverse-Engineering-Angriffe
* keine echte Identität ohne Registrierung
* keine App-Attestation
* Count-then-insert ist nicht streng atomar

Für euren Start ist das trotzdem vertretbar, weil:

* globales Budget eng gedeckelt ist
* Tages- und Burst-Limits Kostenwellen abbremsen
* die Implementierung klein bleibt
* spätere Härtung einfach möglich ist

---

## Spätere Erweiterungspfade

1. **`@expo/app-integrity`** vor den Quota-Check setzen
2. **Caching** für häufige Quiz-Kombinationen
3. **Konto-/Anonymous-Auth** für fairere Limits (Personen der DHBW per E-Mail-Link?)
4. **Gewichtete Quotas** je Endpunkt
5. **Atomare DB-Funktion / RPC**, falls das Volumen deutlich steigt

---

[1]: https://supabase.com/docs/guides/api/api-keys "Understanding API keys | Supabase Docs"
[2]: https://developers.openai.com/api/docs/pricing/ "Pricing | OpenAI API"
[3]: https://docs.expo.dev/router/web/api-routes/ "API Routes - Expo Documentation"
[4]: https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"
[5]: https://docs.expo.dev/eas/environment-variables/usage/?utm_source=chatgpt.com "Using Environment variables in EAS"
[6]: https://docs.expo.dev/eas/hosting/reference/responses-and-headers/?utm_source=chatgpt.com "Default responses and headers"
