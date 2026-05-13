import { useEffect, useState } from 'react';

/** Default delay for client-side search / filter inputs (ms). */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Returns `value` after it has stayed unchanged for `delayMs`.
 * The first render mirrors `value` immediately.
 */
export function useDebouncedValue<T>(
  value: T,
  delayMs: number = SEARCH_DEBOUNCE_MS,
): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
