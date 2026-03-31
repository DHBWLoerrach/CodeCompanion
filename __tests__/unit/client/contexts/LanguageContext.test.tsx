import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { getDeviceLocale } from '@/lib/device-locale';
import { storage } from '@/lib/storage';

jest.mock('@/lib/device-locale', () => ({
  getDeviceLocale: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  storage: {
    hasStoredSettings: jest.fn(),
    getSettings: jest.fn(),
    setSettings: jest.fn(),
  },
}));

const mockGetDeviceLocale = getDeviceLocale as jest.MockedFunction<
  typeof getDeviceLocale
>;
const mockStorage = storage as jest.Mocked<typeof storage>;

function TestConsumer() {
  const { language, isLoading } = useLanguage();

  return <Text>{`${language}:${String(isLoading)}`}</Text>;
}

describe('LanguageProvider', () => {
  beforeEach(() => {
    mockGetDeviceLocale.mockReturnValue('en-US');
    mockStorage.hasStoredSettings.mockResolvedValue(false);
    mockStorage.getSettings.mockResolvedValue({
      language: 'en',
      themeMode: 'auto',
    });
    mockStorage.setSettings.mockResolvedValue(undefined);
  });

  it('uses german on first start when the device locale is german', async () => {
    mockGetDeviceLocale.mockReturnValue('de-DE');

    const screen = render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByText('de:true')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('de:false')).toBeTruthy();
    });

    expect(mockStorage.setSettings).toHaveBeenCalledWith({
      language: 'de',
      themeMode: 'auto',
    });
    expect(mockStorage.setSettings).toHaveBeenCalledTimes(1);
    expect(mockStorage.getSettings).not.toHaveBeenCalled();
  });

  it('uses stored language for returning users', async () => {
    mockGetDeviceLocale.mockReturnValue('de-DE');
    mockStorage.hasStoredSettings.mockResolvedValue(true);
    mockStorage.getSettings.mockResolvedValue({
      language: 'en',
      themeMode: 'auto',
    });

    const screen = render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('en:false')).toBeTruthy();
    });

    expect(mockStorage.setSettings).not.toHaveBeenCalled();
  });

  it('falls back to device locale when storage throws', async () => {
    mockGetDeviceLocale.mockReturnValue('de-DE');
    mockStorage.hasStoredSettings.mockRejectedValue(new Error('storage error'));

    const screen = render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('de:false')).toBeTruthy();
    });
  });

  it('uses english on first start when the device locale is not german', async () => {
    mockGetDeviceLocale.mockReturnValue('fr-FR');

    const screen = render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByText('en:true')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('en:false')).toBeTruthy();
    });

    expect(mockStorage.setSettings).toHaveBeenCalledWith({
      language: 'en',
      themeMode: 'auto',
    });
    expect(mockStorage.setSettings).toHaveBeenCalledTimes(1);
    expect(mockStorage.getSettings).not.toHaveBeenCalled();
  });
});

describe('useLanguage without provider', () => {
  it('returns the device-locale fallback lazily', () => {
    mockGetDeviceLocale.mockReturnValue('de-DE');

    const screen = render(<TestConsumer />);

    expect(screen.getByText('de:false')).toBeTruthy();
    expect(mockStorage.hasStoredSettings).not.toHaveBeenCalled();
    expect(mockStorage.getSettings).not.toHaveBeenCalled();
    expect(mockStorage.setSettings).not.toHaveBeenCalled();
  });
});
