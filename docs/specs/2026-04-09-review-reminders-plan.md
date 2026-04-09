# Review Reminders Plan

**Status:** Draft  
**Date:** 2026-04-09  
**Version:** 1.0.0

---

## Overview

This document specifies local review reminders for topics that are due for repetition in DHBW Code Companion.

The feature builds on the existing local progress model and due-topic logic. It adds opt-in local notifications that remind learners to return to the Practice flow when review work is pending.

The implementation is intentionally local-first:

- no backend
- no push notifications
- no device registration
- no server-side scheduling

---

## Goals

- Notify learners when review topics are due.
- Reuse the existing `lastPracticed + interval(skillLevel)` logic as the source of truth.
- Keep reminders bundled and low-noise.
- Give users explicit control through Settings.
- Stay safe on iOS by avoiding large numbers of pending local notifications.

## Non-Goals

- Push notifications
- Background fetch or periodic background recomputation
- One notification per topic
- Separate reminder streams per programming language
- Auto-starting a quiz from the notification tap

---

## Product Decisions

### Reminder Model

- Reminders are scheduled for a fixed local time selected by the user.
- A topic becomes reminder-eligible only after it is actually due according to the current due logic.
- If due topics remain unresolved, the app reminds again daily at the chosen time.

### Aggregation

- v1 uses one global reminder stream across all programming languages.
- Reminder copy stays generic and does not embed topic IDs or counts in the scheduled payload.

### Settings

- Reminders are off by default.
- v1 exposes exactly two controls:
  - enable/disable review reminders
  - choose reminder time
- Default reminder time is `18:00`.

### Notification Tap Behavior

- Tapping a reminder opens the Practice tab.
- The app does not auto-start a quiz.
- The app switches to the most relevant programming language if the current one has no due topics.

---

## Existing Logic to Reuse

The current due-topic model already exists and remains the source of truth:

- `TopicProgress` stores `lastPracticed` and `skillLevel`
- intervals are fixed per skill level: `1`, `3`, `7`, `14`, `30` days
- only started topics (`questionsAnswered > 0`) participate in due/review logic

The reminder system must not introduce a second independent definition of "due". It may translate exact due timestamps into reminder slots, but only after the topic is truly due.

---

## Architecture

### 1. Settings Persistence

Extend `SettingsData` in `client/lib/storage.ts` with:

```ts
reviewReminderEnabled: boolean;
reviewReminderTime: string;
```

Normalization defaults:

```ts
reviewReminderEnabled: false;
reviewReminderTime: '18:00';
```

No dedicated storage migration is required. Existing settings continue to load through normalization.

### 2. Reminder Module

Add a dedicated client-side module, for example `client/lib/review-reminders.ts`, responsible for:

- requesting notification permissions
- reading scheduled notifications
- cancelling scheduled review reminders
- rebuilding the reminder schedule from current local progress
- handling notification response routing

This module owns only reminder scheduling behavior. It does not own progress logic.

### 3. Trigger Points

Rebuild the reminder queue in these cases:

- app startup
- app returning to foreground
- after quiz completion, once topic progress and skill levels are updated
- after reminder settings change
- after progress reset / `clearAllData()`

The root initialization point should live in `app/_layout.tsx`.

### 4. Notification Payload

Scheduled notifications should include only stable metadata in `content.data`, for example:

```ts
{
  kind: 'review-reminder'
}
```

Do not persist counts, topic IDs, or language IDs in the notification payload, because they can become stale before delivery.

---

## Scheduling Strategy

### Why a Bounded Queue

iOS is risky territory for large pending local-notification sets. The reminder implementation must therefore avoid planning a long fixed horizon such as 90 daily notifications.

Instead, v1 maintains a small bounded queue of pending review reminders and rebuilds it opportunistically whenever the app is opened, resumed, or local progress changes.

### Queue Size

- Schedule at most `32` review notifications at once.
- The queue contains one-shot daily notifications, not a single infinitely repeating notification.

### Why `32`

With the current review model:

- the maximum review interval is `30` days
- converting an exact due timestamp into a fixed-time reminder can defer the first reminder by at most one additional calendar day

