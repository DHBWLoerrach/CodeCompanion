# App Integrity fuer Quiz-API - abgestufter Rollout-Plan

## Zusammenfassung

CodeCompanion ist ein Android-/iOS-Produkt. `expo.web.output = "server"` wird in diesem Repo nur genutzt, um Expo API Routes auf EAS Hosting bereitzustellen, nicht fuer eine Webapp.

Die aktuelle Quota-Architektur schuetzt bereits gegen Budget-Spikes, aber nicht gegen triviale Client-Spoofing-Angriffe. Der schwaechste Punkt ist die client-generierte `X-Device-Id`, die ohne echte Vertrauensbasis rotiert oder gefaelscht werden kann.

App Integrity ist fuer dieses Projekt **technisch machbar**, aber der wirtschaftlich sinnvolle Ausbaupfad ist **nicht** ein sofortiger iOS+Android-Gleichstart. Die empfohlene Reihenfolge ist:

1. **Phase 0:** Observability und grobes IP-basiertes Abuse-Limiting
2. **Phase 1:** Android-first mit Play Integrity Standard Requests
3. **Phase 2:** Beobachtungsmodus (`observe`) vor echter Enforce-Schaltung
4. **Phase 3:** Separater iOS-PoC fuer App Attest auf EAS Hosting
5. **Phase 4:** Optionales iOS-Enforcement nur bei stabilem PoC

Der Plan ersetzt das bestehende Quota-Modell nicht, sondern haertet es schrittweise.

## Ausgangslage im aktuellen Repo

Aktuell geschuetzte kostenrelevante Endpunkte:

- `POST /api/quiz/generate`
- `POST /api/quiz/generate-mixed`

Aktueller Schutz:

- Client sendet auf den beiden Quiz-POSTs `X-Device-Id`
- Die ID ist eine lokal gespeicherte UUID v4
- Der Server hasht die Device-ID und prueft Tageslimits in Supabase

Aktuelle Eckdaten im Code:

- Gesamtlimit pro Geraet/Tag: `15`
- Endpoint-Limit `quiz/generate`: `12`
- Endpoint-Limit `quiz/generate-mixed`: `6`
- Globales Tageslimit: `400`
- OpenAI-Modell standardmaessig: `gpt-5.4-nano`

Sicherheitsbewertung:

- Stark genug gegen versehentliche Schleifen und einfache Budget-Ausreisser
- Nicht stark genug gegen triviale Header-Faelschung oder Device-ID-Rotation
- Schaden bleibt derzeit dennoch begrenzt, weil das globale Budget bereits klein ist

## Ziele

- OpenAI-Aufrufe besser gegen triviale Fremdclients absichern
- Device-ID-Spoofing deutlich erschweren
- Missbrauch frueher stoppen, bevor der OpenAI-Call erfolgt
- Mobile Dev- und Test-Workflow nicht unnoetig verschlechtern
- Plattformrisiken sauber isolieren, statt Android und iOS zwangsweise gleich zu behandeln

## Nicht-Ziele

- Keine perfekte Bot- oder Fraud-Abwehr
- Keine echte Benutzeridentitaet
- Kein Browser-Support fuer App Integrity
- Kein sofortiges hartes Enforcen ohne Beobachtungsphase
- Kein Ausbau auf weitere AI-Endpunkte in der ersten Iteration

## Verifizierte Plattformannahmen

### Expo / EAS Hosting

- Expo App Integrity ist laut Expo-Dokumentation weiterhin **Alpha**
- EAS Hosting basiert auf Cloudflare Workers (V8 Isolates, nicht Node.js)
- `node:crypto` ist als Kompatibilitaetsmodul verfuegbar; einige veraltete Algorithmen fehlen, aber SHA-256, HMAC, X.509 sollten funktionieren
- `Buffer` ist als Global vollstaendig verfuegbar
- Native Node-Addons funktionieren **nicht** auf Workers (V8 Isolates)
- Kein eingebautes Rate Limiting in EAS Hosting
- IP des Clients ist ueber `X-Real-IP` Header zuverlaessig verfuegbar (empfohlener Header laut Expo-Docs)
- Weitere verfuegbare Header: `X-Forwarded-For`, `eas-ip-country`, `eas-ip-city`, `eas-ip-timezone`

