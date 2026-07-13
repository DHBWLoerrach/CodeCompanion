# Plan 001: Return fresh progress defaults after reset

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 847c930..HEAD -- client/lib/storage.ts __tests__/unit/client/lib/storage.test.ts plans/README.md`
> If any in-scope source or test file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition. A status-only change to `plans/README.md` is expected when this plan has been started or completed.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `847c930`, 2026-07-10

## Why this matters

The app stores learning progress in AsyncStorage and offers Reset Progress in Settings. When no saved progress exists, `storage.getProgress()` currently returns a module-level object that `updateTopicProgress()` mutates in place. Clearing AsyncStorage therefore does not clear that object: within the same app process, a learner can reset progress and immediately have old counters and topic progress return. Make every missing-or-unreadable-progress fallback a fresh value so Reset Progress has its advertised effect without requiring an app restart.

## Current state

- `client/lib/storage.ts` owns AsyncStorage persistence for profile, progress, streak, settings, language selection, and reset behavior.
- `__tests__/unit/client/lib/storage.test.ts` is the unit-test home for `storage`; Jest clears AsyncStorage before every test in `test/setup.ts:46-47`.
- `client/screens/SettingsScreen.tsx:315-325` calls `storage.clearAllData()` when the learner confirms Reset Progress. Do not change the screen: the fault is in the storage fallback.

Current problematic code in `client/lib/storage.ts:90-95,147-185`:

```ts
const defaultProgress: ProgressData = {
  totalQuestions: 0,
  correctAnswers: 0,
  topicProgress: {},
  achievements: [],
};

async getProgress(): Promise<ProgressData> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS);
    return data ? JSON.parse(data) : defaultProgress;
  } catch {
    return defaultProgress;
  }
},

