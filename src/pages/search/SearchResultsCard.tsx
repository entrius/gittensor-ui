import React from 'react';
import { Card, TablePagination } from '@mui/material';
import { type SxProps, type Theme } from '@mui/material/styles';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';

/**
 * Search-results pattern wrapper: bordered Card around `DataTable` plus the
 * MUI page-based `TablePagination` in the pagination slot. The 4 search tabs
 * share this exact shape; keeping the wrapper here avoids duplicating it in
 * each tab.
 */

type SearchResultsCardProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  totalCount: number;
  emptyLabel: string;
  errorLabel: string;
  getRowKey: (item: T) => React.Key;
  isError: boolean;
  isLoading: boolean;
  minWidth: number;
  getRowHref?: (item: T) => string;
  linkState?: Record<string, unknown>;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  page: number;
  rowsPerPage: number;
  rowsPerPageOptions: number[];
};

const cardSx: SxProps<Theme> = (theme) => ({
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.border.light}`,
  borderRadius: 3,
  overflow: 'hidden',
  // Original SearchResultsTable used `py: 1.5` (12px) on every cell;
  // restore that spacing on top of DataTable's `size="small"` default.
  '& .MuiTableCell-root': { py: 1.5 },
});

const paginationSx: SxProps<Theme> = (theme) => ({
  borderTop: `1px solid ${theme.palette.border.light}`,
  color: theme.palette.text.secondary,
  '.MuiTablePagination-toolbar': {
    minHeight: 48,
  },
});

const SearchResultsCard = <T,>({
  columns,
  rows,
  totalCount,
  emptyLabel,
  errorLabel,
  getRowKey,
  isError,
  isLoading,
  minWidth,
  getRowHref,
  linkState,
  onPageChange,
  onRowsPerPageChange,
  page,
  rowsPerPage,
  rowsPerPageOptions,
}: SearchResultsCardProps<T>) => (
  <Card elevation={0} sx={cardSx}>
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={getRowKey}
      isLoading={isLoading}
      isError={isError}
      errorLabel={errorLabel}
      emptyLabel={emptyLabel}
      minWidth={minWidth}
      getRowHref={getRowHref}
      linkState={linkState}
      pagination={
        totalCount > 0 ? (
          <TablePagination
            component="div"
            count={totalCount}
            labelRowsPerPage="Rows"
            page={page}
            onPageChange={(_event, newPage) => onPageChange(newPage)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
            onRowsPerPageChange={(event) =>
              onRowsPerPageChange(parseInt(event.target.value, 10))
            }
            showFirstButton
            showLastButton
            sx={paginationSx}
          />
        ) : null
      }
    />
  </Card>
);

export default SearchResultsCard;
