# Quiz Explanation Redesign

Elevate quiz explanations from supplementary feedback to the core learning element.

## Motivation

The current explanation is a plain-text block under a generic "Explanation" label. Users tend to skip it and tap "Next Question" immediately. By structuring the explanation into scannable layers with clear visual hierarchy, we turn every answered question into a learning moment.

## Data Model

Extend `QuizQuestion` in `shared/quiz-question.ts` with three new fields:

```typescript
export interface QuizQuestion {
  id: string;
  topicId?: string;
  question: string;
  code?: string;
  options: string[];
  correctIndex: number;
  explanation: string;        // existing — focused "why" explanation (2-3 sentences)
  resultSentence: string;     // NEW, required — e.g. "Result: `0`"
  takeaway: string;           // NEW, required — one memorable rule, max 1 sentence
  commonMistake?: string;     // NEW, optional — common misconception if relevant
}
```

All text fields support inline code via backticks (rendered by existing `InlineCodeText`).

## AI Prompt & Server Schema

### OpenAI JSON Schema (`server/quiz.ts`)

Add to the per-question schema:

- `resultSentence`: `{ type: "string" }`, required
- `takeaway`: `{ type: "string" }`, required
- `commonMistake`: `{ type: "string" }`, not required

### Prompt Instructions

Add to the system/user prompt:

- **resultSentence**: "State the correct result in one short sentence, e.g. 'Result: `0`'. Use inline code for values."
- **takeaway**: "Provide one memorable rule the learner should remember, e.g. '`??` only checks for `null` and `undefined`'."
- **commonMistake**: "If there is a common misconception relevant to this question, explain it briefly. Include a comparison if helpful. Omit if not applicable."
- Refocus existing **explanation** instruction: explain the *why* behind the correct answer in 2-3 sentences. Do not repeat the result or the takeaway rule.

### Validation

Extend existing validation in `server/quiz.ts`:

- `resultSentence` and `takeaway` must be non-empty strings (same pattern as existing `explanation` validation).
- Existing validation rules (no option references by number/letter) apply to all text fields including the new ones.

## ExplanationCard Component

New file: `client/components/ExplanationCard.tsx`

### Props

```typescript
interface ExplanationCardProps {
  isCorrect: boolean;
  correctAnswer: string;     // text of the correct option
  resultSentence: string;
  explanation: string;
  takeaway: string;
  commonMistake?: string;
  topicId?: string;          // enables "More on this Topic" link
}
```

### Visual Structure (3 layers)

1. **Title** — context-dependent:
   - Correct: "Richtig — `<correct answer>`" (green accent)
   - Incorrect: "Falsch — die Antwort war `<correct answer>`" (red accent)
2. **resultSentence + explanation** — normal text rendered with `InlineCodeText`
3. **Takeaway** — visually distinct (subtle background or left border), prefixed with "Merke:" label
4. **commonMistake** (if present) — below takeaway, prefixed with "Typischer Denkfehler:" label
5. **"More on this Topic" button** — existing functionality, remains the sole deep-dive path

### Styling

- Own `SurfaceCard` with slightly different background than the question card.
- Takeaway line visually set apart (subtle background or left border accent).
- Increased spacing between the card and the `BottomActionBar` "Next Question" button.

### Localization

All UI labels ("Richtig", "Falsch — die Antwort war", "Merke:", "Typischer Denkfehler:", "More on this Topic") use the existing i18n system (`client/lib/i18n.ts`) with German and English translations.

## Animation & Timing

After the user submits an answer:

1. **Immediately**: answer options show correct/incorrect state (green/red).
2. **~300ms delay**: `ExplanationCard` fades in via `EaseView`.
   - Opacity animation 0 to 1.
   - Optional subtle translateY (few px upward slide).
   - `animate={{ opacity: showExplanation ? 1 : 0 }}` with `transition={{ type: "timing", duration: 300 }}`.

The "Next Question" button in `BottomActionBar` is available immediately — no delay on the CTA.

### Implementation

- Existing `showResult` state triggers answer marking immediately.
- New `showExplanation` state, set via `setTimeout` (~300ms after `showResult`).
- `EaseView` wrapper around `ExplanationCard` driven by `showExplanation`.

## Tests

### ExplanationCard Unit Tests

New file: `__tests__/unit/components/ExplanationCard.test.tsx`

- Renders correct title variant for `isCorrect: true` and `false`.
- Displays `resultSentence`, `explanation`, `takeaway`.
- Shows `commonMistake` only when provided.
- Shows "More on this Topic" button only when `topicId` is provided.

### QuizSessionScreen Test Updates

- Extend mock question data with `resultSentence`, `takeaway`, and optionally `commonMistake`.
- Verify `ExplanationCard` renders after answer submission.

### Server Validation Tests

- `resultSentence` and `takeaway` must not be empty.
- Existing validation rules (no option references) apply to new fields.

### No animation tests

Timing-based fade-ins are fragile in unit tests and provide little value.

## Out of Scope

- Expandable "More Details" sections within the explanation card — the existing "More on this Topic" link to `TopicExplanationScreen` remains the single deep-dive mechanism.
- Explanation display on `SessionSummaryScreen` — summary continues to show only correct/incorrect status per question.
- Changes to the `TopicExplanationScreen` itself.
