# Plan 004: Test the OpenAI HTTPS timeout fallback

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving on. If a STOP condition occurs, stop and report — do not improvise. Never log or hardcode a real OpenAI credential. When complete, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bb501e..HEAD -- server/quiz/openai.ts __tests__/unit/server/quiz.test.ts plans/README.md`
> If the fallback no longer uses `node:https` or the quiz tests moved, STOP and refresh the plan.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `0bb501e`, 2026-07-13

## Why this matters

Quiz generation falls back from Expo's fetch shim to `node:https` after a timeout, specifically to keep longer OpenAI responses working in the deployed runtime. The fallback constructs a request, owns timeout/error lifecycle, parses a streamed response, and propagates upstream failures, yet its behavior has no direct tests. Add isolated unit tests so a future networking refactor cannot silently remove the production resilience path.

## Current state

- `server/quiz/openai.ts` is the only OpenAI transport module.
- `__tests__/unit/server/quiz.test.ts` already owns server quiz transport/validation tests and replaces `global.fetch` in `beforeEach`.

Fallback behavior in `server/quiz/openai.ts:109-161,180-201`:

```ts
const request = https.request(OPENAI_RESPONSES_URL, options, (response) => {
  response.setEncoding('utf8');
  response.on('data', (chunk) => {
    responseBody += chunk;
  });
  response.on('end', () => {
    /* status and JSON handling */
  });
});
request.setTimeout(getOpenAIRequestTimeoutMs(), () => {
  const timeoutError = new Error('Request timed out');
  timeoutError.code = 'ETIMEDOUT';
  request.destroy(timeoutError);
});
request.on('error', reject);
request.write(requestBody);
request.end();

// A fetch timeout or response.json() timeout returns requestOpenAIViaHttps(...).
```

Existing test setup at `__tests__/unit/server/quiz.test.ts:106-135` provides a `fetchMock`, a mock API key, and restores globals. Reuse that pattern. The test credential is a dummy fixture only; do not add any real value. `mockFetchResponse` already supports `jsonError` at lines 7-35.

## Commands you will need

| Purpose      | Command                                                   | Expected on success |
| ------------ | --------------------------------------------------------- | ------------------- |
| Focused test | `npx jest __tests__/unit/server/quiz.test.ts --runInBand` | Exit 0.             |
| Typecheck    | `npm run check:types`                                     | Exit 0.             |
| Lint/format  | `npm run lint && npm run check:format`                    | Both exit 0.        |
| Full tests   | `npm test -- --runInBand`                                 | Exit 0.             |

## Scope

**In scope**: `__tests__/unit/server/quiz.test.ts`; `server/quiz/openai.ts` only if a minimal test seam is unavoidable; `plans/README.md` (status only).

**Out of scope**: changing timeout values, OpenAI prompts/models/response schema, production retry policy, making real network requests, or altering `server/quiz.ts` public behavior.

## Steps

### Step 1: Build a deterministic HTTPS request double in the existing test file

Mock `node:https` before importing the transport under test. The double must model only the APIs used by production code: `https.request`, a response with `setEncoding` and `on('data'/'end')`, and a request with `setTimeout`, `on('error')`, `write`, `end`, and `destroy`. Use explicit test helpers to emit response data/end or an error; do not use real timers or sockets.

Keep the mock reset/restore behavior aligned with the current `fetchMock` setup so tests cannot leak event handlers between cases.

**Verify**: `npx jest __tests__/unit/server/quiz.test.ts --runInBand` → existing tests still pass before adding fallback assertions.

### Step 2: Cover both fallback entry points and response outcomes

Add focused tests through the public transport path (`requestQuizResponseText` imported directly from `@server/quiz/openai` is acceptable) that prove:

1. A rejected fetch with `code: 'ETIMEDOUT'` uses HTTPS and returns valid `output_text`.
2. A successful fetch whose `json()` rejects with a timeout message also uses HTTPS.
3. HTTPS receives a POST request to the Responses URL with JSON content type, a byte-accurate content length, and an authorization header derived from the existing dummy test key; assert the header shape, not a real value.
4. A non-2xx HTTPS response rejects with the existing status error.
5. Malformed HTTPS response JSON rejects with `Invalid JSON response from OpenAI`.
6. Invoking the captured timeout callback calls `destroy()` with an error whose code is `ETIMEDOUT` and the promise rejects through the registered error path.

Do not test the OpenAI service itself. Keep payloads and response JSON minimal and use the existing structured quiz fixtures where a generated quiz is required.

**Verify**: focused Jest command → exit 0; new tests would fail if either fallback branch or HTTPS parser were removed.

### Step 3: Add a source seam only if the test cannot mock the module safely

If Jest's module mock cannot observe the imported namespace reliably, add the smallest internal test seam in `server/quiz/openai.ts`, marked with the repository's `// @visibleForTesting` convention (see `server/validation.ts:10`). It must not change production control flow, timeout defaults, headers, or exports used by clients. Prefer the test-only import route over refactoring production transport.

**Verify**: `npm run check:types` → exit 0.

### Step 4: Run full verification and record completion

Run focused test, typecheck, lint, formatting, and the full Jest suite. Mark Plan 004 DONE only after all pass.

**Verify**: `git diff --check` → exit 0; `git diff --name-only` stays within scope.

## Test plan

- Model test structure after `__tests__/unit/server/quiz.test.ts` existing fetch error tests.
- Cover fetch-rejection and JSON-read-timeout fallback entry points, successful streamed parse, status failure, malformed JSON, and request timeout destruction.
- No network, real timers, or credentials.

## Done criteria

- [ ] Both timeout fallback entry points are directly tested.
- [ ] HTTPS success, non-2xx, malformed JSON, and request-timeout behavior are tested deterministically.
- [ ] Production transport behavior and timeout defaults are unchanged.
- [ ] Focused/full tests, typecheck, lint, and format checks pass.
- [ ] No files outside scope changed; index is updated.

## STOP conditions

- The test requires a real OpenAI request or a real secret.
- Mocking `node:https` requires broad Jest configuration changes or a transport rewrite beyond a minimal test seam.
- The implementation reveals that the fallback is unreachable in the deployed runtime; report evidence instead of deleting it.

## Maintenance notes

Any future change to fetch, timeout classification, or the Node fallback must extend these tests. Reviewers should ensure the test invokes the fallback because of a timeout, not by calling a helper in isolation only.
