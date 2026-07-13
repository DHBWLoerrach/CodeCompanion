# Plan 006: Measure explanation-corpus loading before optimizing it

> **Executor instructions**: This is a performance spike, not permission for a speculative lazy-loading refactor. Collect reproducible evidence, write the decision record described below, and STOP after measurement. Do not alter explanation imports, routes, or user-visible behavior. Update the plan index only after the record is complete.
>
> **Drift check (run first)**: `git diff --stat 0bb501e..HEAD -- shared/explanations client/screens/TopicDetailScreen.tsx client/screens/TopicExplanationScreen.tsx docs/measurements plans/README.md`
> STOP if explanations are no longer static JSON imports or the Topic Detail/Explanation routes changed architecture.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `0bb501e`, 2026-07-13

## Why this matters

All eight bilingual explanation JSON files are statically imported into `shared/explanations/index.ts`, making the complete corpus reachable from both topic detail and explanation screens. The raw corpus is currently about 692 KiB and will grow with each language, but the exact mobile bundle/startup cost and Expo's viable code-splitting behavior have not been measured. Establish a reproducible baseline before deciding whether an offline-safe deferred-loading implementation is worth its complexity.

## Current state

`shared/explanations/index.ts:1-8` statically imports every language/locale JSON file and builds one `TOPIC_EXPLANATIONS` object at lines 27-47. `client/screens/TopicDetailScreen.tsx:11,202-214` imports this module for availability and a 120-character preview; `client/screens/TopicExplanationScreen.tsx:9,141-147` imports it to render full markdown.

The current Expo CLI supports static export with `--platform android|ios|web|all`, `--output-dir`, and `--dump-assetmap` (`npx expo export --help`). The product is iOS/Android only; do not use a web/API export as the sole performance result.

## Commands you will need

| Purpose                | Command                                                                                                           | Expected on success                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------- |
| Corpus baseline        | `du -ch shared/explanations/\*.json                                                                               | tail -1`                                           | Reports raw corpus total. |
| Inspect export options | `npx expo export --help`                                                                                          | Lists iOS/Android platform and output-dir options. |
| iOS export             | `npx expo export --platform ios --output-dir /private/tmp/codecompanion-explanations-ios --dump-assetmap`         | Exit 0; artifacts remain outside repo.             |
| Android export         | `npx expo export --platform android --output-dir /private/tmp/codecompanion-explanations-android --dump-assetmap` | Exit 0; artifacts remain outside repo.             |
| Standard verification  | `npm run check:types && npm run lint && npm run check:format && npm test -- --runInBand`                          | All exit 0.                                        |

## Scope

**In scope**: create `docs/measurements/2026-07-explanation-corpus-baseline.md`; `plans/README.md` (status only).

**Out of scope**: all files in `shared/explanations/`, screen/component code, dependencies, Expo configuration, production deployment, and any committed build artifact. `/private/tmp` export directories are disposable and must never be committed.

## Steps

### Step 1: Capture reproducible raw and exported size evidence

Run the raw corpus measurement and both native-platform exports into the exact temporary paths above. For each export, record in the measurement document: command, Expo/Node versions, total output size, JavaScript bundle file names/sizes, source-map policy, and asset-map location. Use `du`, `find`, and `gzip -9 -c` only on exported files to report raw and gzip sizes; do not modify repo output directories.

**Verify**: both export commands exit 0 and the measurement document includes command output summaries for iOS and Android.

### Step 2: Determine whether the corpus is statically included

Use the asset map and exported JavaScript search to determine whether strings unique to at least two explanation files occur in the initial bundle(s), later chunks, or are absent due to bytecode/minification. Record the method and its limitation. Do not claim startup parse cost from file size alone.

**Verify**: the measurement document names the inspected artifacts and includes a reproducible search command/result for each platform.

### Step 3: Make a constrained decision

End the document with exactly one of these evidence-based outcomes:

- **No follow-up**: corpus is not materially in the initial mobile bundle, or its measured share is too small to justify complexity.
- **Create implementation plan**: static corpus is materially included and a small availability/preview manifest plus an offline-safe deferred-content design is technically supported by the measured Expo output.
- **Investigate tooling**: export artifacts cannot show import/chunk behavior; request a native bundle/profile measurement before touching imports.

For a follow-up recommendation, state the measured threshold used (for example, initial-bundle share), expected benefit, offline constraint, and exact unknowns. Do not implement dynamic imports in this spike.

**Verify**: `rg -n "Outcome: (No follow-up|Create implementation plan|Investigate tooling)" docs/measurements/2026-07-explanation-corpus-baseline.md` → exactly one match.

### Step 4: Verify and record completion

Run standard checks because the measurement document is committed alongside the app. Update Plan 006 to DONE when all checks pass.

**Verify**: `git diff --check` → exit 0; `git diff --name-only` contains only the measurement record and plan index.

## Test plan

No behavior changes are authorized. Verify that existing typecheck, lint, format, and Jest suite pass unchanged; the main acceptance artifact is a reproducible measurement record rather than a benchmark claim.

## Done criteria

- [ ] Raw corpus and iOS/Android export measurements are recorded with reproducible commands.
- [ ] The record distinguishes raw corpus size from measured initial-bundle evidence.
- [ ] Exactly one constrained decision outcome is recorded.
- [ ] No source, dependency, configuration, or build artifact is committed.
- [ ] Standard verification passes and index is updated.

## STOP conditions

- Native export requires credentials, a deployment, or writes artifacts into the repository.
- The measurement would require opening/using a production mobile build or collecting learner data.
- The result cannot distinguish initial bundle reachability from total export size; choose `Investigate tooling`, do not infer a refactor.

## Maintenance notes

Repeat this spike whenever a new language or large explanation corpus is added. Any future implementation must preserve offline explanation access and the Topic Detail preview/availability behavior; it needs a separate plan and tests.
