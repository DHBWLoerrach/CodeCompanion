import { getDeviceLanguage, resolveLanguageFromLocale } from "@/lib/i18n";

describe("i18n locale helpers", () => {
  it("maps German locales to de", () => {
    expect(resolveLanguageFromLocale("de-DE")).toBe("de");
    expect(resolveLanguageFromLocale("de-AT")).toBe("de");
  });

  it("falls back to en for unsupported locales", () => {
    expect(resolveLanguageFromLocale("fr-FR")).toBe("en");
    expect(resolveLanguageFromLocale(undefined)).toBe("en");
  });

  it("reads the device locale from Intl", () => {
    const dateTimeFormatSpy = jest.spyOn(Intl, "DateTimeFormat");
    dateTimeFormatSpy.mockImplementation(
      () =>
        ({
          resolvedOptions: () => ({ locale: "de-CH" }),
        }) as unknown as Intl.DateTimeFormat,
    );

    expect(getDeviceLanguage()).toBe("de");

    dateTimeFormatSpy.mockRestore();
  });
});
