import React from 'react';
import { Platform } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

import {
  SettingsToolbar,
  __resetSettingsToolbarIconForTests,
} from '@/components/SettingsToolbar';

const mockPush = jest.fn();
const mockToolbarButton = jest.fn();
const mockGetImageSource = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Toolbar: Object.assign(
      ({ children }: { children?: React.ReactNode }) => children,
      {
        Button: (props: Record<string, unknown>) => {
          mockToolbarButton(props);
          return null;
        },
      }
    ),
  },
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@react-native-vector-icons/feather', () => ({
  Feather: {
    getImageSource: (...args: unknown[]) => mockGetImageSource(...args),
  },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: { tabIconDefault: '#687076' } }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function lastButtonProps() {
  return mockToolbarButton.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

describe('SettingsToolbar', () => {
  const originalPlatform = Platform.OS;

  function setPlatform(os: typeof Platform.OS) {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
  }

  beforeEach(() => {
    __resetSettingsToolbarIconForTests();
    mockPush.mockReset();
    mockToolbarButton.mockReset();
    mockGetImageSource.mockReset();
  });

  afterAll(() => {
    setPlatform(originalPlatform);
  });

  it('uses an SF Symbol on iOS and opens settings', async () => {
    setPlatform('ios');

    await render(<SettingsToolbar />);

    const props = lastButtonProps();
    expect(props.icon).toBe('gearshape');
    expect(props.hidden).toBe(false);
    expect(props.accessibilityLabel).toBe('settings');
    expect(mockGetImageSource).not.toHaveBeenCalled();

    await act(async () => {
      (props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('hides the Android button until the Feather icon image is ready', async () => {
    setPlatform('android');
    const source = { uri: 'file:///settings.png', width: 24, height: 24 };
    mockGetImageSource.mockResolvedValue(source);

    await render(<SettingsToolbar />);

    await waitFor(() => {
      expect(lastButtonProps().icon).toEqual(source);
    });
    expect(lastButtonProps().hidden).toBe(false);
    expect(mockToolbarButton.mock.calls[0][0]).toEqual(
      expect.objectContaining({ hidden: true, icon: undefined })
    );
    expect(mockGetImageSource).toHaveBeenCalledWith('settings', 24, 'white');
  });

  it('falls back to a text label on Android when the icon cannot be rendered', async () => {
    setPlatform('android');
    mockGetImageSource.mockRejectedValue(new Error('render failed'));

    await render(<SettingsToolbar />);

    await waitFor(() => {
      expect(lastButtonProps().hidden).toBe(false);
    });
    expect(lastButtonProps().icon).toBeUndefined();
    expect(lastButtonProps().children).toBe('settings');
  });
});
