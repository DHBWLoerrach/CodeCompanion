# Todos

Hier sammeln wir Todos für später.

## Rate Limit: Spätere Erweiterungspfade (aufbauend auf v4, siehe [Spec](./docs/specs/rate-limits/rate-limiting-plan-v4.md))

- brauchen DHBW-Nutzer überhaupt mehr Quota? siehe [DHBW-Quota-Extension-Path](./docs/specs/rate-limits/dhbw-quota-extension-path.md)

1. **`@expo/app-integrity`:** Attestation-Token als zusätzlichen Guard vor dem Quota-Check. Auf iOS kann App Attest einen persistenten `keyId` pro Installation liefern; auf Android ist es eher ein Vertrauensnachweis pro Request als ein direkter Ersatz für eine dauerhafte Geräte-ID. Siehe dazu den abgestuften Rollout-Plan: [App Integrity Rollout Plan](./docs/specs/rate-limits/app-integrity-rollout-plan.md). Die Spec ist Stand 25.03.2026 nach mehreren Iterationen finalisiert; vor einer späteren Umsetzung müssen Aktualität, Annahmen und Relevanz erneut geprüft werden.
2. **Caching:** Vorab generierte Fragen für häufige Quiz-Kombinationen, um API-Kosten zu senken.
3. **Burst-Schutz:** Kleines Zeitfenster-Limit ergänzen, z. B. `2 Requests / 10 Minuten` pro Gerät, falls ihr frühe Tages-Spikes oder Script-Traffic in den Logs seht.
4. **Atomare DB-Funktion (RPC):** Falls das Volumen deutlich steigt und Race Conditions relevant werden.

## Full Stack

- Brauchen wir das: https://docs.expo.dev/versions/latest/sdk/build-properties/ ?
- Inhalte:
  - „pures“ JavaScript von JavaScript im Browser abgrenzen (weiteres Thema)
  - Weitere Sprachen: Java, Python, HTML, CSS, C#, Go, Rust, ...
  - TypeScript? Frameworks (React, …) ? Konzepte (HTTPS)
- Chat für Lernsessions einbauen? https://github.com/vercel/aix
- prerequisites bei den Themen berücksichtigen

## Frontend (App)

- UI-Patterns von Apps übernehmen? https://factory.strongdm.ai/techniques/gene-transfusion

## Backend (API-Routes)
