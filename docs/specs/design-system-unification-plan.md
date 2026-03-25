# UI Design System Unification Plan

## Purpose

This document consolidates the recent UI audit findings into an implementation plan for improving visual consistency, shared design primitives, and flow coherence across the app.

The main issue is not a single broken screen, but a partial migration: `Learn` and `Topic Detail` already use a newer visual language, while `Quiz`, `Summary`, `Progress`, `Settings`, `Practice`, and `Topic Explanation` still rely on older or screen-local patterns.

## Goals

- Unify the learning and quiz flow under one shared UI vocabulary.
- Replace repeated screen-local button, card, footer, and badge patterns with reusable components.
- Move hardcoded colors, separators, and repeated styling rules into theme tokens or shared utilities.
- Improve consistency across light and dark mode.
- Keep the existing product scope and navigation structure intact.

## Non-goals

- Full visual redesign of the app from scratch.
- New navigation architecture.
- Replacing every local style with abstractions regardless of value.

## Consolidated Findings

### P1: Partial migration across the main flow

The strongest inconsistency is the jump between the newer `Learn` and `Topic Detail` screens and the older `Quiz` and `Session Summary` flow.

- Newer visual language:
  - [`client/screens/LearnScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/LearnScreen.tsx)
  - [`client/screens/TopicDetailScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/TopicDetailScreen.tsx)
