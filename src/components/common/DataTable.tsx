import React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  type TableCellProps,
} from '@mui/material';
import { type SxProps, type Theme } from '@mui/material/styles';
import { type SystemStyleObject } from '@mui/system';
import { LinkTableRow } from './linkBehavior';
import { bodyCellStyle, headerCellStyle, scrollbarSx } from '../../theme';
import { type SortOrder } from '../../utils/ExplorerUtils';

export type DataTableColumn<T, SortKey extends string = never> = {
  /**
   * Stable identifier for the column. Must be unique within the `columns`
   * array (used as the React key).
   */
  key: string;
  header: React.ReactNode;
  width?: string | number;
  align?: TableCellProps['align'];
  renderCell: (item: T) => React.ReactNode;
  headerSx?: SystemStyleObject<Theme>;
  cellSx?: SystemStyleObject<Theme> | ((item: T) => SystemStyleObject<Theme>);
  /**
   * Setting this makes the column sortable. The actual "first-click" order
   * for this key lives in the hook (`useDataTableParams.defaultOrderOverrides`);
   * DataTable only renders the hover arrow direction.
   */
  sortKey?: SortKey;
};

export type DataTableSort<SortKey extends string> = {
  field: SortKey;
  order: SortOrder;
  onChange: (nextField: SortKey) => void;
};

export type DataTableProps<T, SortKey extends string = never> = {
  columns: DataTableColumn<T, SortKey>[];
  rows: T[];
  getRowKey: (item: T) => React.Key;
  isLoading?: boolean;
  isError?: boolean;
  errorLabel?: string;
  emptyLabel?: string;
  emptyState?: React.ReactNode;
  minWidth?: number | string;
  /**
   * When set, each row renders as an `<a href>` (native new-tab / middle-click
   * support). NOTE: because the row becomes `<a>`, cells must not contain
   * nested `<a>` elements (invalid HTML). For tables with nested anchors,
   * use `onRowClick` instead.
   */
  getRowHref?: (item: T) => string;
  linkState?: Record<string, unknown>;
  /**
   * Alternative to `getRowHref` — for tables that trigger dialogs, toggle
   * expansion, or render nested `<a>` elements in cells. Ignored when
   * `getRowHref` is provided.
   */
  onRowClick?: (item: T) => void;
  getRowSx?: (item: T) => SystemStyleObject<Theme>;
  header?: React.ReactNode;
  /**
   * Rendered below the table body when rows are present. Use this slot
   * for pagination components (the app uses several styles — pluggable).
   */
  pagination?: React.ReactNode;
  /**
   * Rendered after the table regardless of loading / empty / error state.
   * For summary bars or any controls that should persist across states.
   */
  footer?: React.ReactNode;
  sort?: DataTableSort<SortKey>;
  /**
   * Defaults to false. Sticky header only resolves against a scroll
   * ancestor with a bounded height — the consumer must provide one.
   */
  stickyHeader?: boolean;
  /**
   * MUI table cell padding density. Defaults to 'small' (compact cells —
   * matches the historical look of the leaderboard and search tables).
   * Pass 'medium' for the roomier MUI default (~16px vertical padding).
   */
  size?: 'small' | 'medium';
};

const containerSx: SxProps<Theme> = {
  overflowX: 'auto',
  ...scrollbarSx,
};

/**
 * sx for a sortable column's `TableSortLabel`. Two concerns rolled up:
 *
 *   1. **Right-aligned columns** — MUI puts the sort arrow to the right
 *      of the label, which pushes the text away from the right edge so
 *      the header no longer lines up with right-aligned numeric values
 *      in the body. Flipping to `row-reverse` keeps the text flush right
 *      and parks the icon on the inside.
 *   2. **Keyboard focus visibility** — MUI's default focus outline is
 *      the user-agent ring, which disappears against the dark
 *      `surface.tooltip` header background. Scope an explicit
 *      `:focus-visible` ring to the interactive label only (not the
 *      whole `TableCell`).
 */
