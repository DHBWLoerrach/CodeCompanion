import type { ComponentProps } from 'react';
import React from 'react';
import { Stack } from 'expo-router';

import { ProgrammingLanguageHeaderTitle } from '@/components/ProgrammingLanguageHeaderTitle';
import { type LanguageFlowReturnTarget } from '@/lib/language-flow';

type StackScreenOptions = ComponentProps<typeof Stack.Screen>['options'];

// The settings action is rendered natively via <SettingsToolbar /> in each screen.
const HEADER_OPTIONS_BY_TARGET: Record<
  LanguageFlowReturnTarget,
  StackScreenOptions
> = {
  '/learn': {
    headerLeft: () => <ProgrammingLanguageHeaderTitle returnTo="/learn" />,
    headerTitle: '',
  },
  '/practice': {
    headerLeft: () => <ProgrammingLanguageHeaderTitle returnTo="/practice" />,
    headerTitle: '',
  },
  '/progress': {
    headerLeft: () => <ProgrammingLanguageHeaderTitle returnTo="/progress" />,
    headerTitle: '',
  },
};

export function getProgrammingLanguageHeaderOptions(
  returnTo: LanguageFlowReturnTarget
): StackScreenOptions {
  return HEADER_OPTIONS_BY_TARGET[returnTo];
}
