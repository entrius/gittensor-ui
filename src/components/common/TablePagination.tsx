/**
 * Miner PRs table pagination: URL-backed page/rows (`prPage` / `prRows`),
 * paging helpers, `useMinerExplorerPagination`, and the shared page bar
 * (Prev / numbers / Next).
 */

import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, alpha, useTheme, useMediaQuery } from '@mui/material';
import { West as WestIcon, East as EastIcon } from '@mui/icons-material';

// --- URL + slice helpers ----------------------------------------------------

/** Allowed numeric page sizes (single source of truth for URL + UI). */
export const MINER_PAGE_SIZES = [5, 10, 20, 50] as const;

export type MinerExplorerNumericRows = (typeof MINER_PAGE_SIZES)[number];
export type MinerExplorerRowsOption = MinerExplorerNumericRows | 'all';

export const MINER_EXPLORER_ROWS_OPTIONS: readonly MinerExplorerRowsOption[] = [
  ...MINER_PAGE_SIZES,
  'all',
];

const PAGE_SIZE_WHITELIST = new Set<number>(MINER_PAGE_SIZES);

export const DEFAULT_MINER_EXPLORER_ROWS: MinerExplorerRowsOption = 20;

export const MINER_EXPLORER_PAGE_PARAM = 'prPage';
export const MINER_EXPLORER_ROWS_PARAM = 'prRows';

export const MINER_EXPLORER_ROWS_SELECT_SX = {
  color: 'text.primary',
  backgroundColor: 'background.default',
  fontSize: '0.8rem',
  height: '36px',
  borderRadius: 2,
  minWidth: '80px',
  '& fieldset': { borderColor: 'border.light' },
  '&:hover fieldset': {
    borderColor: 'border.medium',
  },
  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  '& .MuiSelect-select': { py: 0.75 },
} as const;

export function parseMinerExplorerRowsParam(
  raw: string | null,
): MinerExplorerRowsOption {
  if (raw === 'all') return 'all';
  if (raw == null || raw === '') return DEFAULT_MINER_EXPLORER_ROWS;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return DEFAULT_MINER_EXPLORER_ROWS;
  if (PAGE_SIZE_WHITELIST.has(n)) return n as MinerExplorerNumericRows;
  return DEFAULT_MINER_EXPLORER_ROWS;
}

