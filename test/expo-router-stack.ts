import type { ReactNode } from 'react';

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
    Header: (props: { children?: ReactNode }) => {
      onHeader?.(props);
      return null;
    },
  };
}
