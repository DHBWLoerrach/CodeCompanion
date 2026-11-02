import { createElement, Fragment, type ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

interface MockToolbarButtonProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  hidden?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

// Renders Stack.Toolbar items as plain pressables so tests can press them by
// accessibility label, mirroring how VoiceOver/TalkBack and Maestro find them.
const Toolbar = Object.assign(
  ({ children }: { children?: ReactNode }) =>
    createElement(Fragment, null, children),
  {
    Button: ({
      accessibilityLabel,
      children,
      hidden,
      disabled,
      onPress,
    }: MockToolbarButtonProps) =>
      hidden
        ? null
        : createElement(
            Pressable,
            {
              accessibilityLabel,
              accessibilityRole: 'button',
              disabled,
              onPress,
            },
            typeof children === 'string'
              ? createElement(Text, null, children)
              : null
          ),
  }
);

interface MockStackCallbacks {
  onScreen?: (props: { options?: Record<string, unknown> }) => void;
  onTitle?: (props: { children?: ReactNode }) => void;
  onBackButton?: (props: { hidden?: boolean }) => void;
  onHeader?: (props: { children?: ReactNode }) => void;
}

export function createMockExpoRouterStack({
  onScreen,
  onTitle,
  onBackButton,
  onHeader,
}: MockStackCallbacks = {}) {
  const Screen = Object.assign(
    (props: { options?: Record<string, unknown> }) => {
      onScreen?.(props);
      return null;
    },
    {
      Title: (props: { children?: ReactNode }) => {
        onTitle?.(props);
        return null;
      },
      BackButton: (props: { hidden?: boolean }) => {
        onBackButton?.(props);
        return null;
      },
    }
  );

  return {
    Screen,
    Toolbar,
    Header: (props: { children?: ReactNode }) => {
      onHeader?.(props);
      return null;
    },
  };
}
