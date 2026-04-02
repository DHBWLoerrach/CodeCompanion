# Rust Integration Plan

**Status:** Draft  
**Date:** 2026-04-02  
**Version:** 1.0.0

---

## Overview

This document specifies the integration of **Rust** as the fourth programming language in DHBW Code Companion, alongside JavaScript, Python, and Java.

### Goals

- Add Rust support to the curriculum, quiz generation, and explanation system.
- Enable learners to study Rust idioms, ownership, borrowing, lifetimes, and concurrency.
- Maintain consistency with existing language integration patterns.
- Ensure full bilingual support (English and German).

### Non-Goals

- Support for Rust-specific web assembly (Wasm) in this version.
- Integration of Rust into the web build target.
- Support for Rust IDE or external tooling beyond the app.

---

## Scope

### In Scope

- ✅ Addition of Rust as a supported programming language (`rust`).
- ✅ Creation of a Rust curriculum with categories and topics.
- ✅ Topic prompts for AI quiz generation.
- ✅ Static explanations for all Rust topics (EN/DE).
- ✅ Integration of Rust into the existing curriculum registry.

### Out of Scope

- Rust-specific syntax highlighting in code examples (handled by code block rendering).
- Rust linter or clippy integration.
- Rust project templates or `cargo` integration.

---

## Integration Points

### 1. Type System (`shared/programming-language.ts`)

**Current:**

```typescript
export const SUPPORTED_PROGRAMMING_LANGUAGE_IDS = [
  DEFAULT_PROGRAMMING_LANGUAGE_ID, // 'javascript'
  'python',
  'java',
] as const;
```

**Required Change:**

```typescript
export const SUPPORTED_PROGRAMMING_LANGUAGE_IDS = [
  DEFAULT_PROGRAMMING_LANGUAGE_ID,
  'python',
  'java',
  'rust', // ← New
] as const;
```

**Impact:**

- All TypeScript generics using `ProgrammingLanguageId` will now accept `'rust'`.
- No UI changes required—all screens already handle languages dynamically.

---

### 2. Curriculum Schema (`shared/curriculum/rust.json`)

**New File:** `shared/curriculum/rust.json`

#### Structure

```jsonc
{
  "languageId": "rust",
  "languageName": {
    "en": "Rust",
    "de": "Rust"
  },
  "shortName": "RS",
  "color": "#CB5500",  // Official Rust orange
  "contextExclusion": "Focus on Rust language fundamentals and idiomatic Rust. Avoid generic programming examples - always use Rust-specific patterns. Emphasize ownership, borrowing, and the borrow checker.",
  "categories": [
    {
      "order": 1,
      "id": "fundamentals",
      "name": {
        "en": "Fundamentals",
        "de": "Grundlagen"
      },
      "shortDescription": {
        "en": "Intro to Rust types, variables, and module system.",
        "de": "Einführung in Rust-Typen, Variablen und Modulsystem."
      },
      "topics": [
        {
          "order": 1,
          "id": "primitive-types",
          "name": {
            "en": "Primitive Types",
            "de": "Primitive Typen"
          },
          "shortDescription": {
            "en": "Integer, float, boolean, char types and type inference",
            "de": "Ganzzahl-, Float-, Boolesche-Wert-Char-Typen und Typpräfung"
          },
          "prerequisites": []
        },
        ...
      ]
    },
    ...
  ]
}
```

#### Categories & Topics

##### Category 1: `fundamentals` (Order: 1)

| ID                       | Name                     | Order | Prerequisites              |
| ------------------------ | ------------------------ | ----- | -------------------------- |
| `primitive-types`        | Primitive Types          | 1     | []                         |
| `variables-immutability` | Variables & Immutability | 2     | [`primitive-types`]        |
| `data-structures`        | Data Structures          | 3     | [`variables-immutability`] |
| `module-system`          | Module System            | 4     | [`data-structures`]        |

##### Category 2: `ownership-memory` (Order: 2)

| ID          | Name                   | Order | Prerequisites |
| ----------- | ---------------------- | ----- | ------------- |
| `ownership` | Ownership              | 1     | []            |
| `borrowing` | Borrowing & References | 2     | [`ownership`] |
| `slices`    | Slices                 | 3     | [`borrowing`] |
| `lifetimes` | Lifetimes              | 4     | [`borrowing`] |

##### Category 3: `error-handling` (Order: 3)

| ID               | Name           | Order | Prerequisites          |
| ---------------- | -------------- | ----- | ---------------------- |
| `results`        | Result Type    | 1     | []                     |
| `options`        | Option Type    | 2     | []                     |
| `error-handling` | Error Handling | 3     | [`results`, `options`] |
| `custom-errors`  | Custom Errors  | 4     | [`error-handling`]     |

##### Category 4: `abstraction` (Order: 4)

| ID          | Name                     | Order | Prerequisites |
| ----------- | ------------------------ | ----- | ------------- |
| `functions` | Functions & Methods      | 1     | []            |
| `structs`   | Structs                  | 2     | [`functions`] |
| `enums`     | Enums & Pattern Matching | 3     | [`structs`]   |
| `traits`    | Traits                   | 4     | [`enums`]     |

##### Category 5: `advanced` (Order: 5)

| ID                   | Name               | Order | Prerequisites                  |
| -------------------- | ------------------ | ----- | ------------------------------ |
| `generics`           | Generics           | 1     | [`traits`]                     |
| `lifetimes-advanced` | Advanced Lifetimes | 2     | [`lifetimes`]                  |
| `concurrency`        | Concurrency Basics | 3     | []                             |
| `smart-pointers`     | Smart Pointers     | 4     | [`ownership`]                  |
| `macros`             | Macros             | 5     | [`module-system`, `functions`] |

