# Quiz Explanation Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure quiz explanations into a scannable 3-layer card (result, explanation, takeaway) that makes every answered question a learning moment.

**Architecture:** Extend `QuizQuestion` with `resultSentence`, `takeaway`, and optional `commonMistake` fields. Update the AI prompt and server validation to produce structured explanations. Extract a new `ExplanationCard` component that renders the 3-layer structure. Add a delayed fade-in via `EaseView`.

**Tech Stack:** React Native, Expo, TypeScript, OpenAI Responses API, react-native-ease, Jest + Testing Library

---

## File Map

- **Modify:** `shared/quiz-question.ts` — add `resultSentence`, `takeaway`, `commonMistake?`
- **Modify:** `server/quiz.ts` — update JSON schema, prompt, validation, type aliases
- **Modify:** `client/lib/i18n.ts` — add new translation keys
- **Create:** `client/components/ExplanationCard.tsx` — new explanation card component
- **Modify:** `client/screens/QuizSessionScreen.tsx` — replace inline explanation with `ExplanationCard`, add fade-in
- **Modify:** `__tests__/unit/server/quiz.test.ts` — add validation tests for new fields, update mock builders
- **Create:** `__tests__/unit/components/ExplanationCard.test.tsx` — unit tests for new component
- **Modify:** `__tests__/integration/screens/quiz-session-screen.test.tsx` — update mock data with new fields

---

### Task 1: Extend QuizQuestion Interface

**Files:**
- Modify: `shared/quiz-question.ts:1-9`

- [ ] **Step 1: Add new fields to the interface**

```typescript
export interface QuizQuestion {
  id: string;
  topicId?: string;
  question: string;
  code?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  resultSentence: string;
  takeaway: string;
  commonMistake?: string;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Type errors in `server/quiz.ts` and test files (missing new fields in mock data). This is expected — we'll fix those in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add shared/quiz-question.ts
git commit -m "Add resultSentence, takeaway, and commonMistake to QuizQuestion"
```

---

### Task 2: Update Server JSON Schema and Type Aliases

**Files:**
- Modify: `server/quiz.ts:33-70` (QUIZ_RESPONSE_FORMAT)
- Modify: `server/quiz.ts:72-116` (buildMixedQuizResponseFormat)
- Modify: `server/quiz.ts:258-265` (StructuredQuizQuestionCandidate)
- Modify: `server/quiz.ts:267-273` (StructuredQuizQuestionFields)

- [ ] **Step 1: Add new fields to QUIZ_RESPONSE_FORMAT**

In the `items.properties` object (line 45), add after the `explanation` property:

```typescript
resultSentence: { type: "string" },
takeaway: { type: "string" },
commonMistake: { type: "string" },
```

In the `items.required` array (line 55), add all three new fields. Note: OpenAI structured outputs with `strict: true` and `additionalProperties: false` require all properties to be listed in `required`. The AI will always produce `commonMistake`; empty strings mean "not applicable" and are treated as absent in validation.

```typescript
required: [
  "question",
  "code",
  "options",
  "correctIndex",
  "explanation",
  "resultSentence",
  "takeaway",
  "commonMistake",
],
```

- [ ] **Step 2: Add new fields to buildMixedQuizResponseFormat**

Same changes in `buildMixedQuizResponseFormat` (line 85 properties, line 99 required):

Add to `items.properties`:
```typescript
resultSentence: { type: "string" },
takeaway: { type: "string" },
commonMistake: { type: "string" },
```

Add to `items.required`:
```typescript
required: [
  "topicId",
  "question",
  "code",
  "options",
  "correctIndex",
  "explanation",
  "resultSentence",
  "takeaway",
  "commonMistake",
],
```

- [ ] **Step 3: Update StructuredQuizQuestionCandidate type**

At line 258, add the new optional fields:

```typescript
type StructuredQuizQuestionCandidate = {
  topicId?: unknown;
  question?: unknown;
  code?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
  resultSentence?: unknown;
  takeaway?: unknown;
  commonMistake?: unknown;
};
```

- [ ] **Step 4: Update StructuredQuizQuestionFields type**

At line 267, add the new fields:

```typescript
type StructuredQuizQuestionFields = {
  question: string;
  code: string | null;
  options: string[];
  correctIndex: number;
  explanation: string;
  resultSentence: string;
  takeaway: string;
  commonMistake?: string;
};
```

