import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SessionSummaryScreen from '@/screens/SessionSummaryScreen';

const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
const mockStackTitle = jest.fn();

let mockCanDismiss = true;
let mockSearchParams: {
  score?: string;
  total?: string;
  topicId?: string;
  topicIds?: string;
  answers?: string;
  count?: string;
  quizMode?: string;
  programmingLanguage?: string;
  returnTo?: string;
} = {
  score: '3',
  total: '5',
  answers: '[]',
  count: '5',
  programmingLanguage: 'javascript',
};

jest.mock('expo-router', () => ({
  Stack: jest
    .requireActual<
      typeof import('../../../test/expo-router-stack')
    >('../../../test/expo-router-stack')
    .createMockExpoRouterStack({
      onTitle: (props) => mockStackTitle(props),
    }),
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({
    replace: mockReplace,
    dismissTo: mockDismissTo,
    canDismiss: () => mockCanDismiss,
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native-svg', () => {
  const ReactModule = require('react');
  return {
    __esModule: true,
    default: ({ children }: { children?: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
    Circle: () => null,
  };
});

jest.mock('@/components/AppIcon', () => ({
  AppIcon: () => null,
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
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
    t: (key: string) => key,
    language: 'en',
    refreshLanguage: jest.fn(),
  }),
}));

describe('SessionSummaryScreen integration', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockDismissTo.mockReset();
    mockStackTitle.mockReset();
    mockCanDismiss = true;
    mockSearchParams = {
      score: '3',
      total: '5',
      answers: '[]',
      count: '5',
      programmingLanguage: 'javascript',
    };
  });

  it('dismisses directly to learn when returning to topics from the modal flow', () => {
    const screen = render(<SessionSummaryScreen />);

    fireEvent.press(screen.getByTestId('summary-back-to-topics-button'));

    expect(mockDismissTo).toHaveBeenCalledWith('/learn');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('returns to practice when the quiz started from the practice tab', () => {
    mockSearchParams = {
      score: '3',
      total: '5',
      answers: '[]',
      count: '5',
      programmingLanguage: 'javascript',
      returnTo: 'practice',
    };

    const screen = render(<SessionSummaryScreen />);

    expect(screen.getByText('backToPractice')).toBeTruthy();

    fireEvent.press(screen.getByTestId('summary-back-to-topics-button'));

    expect(mockDismissTo).toHaveBeenCalledWith('/practice');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('replaces to learn when no dismiss context exists', () => {
    mockCanDismiss = false;

    const screen = render(<SessionSummaryScreen />);

    fireEvent.press(screen.getByTestId('summary-back-to-topics-button'));

    expect(mockReplace).toHaveBeenCalledWith('/learn');
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it('replays explore quizzes with the same topic pool', () => {
    mockSearchParams = {
      score: '3',
      total: '5',
      answers: '[]',
      count: '5',
      programmingLanguage: 'javascript',
      quizMode: 'explore',
      returnTo: 'practice',
      topicIds: 'operators,null-undefined,strings-template-literals',
    };

    const screen = render(<SessionSummaryScreen />);

    expect(screen.getAllByText('exploreQuiz')).toHaveLength(2);

    fireEvent.press(screen.getByTestId('summary-practice-again-button'));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/quiz-session',
      params: {
        count: '5',
        programmingLanguage: 'javascript',
        quizMode: 'explore',
        returnTo: 'practice',
        topicIds: 'operators,null-undefined,strings-template-literals',
      },
    });
  });
});