async updateTopicProgress(...) {
  const progress = await this.getProgress();
  // ...
  progress.topicProgress[compositeKey] = { ... };
  progress.totalQuestions += questionsAnswered;
  progress.correctAnswers += correctAnswers;
  await this.setProgress(progress);
}
```

Current reset behavior in `client/lib/storage.ts:400-411` removes only persisted values, by design preserving the device ID and one-time guidance flags:

```ts
await AsyncStorage.multiRemove([
  STORAGE_KEYS.USER_PROFILE,
  STORAGE_KEYS.PROGRESS,
  STORAGE_KEYS.STREAK,
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.SELECTED_LANGUAGE,
  STORAGE_KEYS.PROGRESS_MIGRATED,
]);
```

The existing testing convention is direct, behavior-oriented AsyncStorage testing. For example, `__tests__/unit/client/lib/storage.test.ts:172-190` updates topic progress and asserts persisted counters; `:280-295` exercises `clearAllData()` while asserting which keys survive. Follow that style and use `await` for storage operations. The repo uses strict TypeScript, Prettier, and Jest with `jest-expo`.

## Commands you will need

| Purpose                 | Command                                                          | Expected on success                                            |
| ----------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Focused regression test | `npx jest __tests__/unit/client/lib/storage.test.ts --runInBand` | Exit 0; all storage tests, including the new regression, pass. |
| Typecheck               | `npm run check:types`                                            | Exit 0 with no TypeScript errors.                              |
| Lint                    | `npm run lint`                                                   | Exit 0 with no lint errors.                                    |
| Format check            | `npm run check:format`                                           | Exit 0 and reports all matched files use Prettier style.       |
| Full tests              | `npm test -- --runInBand`                                        | Exit 0; every Jest suite passes.                               |

## Scope

**In scope** (the only application/test files to modify):

- `client/lib/storage.ts`
- `__tests__/unit/client/lib/storage.test.ts`
- `plans/README.md` (status row only)

**Out of scope**:

- `client/screens/SettingsScreen.tsx` and any route/UI changes. Reset already correctly delegates to `storage.clearAllData()`.
- Profile, streak, settings, selected-language, device-ID, welcome, and level-hint default handling. They have different mutation/lifecycle behavior and require a separately scoped audit.
- Changes to the Reset Progress key-preservation policy. Device ID, welcome state, and level-hint state must remain excluded from reset as documented in `client/lib/storage.ts:400-411`.
- Refactoring AsyncStorage access patterns, adding a state library, or changing the persisted `ProgressData` JSON shape.

## Git workflow

- Work on the operator-provided branch/worktree; no branch-naming convention is established in this repository.
- Make one focused commit only if the operator requests a commit. Use the repository's concise imperative English style, for example: `Fix progress reset fallback`.
- Do not push or open a pull request unless the operator explicitly instructs it.

## Steps

### Step 1: Add a failing reset regression test

In `__tests__/unit/client/lib/storage.test.ts`, add a test in the existing `describe('clearAllData', ...)` block that uses the public storage API in one JavaScript process:

1. Call `storage.updateTopicProgress('javascript', 'variables', 5, 4)` while AsyncStorage is empty.
2. Call `storage.clearAllData()`.
3. Call `storage.getProgress()` immediately, without resetting modules or restarting the test environment.
4. Assert the returned object is exactly the empty `ProgressData` shape: `totalQuestions: 0`, `correctAnswers: 0`, `topicProgress: {}`, and `achievements: []`.
5. Also assert the persisted progress key is absent using `AsyncStorage.getItem('dhbw_progress')` (declare a local progress-key constant beside the existing storage-key constants if that makes the assertion clear).

This test must fail against the current implementation because the module-level `defaultProgress` object is mutated before the reset and survives `multiRemove`.

**Verify**: `npx jest __tests__/unit/client/lib/storage.test.ts --runInBand` → fails specifically on the new reset regression before the implementation change.

### Step 2: Return a new empty progress object on each fallback

In `client/lib/storage.ts`, replace the shared mutable `defaultProgress` fallback with a small local factory, such as `createDefaultProgress(): ProgressData`, that constructs new nested collections (`topicProgress` and `achievements`) for every call.

Update both missing-data and catch branches of `storage.getProgress()` to call the factory. Do not alter the `ProgressData` interface, storage key names, update arithmetic, or the reset key list. The load path for valid stored JSON must keep returning its parsed persisted value.

Keep the implementation local and idiomatic for this file. A factory is preferred over shallow-cloning the current constant because the fallback contains mutable nested objects/arrays and future fields should be created deliberately.

**Verify**: `npx jest __tests__/unit/client/lib/storage.test.ts --runInBand` → exit 0; the new regression and all existing storage tests pass.

### Step 3: Run repository verification and update plan status

Run the required checks after the focused test succeeds. Do not run coverage generation; it creates an untracked report that is unnecessary for this fix.

1. `npm run check:types`
2. `npm run lint`
3. `npm run check:format`
4. `npm test -- --runInBand`

If every command passes, change this plan's status in `plans/README.md` from `TODO` to `DONE`.

**Verify**: `git diff --check` → exit 0 with no whitespace errors; `git status --short` → only `client/lib/storage.ts`, `__tests__/unit/client/lib/storage.test.ts`, and the intended `plans/README.md` status change are modified by this work (plus any pre-existing operator files, which must be left untouched).

## Test plan

- Add one regression test to `__tests__/unit/client/lib/storage.test.ts` that proves progress is empty immediately after `updateTopicProgress()` followed by `clearAllData()` in the same runtime.
- Preserve the existing `clearAllData()` test that ensures the device ID, welcome state, and level hint survive reset.
- Preserve `updateTopicProgress` coverage at `__tests__/unit/client/lib/storage.test.ts:172-190`; it confirms normal counter accumulation still works after the fallback changes.
- Run the focused test, then typecheck, lint, format check, and the complete Jest suite using the commands above.

## Done criteria

- [ ] `storage.getProgress()` returns a newly constructed empty `ProgressData` when no progress key exists or the storage read fails.
- [ ] The shared mutable `defaultProgress` fallback no longer exists in `client/lib/storage.ts`.
- [ ] The new same-runtime update → reset → read regression test exists and passes.
- [ ] The existing reset policy still preserves device ID, welcome state, and level hint state.
- [ ] `npm run check:types`, `npm run lint`, `npm run check:format`, and `npm test -- --runInBand` all exit 0.
- [ ] No application or test files outside the in-scope list are modified.
- [ ] `plans/README.md` marks Plan 001 as `DONE` after successful verification.

## STOP conditions

Stop and report back instead of improvising if:

- The live storage code no longer has a shared `defaultProgress` returned from both no-data and catch paths.
- The regression test passes before any implementation change; this means the observed runtime or test setup differs from the audit assumptions.
- Fixing the regression requires changing the Reset Progress retention policy or any UI screen.
- The persistent progress JSON shape is discovered to be shared with an external migration or service not represented in `client/lib/storage.ts` and the unit tests.
- Any required verification command fails twice after a reasonable, scoped correction.

## Maintenance notes

- Any new mutable default returned by a storage getter must be a fresh object (or be treated as immutable by all callers). Review new getters for the same shared-reference pattern.
- Reviewers should confirm the fix covers both missing-data and read-error fallback branches, not just the Reset Progress path.
- The analogous defaults for profile and streak are deliberately out of scope. Do not expand this small bug fix into a broad persistence refactor; schedule a separate audit if callers begin mutating those fallback values.