Einordnung:

- Die Runtime ist **nicht** der Hauptgrund gegen App Integrity
- Der groessere Risikofaktor liegt bei iOS in der konkreten Verifikationslogik, den verwendeten Libraries und realen Geraetetests
- Expo bietet **keine** serverseitige Verifikations-SDK und hat keine angekuendigt; Verifikation wird vollstaendig an Apple-/Google-Docs delegiert

### Android

- Expo stuetzt Play Integrity Standard Requests
- Android bindet die Integritaetspruefung ueber `requestHash` an den eigentlichen Request
- `requestHash` ist auf maximal 500 Bytes begrenzt (SHA-256 Hex = 64 Zeichen, passt problemlos)
- Daraus folgt fuer dieses Projekt: Ein generischer Challenge-Endpoint ist fuer Android **nicht** das bevorzugte Zielbild
- Server-seitige Token-Dekodierung ist ein einfacher `fetch`-Call an Google (voll Workers-kompatibel)
- Google bietet automatische Replay Protection fuer Standard Requests: bei erneutem Decoding werden Verdicts geleert
- Free Tier: 10.000 Requests/Tag (bei globalem Limit von 400 kein Kostenfaktor)
- Token Provider kann bei laengerer Inaktivitaet ablaufen (`ERR_APP_INTEGRITY_PROVIDER_INVALID`); Client muss `prepareIntegrityTokenProviderAsync()` erneut aufrufen

### iOS

- iOS nutzt App Attest mit Attestation- und spaeter Assertion-Flow
- Dafuer ist serverseitige Challenge-/Assertion-Verifikation erforderlich
- Dieser Teil ist deutlich komplexer als Android und bekommt deshalb einen eigenen PoC-Pfad
- App Attest funktioniert **nicht** auf dem iOS Simulator (erfordert Secure Enclave)
- CBOR-Decoding ist fuer die Attestation-Verifikation erforderlich; `cbor-x` laeuft als reines JavaScript (natives Addon optional) und ist wahrscheinlich Workers-kompatibel, aber nicht explizit getestet
- Community-Libraries fuer Server-Verifikation existieren: `node-app-attest` (38 Stars, aktiv) und `appattest-checker-node` (19 Stars, TypeScript); beide nutzen `node:crypto`. `app-attest-server` (1 Star, nutzt SQLite) ist wegen fehlendem FS auf Workers ausgeschlossen

## Entscheidungslogik

### Empfehlung

Der empfohlene Plan fuer CodeCompanion lautet:

- **nicht** sofort iOS+Android voll implementieren
- **zuerst** einen billigen, robusten Frontdoor-Schutz einfuehren
- **dann** Android-first umsetzen
- iOS nur weiterverfolgen, wenn der PoC auf EAS Hosting technisch sauber und stabil laeuft

### Warum nicht Full Rollout ab Tag 1?

- Der aktuelle Schadensdeckel ist bereits klein
- App Integrity bringt operative Risiken mit sich: echte Geraetetests, Plattformsetup, Fehlablehnungen, Supportfaelle
- Android ist deutlich einfacher und liefert frueher einen echten Schutzgewinn
- iOS ist der teuerste und fragilste Teil des Vorhabens

## Zielbild nach dem Ausbau