export function parseMinerExplorerPageParam(raw: string | null): number {
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function getMinerExplorerPaging<T>(
  items: readonly T[],
  page: number,
  rows: MinerExplorerRowsOption,
): {
  totalPages: number;
  safePage: number;
  slice: T[];
  showPageNav: boolean;
} {
  const isAll = rows === 'all';
  const pageSize = isAll ? Math.max(items.length, 1) : rows;
  const totalPages = isAll
    ? 1
    : Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const slice = isAll ? [...items] : items.slice(start, start + pageSize);
  const showPageNav = !isAll && totalPages > 1;
  return { totalPages, safePage, slice, showPageNav };
}

// --- Hook -------------------------------------------------------------------

type UseMinerExplorerPaginationOptions = {
  resetKey?: string;
  totalItemCount: number;
};

export function useMinerExplorerPagination({
  resetKey,
  totalItemCount,
}: UseMinerExplorerPaginationOptions) {
  const [searchParams, setSearchParams] = useSearchParams();

  const rowsPerPage = useMemo(
    () =>
      parseMinerExplorerRowsParam(searchParams.get(MINER_EXPLORER_ROWS_PARAM)),
    [searchParams],
  );

  const page = useMemo(
    () =>
      parseMinerExplorerPageParam(searchParams.get(MINER_EXPLORER_PAGE_PARAM)),
    [searchParams],
  );

  const setPage = useCallback(
    (updater: number | ((prev: number) => number)) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const current = parseMinerExplorerPageParam(
            next.get(MINER_EXPLORER_PAGE_PARAM),
          );
          const resolved =
            typeof updater === 'function' ? updater(current) : updater;
          if (resolved <= 0) next.delete(MINER_EXPLORER_PAGE_PARAM);
          else next.set(MINER_EXPLORER_PAGE_PARAM, String(resolved));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPageRef = useRef(setPage);
  setPageRef.current = setPage;

  const setRowsPerPage = useCallback(
    (nextRows: MinerExplorerRowsOption) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete(MINER_EXPLORER_PAGE_PARAM);
          if (nextRows === DEFAULT_MINER_EXPLORER_ROWS)
            p.delete(MINER_EXPLORER_ROWS_PARAM);
          else p.set(MINER_EXPLORER_ROWS_PARAM, String(nextRows));
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const prevResetKey = useRef(resetKey);
  useEffect(() => {
    if (resetKey === undefined) return;
    if (prevResetKey.current === resetKey) return;
    prevResetKey.current = resetKey;
    setPageRef.current(0);
  }, [resetKey]);

  useEffect(() => {
    const isAll = rowsPerPage === 'all';
    const size = isAll ? Math.max(totalItemCount, 1) : rowsPerPage;
    const totalPages = Math.max(1, Math.ceil(totalItemCount / size));
    const last = totalPages - 1;
    if (page > last) setPageRef.current(last);
  }, [totalItemCount, rowsPerPage, page]);

  return {
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
  };
}

// --- Page bar UI ------------------------------------------------------------

/** Pages shown around current when using ellipsis (1 … 4 5 6 … 20). */
const PAGER_WINDOW_DELTA = 2;
/** Below this many pages, show every page number (no ellipsis). */
const PAGER_FULL_LIST_MAX = PAGER_WINDOW_DELTA * 2 + 5;

const PAGER_BUTTON_RESET = {
  border: 'none',
  background: 'none',
  fontFamily: 'inherit',
  p: 0,
} as const;

function buildPaginationItems(
  currentPageOneBased: number,
  totalPages: number,
  delta = PAGER_WINDOW_DELTA,
): Array<number | 'ellipsis'> {
  if (totalPages <= 1) return [];
  if (totalPages <= PAGER_FULL_LIST_MAX) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (
    let i = Math.max(1, currentPageOneBased - delta);
    i <= Math.min(totalPages, currentPageOneBased + delta);
    i++
  ) {
    pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | 'ellipsis'> = [];
  let prev: number | undefined;
  for (const p of sorted) {
    if (prev !== undefined && p - prev > 1) {
      result.push('ellipsis');
    }
    result.push(p);
    prev = p;
  }
  return result;
}

export interface TablePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

const TablePagination = memo(function TablePagination({
  page,
  totalPages,
  onPageChange,
}: TablePaginationProps) {
  const theme = useTheme();
  const isMobilePager = useMediaQuery(theme.breakpoints.down('sm'));
  const primary = theme.palette.primary.main;
  const activeFg =
    theme.palette.primary.contrastText ?? theme.palette.common.white;
  const items = useMemo(
    () => buildPaginationItems(page + 1, totalPages),
    [page, totalPages],
  );

  const navSx = (enabled: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.25,
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: enabled ? primary : alpha(theme.palette.text.primary, 0.22),
    cursor: enabled ? 'pointer' : 'default',
    userSelect: 'none' as const,
    '&:hover': enabled ? { opacity: 0.88 } : {},
  });

  const outerBarSx = {
    py: 1.5,
    px: 1,
    borderTop: '1px solid',
    borderColor: 'border.subtle',
  } as const;

  if (totalPages <= 1) {
    return null;
  }

  if (isMobilePager) {
    const canPrev = page > 0;
    const canNext = page < totalPages - 1;
    return (
      <Box sx={outerBarSx}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 1,
          }}
        >
          <Box
            component="button"
            type="button"
            aria-label="Previous page"
            onClick={() => canPrev && onPageChange(page - 1)}
            sx={{
              ...navSx(canPrev),
              ...PAGER_BUTTON_RESET,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.35,
              }}
            >
              <WestIcon
                sx={{ fontSize: '1.05rem', color: 'inherit', flexShrink: 0 }}
              />
              Prev
            </Box>
          </Box>

          <Typography
            component="span"
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: 'text.primary',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {page + 1} / {totalPages}
          </Typography>

          <Box
            component="button"
            type="button"
            aria-label="Next page"
            onClick={() => canNext && onPageChange(page + 1)}
            sx={{
              ...navSx(canNext),
              ...PAGER_BUTTON_RESET,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.35,
              }}
            >
              Next
              <EastIcon
                sx={{ fontSize: '1.05rem', color: 'inherit', flexShrink: 0 }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...outerBarSx,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: { xs: 0.75, sm: 1 },
      }}
    >
      <Box
        component="button"
        type="button"
        aria-label="Previous page"
        onClick={() => page > 0 && onPageChange(page - 1)}
        sx={{
          ...navSx(page > 0),
          ...PAGER_BUTTON_RESET,
        }}
      >
        <WestIcon sx={{ fontSize: '1.1rem', color: 'inherit' }} />
        Prev
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.35, sm: 0.5 },
          mx: { xs: 0.5, sm: 1 },
        }}
      >
        {items.map((item, idx) =>
          item === 'ellipsis' ? (
            <Typography
              key={`ellipsis-${idx}`}
              component="span"
              sx={{
                fontSize: '0.8125rem',
                color: alpha(theme.palette.text.primary, 0.45),
                px: 0.25,
                userSelect: 'none',
              }}
            >
              ...
            </Typography>
          ) : (
            <Box
              key={item}
              component="button"
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === page + 1 ? 'page' : undefined}
              onClick={() => onPageChange(item - 1)}
              sx={{
                ...PAGER_BUTTON_RESET,
                minWidth: 36,
                height: 32,
                px: 1,
                borderRadius: 1,
                backgroundColor: item === page + 1 ? primary : 'transparent',
                color: item === page + 1 ? activeFg : 'text.primary',
                fontSize: '0.8125rem',
                fontWeight: item === page + 1 ? 600 : 400,
                cursor: 'pointer',
                lineHeight: 1,
                '&:hover': {
                  backgroundColor:
                    item === page + 1
                      ? primary
                      : alpha(theme.palette.text.primary, 0.06),
                },
              }}
            >
              {item}
            </Box>
          ),
        )}
      </Box>

      <Box
        component="button"
        type="button"
        aria-label="Next page"
        onClick={() => page < totalPages - 1 && onPageChange(page + 1)}
        sx={{
          ...navSx(page < totalPages - 1),
          ...PAGER_BUTTON_RESET,
        }}
      >
        Next
        <EastIcon sx={{ fontSize: '1.1rem', color: 'inherit' }} />
      </Box>
    </Box>
  );
});

export default TablePagination;
