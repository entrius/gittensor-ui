/**
 * Persist last-selected UI tabs in localStorage (per browser profile).
 * Used when the URL does not specify a tab.
 */

export function readStoredTab(storageKey: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function writeStoredTab(storageKey: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // ignore quota / private mode
  }
}
