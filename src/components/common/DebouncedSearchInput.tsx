import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  SEARCH_DEBOUNCE_MS,
  useDebouncedValue,
} from '../../hooks/useDebouncedValue';

export type DebouncedSearchDraft = {
  draftValue: string;
  setDraftValue: React.Dispatch<React.SetStateAction<string>>;
};

export const DebouncedSearchDraftContext =
  createContext<DebouncedSearchDraft | null>(null);

export function useDebouncedSearchDraft(): DebouncedSearchDraft {
  const ctx = useContext(DebouncedSearchDraftContext);
  if (!ctx) {
    throw new Error(
      'useDebouncedSearchDraft must be used under DebouncedSearchInput',
    );
  }
  return ctx;
}

export type DebouncedSearchInputProps = {
  initialDraft?: string;
  debounceMs?: number;
  onDebouncedChange: (value: string) => void;
  children: React.ReactNode | ((args: DebouncedSearchDraft) => React.ReactNode);
};

/**
 * Holds the search typing buffer in isolated local state so each keystroke
 * does not re-render heavy parents. The parent should only store the string
 * passed to `onDebouncedChange` (after `debounceMs` of stability).
 *
 * Use either the render-prop form `children({ draftValue, setDraftValue })`
 * or plain `children` with `useDebouncedSearchDraft()` (e.g. split Portal /
 * Popover fields that must share one draft).
 */
export function DebouncedSearchInput({
  initialDraft = '',
  debounceMs = SEARCH_DEBOUNCE_MS,
  onDebouncedChange,
  children,
}: DebouncedSearchInputProps) {
  const [draftValue, setDraftValue] = useState(initialDraft);
  const debounced = useDebouncedValue(draftValue, debounceMs);
  const didInitInitialRef = useRef(false);
  const skipInitialDebouncedSyncRef = useRef(true);

  useEffect(() => {
    if (!didInitInitialRef.current) {
      didInitInitialRef.current = true;
      return;
    }
    setDraftValue(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    // Parent tables already hydrate filters from the URL; firing on mount would
    // call setFilter with the same value and (before the no-op guard) reset page.
    if (skipInitialDebouncedSyncRef.current) {
      skipInitialDebouncedSyncRef.current = false;
      return;
    }
    onDebouncedChange(debounced);
  }, [debounced, onDebouncedChange]);

  const draftBag = useMemo(
    () => ({ draftValue, setDraftValue }),
    [draftValue, setDraftValue],
  );

  const inner = typeof children === 'function' ? children(draftBag) : children;

  return (
    <DebouncedSearchDraftContext.Provider value={draftBag}>
      {inner}
    </DebouncedSearchDraftContext.Provider>
  );
}
