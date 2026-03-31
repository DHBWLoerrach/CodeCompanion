import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import TopicExplanationScreen from '@/screens/TopicExplanationScreen';
import { getTopicExplanation } from '@shared/explanations';

const mockTranslate = (key: string) => key;
let mockSearchParams: { topicId?: string; programmingLanguage?: string } = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({
    replace: jest.fn(),
    dismiss: jest.fn(),
    back: jest.fn(),
    canDismiss: () => false,
    canGoBack: () => false,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/components/AppIcon', () => ({
  AppIcon: () => null,
}));

jest.mock('react-native-enriched-markdown', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return {
    EnrichedMarkdownText: ({ markdown }: { markdown: string }) =>
      ReactModule.createElement(Text, null, markdown),
  };
});

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    refreshTheme: jest.fn(),
    theme: {
      primary: '#E2001A',
      secondary: '#4A90E2',
      success: '#34C759',
      accent: '#FFB800',
      error: '#E2001A',
      text: '#111111',
      tabIconDefault: '#666666',
      backgroundDefault: '#FFFFFF',
      backgroundRoot: '#FFFFFF',
      cardBorder: '#DDDDDD',
      codeBackground: '#F7F7F7',
      disabled: '#CCCCCC',
      buttonText: '#FFFFFF',
      onColor: '#FFFFFF',
      link: '#4A90E2',
      backgroundSecondary: '#F0F0F0',
      backgroundTertiary: '#EBEBEB',
      cardBorderSubtle: '#DDDDDD',
      separator: 'rgba(0, 0, 0, 0.08)',
    },
  }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: mockTranslate,
    language: 'en',
    refreshLanguage: jest.fn(),
  }),
}));

jest.mock('@shared/explanations', () => ({
  getTopicExplanation: jest.fn(),
}));

const mockGetTopicExplanation = jest.mocked(getTopicExplanation);

describe('TopicExplanationScreen integration', () => {
  beforeEach(() => {
    mockGetTopicExplanation.mockReset();
    mockSearchParams = {
      topicId: 'variables',
      programmingLanguage: 'javascript',
    };
  });

  it('renders static explanations without issuing a network request', async () => {
    mockGetTopicExplanation.mockReturnValue('## Static explanation');

    const screen = render(<TopicExplanationScreen />);

    await waitFor(() => {
      expect(screen.getByText('## Static explanation')).toBeTruthy();
    });
  });

  it('shows a static unavailable message when no explanation exists', async () => {
    mockGetTopicExplanation.mockReturnValue(undefined);

    const screen = render(<TopicExplanationScreen />);

    await waitFor(() => {
      expect(screen.getByText('explanationUnavailable')).toBeTruthy();
    });
  });
});
