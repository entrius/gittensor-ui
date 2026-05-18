import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type DependencyList,
} from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Parse a 1-based page number from the URL into a 0-based index for
 * `TablePagination` and slice math. Missing or invalid values → first page (0).
 */
export const parseUrlPageParam = (raw: string | null): number => {
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 0;
  return n - 1;
};

/** Parse a plain non-negative integer (not page numbering). */
export const parseUrlNonNegativeInt = (raw: string | null): number => {
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Serialize a 0-based page index to a 1-based URL value, or `null` for page 1. */
export const serializeUrlPageParam = (zeroBasedPage: number): string | null => {
  const clamped = Number.isFinite(zeroBasedPage)
    ? Math.floor(zeroBasedPage)
    : 0;
  if (clamped <= 0) return null;
  return String(clamped + 1);
};

export type UrlPaginationRowsConfig = {
  /** Query key for page size (e.g. `rows`, `langRows`). */
  paramName: string;
  allowed: readonly number[];
  defaultRows: number;
  /** When true (default), drop the rows param when it equals `defaultRows`. */
  omitWhenDefault?: boolean;
  /** When true (default), changing rows deletes the page param. */
  resetPageOnRowsChange?: boolean;
};

/** Options when only the page index is synced (no `rows` in the URL). */
export type UrlPaginationPageOnlyOptions = {
  pageParam?: string;
};

export type UrlPaginationOptionsWithRows = UrlPaginationPageOnlyOptions & {
  rows: UrlPaginationRowsConfig;
};

type SetPage = (next: number | ((prev: number) => number)) => void;
type SetRows = (next: number) => void;

function parseRowsFromUrl(
  raw: string | null,
  allowed: readonly number[],
  defaultRows: number,
): number {
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && (allowed as readonly number[]).includes(n)) {
    return n;
  }
  return defaultRows;
}

export function useUrlPaginationParam(
  options: UrlPaginationOptionsWithRows,
): readonly [number, SetPage, number, SetRows];

export function useUrlPaginationParam(
  options: UrlPaginationPageOnlyOptions,
): readonly [number, SetPage];

export function useUrlPaginationParam(
  paramName?: string,
): readonly [number, SetPage];

export function useUrlPaginationParam(
  paramNameOrOptions?:
    | string
    | UrlPaginationPageOnlyOptions
    | UrlPaginationOptionsWithRows,
): readonly [number, SetPage] | readonly [number, SetPage, number, SetRows] {
  const normalized: UrlPaginationPageOnlyOptions & {
    rows?: UrlPaginationRowsConfig;
  } =
    typeof paramNameOrOptions === 'string' || paramNameOrOptions === undefined
      ? { pageParam: paramNameOrOptions ?? 'page' }
      : paramNameOrOptions;

  const pageParam = normalized.pageParam ?? 'page';
  const rowsConfig = normalized.rows;

  const [searchParams, setSearchParams] = useSearchParams();

  const page = useMemo(
    () => parseUrlPageParam(searchParams.get(pageParam)),
    [searchParams, pageParam],
  );

  const setPage = useCallback(
    (next: number | ((prev: number) => number)) => {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          const current = parseUrlPageParam(nextParams.get(pageParam));
          const resolved = typeof next === 'function' ? next(current) : next;
          const clamped =
            Number.isFinite(resolved) && resolved >= 0
              ? Math.floor(resolved)
              : 0;
          const serialized = serializeUrlPageParam(clamped);
          if (serialized === null) nextParams.delete(pageParam);
          else nextParams.set(pageParam, serialized);
          return nextParams;
        },
        { replace: true },
      );
    },
    [pageParam, setSearchParams],
  );

  const rowsParamName = rowsConfig?.paramName;
  const rowsAllowed = rowsConfig?.allowed;
  const rowsDefault = rowsConfig?.defaultRows;
  const omitWhenDefault = rowsConfig?.omitWhenDefault ?? true;
  const resetPageOnRowsChange = rowsConfig?.resetPageOnRowsChange ?? true;

  const rowsPerPage = useMemo(() => {
    if (!rowsParamName || !rowsAllowed || rowsDefault === undefined) return 0;
    return parseRowsFromUrl(
      searchParams.get(rowsParamName),
      rowsAllowed,
      rowsDefault,
    );
  }, [searchParams, rowsParamName, rowsAllowed, rowsDefault]);

  const setRowsPerPage = useCallback(
    (next: number) => {
      if (!rowsParamName || !rowsAllowed || rowsDefault === undefined) return;
      if (!(rowsAllowed as readonly number[]).includes(next)) return;
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          if (omitWhenDefault && next === rowsDefault)
            nextParams.delete(rowsParamName);
          else nextParams.set(rowsParamName, String(next));
          if (resetPageOnRowsChange) nextParams.delete(pageParam);
          return nextParams;
        },
        { replace: true },
      );
    },
    [
      pageParam,
      rowsParamName,
      rowsAllowed,
      rowsDefault,
      omitWhenDefault,
      resetPageOnRowsChange,
      setSearchParams,
    ],
  );

  if (rowsConfig) {
    return [page, setPage, rowsPerPage, setRowsPerPage] as const;
  }
  return [page, setPage] as const;
}

/**
 * Resets pagination when `deps` change, but not on the initial mount — so a
 * reload with `?prsPage=3` keeps the URL page intact.
 */
export function useResetPageOnDepsChange(
  setPage: SetPage,
  deps: DependencyList,
): void {
  const isFirstRenderRef = useRef(true);
  const prevDepsRef = useRef<DependencyList | null>(null);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevDepsRef.current = deps;
      return;
    }
    const prev = prevDepsRef.current;
    prevDepsRef.current = deps;
    if (prev === null) return;
    const changed = deps.some((dep, index) => !Object.is(dep, prev[index]));
    if (changed) {
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps
  }, deps);
}

/**
 * Clamps an out-of-range page after data is ready. Skips while `ready` is false
 * so an empty loading state does not wipe a deep-linked page from the URL.
 */
export function useClampUrlPage(
  page: number,
  setPage: SetPage,
  totalPages: number,
  ready: boolean,
): void {
  useEffect(() => {
    if (!ready || totalPages < 1) return;
    const maxIndex = totalPages - 1;
    if (page > maxIndex) {
      setPage(maxIndex);
    }
  }, [page, setPage, totalPages, ready]);
}
