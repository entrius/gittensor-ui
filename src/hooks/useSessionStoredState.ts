import { useCallback, useEffect, useState } from 'react';

/**
 * useState backed by sessionStorage so the value survives unmount/remount
 * (e.g. navigating to a detail page and back) but resets between sessions.
 *
 * `isValid` guards against stale or corrupt values from older builds.
 */
export const useSessionStoredState = <T>(
  storageKey: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): [T, (value: T) => void] => {
  const read = useCallback((): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      return isValid(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }, [storageKey, fallback, isValid]);

  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* ignore (private mode, quota) */
    }
  }, [storageKey, value]);

  return [value, setValue];
};