```text
Mobile App (Android / iOS)
  │
  │  POST /api/quiz/generate
  │  Header:
  │    X-Device-Id
  │    X-Integrity-Platform
  │    X-Integrity-Token / Assertion
  │
  ▼
Expo API Route (EAS Hosting)
  │
  ├─ 1. Payload validieren
  ├─ 2. Grobes IP-Limit / Abuse-Guard pruefen
  ├─ 3. App-Integrity-Pruefung je Plattform
  ├─ 4. Quota pruefen und konsumieren
  ├─ 5. OpenAI aufrufen
  │
  ▼
OpenAI Responses API
```

Wichtige Reihenfolge:

- Payload-Validierung bleibt ganz vorne
- Ein billiger Abuse-Guard muss **vor** externer Integrity-Verifikation sitzen
- Quota bleibt vor dem OpenAI-Call

## Rollout-Phasen

### Phase 0 - Observability und IP-Guard

#### Ziel

Sofortigen Zusatzschutz mit geringem Risiko einbauen, ohne App Integrity schon verpflichtend zu machen.

#### Umsetzung

- IP-Adresse aus `X-Real-IP` Header auslesen (empfohlener Header auf EAS Hosting, enthaelt nur die Client-IP)
- Sofort mit `sha256Hex()` aus `server/crypto.ts` hashen (bestehende Funktion wiederverwendbar)
- Rohe IP nicht persistent speichern
- IP-Hash in Supabase pruefen: eigener globaler Counter `ip_usage_daily` mit `ip_hash`, `usage_date`, `request_count`
- Optional zusaetzlich ein separates leichtgewichtiges Audit- oder Telemetrie-Log mit `ip_hash`, `usage_date`, `endpoint`
- Grobes Tageslimit je IP-Hash (z.B. 50/Tag) vor OpenAI und vor spaeteren Integrity-Checks anwenden; bewusst grosszuegiger als Device-Limit wegen Shared WiFi (Uni-Netzwerke)
- Zusaezliche Signale loggen:
  - fehlende Integrity-Header
  - ungueltige Integrity-Tokens
  - Enforce-vs-Observe-Ergebnisse
  - Anteil abgewiesener Requests

#### Warum zuerst?

- Deutlich billiger und risikoaermer als App Integrity
- Schuetzt auch gegen das spaetere Hammern auf Integrity-Endpunkte
- Liefert Missbrauchsdaten, bevor ein Alpha-Feature produktiv erzwungen wird

#### Datenschutz-Notiz

Da das Produkt serverseitig bewusst kaum personenbezogene Daten speichert, sollten IPs nie im Klartext persistiert werden. Fuer die Abuse-Erkennung reicht eine serverseitig gehashte oder kurzlebig verarbeitete Form.

### Phase 1 - Android-first

#### Ziel

Den einfacheren und risikoaermeren Integritaetspfad zuerst ausrollen.

#### Wichtige Architekturentscheidung

Fuer Android wird **kein generischer Challenge-Endpoint** eingeplant.

Stattdessen:

1. Client berechnet einen `requestHash` ueber eine **kanonische Serialisierung** des geschuetzten Requests
2. Client ruft `requestIntegrityCheckAsync(requestHash)` auf und erhaelt ein opakes Token
3. Client sendet Token als `X-Integrity-Token` Header und Plattform als `X-Integrity-Platform: android`
4. Server sendet Token an `playintegrity.googleapis.com/v1/{PACKAGE_NAME}:decodeIntegrityToken`
5. Google gibt entschluesseltes Verdict zurueck, inkl. `requestHash` im Klartext
6. Server rekonstruiert den erwarteten Hash unabhaengig und vergleicht

#### Client-seitiges Warm-up

Der Token Provider sollte **nicht erst beim eigentlichen Quiz-Request** vorbereitet werden.

Empfehlung:

- Vorbereitung beim App-Start oder spaetestens beim Betreten des Quiz-Flows
- nicht-blockierendes Warm-up im Hintergrund
- beim eigentlichen Request nach Moeglichkeit nur noch `requestIntegrityCheckAsync(...)`

Rationale:

