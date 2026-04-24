import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'tab:';

function readStored<T extends string>(
  key: string,
  valid: readonly T[],
): T | null {
  try {
    const v = localStorage.getItem(key);
    if (v !== null && (valid as readonly string[]).includes(v)) return v as T;
  } catch {
    // localStorage unavailable (SSR, private-mode restrictions, etc.)
  }
  return null;
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore write failures silently.
  }
}

function resolve<T extends string>(
  key: string,
  validTabs: readonly T[],
  urlValue?: string | null,
): T {
  // 1. URL param always wins — also refreshes the stored preference so that
  //    a direct link (e.g. ?tab=activity) becomes the new "remembered" tab.
  if (urlValue && (validTabs as readonly string[]).includes(urlValue)) {
    writeStored(key, urlValue);
    return urlValue as T;
  }
  // 2. Stored preference (validated against the current tab list).
  const stored = readStored(key, validTabs);
  if (stored !== null) return stored;
  // 3. Hard fallback.
  return validTabs[0];
}

/**
 * Persists the most-recently-selected tab in `localStorage` so each
 * multi-tab page remembers the user's "home tab" across reloads and
 * browser sessions, without requiring any user action.
 *
 * Priority (highest → lowest):
 *  1. `urlValue` — the raw tab value from the URL (always wins; also saves
 *     the choice, so direct links teach the preference).
 *  2. Stored `localStorage` value, validated against the current `validTabs`
 *     list (guards against stale / renamed tabs).
 *  3. `validTabs[0]` as the hard fallback.
 *
 * Cross-tab sync: if the user selects a different tab in another browser
 * window the active tab in this window updates automatically via the
 * `storage` event.
 *
 * @param storageKey  A stable, unique key per page/mode
 *                    (e.g. `'miner-details-prs'`, `'pr-details'`)
 * @param validTabs   All valid tab identifiers for this page/mode. Define
 *                    this array **outside** the component (module-level const)
 *                    so its reference is stable across renders.
 * @param urlValue    The raw tab string from the URL query param; pass
 *                    `undefined` or omit for purely state-driven pages.
 * @returns           `[activeTab, persistTab]` — call `persistTab(tab)`
 *                    whenever the user selects a new tab.
 */
export function usePersistedTab<T extends string>(
  storageKey: string,
  validTabs: readonly T[],
  urlValue?: string | null,
): [T, (tab: T) => void] {
  const key = `${STORAGE_PREFIX}${storageKey}`;

  const [tab, setTab] = useState<T>(() => resolve(key, validTabs, urlValue));

  // Re-sync when the URL value changes (back/forward navigation, direct links).
  // `validTabs` is intentionally omitted from deps — it must be a stable
  // module-level const; including it would fire on every render for inline arrays.
  useEffect(() => {
    setTab(resolve(key, validTabs, urlValue));
  }, [key, urlValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync selections made in other browser windows / tabs.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== key || !e.newValue) return;
      if ((validTabs as readonly string[]).includes(e.newValue)) {
        setTab(e.newValue as T);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, validTabs]);

  const persistTab = useCallback(
    (next: T) => {
      writeStored(key, next);
      setTab(next);
    },
    [key],
  );

  return [tab, persistTab];
}
