# Plan 003: Version and exercise the Supabase quota contract

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report — do not improvise. Never print, commit, or place real credential values in source, test output, or documentation. When complete, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bb501e..HEAD -- server/quota.ts server/supabase.ts shared/api-quota.ts app/api/quiz/generate+api.ts app/api/quiz/generate-mixed+api.ts package.json __tests__/unit/app/api/_lib/quota.test.ts supabase scripts plans/README.md`
> If any in-scope contract file changed, compare it with the excerpts below. STOP if endpoint names, limits, or the server-side-only credential model no longer match.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `0bb501e`, 2026-07-13

## Why this matters

The quota feature intentionally fails closed when Supabase is unavailable, but its table is currently created manually and its tests use only an in-memory fake client. A developer can therefore deploy an enabled quota configuration with a missing or incompatible schema without a reproducible migration or a real-service check. Commit the schema as the source of truth and add an explicitly opt-in integration command that can run only against a dedicated non-production Supabase project.

## Current state

- `server/quota.ts` counts `public.api_usage` by UTC date, device hash, and endpoint, then inserts one row for each allowed request.
- `server/supabase.ts:25-48` creates an admin client from `SUPABASE_URL` and `SUPABASE_SECRET_KEY`; these names are production/server-only and must not become `EXPO_PUBLIC_*` values.
- `README.md:148-181` currently says no migration is committed and provides manual SQL. Plan 005 will update that documentation after this migration exists.
- `__tests__/unit/app/api/_lib/quota.test.ts:24-85` simulates Supabase entirely in memory. Keep it for fast unit coverage.

Runtime limits and schema use in `server/quota.ts:13-16,171-232`:

```ts
const DEVICE_TOTAL_LIMIT_PER_DAY = 15;
const DEVICE_GENERATE_LIMIT_PER_DAY = 12;
const DEVICE_MIXED_LIMIT_PER_DAY = 6;
const GLOBAL_LIMIT_PER_DAY = 400;

