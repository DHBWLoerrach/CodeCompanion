# Plan 002: Gate production deployment on existing verification

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bb501e..HEAD -- .github/workflows/deploy.yml package.json plans/README.md`
> If an in-scope file changed, compare the excerpts below with live code. If they no longer describe the workflow, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `0bb501e`, 2026-07-13

## Why this matters

The only production deployment workflow installs dependencies, exports the web/API bundle, and deploys it, but it never executes the project's existing automated checks. A manual deployment can therefore publish a regression that TypeScript, ESLint, Prettier, or Jest would already detect. Make the deployment job stop before EAS export/deploy whenever one of those checks fails.

## Current state

- `.github/workflows/deploy.yml` is the sole manual production EAS Hosting workflow.
- `package.json` already defines the checks; reuse them verbatim rather than duplicating tool invocations or adding dependencies.

Current deployment sequence in `.github/workflows/deploy.yml:40-47`:

```yaml
- name: Install dependencies
  run: npm ci

- name: Export web bundle for API routes
  run: eas env:exec production 'npx expo export --platform web --no-ssg' --non-interactive

- name: Deploy to EAS Hosting (production env + production alias)
  run: eas deploy --environment production --prod --non-interactive
```

Existing commands in `package.json:7-17` are `npm run check:types`, `npm run lint`, `npm run check:format`, and `npm test`. The repository's manual deploy policy in `README.md:308-312` intentionally requires GitHub Actions; do not add a local deployment path.

## Commands you will need

| Purpose                    | Command                                             | Expected on success                           |
| -------------------------- | --------------------------------------------------- | --------------------------------------------- |
| Typecheck                  | `npm run check:types`                               | Exit 0.                                       |
| Lint                       | `npm run lint`                                      | Exit 0.                                       |
| Format                     | `npm run check:format`                              | Exit 0; all matched files use Prettier style. |
| Tests                      | `npm test -- --runInBand`                           | Exit 0; all Jest suites pass.                 |
| Workflow syntax formatting | `npx prettier --check .github/workflows/deploy.yml` | Exit 0.                                       |

## Scope

**In scope**: `.github/workflows/deploy.yml`, `plans/README.md` (status row only).

**Out of scope**: creating a PR/CI workflow, Maestro/emulator execution, changing EAS credentials/environments, `package.json` scripts, deployment triggers, or any source/test file.

## Git workflow

- Use the operator's branch; commit only when instructed.
- Use the repository's concise imperative English style, e.g. `Gate deploy on verification`.
- Never push, deploy, or manually trigger GitHub Actions during this plan.

## Steps

### Step 1: Insert blocking verification steps

After `npm ci` and before the EAS export step, add four named workflow steps in this exact order:

1. Typecheck — `npm run check:types`
2. Lint — `npm run lint`
3. Check formatting — `npm run check:format`
4. Run tests — `npm test -- --runInBand`

Keep them in the existing `deploy` job. GitHub Actions' default failure behavior must prevent later export/deploy steps from running. Do not use `continue-on-error`, conditional bypasses, or an unpinned third-party action.

**Verify**: `npx prettier --check .github/workflows/deploy.yml` → exit 0.

### Step 2: Verify the gates locally

Run every reused command locally. These commands must pass before a workflow is allowed to depend on them.

**Verify**: run all four commands in the table above → each exits 0.

### Step 3: Record completion

Set Plan 002 to `DONE` in `plans/README.md` only after the preceding checks pass.

**Verify**: `git diff --check` → exit 0; `git diff --name-only` contains only the workflow and intended plan-index change.

## Test plan

No application test is added. The plan makes the existing typecheck, lint, formatting, and full Jest checks mandatory for every production deployment. Confirm each command independently before relying on it in CI.

## Done criteria

- [ ] The deploy job runs all four existing checks after `npm ci` and before EAS export/deploy.
- [ ] A check failure blocks the subsequent workflow steps through normal GitHub Actions failure semantics.
- [ ] `npm run check:types`, `npm run lint`, `npm run check:format`, `npm test -- --runInBand`, and YAML Prettier check all exit 0.
- [ ] No files outside scope changed.
- [ ] `plans/README.md` marks Plan 002 DONE.

## STOP conditions

- The workflow has been replaced by a reusable workflow or different deployment job.
- Any added check needs production secrets or network-only services to run.
- The required commands fail twice without a scoped cause in the workflow change.

## Maintenance notes

Keep this workflow limited to deterministic repository checks. Add device/emulator E2E only with a deliberate managed-runner strategy; do not silently make deploys dependent on local Maestro tooling.
