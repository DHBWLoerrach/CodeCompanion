export function getParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getParamWithDefault(
  value: string | string[] | undefined,
  defaultValue: string,
): string {
  return getParam(value) || defaultValue;
}