**Total:** 25 topics across 5 categories.

---

### 3. Curriculum Registry (`shared/curriculum/index.ts`)

**Required Change:**

```typescript
// Import
import rustCurriculumJson from './rust.json';

// Metadata
const DEFAULT_LANGUAGE_METADATA = {
  javascript: { shortName: 'JS', color: '#F7DF1E' },
  python: { shortName: 'PY', color: '#3776AB' },
  java: { shortName: 'JA', color: '#F89820' },
  rust: { shortName: 'RS', color: '#CB5500' }, // ← New
};

// Registry
const rawCurricula = [
  javascriptCurriculumJson,
  pythonCurriculumJson,
  javaCurriculumJson,
  rustCurriculumJson, // ← New
];
```

---

### 4. Topic Prompts (`shared/topic-prompts/rust.json`)

**New File:** `shared/topic-prompts/rust.json`

**Structure:** Mapping of topic IDs to AI prompts.

**Example:**

```json
{
  "primitive-types": "Rust primitive types (integer, float, boolean, char) and type inference rules",
  "variables-immutability": "Rust variable declarations, constants, mutability restrictions, and variable shadowing",
  "ownership": "Rust ownership rules, stack vs heap memory, move semantics",
  ...
}
```

**Coverage Rule:** Every topic ID from `rust.json` must have a corresponding entry here. The import-time validation in `index.ts` will fail if there is any mismatch.

---

### 5. Explanations (`shared/explanations/rust.en.json`, `rust.de.json`)

**New Files:**

- `shared/explanations/rust.en.json`
- `shared/explanations/rust.de.json`

**Structure:**

```json
{
  "primitive-types": "Rust has several primitive types that form the building blocks of the language. Integer types include signed integers (i8-i128) and unsigned integers (u8-u128). Floating-point types are f32 and f64. Booleans use the bool type (true/false). Characters are represented using char, which is always a Unicode scalar value. Rust uses type inference with let bindings when you don't specify types explicitly.",
  ...
}
```

**Example (de):**

```json
{
  "primitive-types": "Rust verfügt über mehrere primitive Typen, die die Grundbausteine der Sprache bilden. Ganzzahltypen umfassen signed integers (i8-i128) und unsigned integers (u8-u128). Gleitkommatypen sind f32 und f64. Booleans werden mit dem bool-Typ repräsentiert. Zeichen werden mit char dargestellt, das immer ein Unicode-Skalartyp ist. Rust verwendet Typpräfung mit let-Bindung, wenn Sie keine Typen explizit angeben."
}
```

---

### 6. Explanation Index (`shared/explanations/index.ts`)

**Required Change:**

```typescript
import rustDe from './rust.de.json';
import rustEn from './rust.en.json';

const TOPIC_EXPLANATIONS = {
  javascript: { en: ..., de: ... },
  python: { en: ..., de: ... },
  java: { en: ..., de: ... },
  rust: {
    en: toExplanationMap(rustEn),
    de: toExplanationMap(rustDe),
  },  // ← New
} as const;
```

---

## Validation Checklist

After implementation, the following checks must pass:

- [ ] **Type Check:** `ProgrammingLanguageId` includes `'rust'`
- [ ] **Unique IDs:** No duplicate category or topic IDs in `rust.json`
- [ ] **Prerequisites:** All prerequisites reference valid topic IDs
- [ ] **Prompts Coverage:** All 25 topic IDs have entries in `rust.json` topic-prompts
- [ ] **Explanations:** No import errors (optional, fallback if missing)

**Command:**

```bash
npm run check:types && npm run lint
```

---

## Implementation Order

| Step | Files                              | Description                               | Time   |
| ---- | ---------------------------------- | ----------------------------------------- | ------ |
| 1    | `shared/programming-language.ts`   | Add `'rust'` to supported languages       | 2 min  |
| 2    | `shared/curriculum/rust.json`      | Create Rust curriculum with all 25 topics | 25 min |
| 3    | `shared/topic-prompts/rust.json`   | Add prompt mappings for all 25 topics     | 5 min  |
| 4    | `shared/explanations/rust.en.json` | Add explanations for all 25 topics (EN)   | 15 min |
| 5    | `shared/explanations/rust.de.json` | Add explanations for all 25 topics (DE)   | 15 min |
| 6    | `shared/curriculum/index.ts`       | Import and register Rust curriculum       | 2 min  |
| 7    | `shared/explanations/index.ts`     | Import and register Rust explanations     | 2 min  |
| 8    | Validation                         | Run `npm run check:types && npm run lint` | 5 min  |

---

## Open Questions

- [x] Should `lifetimes-advanced` be renamed to include "lifetime elision"?
- [x] Should `module-system` be named `modules` for consistency?
- [x] Should `error-handling` be renamed to `try-operator` in category 3?

**Resolution:** Follow the short naming convention as proposed in the topic list (e.g., `lifetimes-advanced`, `module-system`, `error-handling`).

---

## Notes

- The `contextExclusion` field in the curriculum JSON helps the AI avoid providing generic programming examples and instead focus on idiomatic Rust patterns.
- Prerequisites are intentionally minimal (10 topics have no prerequisites) to allow parallel learning.
- The curriculum structure (5 categories, ~5 topics per category) mirrors the pattern used for JavaScript, Python, and Java.

---

## References

- [DHBW Code Companion Repository Guidelines](../AGENTS.md)
- [Add a Programming Language Guidelines](../AGENTS.md/#add-a-programming-language)
- [Existing JavaScript Curriculum](../shared/curriculum/javascript.json)
- [Existing Python Curriculum](../shared/curriculum/python.json)
- [Existing Java Curriculum](../shared/curriculum/java.json)