export function getSortLabelSx(
  align: TableCellProps['align'],
): SystemStyleObject<Theme> {
  const focusRing = {
    '&:focus-visible': {
      outline: '2px solid',
      outlineColor: 'primary.main',
      outlineOffset: 2,
      borderRadius: 1,
    },
  } as const;
  if (align !== 'right') return focusRing;
  return {
    ...focusRing,
    flexDirection: 'row-reverse',
    '& .MuiTableSortLabel-icon': { ml: 0, mr: 0.5 },
  };
}

const tableSx = {
  tableLayout: 'fixed',
  width: '100%',
} as const;

const clickableRowSx: SxProps<Theme> = (theme) => ({
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: theme.palette.surface.subtle,
  },
});

export const DataTable = <T, SortKey extends string = never>({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  isError = false,
  errorLabel = 'Something went wrong loading this table.',
  emptyLabel = 'No results to display.',
  emptyState,
  minWidth,
  getRowHref,
  linkState,
  onRowClick,
  getRowSx,
  header,
  pagination,
  footer,
  sort,
  stickyHeader = false,
  size = 'small',
}: DataTableProps<T, SortKey>) => {
  const showTable = !isLoading && !isError && rows.length > 0;
  const showEmpty = !isLoading && !isError && rows.length === 0;

  return (
    <>
      {header}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : null}
      {isError && !isLoading ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {errorLabel}
        </Alert>
      ) : null}
      {showEmpty
        ? (emptyState ?? (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary">{emptyLabel}</Typography>
            </Box>
          ))
        : null}
      {showTable ? (
        <>
          <TableContainer sx={containerSx}>
            <Table
              stickyHeader={stickyHeader}
              size={size}
              sx={{ ...tableSx, ...(minWidth ? { minWidth } : {}) }}
            >
              <TableHead>
                <TableRow>
                  {columns.map((column) => {
                    const { sortKey } = column;
                    const isSortable = Boolean(sortKey && sort);
                    const isActive = Boolean(
                      isSortable && sort && sort.field === sortKey,
                    );
                    const ariaSort: TableCellProps['aria-sort'] = isSortable
                      ? isActive && sort
                        ? sort.order === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined;
                    return (
                      <TableCell
                        key={column.key}
                        align={column.align}
                        aria-sort={ariaSort}
                        sx={[
                          headerCellStyle,
                          ...(column.width !== undefined
                            ? [{ width: column.width }]
                            : []),
                          ...(column.headerSx ? [column.headerSx] : []),
                        ]}
                      >
                        {sortKey && sort ? (
                          <TableSortLabel
                            active={isActive}
                            direction={isActive ? sort.order : 'desc'}
                            onClick={() => sort.onChange(sortKey)}
                            sx={getSortLabelSx(column.align)}
                          >
                            {column.header}
                          </TableSortLabel>
                        ) : (
                          column.header
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((item) => {
                  const href = getRowHref?.(item);
                  const customRowSx = getRowSx?.(item);
                  const cells = columns.map((column) => {
                    const customCellSx =
                      typeof column.cellSx === 'function'
                        ? column.cellSx(item)
                        : column.cellSx;
                    return (
                      <TableCell
                        key={column.key}
                        align={column.align}
                        sx={[
                          bodyCellStyle,
                          ...(column.width !== undefined
                            ? [{ width: column.width }]
                            : []),
                          ...(customCellSx ? [customCellSx] : []),
                        ]}
                      >
                        {column.renderCell(item)}
                      </TableCell>
                    );
                  });
                  if (href) {
                    return (
                      <LinkTableRow
                        key={getRowKey(item)}
                        href={href}
                        linkState={linkState}
                        sx={[
                          clickableRowSx,
                          ...(customRowSx ? [customRowSx] : []),
                        ]}
                      >
                        {cells}
                      </LinkTableRow>
                    );
                  }
                  if (onRowClick) {
                    return (
                      <TableRow
                        key={getRowKey(item)}
                        role="button"
                        tabIndex={0}
                        onClick={() => onRowClick(item)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onRowClick(item);
                          }
                        }}
                        sx={[
                          clickableRowSx,
                          ...(customRowSx ? [customRowSx] : []),
                        ]}
                      >
                        {cells}
                      </TableRow>
                    );
                  }
                  return (
                    <TableRow key={getRowKey(item)} sx={customRowSx}>
                      {cells}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {pagination}
        </>
      ) : null}
      {footer}
    </>
  );
};

export default DataTable;
