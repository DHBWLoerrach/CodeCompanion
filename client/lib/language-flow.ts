import { getParam } from '@/lib/router-utils';

export type LanguageFlowOrigin = 'settings' | 'header';
export type LanguageOverviewMode = 'view';
export type LanguageFlowReturnTarget = '/learn' | '/practice' | '/progress';

export function getLanguageFlowOrigin(
  value: string | string[] | undefined
): LanguageFlowOrigin | undefined {
  const origin = getParam(value);

  if (origin === 'settings' || origin === 'header') {
    return origin;
  }

  return undefined;
}

export function getLanguageOverviewMode(
  value: string | string[] | undefined
): LanguageOverviewMode | undefined {
  return getParam(value) === 'view' ? 'view' : undefined;
}

export function getLanguageFlowReturnTarget(
  value: string | string[] | undefined
): LanguageFlowReturnTarget | undefined {
  const returnTarget = getParam(value);

  if (
    returnTarget === '/learn' ||
    returnTarget === '/practice' ||
    returnTarget === '/progress'
  ) {
    return returnTarget;
  }

  return undefined;
}
