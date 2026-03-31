import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Index from '../../../app/index';

const mockHasSeenWelcome = jest.fn();
const mockUseLanguage = jest.fn();
const mockUseProgrammingLanguage = jest.fn();

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>{href}</Text>;
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

jest.mock('@/contexts/ProgrammingLanguageContext', () => ({
  useProgrammingLanguage: () => mockUseProgrammingLanguage(),
}));

jest.mock('@/lib/storage', () => ({
  storage: {
    hasSeenWelcome: (...args: unknown[]) => mockHasSeenWelcome(...args),
  },
}));

describe('Index screen routing', () => {
  beforeEach(() => {
    mockHasSeenWelcome.mockReset();
    mockUseLanguage.mockReset();
    mockUseProgrammingLanguage.mockReset();

    mockUseLanguage.mockReturnValue({
      isLoading: false,
    });
    mockUseProgrammingLanguage.mockReturnValue({
      isLoading: false,
      isLanguageSelected: false,
    });
  });

  it('redirects first-time users to welcome', async () => {
    mockHasSeenWelcome.mockResolvedValue(false);

    const screen = render(<Index />);

    await waitFor(() => {
      expect(screen.getByText('/welcome')).toBeTruthy();
    });
  });

  it('redirects returning users without a selected language to language select', async () => {
    mockHasSeenWelcome.mockResolvedValue(true);

    const screen = render(<Index />);

    await waitFor(() => {
      expect(screen.getByText('/language-select')).toBeTruthy();
    });
  });

  it('redirects returning users with a selected language to learn', async () => {
    mockHasSeenWelcome.mockResolvedValue(true);
    mockUseProgrammingLanguage.mockReturnValue({
      isLoading: false,
      isLanguageSelected: true,
    });

    const screen = render(<Index />);

    await waitFor(() => {
      expect(screen.getByText('/learn')).toBeTruthy();
    });
  });
});
