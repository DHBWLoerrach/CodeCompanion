import { resolveLanguageFromLocale } from '@/lib/i18n';

describe('resolveLanguageFromLocale', () => {
  it('returns english for english locales', () => {
    expect(resolveLanguageFromLocale('en-US')).toBe('en');
    expect(resolveLanguageFromLocale('en-GB')).toBe('en');
  });

  it('returns german for german locales', () => {
    expect(resolveLanguageFromLocale('de-DE')).toBe('de');
    expect(resolveLanguageFromLocale('de-AT')).toBe('de');
  });

  it('falls back to english for non-german locales', () => {
    expect(resolveLanguageFromLocale('fr-FR')).toBe('en');
    expect(resolveLanguageFromLocale('es-ES')).toBe('en');
  });

  it('falls back to english when locale is missing', () => {
    expect(resolveLanguageFromLocale(undefined)).toBe('en');
    expect(resolveLanguageFromLocale(null)).toBe('en');
  });
});
