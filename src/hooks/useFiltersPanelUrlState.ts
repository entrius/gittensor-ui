import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Query key for collapsible filter toolbars in sidebars (leaderboard miners,
 * bounties page, watchlist tabs). Matches `useDataTableParams` filtersOpen in
 * TopMinersTable.
 */
export const FILTERS_PANEL_QUERY_PARAM = 'filters';

export const parseFiltersPanelOpen = (raw: string | null): boolean =>
  raw === 'open' || raw === 'true';

export const serializeFiltersPanelOpen = (value: boolean): string | null =>
  value ? 'open' : null;

export function useFiltersPanelOpenInUrl(): readonly [
  open: boolean,
  setOpen: (next: boolean) => void,
] {
  const [searchParams, setSearchParams] = useSearchParams();
  const open = useMemo(
    () => parseFiltersPanelOpen(searchParams.get(FILTERS_PANEL_QUERY_PARAM)),
    [searchParams],
  );
  const setOpen = useCallback(
    (next: boolean) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          const serialized = serializeFiltersPanelOpen(next);
          if (serialized != null) {
            p.set(FILTERS_PANEL_QUERY_PARAM, serialized);
          } else {
            p.delete(FILTERS_PANEL_QUERY_PARAM);
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  return [open, setOpen] as const;
}