await supabase.from('api_usage').insert({
  device_id_hash: deviceIdHash,
  endpoint,
  usage_date: usageDate,
});
```

The two protected endpoints are exactly `quiz/generate` and `quiz/generate-mixed`. The application contract uses UTC dates and RLS with no client policy; preserve both. `package.json:16-17` shows the normal unit/integration commands. The new live-service command must not be included in `npm test` or `npm run test:integration`, because contributors normally do not have test-project credentials.

## Commands you will need

| Purpose                          | Command                                                          | Expected on success                                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fast quota unit tests            | `npx jest __tests__/unit/app/api/_lib/quota.test.ts --runInBand` | Exit 0.                                                                                                                                             |
| Normal tests without credentials | `npm test -- --runInBand`                                        | Exit 0; live Supabase suite is skipped.                                                                                                             |
| Explicit live quota test         | `npm run test:quota:integration`                                 | Exit 0 only with dedicated test-project env vars set; otherwise exits non-zero before contacting a service and names only missing variable _names_. |
| Type/lint/format                 | `npm run check:types && npm run lint && npm run check:format`    | All exit 0.                                                                                                                                         |

## Scope

**In scope**:

- `supabase/migrations/` (create the quota migration)
- `scripts/verify-quota-test-env.ts` (create a non-secret env preflight)
- `__tests__/integration/server/quota-supabase.test.ts` (create)
- `package.json`
- `plans/README.md` (status row only)

**Out of scope**:

- Production Supabase configuration, production data, RLS policies beyond the documented no-policy setup, and all `.env*` files.
- Changing quota limits, using the test project from the mobile client, or adding public authentication.
- Replacing the accepted count-then-insert algorithm with an atomic RPC; that is a separate security/design decision.
- README edits (Plan 005 owns them).

## Git workflow

- Use one focused commit if the operator asks, e.g. `Version quota schema and integration test`.
- Do not push, deploy, or run against production.

## Steps

### Step 1: Commit an idempotent schema migration

Create a timestamped SQL file under `supabase/migrations/` that defines `public.api_usage` with the existing contract: identity primary key; non-null `device_id_hash`; non-null `endpoint` constrained to the two endpoint strings; non-null UTC-date `usage_date`; non-null timestamp `created_at`; the three indexes currently documented in README; and RLS enabled without policies.

Use `if not exists` only where needed to make adoption safe for the already manually provisioned non-production environments. Do not add a client-facing RLS policy. Add SQL comments that state the migration must be applied only through the team's normal Supabase migration workflow, not from the mobile app.

**Verify**: `rg -n "api_usage|enable row level security|quiz/generate-mixed" supabase/migrations` → finds table, endpoint constraint, indexes, and RLS in the new migration.

### Step 2: Add a fail-fast opt-in integration command

Create `scripts/verify-quota-test-env.ts` that checks only the presence of `SUPABASE_TEST_URL` and `SUPABASE_TEST_SECRET_KEY`; it must never echo their values. Add `test:quota:integration` to `package.json` that runs this preflight and then the single new Jest file with `--runInBand --coverage=false`.

The integration test must use the test-only variable names, create its own Supabase admin client, and use a unique test-run prefix for `device_id_hash`. In `beforeAll`/`afterAll`, delete only rows matching that prefix. It must never issue unscoped `delete()` calls and must assert the cleanup query succeeds.

**Verify**: with neither variable present, `npm run test:quota:integration` → exits non-zero before a network call and does not reveal a value.

### Step 3: Exercise the real schema and quota behavior

In `__tests__/integration/server/quota-supabase.test.ts`, use the real test-project client to verify all of the following:

1. An allowed `checkAndConsumeQuota` call writes a row with the expected UTC-day and `quiz/generate` endpoint.
2. An allowed call for `quiz/generate-mixed` writes a distinct endpoint row.
3. Seed only prefix-owned rows to reach each current runtime threshold (12 generate, 15 device total, and 400 global), then assert `checkAndConsumeQuota` returns the matching `device_endpoint`, `device_total`, or `global_day` reason and no extra row is inserted.
4. A deliberately invalid test-only client/connection path is tested at the existing API-route unit boundary, where the expected public result is the existing generic `503` quota-unavailable response and no OpenAI generator is called. Keep this deterministic test mocked; do not manufacture a production outage.

Use the current unit test's expected reason/body vocabulary as the assertion pattern. Do not assert or log secret values, raw device IDs, or test-project URL.

**Verify**: with the dedicated test-project migration applied and both test variables supplied, `npm run test:quota:integration` → exit 0 and all cleanup assertions pass.

### Step 4: Run non-live verification and record completion

Run the fast quota unit test and the normal suite with no test credentials. Then run typecheck, lint, and format. Update Plan 003 only after both the normal and explicitly opted-in verification modes have passed.

**Verify**: commands in the table above → expected results; `git diff --check` → exit 0.

## Test plan

- Preserve fake-client unit tests for fast error/header coverage.
- Add a skipped-by-default, explicitly invoked real-Supabase suite with scoped setup/cleanup.
- Cover both endpoint values, all three current limits, persisted UTC date, and deterministic fail-closed route behavior.

## Done criteria

- [ ] A committed SQL migration expresses the active `api_usage` schema, indexes, endpoint constraint, and RLS state.
- [ ] `test:quota:integration` refuses to run without test-only variables and never exposes values.
- [ ] The real-Supabase suite cleans up only its own prefixed rows and passes against a non-production project.
- [ ] Normal `npm test` remains credential-free and passes.
- [ ] No production system, `.env` file, or out-of-scope file changed.
- [ ] `plans/README.md` marks Plan 003 DONE.

## STOP conditions

- Only production credentials/project are available, or the target project's identity cannot be verified as non-production.
- The existing manually created table differs materially from the documented schema and an adoption migration would risk data loss.
- The test project has non-test `api_usage` rows and isolation cannot be guaranteed.
- Any code path requires exposing a server credential to the app or test output.

## Maintenance notes

When quota limits or endpoint strings change, update the migration strategy only for schema changes, the real integration thresholds, the unit tests, and Plan 005 documentation together. Retain the test-project-only env variable names; they prevent accidental production tests.