- Das Warm-up dauert laut Google typischerweise einige Sekunden, oft unter 10 Sekunden
- Ein spaeter Start direkt beim Quiz-Request fuehrt sonst zu sichtbar schlechter UX

#### Kanonische `requestHash`-Definition

Die Hash-Berechnung darf **nicht** ad hoc per String-Konkatenation erfolgen.

Stattdessen wird eine gemeinsame Helper-Funktion in Shared-Code verwendet, die auf Client und Server identisch arbeitet:

1. HTTP-Methode aufnehmen
2. Route aufnehmen
3. Request-Body in eine normalisierte Objektform ueberfuehren
4. Defaults explizit einsetzen
5. Das Ergebnis als stabile JSON-Struktur serialisieren
6. Darueber SHA-256 bilden

Wichtige Trennung:

- Die Schritte 1-5 sind **plattformneutral**
- Der SHA-256-Schritt wird **pro Runtime** ueber eine kleine Abstraktionsschicht injiziert
- Auf dem Server kann die bestehende `sha256Hex()`-Logik verwendet werden
- Auf dem Client sollte `expo-crypto` verwendet werden; `crypto.subtle` darf in React Native nicht vorausgesetzt werden

Beispiel-Zielbild:

```ts
{
  method: "POST",
  route: "/api/quiz/generate",
  body: {
    topicId: "...",
    count: 5,
    language: "de",
    skillLevel: 1,
    programmingLanguage: "javascript",
  },
}
```

Fuer `POST /api/quiz/generate-mixed` gilt dasselbe Prinzip. Wichtig:

- gleiche Defaults auf Client und Server
- gleiche Feldnamen
- gleiche und explizit definierte Feldreihenfolge in der Serialisierung
- Arrays werden bewusst entweder **in Originalreihenfolge** oder bewusst sortiert behandelt; diese Entscheidung muss einmalig festgelegt und in der Shared-Helper-Funktion zentral umgesetzt werden

`JSON.stringify(...)` allein ist dafuer nicht genug spezifiziert, wenn sich die Objektkonstruktion spaeter aendert. Deshalb muss die Shared-Funktion entweder:

- Keys bewusst in fest definierter Reihenfolge aufbauen, oder
- eine stabile, rekursive Key-Sortierung erzwingen

Die Entscheidung muss durch Unit-Tests abgesichert werden.

Empfehlung fuer dieses Repo:

- Methode und Route immer in den Hash aufnehmen
- denselben Normalisierungspfad fuer Client und Server in Shared-Code kapseln
- `topicIds` nur dann sortieren, wenn die Server-Semantik Reihenfolge explizit als irrelevant behandelt

#### Hash-Versionierung

Die Hash-Definition ist Teil des API-Vertrags. Wenn sich Normalisierung, Defaults oder relevante Felder aendern, koennen alte Clients sonst im `enforce`-Modus mit `hash_mismatch` scheitern.

Empfehlung:

- Eine explizite Hash-Version mitfuehren, z. B. `X-Integrity-Hash-Version: 1`
- Der Server sollte mindestens `N` und waehrend eines Rollouts idealerweise auch `N-1` unterstuetzen

Alternative fuer kleine Nutzerbasis:

- erzwungenes App-Update vor Aktivierung einer inkompatiblen Hash-Aenderung

Bevorzugtes Zielbild fuer dieses Repo bleibt trotzdem:

- Header-basierte Versionierung im Request, damit Server und Client kontrolliert weiterentwickelt werden koennen

#### Vorteile

- kein zusaetzlicher Round-Trip fuer Android
- weniger serverseitiger State
- geringere Latenz
- weniger Angriffsoberflaeche

#### Server-seitige Verdict-Verifikation

Der Server dekodiert das Token ueber Googles REST API:

```
POST https://playintegrity.googleapis.com/v1/{PACKAGE_NAME}:decodeIntegrityToken
Authorization: Bearer {access_token}
Body: { "integrity_token": "..." }
```

