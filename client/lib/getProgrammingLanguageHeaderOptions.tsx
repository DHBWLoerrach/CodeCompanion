import type { ComponentProps } from 'react';
import React from 'react';
import { Stack } from 'expo-router';

import { ProgrammingLanguageHeaderTitle } from '@/components/ProgrammingLanguageHeaderTitle';
import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { type LanguageFlowReturnTarget } from '@/lib/language-flow';

type StackScreenOptions = ComponentProps<typeof Stack.Screen>['options'];

const HEADER_OPTIONS_BY_TARGET: Record<
  LanguageFlowReturnTarget,
  StackScreenOptions
> = {
  '/learn': {
    headerLeft: () => <ProgrammingLanguageHeaderTitle returnTo="/learn" />,
    headerTitle: '',
    headerRight: () => <SettingsHeaderButton iconSize={17} />,
  },
  '/practice': {
    headerLeft: () => <ProgrammingLanguageHeaderTitle returnTo="/practice" />,
    headerTitle: '',
    headerRight: () => <SettingsHeaderButton iconSize={17} />,
  },
  '/progress': {
    headerLeft: () => <ProgrammingLanguageHeaderTitle returnTo="/progress" />,
    headerTitle: '',
    headerRight: () => <SettingsHeaderButton iconSize={17} />,
  },
};

export function getProgrammingLanguageHeaderOptions(
  returnTo: LanguageFlowReturnTarget
): StackScreenOptions {
  return HEADER_OPTIONS_BY_TARGET[returnTo];
}
