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
- EAS Hosting basiert auf Cloudflare Workers
- `node:crypto` und `node:https` sind auf EAS Hosting als Kompatibilitaetsmodule verfuegbar

Einordnung:

- Die Runtime ist **nicht** der Hauptgrund gegen App Integrity
- Der groessere Risikofaktor liegt bei iOS in der konkreten Verifikationslogik, den verwendeten Libraries und realen Geraetetests

### Android

- Expo stuetzt Play Integrity Standard Requests
- Android bindet die Integritaetspruefung ueber `requestHash` an den eigentlichen Request
- Daraus folgt fuer dieses Projekt: Ein generischer Challenge-Endpoint ist fuer Android **nicht** das bevorzugte Zielbild

### iOS

- iOS nutzt App Attest mit Attestation- und spaeter Assertion-Flow
- Dafuer ist serverseitige Challenge-/Assertion-Verifikation erforderlich
- Dieser Teil ist deutlich komplexer als Android und bekommt deshalb einen eigenen PoC-Pfad

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

- IP-Adresse aus EAS-Forwarding-Headern auslesen
- Rohe IP nicht persistent speichern
- Falls gespeichert oder geloggt, nur als Hash oder stark reduzierte Ableitung
- Grobes Tages- oder Burst-Limit je IP vor OpenAI und vor spaeteren Integrity-Checks anwenden
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

1. Client berechnet einen stabilen `requestHash`
2. Client fordert einen Play-Integrity-Token fuer genau diesen Request an
3. Server verifiziert den Verdict
4. Server vergleicht den erwarteten Hash mit dem im Verdict referenzierten Request

### Vorteile

- kein zusaetzlicher Round-Trip fuer Android
- weniger serverseitiger State
- geringere Latenz
- weniger Angriffsoberflaeche

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
- `shared/api-quota.ts` oder neues gemeinsames Security-Contract-Modul

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

- Community-Library fuer App Attest evaluieren
- Attestation- und Assertion-Verifikation auf EAS Hosting testen
- CBOR-/X.509-/Counter-Verhalten pruefen
- Real-Geraete statt Simulator als Pflicht

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
2. Existiert ein Google-Cloud-Projekt fuer Play Integrity bereits?
3. Ist App Attest auf Apple-Seite organisatorisch und technisch vorbereitet?
4. Welche Community-Library kommt fuer den iOS-PoC in Frage?
5. Soll iOS bei ausbleibendem PoC bewusst vorerst ohne App Integrity bleiben?

## Empfohlene Entscheidung fuer dieses Repo

**Ja zu einem abgestuften Plan.**

Aber konkret:

- **jetzt** Phase 0 planen und umsetzen
- **danach** Android-first
- **iOS nicht versprechen**, sondern nur als PoC aufnehmen

Damit bleibt der Plan technisch ernsthaft, aber wirtschaftlich und operativ angemessen fuer CodeCompanion.

## Quellen

- Expo App Integrity Docs: https://docs.expo.dev/versions/latest/sdk/app-integrity/
- EAS Hosting Worker Runtime: https://docs.expo.dev/eas/hosting/reference/worker-runtime/
- EAS Hosting Responses and Headers: https://docs.expo.dev/eas/hosting/reference/responses-and-headers/
- Google Play Integrity Standard Requests: https://developer.android.com/google/play/integrity/standard
- Google Play Integrity Verdicts: https://developer.android.com/google/play/integrity/verdicts
- Apple App Attest / Validating Apps That Connect to Your Server: https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server
