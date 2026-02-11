import {
  toNumber,
  toQuestionCount,
  toLanguage,
  requireTopicId,
  toQuizDifficultyLevel,
} from "@server/validation";

describe("server/validation", () => {
  describe("toNumber", () => {
    it("returns the number when value is a finite number", () => {
      expect(toNumber(42, 0)).toBe(42);
    });

    it("parses a numeric string", () => {
      expect(toNumber("7", 0)).toBe(7);
    });

    it("returns fallback for NaN string", () => {
      expect(toNumber("abc", 5)).toBe(5);
    });

    it("coerces null to 0", () => {
      expect(toNumber(null, 10)).toBe(0);
    });

    it("returns fallback for undefined", () => {
      expect(toNumber(undefined, 3)).toBe(3);
    });

    it("returns fallback for Infinity", () => {
      expect(toNumber(Infinity, 1)).toBe(1);
    });
  });

  describe("toQuestionCount", () => {
    it("returns parsed count within bounds", () => {
      expect(toQuestionCount(10, 5)).toBe(10);
    });

    it("clamps to minimum 1", () => {
      expect(toQuestionCount(-5, 5)).toBe(1);
      expect(toQuestionCount(0, 5)).toBe(1);
    });

    it("clamps to maximum 20", () => {
      expect(toQuestionCount(100, 5)).toBe(20);
      expect(toQuestionCount(100000, 5)).toBe(20);
    });

    it("uses fallback for invalid value", () => {
      expect(toQuestionCount("abc", 5)).toBe(5);
    });

    it("parses string count", () => {
      expect(toQuestionCount("7", 5)).toBe(7);
    });
  });

  describe("toLanguage", () => {
    it("returns 'en' for undefined", () => {
      expect(toLanguage(undefined)).toBe("en");
    });

    it("returns 'en' for null", () => {
      expect(toLanguage(null)).toBe("en");
    });

    it("returns 'en' for 'en'", () => {
      expect(toLanguage("en")).toBe("en");
    });

    it("returns 'de' for 'de'", () => {
      expect(toLanguage("de")).toBe("de");
    });

    it("returns null for unsupported language", () => {
      expect(toLanguage("fr")).toBeNull();
      expect(toLanguage("es")).toBeNull();
      expect(toLanguage(123)).toBeNull();
    });
  });

  describe("requireTopicId", () => {
    it("returns the string for valid topic ID", () => {
      expect(requireTopicId("variables")).toBe("variables");
    });

    it("returns null for empty string", () => {
      expect(requireTopicId("")).toBeNull();
    });

    it("returns null for non-string values", () => {
      expect(requireTopicId(undefined)).toBeNull();
      expect(requireTopicId(null)).toBeNull();
      expect(requireTopicId(42)).toBeNull();
    });
  });

  describe("toQuizDifficultyLevel", () => {
    it("returns valid difficulty levels", () => {
      expect(toQuizDifficultyLevel(1)).toBe(1);
      expect(toQuizDifficultyLevel(2)).toBe(2);
      expect(toQuizDifficultyLevel(3)).toBe(3);
    });

    it("clamps to minimum 1", () => {
      expect(toQuizDifficultyLevel(-5)).toBe(1);
      expect(toQuizDifficultyLevel(0)).toBe(1);
    });

    it("clamps to maximum 3", () => {
      expect(toQuizDifficultyLevel(99)).toBe(3);
    });

    it("uses fallback for non-numeric value", () => {
      expect(toQuizDifficultyLevel("abc", 2)).toBe(2);
    });

    it("uses default fallback of 1", () => {
      expect(toQuizDifficultyLevel(undefined)).toBe(1);
    });
  });
});
