import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type SortOrder } from '../utils/ExplorerUtils';

type ParamKeys = {
  sort: string;
  order: string;
  page: string;
  rowsPerPage: string;
};

const DEFAULT_PARAM_KEYS: ParamKeys = {
  sort: 'sort',
  order: 'dir',
  page: 'page',
  rowsPerPage: 'rows',
};

/**
 * Configuration for an additional URL-backed filter (search, enum, etc.)
 * that should be co-located with the table's sort/pagination state.
 */
export type FilterConfig<T> = {
  parse: (raw: string | null) => T;
  /** Return `null` to delete the param (used for "default" values). */
  serialize: (value: T) => string | null;
  /** URL parameter name. Defaults to the filter's key in the `filters` map. */
  paramKey?: string;
  /**
   * When true (default), changing this filter deletes the `page` slot —
   * appropriate for filters that change the result set. Set to `false`
   * for preferences like view mode that shouldn't reset pagination.
   */
  resetPageOnChange?: boolean;
};

export type UseDataTableParamsConfig<
  SortKey extends string,
  Filters extends Record<string, unknown> = Record<string, never>,
> = {
  sortKeys: readonly SortKey[];
  defaultSortKey: SortKey;
  defaultSortOrder?: SortOrder;
  // Per-field override for the order applied the first time a column becomes
  // active — string columns often feel natural ascending, numeric descending.
  defaultOrderOverrides?: Partial<Record<SortKey, SortOrder>>;
  defaultRowsPerPage?: number;
  rowsPerPageOptions?: readonly number[];
  // Override URL parameter names. Useful when multiple tables coexist on the
  // same page (e.g. prefix with the table name).
  paramKeys?: Partial<ParamKeys>;
  /**
   * Additional URL-backed filters beyond sort/pagination. Each entry
   * provides `parse` / `serialize` so the hook stays type-safe.
   */
  filters?: { [K in keyof Filters]: FilterConfig<Filters[K]> };
};

export type UseDataTableParamsResult<
  SortKey extends string,
  Filters extends Record<string, unknown> = Record<string, never>,
> = {
  sortField: SortKey;
  sortOrder: SortOrder;
  page: number;
  rowsPerPage: number;
  setSort: (field: SortKey) => void;
  setPage: (page: number) => void;
  setRowsPerPage: (rowsPerPage: number) => void;
  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
};

const parseSortField = <K extends string>(
  value: string | null,
  sortKeys: readonly K[],
  defaultKey: K,
): K => {
  if (value && (sortKeys as readonly string[]).includes(value)) {
    return value as K;
  }
  return defaultKey;
};

const parseSortOrder = (
  value: string | null,
  fallback: SortOrder,
): SortOrder => {
  if (value === 'asc') return 'asc';
  if (value === 'desc') return 'desc';
  return fallback;
};

