export const readEnumParam = <T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
  defaultValue: T,
): T => {
  const raw = params.get(key);
  if (raw && (allowed as readonly string[]).includes(raw)) {
    return raw as T;
  }
  return defaultValue;
};

export const writeEnumParam = <T extends string>(
  prev: URLSearchParams,
  key: string,
  value: T,
  defaultValue: T,
): URLSearchParams => {
  const next = new URLSearchParams(prev);
  if (value === defaultValue) {
    next.delete(key);
  } else {
    next.set(key, value);
  }
  return next;
};
