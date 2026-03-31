import type { Locale } from 'expo-localization';
import { getLocales } from 'expo-localization';
import { getDeviceLocale, getPreferredLanguageTag } from '@/lib/device-locale';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(),
}));

const mockGetLocales = getLocales as jest.MockedFunction<typeof getLocales>;

function createLocale(overrides: Partial<Locale>): Locale {
  return {
    languageTag: 'en-US',
    languageCode: 'en',
    languageScriptCode: null,
    regionCode: 'US',
    languageRegionCode: 'US',
    currencyCode: 'USD',
    currencySymbol: '$',
    languageCurrencyCode: 'USD',
    languageCurrencySymbol: '$',
    decimalSeparator: '.',
    digitGroupingSeparator: ',',
    textDirection: 'ltr',
    measurementSystem: 'us',
    temperatureUnit: 'fahrenheit',
    ...overrides,
  };
}

beforeEach(() => {
  mockGetLocales.mockReset();
});

describe('getPreferredLanguageTag', () => {
  it('returns undefined when getLocales returns an empty array', () => {
    mockGetLocales.mockReturnValue(
      [] as unknown as ReturnType<typeof getLocales>
    );
    expect(getPreferredLanguageTag()).toBeUndefined();
  });

  it('returns undefined when getLocales throws', () => {
    mockGetLocales.mockImplementation(() => {
      throw new Error('native error');
    });
    expect(getPreferredLanguageTag()).toBeUndefined();
  });

  it('uses the first preferred locale from expo-localization', () => {
    mockGetLocales.mockReturnValue([
      createLocale({
        languageTag: 'de-DE',
        languageCode: 'de',
        regionCode: 'DE',
        languageRegionCode: 'DE',
        currencyCode: 'EUR',
        currencySymbol: 'EUR',
        languageCurrencyCode: 'EUR',
        languageCurrencySymbol: 'EUR',
        decimalSeparator: ',',
        digitGroupingSeparator: '.',
        measurementSystem: 'metric',
        temperatureUnit: 'celsius',
      }),
    ]);

    expect(getPreferredLanguageTag()).toBe('de-DE');
  });

  it('falls back to the language code when the language tag is missing', () => {
    mockGetLocales.mockReturnValue([
      createLocale({
        languageTag: '',
        languageCode: 'de',
        regionCode: 'DE',
        languageRegionCode: 'DE',
        currencyCode: 'EUR',
        currencySymbol: 'EUR',
        languageCurrencyCode: 'EUR',
        languageCurrencySymbol: 'EUR',
        decimalSeparator: ',',
        digitGroupingSeparator: '.',
        measurementSystem: 'metric',
        temperatureUnit: 'celsius',
      }),
    ]);

    expect(getPreferredLanguageTag()).toBe('de');
  });
});

describe('getDeviceLocale', () => {
  let dateTimeFormatSpy: jest.SpyInstance;

  afterEach(() => {
    dateTimeFormatSpy?.mockRestore();
  });

  it('returns undefined when both sources return nothing', () => {
    mockGetLocales.mockReturnValue(
      [] as unknown as ReturnType<typeof getLocales>
    );
    // Intl.DateTimeFormat is not mocked, but returns the host locale;
    // override it to also fail:
    const spy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('no intl');
    });

    expect(getDeviceLocale()).toBeUndefined();
    spy.mockRestore();
  });

  it('falls back to Intl when expo-localization returns no usable locale', () => {
    mockGetLocales.mockReturnValue([
      createLocale({
        languageTag: '',
        languageCode: '',
      }),
    ]);
    dateTimeFormatSpy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      (() =>
        ({
          resolvedOptions: () => ({ locale: 'de-DE' }),
        }) as Intl.DateTimeFormat) as typeof Intl.DateTimeFormat
    );

    expect(getDeviceLocale()).toBe('de-DE');
  });
});
