import { resolveLanguageFromLocale } from "@/lib/i18n";

describe("resolveLanguageFromLocale", () => {
  it("returns english for english locales", () => {
    expect(resolveLanguageFromLocale("en-US")).toBe("en");
    expect(resolveLanguageFromLocale("en-GB")).toBe("en");
  });

  it("returns german for german locales", () => {
    expect(resolveLanguageFromLocale("de-DE")).toBe("de");
    expect(resolveLanguageFromLocale("de-AT")).toBe("de");
  });

  it("falls back to german for unsupported locales", () => {
    expect(resolveLanguageFromLocale("fr-FR")).toBe("de");
    expect(resolveLanguageFromLocale("es-ES")).toBe("de");
  });

  it("falls back to german when locale is missing", () => {
    expect(resolveLanguageFromLocale(undefined)).toBe("de");
    expect(resolveLanguageFromLocale(null)).toBe("de");
  });
});
