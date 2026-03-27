import { getLocales } from "expo-localization";

function getLocaleFromIntl(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

export function getPreferredLanguageTag(): string | undefined {
  try {
    const primaryLocale = getLocales()[0];

    if (
      typeof primaryLocale?.languageTag === "string" &&
      primaryLocale.languageTag.length > 0
    ) {
      return primaryLocale.languageTag;
    }

    if (
      typeof primaryLocale?.languageCode === "string" &&
      primaryLocale.languageCode.length > 0
    ) {
      return primaryLocale.languageCode;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export function getDeviceLocale(): string | undefined {
  return getPreferredLanguageTag() ?? getLocaleFromIntl();
}
