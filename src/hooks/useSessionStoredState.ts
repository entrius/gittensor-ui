import { useCallback, useState } from 'react';

function readSessionValue<T>(
  storageKey: string,
  defaultValue: T,
  isValid: (value: unknown) => value is T,
): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw === null || raw === '') return defaultValue;
    const parsed: unknown = JSON.parse(raw);
    if (isValid(parsed)) return parsed;
  } catch {
    // malformed JSON or parse errors
  }
  return defaultValue;
}

function writeSessionValue<T>(storageKey: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // quota / private mode
  }
}

/**
 * `useState`-shaped API backed by `sessionStorage`. Values survive component
 * unmount/remount (e.g. navigating to a detail page and pressing browser Back)
 * until the browser tab is closed.
 *
 * @param isValid — Reject stale or manually edited storage so older builds
 *                  cannot deserialize into an invalid shape.
 */
export function useSessionStoredState<T>(
  storageKey: string,
  defaultValue: T,
  isValid: (value: unknown) => value is T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() =>
    readSessionValue(storageKey, defaultValue, isValid),
  );

  const setStoredState = useCallback(
    (action: React.SetStateAction<T>) => {
      setState((prev) => {
        const next =
          typeof action === 'function'
            ? (action as (previous: T) => T)(prev)
            : action;
        writeSessionValue(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  return [state, setStoredState];
}