- [ ] **Step 5: Verify types compile (ignoring test errors)**

Run: `npx tsc --noEmit 2>&1 | grep -v '__tests__' | head -20`
Expected: Errors in `server/quiz.ts` validation function (doesn't return new fields yet). Fixed in Task 3.

- [ ] **Step 6: Commit**

```bash
git add server/quiz.ts
git commit -m "Add new explanation fields to OpenAI schema and server types"
```

---

### Task 3: Update Server Validation

**Files:**
- Modify: `server/quiz.ts:280-378` (validateStructuredQuizQuestionFields)

- [ ] **Step 1: Write failing tests for resultSentence validation**

In `__tests__/unit/server/quiz.test.ts`, update the `buildStructuredQuizQuestion` helper (line 80) to include new fields:

```typescript
function buildStructuredQuizQuestion(
  overrides: StructuredQuizQuestionOverrides = {},
) {
  return {
    question: "Q?",
    code: null,
    options: ["A", "B", "C", "D"],
    correctIndex: 0,
    explanation: "Because",
    resultSentence: "Result: A",
    takeaway: "Remember A",
    commonMistake: "",
    ...overrides,
  };
}
```

Update `StructuredQuizQuestionOverrides` type (line 72):

```typescript
type StructuredQuizQuestionOverrides = {
  question?: unknown;
  code?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
  resultSentence?: unknown;
  takeaway?: unknown;
  commonMistake?: unknown;
};
```

Update `buildStructuredQuizQuestions` (line 47) to include new fields:

```typescript
function buildStructuredQuizQuestions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    question: `Q${index + 1}?`,
    code: null,
    options: ["A", "B", "C", "D"],
    correctIndex: 0,
    explanation: `Because ${index + 1}`,
    resultSentence: `Result: A`,
    takeaway: `Remember ${index + 1}`,
    commonMistake: "",
  }));
}
```

Update `buildStructuredMixedQuizQuestions` (line 57) to include new fields:

```typescript
function buildStructuredMixedQuizQuestions(
  topicPlan: { topicId: string; questionCount: number }[],
) {
  return topicPlan.flatMap(({ topicId, questionCount }) =>
    Array.from({ length: questionCount }, (_, index) => ({
      topicId,
      question: `${topicId} Q${index + 1}?`,
      code: null,
      options: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: `Because ${topicId} ${index + 1}`,
      resultSentence: `Result: A`,
      takeaway: `Remember ${topicId} ${index + 1}`,
      commonMistake: "",
    })),
  );
}
```

Add new test cases after the "throws when explanation is empty" test (line 537):

```typescript
it("throws when resultSentence is empty", async () => {
  fetchMock.mockResolvedValueOnce(
    mockFetchResponse({
      json: {
        output_text: JSON.stringify({
          questions: [
            buildStructuredQuizQuestion({
              resultSentence: "   ",
            }),
          ],
        }),
      },
    }),
  );

  await expect(
    generateQuizQuestions("javascript", "variables", 1),
  ).rejects.toThrow(
    "Invalid quiz question at index 0: resultSentence is empty",
  );
});

it("throws when takeaway is empty", async () => {
  fetchMock.mockResolvedValueOnce(
    mockFetchResponse({
      json: {
        output_text: JSON.stringify({
          questions: [
            buildStructuredQuizQuestion({
              takeaway: "   ",
            }),
          ],
        }),
      },
    }),
  );

  await expect(
    generateQuizQuestions("javascript", "variables", 1),
  ).rejects.toThrow(
    "Invalid quiz question at index 0: takeaway is empty",
  );
});

it("throws when resultSentence references an option by number or letter", async () => {
  fetchMock.mockResolvedValueOnce(
    mockFetchResponse({
      json: {
        output_text: JSON.stringify({
          questions: [
            buildStructuredQuizQuestion({
              resultSentence: "Option A is the result.",
            }),
          ],
        }),
      },
    }),
  );

  await expect(
    generateQuizQuestions("javascript", "variables", 1),
  ).rejects.toThrow(
    "Invalid quiz question at index 0: resultSentence must not reference options by number or letter",
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/unit/server/quiz.test.ts --no-coverage 2>&1 | tail -20`
Expected: The three new tests fail (validation not yet implemented).

- [ ] **Step 3: Add validation for new fields in validateStructuredQuizQuestionFields**

In `server/quiz.ts`, in `validateStructuredQuizQuestionFields` after the explanation validation (after line 357), add:

```typescript
if (typeof question.resultSentence !== "string") {
  throw new Error(
    `Invalid quiz question at index ${index}: resultSentence must be a string`,
  );
}

if (!question.resultSentence.trim()) {
  throw new Error(
    `Invalid quiz question at index ${index}: resultSentence is empty`,
  );
}

if (EXPLANATION_OPTION_REFERENCE_PATTERN.test(question.resultSentence)) {
  throw new Error(
    `Invalid quiz question at index ${index}: resultSentence must not reference options by number or letter`,
  );
}

if (typeof question.takeaway !== "string") {
  throw new Error(
    `Invalid quiz question at index ${index}: takeaway must be a string`,
  );
}

if (!question.takeaway.trim()) {
  throw new Error(
    `Invalid quiz question at index ${index}: takeaway is empty`,
  );
}

if (EXPLANATION_OPTION_REFERENCE_PATTERN.test(question.takeaway)) {
  throw new Error(
    `Invalid quiz question at index ${index}: takeaway must not reference options by number or letter`,
  );
}

const commonMistake =
  typeof question.commonMistake === "string"
    ? question.commonMistake.trim()
    : undefined;

if (
  commonMistake &&
  EXPLANATION_OPTION_REFERENCE_PATTERN.test(commonMistake)
) {
  throw new Error(
    `Invalid quiz question at index ${index}: commonMistake must not reference options by number or letter`,
  );
}
```

Update the return statement (line 371) to include the new fields:

```typescript
return {
  question: question.question,
  code: question.code,
  options: question.options,
  correctIndex,
  explanation: question.explanation,
  resultSentence: question.resultSentence,
  takeaway: question.takeaway,
  ...(commonMistake ? { commonMistake } : {}),
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/unit/server/quiz.test.ts --no-coverage 2>&1 | tail -20`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/quiz.ts __tests__/unit/server/quiz.test.ts
git commit -m "Add server validation for resultSentence, takeaway, and commonMistake"
```

---

### Task 4: Update AI Prompt Instructions

**Files:**
- Modify: `server/quiz.ts:753-772` (single quiz prompt)
- Modify: `server/quiz.ts:822-853` (mixed quiz prompt)

- [ ] **Step 1: Update the single quiz prompt**

In `requestQuizQuestionBatch`, update the prompt string. After the line about `getSingleChoiceQualityRequirements()` (line 765), and in the "Important" block, add new field instructions and update the keys list.

Replace lines 766-772 with:

```typescript
${getSingleChoiceQualityRequirements()}
- In the resultSentence, state the correct result in one short sentence (e.g. "Result: \`0\`"). Use inline code for values.
- In the takeaway, provide one memorable rule the learner should remember (e.g. "\`??\` only checks for \`null\` and \`undefined\`")
- In the commonMistake, briefly explain a common misconception relevant to this question if one exists; include a comparison if helpful; use an empty string if not applicable

Important:
- Make questions progressively challenging
- Use realistic code examples students would encounter
- The response schema already defines the JSON shape, so focus on the question content
${contextExclusion ? `- ${contextExclusion}` : ""}
- Do not include any keys other than question, code, options, correctIndex, explanation, resultSentence, takeaway, and commonMistake`;
```

- [ ] **Step 2: Update the mixed quiz prompt**

In `requestMixedQuizQuestionBatch`, apply the same changes. Replace lines 843-853 with:

```typescript
${getSingleChoiceQualityRequirements()}
- In the resultSentence, state the correct result in one short sentence (e.g. "Result: \`0\`"). Use inline code for values.
- In the takeaway, provide one memorable rule the learner should remember (e.g. "\`??\` only checks for \`null\` and \`undefined\`")
- In the commonMistake, briefly explain a common misconception relevant to this question if one exists; include a comparison if helpful; use an empty string if not applicable

Important:
- Return exactly ${totalCount} questions total
- Produce exactly the requested number of questions for each topicId
- Include a topicId field on every question using only the topic IDs from the topic plan
- Avoid near-duplicate questions across the entire quiz
- Use realistic code examples students would encounter
- The response schema already defines the JSON shape, so focus on the question content
${contextExclusion ? `- ${contextExclusion}` : ""}
- Do not include any keys other than topicId, question, code, options, correctIndex, explanation, resultSentence, takeaway, and commonMistake`;
```

- [ ] **Step 3: Update existing prompt-assertion tests**

In `__tests__/unit/server/quiz.test.ts`, the test "uses javascript language context when generating javascript quizzes" (line 601) checks for prompt content. Update the mock response data to include the new fields. The inline JSON strings in the `output_text` mocks throughout the file also need updating.

For the simple one-question mock at line 141, update:

```typescript
'{"questions":[{"question":"Q?","code":null,"options":["A","B","C","D"],"correctIndex":0,"explanation":"Because","resultSentence":"Result: A","takeaway":"Remember A","commonMistake":""}]}'
```

Apply the same pattern to all other inline JSON mocks in the test file (lines 215, 243, 577-578). Each must include `"resultSentence"`, `"takeaway"`, and `"commonMistake"` fields.

- [ ] **Step 4: Run all tests**

Run: `npx jest __tests__/unit/server/quiz.test.ts --no-coverage 2>&1 | tail -20`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/quiz.ts __tests__/unit/server/quiz.test.ts
git commit -m "Add structured explanation instructions to AI prompts"
```

---

### Task 5: Update Stable ID Hash Input

**Files:**
- Modify: `server/quiz.ts:648-678` (addStableIds)

The `addStableIds` function hashes question content for stable IDs. The new fields should be included so different explanations produce different IDs.

- [ ] **Step 1: Add new fields to the hash input**

In `addStableIds` (line 659), update the `JSON.stringify` call:

```typescript
const contentHash = await sha256Hex(
  JSON.stringify({
    programmingLanguage,
    topicId,
    question: question.question,
    code: question.code ?? null,
    options: question.options,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    resultSentence: question.resultSentence,
    takeaway: question.takeaway,
    commonMistake: question.commonMistake ?? null,
    index,
  }),
);
```

- [ ] **Step 2: Update the stable ID test assertions**

In `__tests__/unit/server/quiz.test.ts`, the test "includes programming language and full question content in stable ID input" (line 353) checks the digest input. Update the mock response data and add assertions for the new fields.

Update the two mock responses at line 360 and 376 to include:

```typescript
resultSentence: "Result: A",
takeaway: "Remember JS",
commonMistake: "",
```

and:

```typescript
resultSentence: "Result: A",
takeaway: "Remember Py",
commonMistake: "",
```

Add assertions after line 424:

```typescript
expect(firstDigestInput).toContain('"resultSentence":"Result: A"');
expect(firstDigestInput).toContain('"takeaway":"Remember JS"');
expect(secondDigestInput).toContain('"takeaway":"Remember Py"');
```

- [ ] **Step 3: Run tests**

Run: `npx jest __tests__/unit/server/quiz.test.ts --no-coverage 2>&1 | tail -20`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add server/quiz.ts __tests__/unit/server/quiz.test.ts
git commit -m "Include new explanation fields in stable quiz question ID hash"
```

---

### Task 6: Add i18n Translation Keys

**Files:**
- Modify: `client/lib/i18n.ts`

- [ ] **Step 1: Add English translations**

After the `explanation` key (line 63), add:

```typescript
correctTitle: "Correct",
incorrectTitle: "Incorrect — the answer was",
takeawayLabel: "Remember:",
commonMistakeLabel: "Common mistake:",
```

- [ ] **Step 2: Add German translations**

After the `explanation` key (line 204), add:

```typescript
correctTitle: "Richtig",
incorrectTitle: "Falsch — die Antwort war",
takeawayLabel: "Merke:",
commonMistakeLabel: "Typischer Denkfehler:",
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No new errors from i18n changes.

- [ ] **Step 4: Commit**

```bash
git add client/lib/i18n.ts
git commit -m "Add i18n keys for explanation card titles and labels"
```

---

### Task 7: Create ExplanationCard Component

**Files:**
- Create: `client/components/ExplanationCard.tsx`
- Test: `__tests__/unit/components/ExplanationCard.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/unit/components/ExplanationCard.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { ExplanationCard } from "@/components/ExplanationCard";

jest.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      success: "#34C759",
      error: "#E2001A",
      secondary: "#4A90E2",
      text: "#111111",
      backgroundDefault: "#FFFFFF",
      backgroundSecondary: "#F0F0F0",
      codeBackground: "#F7F7F7",
      cardBorder: "#DDDDDD",
      cardBorderSubtle: "#DDDDDD",
      tabIconDefault: "#666666",
      onColor: "#FFFFFF",
    },
  }),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: "en",
  }),
}));

jest.mock("@/components/AppIcon", () => ({
  AppIcon: () => null,
}));

const baseProps = {
  isCorrect: true,
  correctAnswer: "`0`",
  resultSentence: "Result: `0`",
  explanation: "The `??` operator only falls back when left is `null` or `undefined`.",
  takeaway: "`??` only checks for `null` and `undefined`",
};

describe("ExplanationCard", () => {
  it("renders correct title when answer is correct", () => {
    const screen = render(<ExplanationCard {...baseProps} />);
    expect(screen.getByText(/correctTitle/)).toBeTruthy();
  });

  it("renders incorrect title when answer is wrong", () => {
    const screen = render(
      <ExplanationCard {...baseProps} isCorrect={false} />,
    );
    expect(screen.getByText(/incorrectTitle/)).toBeTruthy();
  });

  it("displays resultSentence and explanation text", () => {
    const screen = render(<ExplanationCard {...baseProps} />);
    expect(
      screen.getByText(
        /The ?? operator only falls back when left is null or undefined./,
      ),
    ).toBeTruthy();
  });

  it("displays takeaway with label", () => {
    const screen = render(<ExplanationCard {...baseProps} />);
    expect(screen.getByText(/takeawayLabel/)).toBeTruthy();
  });

  it("shows commonMistake when provided", () => {
    const screen = render(
      <ExplanationCard
        {...baseProps}
        commonMistake="Many confuse `??` with `||`."
      />,
    );
    expect(screen.getByText(/commonMistakeLabel/)).toBeTruthy();
    expect(
      screen.getByText(/Many confuse \?\? with \|\|./),
    ).toBeTruthy();
  });

  it("does not show commonMistake section when not provided", () => {
    const screen = render(<ExplanationCard {...baseProps} />);
    expect(screen.queryByText(/commonMistakeLabel/)).toBeNull();
  });

  it("shows topic explanation button when topicId is provided", () => {
    const onPressTopic = jest.fn();
    const screen = render(
      <ExplanationCard
        {...baseProps}
        topicId="nullish-coalescing"
        onPressTopic={onPressTopic}
      />,
    );
    expect(screen.getByTestId("quiz-topic-explanation-button")).toBeTruthy();
  });

  it("does not show topic explanation button when topicId is absent", () => {
    const screen = render(<ExplanationCard {...baseProps} />);
    expect(
      screen.queryByTestId("quiz-topic-explanation-button"),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/unit/components/ExplanationCard.test.tsx --no-coverage 2>&1 | tail -10`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the ExplanationCard component**

Create `client/components/ExplanationCard.tsx`:

```tsx
import React from "react";
import { View, StyleSheet } from "react-native";

import { InlineCodeText } from "@/components/InlineCodeText";
import { SecondaryButton } from "@/components/ActionButton";
import { SurfaceCard } from "@/components/SurfaceCard";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { BorderRadius, Spacing } from "@/constants/theme";

interface ExplanationCardProps {
  isCorrect: boolean;
  correctAnswer: string;
  resultSentence: string;
  explanation: string;
  takeaway: string;
  commonMistake?: string;
  topicId?: string;
  onPressTopic?: () => void;
}

export function ExplanationCard({
  isCorrect,
  correctAnswer,
  resultSentence,
  explanation,
  takeaway,
  commonMistake,
  topicId,
  onPressTopic,
}: ExplanationCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const titleColor = isCorrect ? theme.success : theme.error;

  return (
    <SurfaceCard
      style={styles.card}
      backgroundColor={theme.backgroundSecondary}
    >
      <View style={styles.titleRow}>
        <InlineCodeText
          type="label"
          style={{ color: titleColor }}
          text={
            isCorrect
              ? `${t("correctTitle")} — ${correctAnswer}`
              : `${t("incorrectTitle")} ${correctAnswer}`
          }
        />
      </View>

      <InlineCodeText type="body" text={resultSentence} />
      <InlineCodeText type="body" text={explanation} />

      <View
        style={[
          styles.takeawayContainer,
          { borderLeftColor: theme.secondary },
        ]}
      >
        <ThemedText type="label" style={{ color: theme.secondary }}>
          {t("takeawayLabel")}
        </ThemedText>
        <InlineCodeText type="body" text={takeaway} />
      </View>

      {commonMistake ? (
        <View style={styles.commonMistakeContainer}>
          <ThemedText
            type="label"
            style={{ color: theme.tabIconDefault }}
          >
            {t("commonMistakeLabel")}
          </ThemedText>
          <InlineCodeText type="body" text={commonMistake} />
        </View>
      ) : null}

      {topicId && onPressTopic ? (
        <SecondaryButton
          testID="quiz-topic-explanation-button"
          color={theme.secondary}
          icon="book-open"
          label={t("moreOnThisTopic")}
          onPress={onPressTopic}
          style={styles.topicAction}
        />
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  titleRow: {
    marginBottom: Spacing.xs,
  },
  takeawayContainer: {
    borderLeftWidth: 3,
    borderRadius: BorderRadius.xs,
    paddingLeft: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  commonMistakeContainer: {
    gap: Spacing.xs,
  },
  topicAction: {
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/unit/components/ExplanationCard.test.tsx --no-coverage 2>&1 | tail -15`
Expected: All 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/components/ExplanationCard.tsx __tests__/unit/components/ExplanationCard.test.tsx
git commit -m "Add ExplanationCard component with 3-layer structured layout"
```

---

### Task 8: Integrate ExplanationCard into QuizSessionScreen

**Files:**
- Modify: `client/screens/QuizSessionScreen.tsx:812-832` (explanation section)
- Modify: `client/screens/QuizSessionScreen.tsx:389-394` (state)
- Modify: `client/screens/QuizSessionScreen.tsx:957-963` (styles)

- [ ] **Step 1: Add import for ExplanationCard and update state**

At the top of the file (after the existing imports around line 27), add:

```typescript
import { ExplanationCard } from "@/components/ExplanationCard";
```

In the state declarations (around line 390), add after `showResult`:

```typescript
const [showExplanation, setShowExplanation] = useState(false);
```

- [ ] **Step 2: Add delayed show logic**

In `handleSubmit` (line 520), after `setShowResult(true)` (line 524), add:

```typescript
setTimeout(() => setShowExplanation(true), 300);
```

In the state reset when advancing to next question (line 550, inside `handleNext`), add after `setShowResult(false)`:

```typescript
setShowExplanation(false);
```

- [ ] **Step 3: Replace inline explanation with ExplanationCard**

Replace lines 812-832:

```tsx
{showResult ? (
  <SurfaceCard style={styles.explanationCard}>
    <ThemedText
      type="label"
      style={{ color: theme.secondary, marginBottom: Spacing.sm }}
    >
      {t("explanation")}
    </ThemedText>
    <InlineCodeText type="body" text={currentQuestion.explanation} />
    {canOpenTopicExplanation ? (
      <SecondaryButton
        testID="quiz-topic-explanation-button"
        color={theme.secondary}
        icon="book-open"
        label={t("moreOnThisTopic")}
        onPress={handleOpenTopicExplanation}
        style={styles.explanationAction}
      />
    ) : null}
  </SurfaceCard>
) : null}
```

With:

```tsx
{showResult ? (
  <EaseView
    animate={{
      opacity: showExplanation ? 1 : 0,
      translateY: showExplanation ? 0 : 8,
    }}
    transition={{ type: "timing", duration: 300 }}
  >
    <ExplanationCard
      isCorrect={selectedAnswer === currentQuestion.correctIndex}
      correctAnswer={
        currentQuestion.options[currentQuestion.correctIndex]
      }
      resultSentence={currentQuestion.resultSentence}
      explanation={currentQuestion.explanation}
      takeaway={currentQuestion.takeaway}
      commonMistake={currentQuestion.commonMistake}
      topicId={
        canOpenTopicExplanation ? explanationTopicId : undefined
      }
      onPressTopic={
        canOpenTopicExplanation
          ? handleOpenTopicExplanation
          : undefined
      }
    />
  </EaseView>
) : null}
```

- [ ] **Step 4: Remove unused styles**

Remove the `explanationCard` and `explanationAction` styles (lines 957-963) since they're now inside `ExplanationCard`. Also remove the `SecondaryButton` import if it's no longer used elsewhere in the file — check first. (It's used in the loading and error states, so keep it.)

The `SurfaceCard` import can also stay since it's used for the question card and context card.

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (or only test-related errors from mock data).

- [ ] **Step 6: Commit**

```bash
git add client/screens/QuizSessionScreen.tsx
git commit -m "Replace inline explanation with ExplanationCard and add fade-in"
```

---

### Task 9: Update Integration Tests

**Files:**
- Modify: `__tests__/integration/screens/quiz-session-screen.test.tsx`

- [ ] **Step 1: Update default mock question data**

At line 188, update the mock to include new fields:

```typescript
mockApiRequest.mockResolvedValue({
  json: async () => ({
    questions: [
      {
        id: "q1",
        question: "What is const?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctIndex: 1,
        explanation: "Because const creates block-scoped bindings.",
        resultSentence: "Result: Option B",
        takeaway: "const creates block-scoped, non-reassignable bindings",
        commonMistake: "",
      },
    ],
  }),
});
```

- [ ] **Step 2: Update all other mock question data in tests**

Update the mock at line 303 (mixed quiz test):

```typescript
{
  id: "q1",
  topicId: "loops",
  question: "Question 1",
  options: ["Option A", "Option B", "Option C", "Option D"],
  correctIndex: 1,
  explanation: "Explanation 1",
  resultSentence: "Result: Option B",
  takeaway: "Takeaway 1",
  commonMistake: "",
},
```

Update the inline code test mock at line 343:

```typescript
{
  id: "q1",
  question: "What is `x` after `let x;`?",
  options: ["`undefined`", "`null`", "`0`", "`NaN`"],
  correctIndex: 0,
  explanation: "Because `let x;` leaves `x` as `undefined`.",
  resultSentence: "Result: `undefined`",
  takeaway: "Uninitialized `let` variables are `undefined`",
  commonMistake: "",
},
```

Update the multi-question test mocks at lines 393-406:

```typescript
{
  id: "q1",
  question: "Question 1",
  options: ["Option A", "Option B", "Option C", "Option D"],
  correctIndex: 1,
  explanation: "Explanation 1",
  resultSentence: "Result: Option B",
  takeaway: "Takeaway 1",
  commonMistake: "",
},
{
  id: "q2",
  question: "Question 2",
  options: ["Option A", "Option B", "Option C", "Option D"],
  correctIndex: 1,
  explanation: "Explanation 2",
  resultSentence: "Result: Option B",
  takeaway: "Takeaway 2",
  commonMistake: "",
},
```

Update the quick quiz test mocks at lines 527-551 (3 questions):

```typescript
{
  id: "q1",
  topicId: "variables",
  question: "Question 1",
  options: ["Option A", "Option B", "Option C", "Option D"],
  correctIndex: 1,
  explanation: "Explanation 1",
  resultSentence: "Result: Option B",
  takeaway: "Takeaway 1",
  commonMistake: "",
},
{
  id: "q2",
  topicId: "loops",
  question: "Question 2",
  options: ["Option A", "Option B", "Option C", "Option D"],
  correctIndex: 0,
  explanation: "Explanation 2",
  resultSentence: "Result: Option A",
  takeaway: "Takeaway 2",
  commonMistake: "",
},
{
  id: "q3",
  topicId: "variables",
  question: "Question 3",
  options: ["Option A", "Option B", "Option C", "Option D"],
  correctIndex: 1,
  explanation: "Explanation 3",
  resultSentence: "Result: Option B",
  takeaway: "Takeaway 3",
  commonMistake: "",
},
```

- [ ] **Step 3: Verify explanation display assertions still work**

The existing tests already use `await waitFor(() => { ... })` to check explanation text. Since `waitFor` polls every 50ms with a 1000ms timeout by default, it will naturally catch the 300ms `setTimeout` for `showExplanation`. No fake timer setup is needed — the existing `waitFor` calls handle the delay automatically.

- [ ] **Step 4: Run all tests**

Run: `npx jest --no-coverage 2>&1 | tail -20`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add __tests__/integration/screens/quiz-session-screen.test.tsx
git commit -m "Update integration test mocks with new explanation fields"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run type check**

Run: `npm run check:types`
Expected: No errors.

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Run formatter check**

Run: `npm run check:format`
Expected: No issues (run `npm run format` if needed).

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 5: Final commit if any formatting fixes were needed**

```bash
git add -A
git commit -m "Fix formatting"
```