That means every started topic will produce its first eligible reminder slot within at most `31` days. A queue of `32` scheduled reminder slots safely covers that range while keeping pending notifications well bounded.

### Slot Computation

For each started topic:

1. Compute `exactDueAt = lastPracticed + interval(skillLevel)`.
2. Compute the first reminder slot at the configured reminder time that is not earlier than `exactDueAt`.
3. This becomes `firstReminderAt`.

Across all started topics:

- find the earliest `firstReminderAt`
- if none exists, schedule nothing
- from that point onward, schedule `32` consecutive daily one-shot notifications at the configured reminder time

### Behavioral Consequences

- If something becomes due before the configured reminder time today, the user can still be reminded today.
- If something becomes due after the configured reminder time today, the first reminder shifts to tomorrow.
- If due topics already exist and today’s reminder time has already passed, no late catch-up notification is sent immediately; the next reminder is tomorrow at the configured time.

### Rebuild Strategy

Every sync fully replaces the review-reminder queue:

1. find all scheduled review reminders
2. cancel them
3. recompute from local progress and settings
4. schedule a fresh bounded queue

No incremental patching is required in v1.

---

## Language Selection on Tap

When the user taps a review reminder:

1. keep the current programming language if it currently has due topics
2. otherwise switch to the language with the highest number of currently due topics
3. if tied, prefer the language with the earliest exact due timestamp
4. if still tied, use the order of `LANGUAGES`

After language selection, navigate to the Practice tab.

---

## UX and Copy

- Reminder text should be localized via `client/lib/i18n.ts`.
- Copy should remain generic, for example:
  - EN: `Review topics are waiting for you`
  - DE: `Themen zur Wiederholung warten auf dich`
- Foreground presentation does not need special banner handling in v1.
- If notification permission is denied, enabling reminders should fail gracefully and explain that reminders must be allowed in OS settings.

---

## Integration Points

### Settings Screen

Add a new settings section or rows in `client/screens/SettingsScreen.tsx` for:

- reminder toggle
- reminder time picker

Behavior:

- enabling reminders requests permission first
- if permission is denied, keep the toggle off
- any successful change triggers reminder rebuild

### Quiz Completion

After the existing topic progress and skill-level updates in `client/screens/QuizSessionScreen.tsx`, trigger reminder rebuild.

### Reset Progress

When local progress is cleared, explicitly cancel all scheduled review reminders so the device cannot continue showing stale notifications.

---

## Testing Plan

### Unit Tests

- settings normalization adds default reminder fields
- scheduler returns no reminders when no started topics exist
- scheduler never creates a slot before `exactDueAt`
- scheduler handles reminder-time-before-due and reminder-time-after-due cases correctly
- scheduler respects the maximum queue size of `32`
- scheduler works across multiple programming languages
- tap-language selection follows the agreed priority rules

### Integration Tests

- enabling reminders requests permissions and rebuilds the queue on success
- permission denial leaves the toggle off
- quiz completion rebuilds scheduled reminders
- progress reset clears scheduled review reminders
- tapping a reminder routes to Practice and selects the correct language

### Mocking Strategy

- mock `expo-notifications`
- verify scheduling/cancellation calls and payload shape
- do not attempt end-to-end OS-level delivery tests in Jest

---

## Assumptions

- v1 uses local notifications only.
- v1 does not use `TaskManager`, background fetch, or remote push infrastructure.
- Minor platform-level delivery variance is acceptable.
- If the user does not open the app for longer than the bounded queue covers, reminders stop until the next app open/resume. This tradeoff is accepted in v1 to keep the implementation simple and platform-safe.

---

## Suggested Files

- Modify: `client/lib/storage.ts`
- Create: `client/lib/review-reminders.ts`
- Modify: `client/lib/i18n.ts`
- Modify: `client/screens/SettingsScreen.tsx`
- Modify: `client/screens/QuizSessionScreen.tsx`
- Modify: `app/_layout.tsx`
- Update tests around storage, settings, quiz session, and notification behavior
