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

- Expo App Integrity ist laut Expo-Dokumentation weiterhin **Alpha** (aktuell v55.0.8)
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

### Ziel

Sofortigen Zusatzschutz mit geringem Risiko einbauen, ohne App Integrity schon verpflichtend zu machen.

### Umsetzung

- IP-Adresse aus `X-Real-IP` Header auslesen (empfohlener Header auf EAS Hosting, enthaelt nur die Client-IP)
- Sofort mit `sha256Hex()` aus `server/crypto.ts` hashen (bestehende Funktion wiederverwendbar)
- Rohe IP nicht persistent speichern
- IP-Hash in Supabase pruefen: eigene kurzlebige Tabelle `ip_usage` mit `ip_hash`, `usage_date`, `request_count`
- Grobes Tageslimit je IP-Hash (z.B. 50/Tag) vor OpenAI und vor spaeteren Integrity-Checks anwenden; bewusst grosszuegiger als Device-Limit wegen Shared WiFi (Uni-Netzwerke)
- Zusaezliche Signale loggen:
  - fehlende Integrity-Header
  - ungueltige Integrity-Tokens
  - Enforce-vs-Observe-Ergebnisse
  - Anteil abgewiesener Requests

### Warum zuerst?

- Deutlich billiger und risikoaermer als App Integrity
- Schuetzt auch gegen das spaetere Hammern auf Integrity-Endpunkte
- Liefert Missbrauchsdaten, bevor ein Alpha-Feature produktiv erzwungen wird

### Datenschutz-Notiz

Da das Produkt serverseitig bewusst kaum personenbezogene Daten speichert, sollten IPs nie im Klartext persistiert werden. Fuer die Abuse-Erkennung reicht eine serverseitig gehashte oder kurzlebig verarbeitete Form.

### Phase 1 - Android-first

### Ziel

Den einfacheren und risikoaermeren Integritaetspfad zuerst ausrollen.

### Wichtige Architekturentscheidung

Fuer Android wird **kein generischer Challenge-Endpoint** eingeplant.

Stattdessen:

1. Client berechnet SHA-256 ueber die relevanten Request-Parameter (z.B. `topicId + count + language + programmingLanguage + skillLevel`)
2. Client ruft `requestIntegrityCheckAsync(requestHash)` auf und erhaelt ein opakes Token
3. Client sendet Token als `X-Integrity-Token` Header und Plattform als `X-Integrity-Platform: android`
4. Server sendet Token an `playintegrity.googleapis.com/v1/{PACKAGE_NAME}:decodeIntegrityToken`
5. Google gibt entschluesseltes Verdict zurueck, inkl. `requestHash` im Klartext
6. Server rekonstruiert den erwarteten Hash unabhaengig und vergleicht

### Vorteile

- kein zusaetzlicher Round-Trip fuer Android
- weniger serverseitiger State
- geringere Latenz
- weniger Angriffsoberflaeche

### Server-seitige Verdict-Verifikation

Der Server dekodiert das Token ueber Googles REST API:

```
POST https://playintegrity.googleapis.com/v1/{PACKAGE_NAME}:decodeIntegrityToken
Authorization: Bearer {access_token}
Body: { "integrity_token": "..." }
```

Erfordert einen Google Cloud Service Account mit `playintegrity` Scope. Die Authentifizierung erfolgt ueber OAuth2 Token-Exchange.

### Empfohlene Verdict-Policy

| Feld | Akzeptierter Wert | Rationale |
|---|---|---|
| `deviceRecognitionVerdict` | mindestens `MEETS_DEVICE_INTEGRITY` | Echtes, zertifiziertes Geraet |
| `appRecognitionVerdict` | `PLAY_RECOGNIZED` | App aus dem Play Store |
| `requestHash` | muss mit Server-Berechnung uebereinstimmen | Verhindert Token-Wiederverwendung |
| `requestPackageName` | muss Package Name matchen | Grundlegende Validierung |
| `timestampMillis` | max. 5-10 Min alt | Verhindert lange Token-Aufbewahrung |