const parsePage = (value: string | null): number => {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const parseRowsPerPage = (
  value: string | null,
  defaultRowsPerPage: number,
  options?: readonly number[],
): number => {
  if (!value) return defaultRowsPerPage;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultRowsPerPage;
  if (options && !options.includes(parsed)) return defaultRowsPerPage;
  return parsed;
};

const computeNextSort = <K extends string>(
  currentField: K,
  currentOrder: SortOrder,
  nextField: K,
  orderFor: (field: K) => SortOrder,
): { field: K; order: SortOrder } => {
  if (currentField === nextField) {
    return {
      field: nextField,
      order: currentOrder === 'asc' ? 'desc' : 'asc',
    };
  }
  return { field: nextField, order: orderFor(nextField) };
};

// ---------- Hook ----------

export const useDataTableParams = <
  SortKey extends string,
  Filters extends Record<string, unknown> = Record<string, never>,
>({
  sortKeys,
  defaultSortKey,
  defaultSortOrder = 'desc',
  defaultOrderOverrides,
  defaultRowsPerPage = 25,
  rowsPerPageOptions,
  paramKeys: paramKeysOverride,
  filters: filtersConfig,
}: UseDataTableParamsConfig<SortKey, Filters>): UseDataTableParamsResult<
  SortKey,
  Filters
> => {
  const [searchParams, setSearchParams] = useSearchParams();

  const paramKeys = useMemo<ParamKeys>(
    () => ({ ...DEFAULT_PARAM_KEYS, ...paramKeysOverride }),
    [paramKeysOverride],
  );

  const orderFor = useCallback(
    (field: SortKey): SortOrder =>
      defaultOrderOverrides?.[field] ?? defaultSortOrder,
    [defaultOrderOverrides, defaultSortOrder],
  );

  const sortField = useMemo(
    () =>
      parseSortField(
        searchParams.get(paramKeys.sort),
        sortKeys,
        defaultSortKey,
      ),
    [searchParams, paramKeys.sort, sortKeys, defaultSortKey],
  );

  const sortOrder = useMemo(
    () =>
      parseSortOrder(searchParams.get(paramKeys.order), orderFor(sortField)),
    [searchParams, paramKeys.order, orderFor, sortField],
  );

  const page = useMemo(
    () => parsePage(searchParams.get(paramKeys.page)),
    [searchParams, paramKeys.page],
  );

  const rowsPerPage = useMemo(
    () =>
      parseRowsPerPage(
        searchParams.get(paramKeys.rowsPerPage),
        defaultRowsPerPage,
        rowsPerPageOptions,
      ),
    [
      searchParams,
      paramKeys.rowsPerPage,
      defaultRowsPerPage,
      rowsPerPageOptions,
    ],
  );

  // Re-compute on every render. Parsers may be inline functions (non-stable
  // refs), so memoising on filtersConfig wouldn't help. The work is cheap —
  // URLSearchParams reads plus caller-supplied parse calls.
  const filters = useMemo(() => {
    const result: Record<string, unknown> = {};
    if (filtersConfig) {
      for (const key of Object.keys(filtersConfig) as (keyof Filters)[]) {
        const config = filtersConfig[key];
        const paramKey = config.paramKey ?? (key as string);
        result[key as string] = config.parse(searchParams.get(paramKey));
      }
    }
    return result as Filters;
  }, [searchParams, filtersConfig]);

  const setSort = useCallback(
    (nextField: SortKey) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const currentField = parseSortField(
            prev.get(paramKeys.sort),
            sortKeys,
            defaultSortKey,
          );
          const currentOrder = parseSortOrder(
            prev.get(paramKeys.order),
            orderFor(currentField),
          );
          const nextSort = computeNextSort(
            currentField,
            currentOrder,
            nextField,
            orderFor,
          );

          if (nextSort.field === defaultSortKey) next.delete(paramKeys.sort);
          else next.set(paramKeys.sort, nextSort.field);

          if (nextSort.order === orderFor(nextSort.field))
            next.delete(paramKeys.order);
          else next.set(paramKeys.order, nextSort.order);

          // Sort change resets the current page slot.
          next.delete(paramKeys.page);

          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, paramKeys, sortKeys, defaultSortKey, orderFor],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextPage <= 0) next.delete(paramKeys.page);
          else next.set(paramKeys.page, String(nextPage));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, paramKeys.page],
  );

  const setRowsPerPage = useCallback(
    (nextRowsPerPage: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextRowsPerPage === defaultRowsPerPage)
            next.delete(paramKeys.rowsPerPage);
          else next.set(paramKeys.rowsPerPage, String(nextRowsPerPage));
          // Row size change invalidates the current page index.
          next.delete(paramKeys.page);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, paramKeys, defaultRowsPerPage],
  );

  const setFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      if (!filtersConfig) return;
      const config = filtersConfig[key];
      const filterParamKey = config.paramKey ?? (key as string);
      const resetPage = config.resetPageOnChange ?? true;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const serialized = config.serialize(value);
          if (serialized === null) next.delete(filterParamKey);
          else next.set(filterParamKey, serialized);
          if (resetPage) next.delete(paramKeys.page);
          return next;
        },
        { replace: true },
      );
    },
    [filtersConfig, setSearchParams, paramKeys.page],
  );

  return {
    sortField,
    sortOrder,
    page,
    rowsPerPage,
    setSort,
    setPage,
    setRowsPerPage,
    filters,
    setFilter,
  };
};
