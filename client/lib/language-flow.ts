import { getParam } from '@/lib/router-utils';

export type LanguageFlowOrigin = 'settings';
export type LanguageOverviewMode = 'view';

export function getLanguageFlowOrigin(
  value: string | string[] | undefined
): LanguageFlowOrigin | undefined {
  return getParam(value) === 'settings' ? 'settings' : undefined;
}

export function getLanguageOverviewMode(
  value: string | string[] | undefined
): LanguageOverviewMode | undefined {
  return getParam(value) === 'view' ? 'view' : undefined;
}