Erfordert einen Google Cloud Service Account mit `playintegrity` Scope. Die Authentifizierung erfolgt ueber OAuth2 Token-Exchange.

Wichtiger Implementierungspunkt:

- Fuer den Google-API-Call muss auf EAS Hosting ein Service-Account-basierter OAuth2-Zugriff funktionieren
- Dazu muss ein JWT fuer den Token-Exchange signiert werden
- Dieser Schritt ist ein eigener Validierungspunkt fuer Android und sollte frueh als technischer Mini-PoC verifiziert werden

#### Initiale Verdict-Policy fuer Observe und spaeteres Enforce

| Feld | Akzeptierter Wert | Rationale |
|---|---|---|
| `deviceRecognitionVerdict` | initialer Kandidat fuer `enforce`: mindestens `MEETS_DEVICE_INTEGRITY` | Echtes, zertifiziertes Geraet |
| `appRecognitionVerdict` | `PLAY_RECOGNIZED` | App aus dem Play Store |
| `requestHash` | muss mit Server-Berechnung uebereinstimmen | Verhindert Token-Wiederverwendung |
| `requestPackageName` | muss Package Name matchen | Grundlegende Validierung |
| `timestampMillis` | max. 5-10 Min alt | Verhindert lange Token-Aufbewahrung |

Wichtige Einordnung:

- Im `observe`-Modus wird **nicht** hart geblockt; dort werden auch schwaechere oder unerwartete Verdicts nur geloggt
- `MEETS_BASIC_INTEGRITY` bleibt bewusst eine Policy-Entscheidung fuer spaeteres `enforce`
- Die Tabelle beschreibt deshalb eine **initiale Kandidaten-Policy**, keine bereits final entschiedene Produktionspolicy
- `PLAY_RECOGNIZED` darf nur dann als Enforce-Voraussetzung gelten, wenn produktive Android-Releases ausschliesslich ueber Google Play verteilt werden

Dev-Builds auf echten Geraeten liefern `appRecognitionVerdict: "UNRECOGNIZED_VERSION"`. Das ist kein Problem, weil lokal `APP_INTEGRITY_MODE=off` gilt und im `observe`-Modus nur geloggt wird.

#### Integrity-Fehler im API-Vertrag

Integrity-Failures sind **keine** Rate-Limit-Fehler und sollten deshalb nicht als `429` modelliert werden.

Empfehlung:

- `400`, wenn Integrity-Header syntaktisch ungueltig oder in sich widerspruechlich sind
- `403`, wenn Integrity im `enforce`-Modus erforderlich war, aber das Token fehlt oder das Verdict ungueltig ist

Beispiel fuer einen strukturierten Fehler-Body:

```json
{
  "error": "integrity_failed",
  "reason": "missing_token"
}
```

Moegliche `reason`-Werte:

- `missing_token`
- `invalid_token`
- `hash_mismatch`
- `unsupported_platform`
- `integrity_unavailable`

Folge fuer den Client:

- Der Quiz-Client muss diesen Fehlertyp explizit erkennen und eine eigene Fehlermeldung anzeigen
- Die bestehende `429`-Behandlung fuer Quota bleibt davon getrennt

Klarstellung:

- `missing_token` ist ein fachlicher Integrity-Failure und faellt deshalb unter `403`
- `400` ist fuer Formfehler reserviert, nicht fuer das blosse Fehlen eines im Enforce-Modus erwarteten Tokens

#### Client-seitige Graceful Degradation

Wenn `@expo/app-integrity` auf einem echten Geraet fehlschlaegt, sollte der Client den Fehler **nicht unkontrolliert eskalieren**.

Empfohlenes Verhalten:

1. Integrity-Aufruf versuchen
2. Bei transientem Fehler den Provider einmal neu vorbereiten
3. Den Integrity-Aufruf genau einmal erneut versuchen
4. Wenn das weiterhin scheitert, den Request **ohne** Integrity-Token senden
5. Optional einen diagnostischen Header mitschicken, z. B. `X-Integrity-Error: provider_failed`

