# Plan 005: Reconcile the public documentation with the released app

> **Executor instructions**: Follow this plan step by step. This plan has a required product-policy input. If it is not supplied, STOP rather than choosing a quota limit. Run every verification command and update `plans/README.md` only after all checks pass.
>
> **Drift check (run first)**: `git diff --stat 0bb501e..HEAD -- README.md package.json shared/programming-language.ts server/quota.ts app/api docs/specs/rate-limits/rate-limiting-plan-v4.md supabase/migrations plans/README.md`
> STOP if the repository has no committed quota migration from Plan 003 or the runtime/documented quota policy is still undecided.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: `plans/003-version-supabase-quota-contract.md`
- **Category**: docs
- **Planned at**: commit `0bb501e`, 2026-07-13

## Why this matters

The README is the onboarding and operations reference, but it predates the Rust integration and Expo 57 upgrade, describes files/routes that do not exist, and gives a quota budget different from the running server. Incorrect API and quota guidance can cause incomplete client changes or unplanned cost exposure. Align public documentation with a deliberately confirmed runtime policy and the migration committed by Plan 003.

## Current state

`README.md:9,29-30,41,53-55,278,291` currently claims JavaScript/Python/Java only, Expo SDK 55/RN 0.83/Router 6, a topic-explain API route, `server/topic-prompts.ts`, and an API language union without Rust. In contrast, `package.json:29,38,45` declares Expo 57, Router 57, and RN 0.86; `shared/programming-language.ts:3-8` includes Rust; route files under `app/api/quiz/` are only generate and generate-mixed; prompts are `shared/topic-prompts/*.json`.

The conflict requiring an owner decision is explicit:

```ts
// server/quota.ts:13-16
const DEVICE_TOTAL_LIMIT_PER_DAY = 15;
const DEVICE_GENERATE_LIMIT_PER_DAY = 12;
const DEVICE_MIXED_LIMIT_PER_DAY = 6;
const GLOBAL_LIMIT_PER_DAY = 400;
```

while `docs/specs/rate-limits/rate-limiting-plan-v4.md:77-80` says 5/4/2/60. Treat runtime code and current unit tests as observed behavior, not proof of desired policy. README currently gives manual schema SQL at lines 148-181; after Plan 003 it must instead point to the migration source and test-only verification process.

## Commands you will need

| Purpose                 | Command                                                                          | Expected on success                   |
| ----------------------- | -------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------- |
| Check current routes    | `find app/api -type f -name '\*+api.ts'                                          | sort`                                 | Lists only real API route files. |
| Check language registry | `rg -n "SUPPORTED_PROGRAMMING_LANGUAGE_IDS                                       | rust" shared/programming-language.ts` | Confirms Rust is included.       |
| Doc formatting          | `npx prettier --check README.md docs/specs/rate-limits/rate-limiting-plan-v4.md` | Exit 0.                               |
| Source verification     | `npm run check:types && npm test -- --runInBand`                                 | Both exit 0.                          |

## Scope

**In scope**: `README.md`, `docs/specs/rate-limits/rate-limiting-plan-v4.md`, `plans/README.md` (status only).

**Out of scope**: changing quota code/tests or limits, changing the migration authored in Plan 003, deployments, `.env` files, or feature implementation.

## Steps

### Step 1: Obtain and record the quota-policy decision

Before editing, obtain one explicit maintainer decision: either the active server limits (15 total / 12 generate / 6 mixed / 400 global) are intended, or the v4 document limits (5 / 4 / 2 / 60) are intended. Record the chosen values and decision date in the updated v4 document's status/history section.

If the v4 limits are intended, STOP: this documentation plan is not authorized to change production behavior. Create a follow-up code plan for `server/quota.ts`, its unit tests, and deployment cost review instead.

**Verify**: the decision is written in the diff and every quota figure in the edited documents equals the confirmed policy.

### Step 2: Correct README facts and onboarding references

Update only facts verified from source:

1. Include Rust in the overview and both API `programmingLanguage` unions.
2. Update stack versions to Expo 57, React Native 0.86, React 19.2, and Expo Router 57.
3. Replace the obsolete route/module map with the actual two quiz API routes, `server/quiz/` module family, and `shared/topic-prompts/` JSON mappings.
4. Preserve the mobile-only product statement; explain that web output exists for server-side Expo API routes, not a browser product.
5. Replace manual Supabase SQL instructions with the committed migration location and the opt-in, non-production quota integration command from Plan 003. State variable names only, never values.

**Verify**: route/language commands above match README; `rg -n "SDK 55|0.83|Router 6|server/topic-prompts|topic explain" README.md` returns no obsolete architecture claims.

### Step 3: Mark the v4 rate-limit document accurately

Keep the document as useful engineering history, but change its status to implemented/superseded as appropriate and add a short "Current runtime contract" section containing the confirmed limits, active endpoints, migration reference, and test-project-only verification rule. Correct acceptance examples and cost statements so none retain the old policy. Do not rewrite historical rationale unrelated to the active contract.

**Verify**: `rg -n "\*\*5 Requests|\*\*60 Requests|maximal 4|maximal 2" docs/specs/rate-limits/rate-limiting-plan-v4.md` returns no stale active-policy statements.

### Step 4: Verify and record completion

Run documentation formatting and source verification commands. Update Plan 005 status only after every check passes.

**Verify**: `git diff --check` → exit 0; diff names only in-scope files.

## Test plan

This is documentation-only. Use source-of-truth searches plus existing typecheck/full Jest verification to ensure no accidental code change. Review all numeric quota values as a set; a single retained 5/60 example makes the plan incomplete.

## Done criteria

- [ ] The maintainer's quota-policy decision is recorded and all active docs agree with it.
- [ ] README reflects Rust, current SDK/framework versions, actual routes/modules, and migration-based quota setup.
- [ ] The v4 spec no longer presents stale limits as the active runtime contract.
- [ ] Prettier check, typecheck, and full Jest pass.
- [ ] No code, migration, secret, or out-of-scope file changed; index updated.

## STOP conditions

- No explicit quota-policy decision is available.
- Plan 003 migration/integration contract is not DONE.
- Correcting docs requires changing source behavior or publishing credentials.

## Maintenance notes

When a language, Expo SDK, route, or quota policy changes, update README and the active-contract section in the same pull request. Historical plans should be visibly labeled so they are not mistaken for current production policy.