Dev-Builds auf echten Geraeten liefern `appRecognitionVerdict: "UNRECOGNIZED_VERSION"`. Das ist kein Problem, weil lokal `APP_INTEGRITY_MODE=off` gilt und im `observe`-Modus nur geloggt wird.

### Grobe Dateiauswirkungen

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

### Android-Rollout-Modus

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

### Phase 2 - Observe vor Enforce

### Ziel

Vor echtem Blocking reale Fehlerraten und Geraeteprobleme sehen.

### Verhalten im Observe-Modus

- Integrity wird bereits geprueft
- Fehlende oder ungueltige Tokens werden geloggt
- Requests werden noch **nicht** hart abgelehnt
- Quota und OpenAI-Pfad bleiben aktiv

### Exit-Kriterien fuer Enforce

- stabile Token-Erzeugung auf echten Android-Geraeten
- keine unerwarteten Ablehnungen auf gaengigen Testgeraeten
- sinnvolle Fehlerraten ueber mindestens einen Release-Zyklus
- klares Monitoring fuer Integrity-Failures vorhanden

### Phase 3 - iOS-PoC

### Ziel

Nur die technische Machbarkeit auf EAS Hosting validieren, nicht direkt produktiv ausrollen.

### Scope des PoC

- Community-Library fuer App Attest evaluieren; empfohlene Kandidaten:
  - `node-app-attest` (38 Stars, 77 Commits, aktiv) - erste Wahl
  - `appattest-checker-node` (19 Stars, TypeScript, v1.0.3) - Alternative
  - `app-attest-server` (1 Star, nutzt SQLite) - ausgeschlossen (kein FS auf Workers)
- Attestation- und Assertion-Verifikation auf EAS Hosting testen
- CBOR-/X.509-/Counter-Verhalten pruefen; `cbor-x` als CBOR-Library (reines JS, optionales natives Addon)
- Real-Geraete statt Simulator als Pflicht
- Minimalen PoC: hardcoded Attestation-Fixture auf einer EAS-Route dekodieren, um Workers-Kompatibilitaet zu verifizieren

### iOS-spezifische Architektur

Im Unterschied zu Android ist hier ein serverseitiger Challenge-/Attestation-Pfad sinnvoll.

Voraussichtliche Bausteine:

- `app/api/integrity/attest+api.ts`
- `server/integrity-apple.ts`
- kurzlebiger Challenge-Speicher
- Persistenz fuer attestierte Schluessel und Counter

### No-Go-Kriterien

Der iOS-Pfad wird **nicht** weiter ausgebaut, wenn:

- die Library auf EAS Hosting unzuverlaessig ist
- echte Geraete unakzeptabel oft scheitern
- der Support-/Testaufwand unverhaeltnismaessig wird
- das Schutzplus den operativen Mehraufwand fuer dieses Projekt nicht rechtfertigt

### Phase 4 - Optionales iOS-Enforcement

### Nur wenn Phase 3 erfolgreich war

Dann gilt:

- erst `observe`
- spaeter `enforce`
- Android und iOS getrennt schaltbar halten
- klaren Fallback auf Android-only plus IP-/Quota-Haertung beibehalten

## Datenmodell

### Sofort sinnvoll

Fuer den IP-Guard:

- eigene kurzlebige Tabelle fuer `ip_hash`, `usage_date`, `endpoint`
- keine Speicherung roher IP-Adressen
- konservative Aufbewahrung

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
APP_INTEGRITY_MODE=off
APP_INTEGRITY_ANDROID_ENABLED=false
APP_INTEGRITY_IOS_ENABLED=false
```

### Staging

Empfohlen:

```bash
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
6. Soll `MEETS_BASIC_INTEGRITY` (unzertifizierte Geraete) im `observe`-Modus toleriert werden, oder nur `MEETS_DEVICE_INTEGRITY`?
7. Welcher Package Name wird fuer die Play Integrity Konfiguration verwendet?

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
