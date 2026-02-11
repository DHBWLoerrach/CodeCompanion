import {
  averageMasteryToQuizDifficulty,
  clampMasteryLevel,
  clampQuizDifficultyLevel,
  masteryToQuizDifficulty,
} from "@shared/skill-level";

describe("shared/skill-level", () => {
  describe("masteryToQuizDifficulty", () => {
    it("maps 1 and 2 to beginner difficulty", () => {
      expect(masteryToQuizDifficulty(1)).toBe(1);
      expect(masteryToQuizDifficulty(2)).toBe(1);
    });

    it("maps 3 to intermediate difficulty", () => {
      expect(masteryToQuizDifficulty(3)).toBe(2);
    });

    it("maps 4 and 5 to advanced difficulty", () => {
      expect(masteryToQuizDifficulty(4)).toBe(3);
      expect(masteryToQuizDifficulty(5)).toBe(3);
    });
  });

  describe("averageMasteryToQuizDifficulty", () => {
    it("uses fallback when no levels are available", () => {
      expect(averageMasteryToQuizDifficulty([])).toBe(1);
      expect(averageMasteryToQuizDifficulty([], 2)).toBe(2);
    });

    it("maps averaged mastery levels into quiz difficulty buckets", () => {
      expect(averageMasteryToQuizDifficulty([5, 1])).toBe(2);
      expect(averageMasteryToQuizDifficulty([5, 4, 4])).toBe(3);
      expect(averageMasteryToQuizDifficulty([2, 2, 1])).toBe(1);
    });
  });

  describe("clamp helpers", () => {
    it("clamps mastery level to range 1..5", () => {
      expect(clampMasteryLevel(0)).toBe(1);
      expect(clampMasteryLevel(99)).toBe(5);
      expect(clampMasteryLevel("abc", 4)).toBe(4);
    });

    it("clamps quiz difficulty level to range 1..3", () => {
      expect(clampQuizDifficultyLevel(-2)).toBe(1);
      expect(clampQuizDifficultyLevel(42)).toBe(3);
      expect(clampQuizDifficultyLevel("abc", 2)).toBe(2);
    });
  });
});
