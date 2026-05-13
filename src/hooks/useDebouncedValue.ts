import { useEffect, useState } from 'react';

const DEFAULT_DEBOUNCE_MS = 250;

export const useDebouncedValue = <T>(
  value: T,
  delayMs = DEFAULT_DEBOUNCE_MS,
): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
};
