# Todos

Hier sammeln wir Todos für später.

Sie auch die Specs/Plans unter `docs`.

## Rate Limit: Spätere Erweiterungspfade (aufbauend auf v4, siehe [Spec](./docs/specs/rate-limits/rate-limiting-plan-v4.md))

- brauchen DHBW-Nutzer überhaupt mehr Quota? siehe [DHBW-Quota-Extension-Path](./docs/specs/rate-limits/dhbw-quota-extension-path.md)
- `public.api_usage` in Supabase im Blick behalten; falls die Tabelle merklich wächst, zunächst manuell bereinigen und später bei Bedarf einen einfachen Aufräum-Job ergänzen (z. B. mit Supabase Cron).

1. **`@expo/app-integrity`:** Attestation-Token als zusätzlichen Guard vor dem Quota-Check. Auf iOS kann App Attest einen persistenten `keyId` pro Installation liefern; auf Android ist es eher ein Vertrauensnachweis pro Request als ein direkter Ersatz für eine dauerhafte Geräte-ID. Siehe dazu den abgestuften Rollout-Plan: [App Integrity Rollout Plan](./docs/specs/rate-limits/app-integrity-rollout-plan.md). Die Spec ist Stand 25.03.2026 nach mehreren Iterationen finalisiert; vor einer späteren Umsetzung müssen Aktualität, Annahmen und Relevanz erneut geprüft werden.
2. **Caching:** Vorab generierte Fragen für häufige Quiz-Kombinationen, um API-Kosten zu senken.
3. **Burst-Schutz:** Kleines Zeitfenster-Limit ergänzen, z. B. `2 Requests / 10 Minuten` pro Gerät, falls ihr frühe Tages-Spikes oder Script-Traffic in den Logs seht.
4. **Atomare DB-Funktion (RPC):** Falls das Volumen deutlich steigt und Race Conditions relevant werden.

## Full Stack

- Brauchen wir das: https://docs.expo.dev/versions/latest/sdk/build-properties/ ?
- Inhalte:
  - „pures“ JavaScript von JavaScript im Browser abgrenzen (weiteres Thema)
  - Weitere Sprachen: Java, Python, HTML, CSS, C#, Go, ...
  - TypeScript? Frameworks (React, …) ? Konzepte (HTTPS)
- Chat für Lernsessions einbauen? https://github.com/vercel/aix
- prerequisites bei den Themen/Lernpfaden stärker berücksichtigen?

## Frontend (App)

- UI-Patterns von Apps übernehmen? https://factory.strongdm.ai/techniques/gene-transfusion
- Expo-Router-v55-iOS-Features im Blick behalten: `Link.AppleZoom`, `Stack.Toolbar`, `SplitView`. Aktuell bewusst nicht einsetzen, weil die APIs alpha bzw. iOS-only sind und `SplitView` einen größeren Layout-/Navigator-Umbau erfordern würde. Nach Release von Expo SDK 56 erneut prüfen, ob die APIs stabiler sind und ob sich ein Pilot für `LanguageSelect -> LanguageOverview` oder `Learn -> TopicDetail` lohnt.
- Expo UI im Blick behalten. Expo schreibt im Blogpost vom 17.03.2026, dass sie auf universelle Komponenten hinarbeiten: eine gemeinsame API für SwiftUI und Jetpack Compose, perspektivisch eventuell auch Web. Wenn sich das in oder nach Expo SDK 56 konkretisiert, prüfen, ob wir gezielt native UI-Bausteine für Android/iOS übernehmen wollen, statt sie rein in React Native nachzubauen. Siehe: [Expo UI in SDK 55](https://expo.dev/blog/expo-ui-in-sdk-55-jetpack-compose-now-available-for-react-native-apps).

## Backend (API-Routes)
