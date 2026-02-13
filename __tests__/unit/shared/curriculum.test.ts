import {
  getAllCurricula,
  getCurriculumByLanguage,
  getLocalizedText,
  getTopicById,
  getTopicIdsByLanguage,
  isValidTopicId,
} from "@shared/curriculum";

describe("shared/curriculum", () => {
  it("loads all supported curricula", () => {
    const curricula = getAllCurricula();
    expect(curricula.map((curriculum) => curriculum.languageId)).toEqual([
      "javascript",
      "python",
      "java",
    ]);
  });

  it("provides required localized language metadata", () => {
    const curricula = getAllCurricula();
    for (const curriculum of curricula) {
      expect(curriculum.languageName.en.length).toBeGreaterThan(0);
      expect(curriculum.languageName.de.length).toBeGreaterThan(0);
      expect(curriculum.shortName).toMatch(/^[A-Z]{2}$/);
      expect(curriculum.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("keeps categories and topics sorted by order", () => {
    const python = getCurriculumByLanguage("python");
    const categoryOrders = python.categories.map((category) => category.order);
    expect(categoryOrders).toEqual([...categoryOrders].sort((a, b) => a - b));

    for (const category of python.categories) {
      const topicOrders = category.topics.map((topic) => topic.order);
      expect(topicOrders).toEqual([...topicOrders].sort((a, b) => a - b));
    }
  });

  it("exposes topic lookup and validation helpers", () => {
    expect(isValidTopicId("javascript", "variables")).toBe(true);
    expect(isValidTopicId("python", "variables")).toBe(false);
    expect(isValidTopicId("python", "variables-assignment")).toBe(true);
    expect(isValidTopicId("java", "variables-constants")).toBe(true);
    expect(isValidTopicId("java", "variables")).toBe(false);

    expect(getTopicById("python", "type-hints")?.id).toBe("type-hints");
    expect(getTopicById("java", "does-not-exist")).toBeUndefined();
  });

  it("returns deterministic topic IDs by language", () => {
    const javascriptTopicIds = getTopicIdsByLanguage("javascript");
    expect(javascriptTopicIds[0]).toBe("variables");
    expect(javascriptTopicIds[javascriptTopicIds.length - 1]).toBe("modules");

    const javaTopicIds = getTopicIdsByLanguage("java");
    expect(javaTopicIds[0]).toBe("variables-constants");
    expect(javaTopicIds[javaTopicIds.length - 1]).toBe("concurrency-basics");
  });

  it("resolves localized text with english fallback", () => {
    const text = { en: "English", de: "Deutsch" };
    expect(getLocalizedText(text, "de")).toBe("Deutsch");
    expect(getLocalizedText(text, "en")).toBe("English");
  });
});