- Older or less cohesive screens:
  - [`client/screens/QuizSessionScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/QuizSessionScreen.tsx)
  - [`client/screens/SessionSummaryScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/SessionSummaryScreen.tsx)
  - [`client/screens/TopicExplanationScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/TopicExplanationScreen.tsx)
  - [`client/screens/ProgressScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/ProgressScreen.tsx)
  - [`client/screens/SettingsScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/SettingsScreen.tsx)
  - [`app/(tabs)/practice/index.tsx`](/Users/erik/projects/dhbw/CodeCompanion/app/(tabs)/practice/index.tsx)

### P1: Missing shared primitives

The codebase repeats the same UI patterns many times without shared components:

- Primary CTA buttons (with three different heights: 48px in practice review, 56px in quiz/summary/settings, 58px in topic detail)
- Secondary or outline buttons
- Card surfaces
- Status badges
- Sticky bottom action bars

This drives duplication and makes style drift inevitable. The button height drift is a concrete example: `Spacing.buttonHeight` (56) exists but is not consistently used, and `TopicDetailScreen` uses 58px while `practice/index.tsx` uses 48px.

### P1: Inconsistent primary action semantics

Primary actions currently use different semantic colors for similar importance:

- Blue in topic detail start action
- Red in quiz submit and summary replay
- Yellow in review actions

This needs an explicit rule. If the different colors are intentional, the semantic meaning must be documented and applied consistently. If not, the primary action treatment should be unified.

### P2: Theme token gaps

Current theme tokens are not sufficient for the newer UI system.

Notable gaps:

- No separator or divider token
- No explicit foreground token for content placed on colored surfaces
- No shared helper for tinted surfaces or alpha variations
- No dedicated footer surface treatment
- No subtle card border variant (`TopicDetailScreen` works around this with `${theme.cardBorder}70`, the same fragile hex+alpha pattern used elsewhere)

This causes hardcoded values and screen-local style rules.

### P2: Hardcoded colors and separators

Hardcoded white and black-alpha values appear in multiple screens and should be replaced with semantic tokens where appropriate.

Examples:

- `#FFFFFF` for CTA labels, icons, and loaders
- `rgba(0,0,0,0.05)` and `rgba(0,0,0,0.1)` for borders and footer separators
- `#B00020` in the info modal heading
- `#9BA1A6` hardcoded in `LearnScreen` (`nextStepMetaDot`) instead of using `theme.tabIconDefault`

Important nuance:

- White content on colored CTAs should usually move to a semantic token such as `buttonText` or a more general `onColor` token.
- Decorative white icons on avatar or achievement surfaces do not necessarily belong to `buttonText`, but should still stop being raw literals.
- Black-alpha separators are a real dark-mode problem and should be fixed via a theme token.

### P2: Bottom action bar inconsistency

The app currently has multiple sticky footer implementations with different padding, border, and surface behavior.

Affected screens:

- [`client/screens/TopicDetailScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/TopicDetailScreen.tsx)
- [`client/screens/QuizSessionScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/QuizSessionScreen.tsx)
- [`client/screens/SessionSummaryScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/SessionSummaryScreen.tsx)
- [`client/screens/SettingsScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/SettingsScreen.tsx)

### P2: Context loss along the flow

Context becomes weaker as the user moves deeper into the flow.

Examples:

- `Topic Detail` still computes category context, but the current hero emphasizes status more than hierarchy.
- `Topic Explanation` is functionally correct, but visually much flatter than the detail screen leading into it.
- Quick quiz mode exists in route logic but is not surfaced clearly in the UI during quiz or summary.

### P2: Loading state inconsistency

The app uses three different loading patterns without a shared approach:

- `<LoadingScreen />` component: `TopicDetailScreen`, `LearnScreen`, `PracticeScreen`
- Inline `<ActivityIndicator>`: `ProgressScreen`, `SettingsScreen`
- Custom loading with descriptive text: `QuizSessionScreen`

The first two should converge. The quiz loading state with text is intentionally different (it shows "Generating Quiz..." with a cancel button), but the split between `LoadingScreen` and inline `ActivityIndicator` is unintentional.

### P2: Press animation gap on primary action buttons

`TopicDetailScreen` and `LearnScreen` use `usePressAnimation` on their primary interactive elements, giving them a polished scale response. `QuizSessionScreen` uses it on `AnswerButton` but not on the submit/next buttons. `SessionSummaryScreen` uses plain `Pressable` throughout without any press animation. This breaks tactile consistency along the main flow.

### P2: Learn screen still has local inconsistencies

`Learn` is the most advanced screen, but not fully normalized yet.

- Category progress switches between bar and segment modes depending on topic count.
- The due section is already accented, while due topic tiles inside it are accented again.
- Some local shadows and typography rules are still screen-specific.

### P3: Robustness and polish issues

These are valid improvements, but lower priority than the structural issues above.

- Hex color opacity string concatenation such as `color + "20"` (also used for border tokens: `${theme.cardBorder}70` in `TopicDetailScreen`)
- Repeated inline `fontWeight` overrides for button labels and emphasis
- Repeated local opacity values such as `0.66` and `0.7`
- Inconsistent icon sizing without a shared size scale
- Session summary correct-answer rendering falling back to plain text instead of reusing inline code treatment
- `LanguageSelectScreen` uses a one-off `boxShadow` string instead of the shared shadow system; even if supported by the current React Native version, it should be aligned with `Shadows.card` or a dedicated shared shadow token for consistency

## Implementation Principles

- Prefer semantic tokens over literal values.
- Prefer shared primitives over local duplication.
- Prefer consistent flow behavior over isolated screen polish.
- Only abstract patterns that are already repeated or clearly part of the target design system.
- Preserve established interaction behavior unless the change directly improves coherence.

## Work Packages

### WP1: Expand theme tokens and helpers

Goal: remove the most obvious hardcoded style drift and support dark mode correctly.

Planned changes:

- Extend [`client/constants/theme.ts`](/Users/erik/projects/dhbw/CodeCompanion/client/constants/theme.ts) with:
  - `separator` (light: `rgba(0,0,0,0.08)`, dark: `rgba(255,255,255,0.08)` or similar)
  - `cardBorderSubtle` for the lighter card border variant currently hacked as `${theme.cardBorder}70`
  - a semantic foreground token for content on colored surfaces
  - optionally muted-opacity or equivalent helper constants
- Decide whether to add a shared `withOpacity(color, opacity)` helper now or in a later cleanup pass
- Replace hardcoded footer and row separators with the new token
- Replace direct `#B00020` usage in the info modal with a semantic token
- Replace hardcoded `#9BA1A6` in `LearnScreen` with `theme.tabIconDefault`

Acceptance criteria:

- No screen uses black-alpha separators directly.
- Footer dividers render correctly in both light and dark mode.
- At least the obvious CTA foregrounds and branded heading use semantic tokens.
- No remaining hardcoded color literals that either duplicate an existing theme token or drift from the established palette semantics (`#9BA1A6`, `#B00020`).

### WP2: Introduce shared UI primitives

Goal: establish the minimum reusable surface and action patterns.

Planned components:

- `SurfaceCard`
- `PrimaryButton`
- `SecondaryButton` or `OutlineButton`
- `BottomActionBar`
- `StatusBadge`

Suggested scope:

- Start with the props actually needed by current screens.
- Avoid over-generalizing variants before they are needed.
- Define button size variants and standardize their usage.
  - `default`: `Spacing.buttonHeight` (56)
  - `compact`: for denser contextual actions such as the practice review button
  - larger hero or floating CTA sizes only when intentionally justified

Acceptance criteria:

- Button and footer patterns are no longer reimplemented separately in each screen.
- Shared components cover at least the quiz, summary, settings, and topic detail footers and actions.
- Primary buttons use documented size variants, with any exceptions intentional and documented.

### WP3: Normalize the main learning and quiz flow

Goal: bring the high-traffic flow onto one coherent visual system.

Target screens:

- [`client/screens/TopicDetailScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/TopicDetailScreen.tsx)
- [`client/screens/QuizSessionScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/QuizSessionScreen.tsx)
- [`client/screens/SessionSummaryScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/SessionSummaryScreen.tsx)
- [`client/screens/TopicExplanationScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/TopicExplanationScreen.tsx)

Planned changes:

- Unify bottom action area treatment
- Unify card surface treatment
- Unify primary action semantics
- Add `usePressAnimation` to primary action buttons in `QuizSessionScreen` (submit, next) and `SessionSummaryScreen` (practice again, back to topics) to match the tactile feedback in `TopicDetailScreen`
- Standardize loading states: screens that show a full-screen loader before content should use `<LoadingScreen />`; `QuizSessionScreen` keeps its custom loading with cancel support
- Add visible context markers where needed:
  - quick quiz mode
  - topic or category context
  - explanation context continuity from topic detail
- Reuse inline code presentation in session summary answer details

Acceptance criteria:

- Moving from topic detail to quiz to summary feels like one product flow.
- Quick quiz and mixed quiz context is visible where relevant.
- Topic explanation no longer feels visually detached from topic detail.
- Primary action buttons across the flow have consistent press animation feedback.

### WP4: Align adjacent screens with the shared system

Goal: reduce visual lag on older but still important screens.

Target screens:

- [`client/screens/ProgressScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/ProgressScreen.tsx)
- [`client/screens/SettingsScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/SettingsScreen.tsx)
- [`app/(tabs)/practice/index.tsx`](/Users/erik/projects/dhbw/CodeCompanion/app/(tabs)/practice/index.tsx)
- [`client/screens/LanguageSelectScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/LanguageSelectScreen.tsx)
- [`client/screens/InfoModalScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/InfoModalScreen.tsx)

Planned changes:

- Migrate repeated cards and buttons to shared primitives
- Replace remaining raw foreground colors
- Replace local shadow or separator styles where a shared token now exists
- Replace the one-off `boxShadow` in `LanguageSelectScreen` with `Shadows.card` or another shared shadow token
- Migrate `ProgressScreen` and `SettingsScreen` loading states to `<LoadingScreen />`
- Reduce layout or header treatment drift where it is clearly unintentional

Acceptance criteria:

- These screens no longer look like a different generation of the app.
- Shared primitives are used consistently.

### WP5: Cleanup and system polish

Goal: finish the migration and remove smaller paper cuts.

Potential changes:

- Replace fragile `color + "20"` style opacity composition with a helper if still needed
- Normalize repeated inline `fontWeight` patterns where shared typography or button components already cover them
- Consider introducing an icon size scale if repetition remains high after component extraction
- Normalize muted opacity usage where it still appears repeatedly
- Evaluate whether the global header strategy and tab-stack header overrides should be unified further

Acceptance criteria:

- Remaining local styling exceptions are intentional and documented.
- The codebase has materially fewer raw style literals.

## Suggested PR Sequence

### PR1: Theme tokens and separators

- Add missing theme tokens (`separator`, `cardBorderSubtle`)
- Replace hardcoded separator colors
- Replace the info modal raw heading color
- Replace hardcoded `#9BA1A6` with theme token
- Replace the most obvious CTA foreground literals

### PR2: Shared action and surface primitives

- Add `SurfaceCard`
- Add button primitives
- Add `BottomActionBar`
- Migrate `Topic Detail`, `Quiz`, `Summary`, and `Settings` first

### PR3: Main flow alignment

- Align `Topic Detail`, `Quiz`, `Summary`, and `Topic Explanation`
- Add press animation to primary buttons in `Quiz` and `Summary`
- Add missing context markers
- Standardize loading states
- Reuse inline code styling in summary

### PR4: Secondary screen migration

- Align `Progress`, `Practice`, `Language Select`, `Info Modal`
- Migrate loading states in `Progress` and `Settings` to `<LoadingScreen />`
- Replace the one-off `boxShadow` in `Language Select`
- Reduce local shadow, spacing, and literal color drift

### PR5: Cleanup

- Optional helper utilities
- Final typography and icon-size cleanup
- Remove leftover local exceptions

## Verification Plan

### Automated checks

- Run `npm run check:types`
- Run `npm run lint`

### Manual visual checks

- Verify affected screens in light mode
- Verify affected screens in dark mode
- Verify on iOS
- Verify on Android

### Core flow checks

- Learn flow: `Learn -> Topic Detail -> Quiz -> Session Summary`
- Explanation flow: `Topic Detail -> Topic Explanation`
- Practice flow: `Practice -> Review or Mixed Quiz -> Session Summary`
- Settings flow: open settings, save changes, confirm loading and footer behavior
- Language selection flow: open language selection and verify elevation, spacing, and selection affordance

### Cross-cutting checks

- Primary action buttons use documented size variants and consistent press feedback
- Sticky bottom action bars use the shared pattern where applicable
- No dark-mode regressions from separator or border changes
- Code fragments remain readable in quiz and summary contexts

## Decisions Needed Before or During Implementation

### 1. Primary action color semantics

Decide one of the following:

- One shared primary action color across the learning and quiz flow
- Different colors with explicit semantics, for example:
  - red for destructive or high-priority app actions
  - blue for learning progression
  - yellow for review urgency

If semantic differentiation is kept, it must be documented and enforced consistently.

### 2. Foreground token strategy

Decide whether `theme.buttonText` is sufficient or whether the app should use a more general semantic token such as `theme.onColor` or `theme.onPrimary`.

### 3. Header strategy

Decide whether current differences between global stack headers and tab stack headers are intentional product design or accumulated implementation drift.

## File Targets

Core theme and shared UI:

- [`client/constants/theme.ts`](/Users/erik/projects/dhbw/CodeCompanion/client/constants/theme.ts)
- [`client/components/ThemedText.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/components/ThemedText.tsx)
- new shared UI components in [`client/components`](/Users/erik/projects/dhbw/CodeCompanion/client/components)

Main flow:

- [`client/screens/TopicDetailScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/TopicDetailScreen.tsx)
- [`client/screens/QuizSessionScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/QuizSessionScreen.tsx)
- [`client/screens/SessionSummaryScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/SessionSummaryScreen.tsx)
- [`client/screens/TopicExplanationScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/TopicExplanationScreen.tsx)

Secondary alignment:

- [`client/screens/ProgressScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/ProgressScreen.tsx)
- [`client/screens/SettingsScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/SettingsScreen.tsx)
- [`app/(tabs)/practice/index.tsx`](/Users/erik/projects/dhbw/CodeCompanion/app/(tabs)/practice/index.tsx)
- [`client/screens/LanguageSelectScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/LanguageSelectScreen.tsx)
- [`client/screens/InfoModalScreen.tsx`](/Users/erik/projects/dhbw/CodeCompanion/client/screens/InfoModalScreen.tsx)

## Definition of Done

- The main topic-to-quiz-to-summary flow uses one coherent visual vocabulary.
- Shared buttons, cards, badges, and bottom action bars replace the major repeated local implementations.
- Primary action buttons use documented size variants and consistent press animation feedback across the flow.
- Loading states use a shared pattern (full-screen `LoadingScreen` for data loads, custom treatment only where cancel/text is needed).
- Hardcoded separator colors are removed.
- Dark mode no longer depends on black-alpha separators.
- Remaining raw color literals are either removed or intentionally justified.
- One-off shadow implementations are replaced by shared shadow tokens where the same surface pattern is intended.
- Shared primitives reduce duplication without introducing unnecessary abstraction.
- The resulting UI feels like one app, not multiple design generations.