Wichtige Einordnung:

- Ein solcher Fehler-Header ist **nicht vertrauenswuerdig**
- Der Server darf ihn nur fuer Logging und Observe-Auswertung verwenden
- Im `observe`-Modus hilft das, Alpha-Bugs von normalem Missing-Token-Traffic besser zu unterscheiden
- Im `enforce`-Modus wird der Request trotzdem regulaer mit `403` abgelehnt

#### Grobe Dateiauswirkungen

Neue Dateien:

- `client/lib/app-integrity.ts`
- `server/integrity.ts`
- `server/integrity-android.ts`
- optional `server/ip-rate-limit.ts`

Anpassungen:

- `client/lib/query-client.ts`
- `app/api/quiz/generate+api.ts`
- `app/api/quiz/generate-mixed+api.ts`
- `shared/api-quota.ts` oder neues `shared/api-integrity.ts` fuer Header-Konstanten (`X-Integrity-Token`, `X-Integrity-Platform`) analog zum bestehenden `DEVICE_ID_HEADER`
- `server/logging.ts` erweitern um `integrityMode` (`off`/`observe`/`enforce`), `integrityResult` (`valid`/`invalid`/`missing`/`error`/`skipped`), `integrityPlatform` (`android`/`ios`/`null`)

#### Android-Rollout-Modus

Empfohlenes Feature-Flag:

```bash
APP_INTEGRITY_MODE=off|observe|enforce
```

Zusaetzlich sollten Android und iOS unabhaengig schaltbar sein.

Beispiel:

```bash
APP_INTEGRITY_ANDROID_ENABLED=true
APP_INTEGRITY_IOS_ENABLED=false
```

Semantik:

- `*_ENABLED=false` bedeutet: Integrity fuer diese Plattform wird komplett uebersprungen (`skipped`)
- `*_ENABLED=true` + `APP_INTEGRITY_MODE=observe` bedeutet: pruefen und loggen, aber nicht blocken
- `*_ENABLED=true` + `APP_INTEGRITY_MODE=enforce` bedeutet: pruefen und bei Failure blocken
- Wenn fuer die aktuelle Plattform `*_ENABLED=false` ist, darf `APP_INTEGRITY_MODE=enforce` **nicht** implizit trotzdem blockieren

Empfohlenes zusaetzliches Flag fuer den Frontdoor-Guard:

```bash
API_IP_GUARD_ENABLED=true|false
```

Semantik:

- `API_IP_GUARD_ENABLED=true`: IP-Guard ist aktiv
- `API_IP_GUARD_ENABLED=false`: IP-Guard wird komplett uebersprungen

Empfehlung fuer dieses Repo:

- lokal standardmaessig `false`
- in Staging/Produktion nach Rollout standardmaessig `true`
- als Kill-Switch beibehalten, falls Shared-IP-Szenarien in Produktion unerwartet viele False Positives erzeugen

### Phase 2 - Observe vor Enforce

#### Ziel

Vor echtem Blocking reale Fehlerraten und Geraeteprobleme sehen.

#### Verhalten im Observe-Modus

- Integrity wird bereits geprueft
- Fehlende oder ungueltige Tokens werden geloggt
- Requests werden noch **nicht** hart abgelehnt
- Quota und OpenAI-Pfad bleiben aktiv

#### Exit-Kriterien fuer Enforce

- stabile Token-Erzeugung auf echten Android-Geraeten
- keine unerwarteten Ablehnungen auf gaengigen Testgeraeten
- sinnvolle Fehlerraten ueber mindestens einen Release-Zyklus
- klares Monitoring fuer Integrity-Failures vorhanden

### Phase 3 - iOS-PoC

#### Ziel

