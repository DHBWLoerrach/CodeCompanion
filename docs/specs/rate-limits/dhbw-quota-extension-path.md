## Erweiterungspfad: DHBW-Accounts mit höherer Quota

### Idee

Authentifizierte Nutzer mit einer DHBW-E-Mail-Adresse bekommen höhere Tageslimits. Alle anderen Nutzer bleiben auf den anonymen v3.1-Limits.

Die Anmeldung ist optional:

- wer sich nicht einloggt, nutzt die App weiter wie bisher
- wer sich mit einer gültigen DHBW-Adresse anmeldet, bekommt ein höheres Kontingent

Ziel ist nicht, eine starke Identität für alle Nutzer einzuführen, sondern eine einfache Möglichkeit, vertrauenswürdigeren Nutzern mehr Quota zu geben.

### Voraussetzungen

- Supabase Auth aktivieren
- bevorzugt **Email OTP** für den ersten Ausbau
- serverseitige Prüfung der E-Mail-Domain über eine **Allowlist**
- bestehender anonymer Pfad bleibt unverändert erhalten

### Warum OTP statt Magic Link?

Für einen einfachen mobilen Opt-in-Login ist Email OTP meist leichter umzusetzen und verständlicher:

- kein separater Magic-Link-Redirect-Flow nötig
- weniger Konfigurationsaufwand bei Redirect-URLs
- gleiche Grundidee für Nutzer: Code per Mail erhalten und eingeben

Magic Link bleibt möglich, ist aber für diesen Erweiterungspfad nicht die bevorzugte erste Ausbaustufe.

### Vertrauensmodell

Es gibt weiterhin zwei Nutzertypen:

- **anonymous**
  - kein Login
  - Identifikation wie bisher über `X-Device-Id`
  - Limits aus dem anonymen Kontingent

- **dhbw**
  - gültiger Supabase-Login
  - serverseitig validierter JWT
  - E-Mail-Domain entspricht einer erlaubten DHBW-Domain
  - Limits aus dem DHBW-Kontingent

### Domain-Prüfung

Die DHBW-Zugehörigkeit darf nicht nur mit einem einfachen `endsWith(...)` geprüft werden.

Stattdessen:

1. E-Mail serverseitig aus dem validierten User lesen
2. E-Mail normalisieren (`trim`, `lowercase`)
3. Domain extrahieren
4. Domain gegen eine feste **Allowlist** prüfen

Beispiel:

```ts
const ALLOWED_DHBW_EMAIL_DOMAINS = [
  'student.dhbw-mannheim.de',
  'dhbw-mannheim.de',
];
```

Die tatsächlich erlaubten Domains sollten bewusst gepflegt werden.  
Falls später weitere Standorte oder Subdomains unterstützt werden sollen, wird nur diese Allowlist erweitert.

### Änderung am Datenmodell

```sql
alter table public.api_usage
  add column user_id uuid references auth.users(id),
  add column user_tier text check (user_tier in ('anonymous', 'dhbw'));
```

Optional kann für bestehende Zeilen ein Default gesetzt werden:

```sql
alter table public.api_usage
  alter column user_tier set default 'anonymous';
```

Zusätzlicher Index:

```sql
create index idx_api_usage_user_day
  on public.api_usage (user_id, usage_date);
```

#### Hinweis

`user_tier` ist vor allem für Auswertung und Debugging nützlich.  
Die eigentliche Quota-Entscheidung sollte zur Laufzeit aus dem validierten Nutzerkontext abgeleitet werden, nicht blind aus der gespeicherten Spalte.

### Quota-Konfiguration

Die Werte für DHBW-Nutzer sollten anfangs bewusst vorsichtig gewählt werden.

Beispiel:

```ts
const LIMITS = {
  anonymous: {
    total: 5,
    generate: 4,
    mixed: 2,
  },
  dhbw: {
    total: 10,
    generate: 8,
    mixed: 4,
  },
};
```

Diese Werte sind Startwerte.  
Sie sollten später anhand des realen Verbrauchs angepasst werden.

### Logik im Quota-Helfer

1. Hat der Request einen `Authorization: Bearer <jwt>`-Header?
   - Ja → JWT serverseitig mit `supabase.auth.getUser(jwt)` validieren
   - Token ungültig → `401`
   - Token gültig → E-Mail des Users auslesen
   - Domain gegen Allowlist prüfen
   - Domain erlaubt → Tier `dhbw`, Limits aus `LIMITS.dhbw`, Zählung per `user_id`
   - Domain nicht erlaubt → `403` (dieser Upgrade-Pfad ist nur für erlaubte DHBW-Domains vorgesehen)

2. Hat der Request keinen Bearer-Token, aber einen `X-Device-Id`-Header?
   - Ja → Tier `anonymous`, Limits aus `LIMITS.anonymous`, Zählung wie bisher per `device_id_hash`

3. Fehlt beides?
   - `400`

### Semantik der Zählung

- eingeloggte Nutzer werden über `user_id` gezählt
- nicht eingeloggte Nutzer werden weiter über `device_id_hash` gezählt
- der anonyme Pfad bleibt vollständig kompatibel zur bisherigen Architektur

### Änderung am Client

- optionaler Login-Screen:
  - „Mit DHBW-Mail anmelden für mehr Quizzes“
- bei eingeloggten Nutzern wird der Access Token mitgeschickt:
  - `Authorization: Bearer <jwt>`
- bei nicht eingeloggten Nutzern bleibt es bei:
  - `X-Device-Id: <uuid>`
- Supabase Auth SDK wird als Client-Abhängigkeit benötigt
- Token-Speicherung:
  - nativ: `expo-secure-store`
  - Web: geeigneter Storage-Adapter

### Was sich für bestehende Nutzer ändert

Nichts.

Der anonyme Pfad bleibt unverändert.  
Die DHBW-Anmeldung ist ein optionales Upgrade für Nutzer mit passender Mail-Adresse.

### Globales Tageslimit

Mit DHBW-Accounts steigt der potenzielle Tagesverbrauch.

Deshalb gilt:

- das globale Tageslimit nicht pauschal stark erhöhen
- zunächst konservativ anpassen
- reale Nutzung beobachten
- Limits erst danach schrittweise lockern

### Vorteile dieses Erweiterungspfads

- kein Zwangslogin
- anonymer Bestandspfad bleibt erhalten
- bessere Quota für vertrauenswürdigere Nutzer
- geringe Änderungen an der bestehenden Architektur
- später gut kombinierbar mit App Integrity oder weiteren Schutzmechanismen

### Grenzen

- DHBW-Mail ist keine harte Missbrauchssperre
- registrierte Nutzer können weiterhin mehrere Geräte verwenden
- mehr Komplexität als rein anonymer Betrieb
- zusätzlicher Pflegeaufwand für erlaubte Domains
- höheres Quota erhöht den potenziellen Tagesverbrauch und muss budgetseitig beobachtet werden
