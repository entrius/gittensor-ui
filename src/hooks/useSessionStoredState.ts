import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

// Builds a type guard from a readonly tuple of allowed string literals.
// Pair with `useSessionStoredState` so a stale value from an older build
// (e.g. a removed filter option) falls back to the default cleanly.
export const oneOf =
  <T extends string>(values: readonly T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (values as readonly string[]).includes(v);

// useState backed by sessionStorage. Persists across in-tab navigation
// (detail page → browser Back) without surviving a tab close. The type guard
// runs against parsed JSON so stale values from older builds fall back to
// `fallback` instead of corrupting typed state.
export function useSessionStoredState<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  });

  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          window.sessionStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // sessionStorage unavailable (private mode, quota, etc.) — keep
          // in-memory state and continue without persistence.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