Nur die technische Machbarkeit auf EAS Hosting validieren, nicht direkt produktiv ausrollen.

#### Scope des PoC

- Community-Library fuer App Attest evaluieren; empfohlene Kandidaten:
  - `node-app-attest` (38 Stars, 77 Commits, aktiv) - erste Wahl
  - `appattest-checker-node` (19 Stars, TypeScript, v1.0.3) - Alternative
  - `app-attest-server` (1 Star, nutzt SQLite) - ausgeschlossen (kein FS auf Workers)
- Attestation- und Assertion-Verifikation auf EAS Hosting testen
- CBOR-/X.509-/Counter-Verhalten pruefen; `cbor-x` als CBOR-Library (reines JS, optionales natives Addon)
- Real-Geraete statt Simulator als Pflicht
- Minimalen PoC: hardcoded Attestation-Fixture auf einer EAS-Route dekodieren, um Workers-Kompatibilitaet zu verifizieren

#### iOS-spezifische Architektur

Im Unterschied zu Android ist hier ein serverseitiger Challenge-/Attestation-Pfad sinnvoll.

Voraussichtliche Bausteine:

- `app/api/integrity/attest+api.ts`
- `server/integrity-apple.ts`
- kurzlebiger Challenge-Speicher
- Persistenz fuer attestierte Schluessel und Counter

#### No-Go-Kriterien

Der iOS-Pfad wird **nicht** weiter ausgebaut, wenn:

- die Library auf EAS Hosting unzuverlaessig ist
- echte Geraete unakzeptabel oft scheitern
- der Support-/Testaufwand unverhaeltnismaessig wird
- das Schutzplus den operativen Mehraufwand fuer dieses Projekt nicht rechtfertigt

### Phase 4 - Optionales iOS-Enforcement

#### Nur wenn Phase 3 erfolgreich war

Dann gilt:

- erst `observe`
- spaeter `enforce`
- Android und iOS getrennt schaltbar halten
- klaren Fallback auf Android-only plus IP-/Quota-Haertung beibehalten

## Datenmodell

### Sofort sinnvoll

Fuer den IP-Guard:

- eigener globaler Counter `ip_usage_daily` mit `ip_hash`, `usage_date`, `request_count`
- keine Speicherung roher IP-Adressen
- konservative Aufbewahrung
- optional separates Audit- oder Telemetrie-Log mit `endpoint`, wenn die Aufteilung spaeter ausgewertet werden soll

Empfehlung:

- Start mit einem **globalen** Limit ueber beide Quiz-Endpunkte
- `endpoint` nur im optionalen Audit-/Telemetrie-Log mitschreiben, nicht im globalen Counter-Schluessel
- bewusst **Upsert + `request_count`** verwenden, nicht Row-per-Request wie beim bestehenden Device-Quota
- Grund: weniger Rows, einfacherer Cleanup, bessere Eignung fuer einen groben Frontdoor-Guard

### Android

Android benoetigt im Zielbild **keine** persistente Challenge-Tabelle.

Optional sinnvoll:

- Audit- oder Failure-Events fuer Observe-/Enforce-Auswertung

### iOS

Nur fuer den PoC bzw. spaeteren Ausbau:

- `integrity_challenges`
- `device_attestations`

Hinweis:

Die iOS-Attestation sollte nicht zu stark an die bisherige client-generierte Device-ID gekoppelt werden. Wenn eine attestierte Schluesselidentitaet vorhanden ist, ist sie der bessere Vertrauensanker als eine frei waehlbare UUID.

## Betriebsregeln

### Default lokal

```bash
API_IP_GUARD_ENABLED=false
APP_INTEGRITY_MODE=off
APP_INTEGRITY_ANDROID_ENABLED=false
APP_INTEGRITY_IOS_ENABLED=false
```

### Staging

Empfohlen:

```bash
API_IP_GUARD_ENABLED=true
APP_INTEGRITY_MODE=observe
APP_INTEGRITY_ANDROID_ENABLED=true
APP_INTEGRITY_IOS_ENABLED=false
```

### Produktion

Empfohlener Pfad:

1. Android `observe`
2. Android `enforce`
3. optional iOS `observe`
4. optional iOS `enforce`

## Auswirkungen auf den Dev-Workflow

- Android-first haelt den zusaetzlichen Workflow-Aufwand moderat
- iOS braucht reale Geraete fuer serioese Tests
- Simulatoren duerfen Integrity nicht heimlich als produktionsnahen Pfad vortaeuschen
- Jest und Maestro brauchen Mock- bzw. Bypass-Pfade
- Feature-Flags muessen lokal und in CI deterministisch steuerbar sein

## Erfolgskriterien

Der Ausbau gilt als erfolgreich, wenn:

- triviale Fremdclients ohne echte App deutlich schlechter durchkommen
- keine spuerbare Regression fuer regulaere Nutzer auf echten Geraeten entsteht
- Android stabil im Enforce-Modus laeuft
- iOS entweder stabil funktioniert oder bewusst draussen bleibt
- die OpenAI-Kosten im Missbrauchsfall frueher begrenzt werden als heute

## Offene Fragen

1. Gibt es bereits belastbare Hinweise auf Missbrauch in den Logs?
2. Existiert ein Google-Cloud-Projekt fuer Play Integrity bereits? Falls nein: ein Projekt anlegen, Play Integrity API aktivieren, Service Account mit `playintegrity` Scope erstellen
3. Ist App Attest auf Apple-Seite organisatorisch und technisch vorbereitet? (App-ID-Registrierung, App Attest Capability in Xcode)
4. ~~Welche Community-Library kommt fuer den iOS-PoC in Frage?~~ Beantwortet: `node-app-attest` als erste Wahl, `appattest-checker-node` als Alternative
5. Soll iOS bei ausbleibendem PoC bewusst vorerst ohne App Integrity bleiben?
6. Sollen Geraete mit nur `MEETS_BASIC_INTEGRITY` nach der Observe-Phase im spaeteren `enforce`-Modus ausgeschlossen bleiben, oder wird diese Klasse bewusst toleriert?
7. Soll der Android-Schritt explizit einen Mini-PoC fuer Google Service-Account OAuth2/JWT-Signing auf EAS Hosting enthalten, bevor die eigentliche Verdict-Pruefung umgesetzt wird?
8. Welcher Package Name wird fuer die Play Integrity Konfiguration verwendet?

## Empfohlene Entscheidung fuer dieses Repo

**Ja zu einem abgestuften Plan.**

Aber konkret:

- **jetzt** Phase 0 planen und umsetzen
- **danach** Android-first
- **iOS nicht versprechen**, sondern nur als PoC aufnehmen

Damit bleibt der Plan technisch ernsthaft, aber wirtschaftlich und operativ angemessen fuer CodeCompanion.

## Quellen

- Expo App Integrity Docs: https://docs.expo.dev/versions/latest/sdk/app-integrity/
- Expo App Integrity Blog: https://expo.dev/blog/expo-app-integrity
- EAS Hosting Worker Runtime: https://docs.expo.dev/eas/hosting/reference/worker-runtime/
- EAS Hosting Responses and Headers: https://docs.expo.dev/eas/hosting/reference/responses-and-headers/
- Google Play Integrity Standard Requests: https://developer.android.com/google/play/integrity/standard
- Google Play Integrity Verdicts: https://developer.android.com/google/play/integrity/verdicts
- Apple App Attest / Validating Apps That Connect to Your Server: https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server
- cbor-x (reines JS, optionales Addon): https://github.com/kriszyp/cbor-x
- node-app-attest (iOS-PoC erste Wahl): https://github.com/uebelack/node-app-attest
- appattest-checker-node (iOS-PoC Alternative): https://github.com/srinivas1729/appattest-checker-node
