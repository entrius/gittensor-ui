import React from 'react';
import {
  Alert,
  Box,
  Card,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  type TableCellProps,
} from '@mui/material';
import { type SxProps, type Theme } from '@mui/material/styles';
import { type SystemStyleObject } from '@mui/system';
import { scrollbarSx } from '../../theme';

export type SearchResultsTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  width?: string | number;
  align?: TableCellProps['align'];
  renderCell: (item: T) => React.ReactNode;
  headerSx?: SystemStyleObject<Theme>;
  cellSx?: SystemStyleObject<Theme> | ((item: T) => SystemStyleObject<Theme>);
};

type SearchResultsTableProps<T> = {
  columns: SearchResultsTableColumn<T>[];
  rows: T[];
  totalCount: number;
  emptyLabel: string;
  errorLabel: string;
  getRowKey: (item: T) => React.Key;
  isError: boolean;
  isLoading: boolean;
  minWidth: number;
  onRowClick?: (item: T) => void;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  page: number;
  rowsPerPage: number;
  rowsPerPageOptions: number[];
};

const searchHeaderCellSx: SxProps<Theme> = (theme) => ({
  ...theme.typography.tableHeader,
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.border.light}`,
  backgroundColor: theme.palette.background.paper,
  py: 1.5,
});

const searchBodyCellSx: SxProps<Theme> = (theme) => ({
  fontFamily: theme.typography.mono.fontFamily,
  fontSize: '0.85rem',
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.border.subtle}`,
  py: 1.5,
});

const searchClickableRowSx: SxProps<Theme> = (theme) => ({
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.surface.subtle,
  },
});

const searchTableCardSx = (theme: Theme) => ({
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.border.light}`,
  borderRadius: 3,
  overflow: 'hidden',
});

const searchTableContainerSx = {
  overflowX: 'auto',
  ...scrollbarSx,
};

const searchTableSx = {
  tableLayout: 'fixed',
  width: '100%',
};

const searchTablePaginationSx = (theme: Theme) => ({
  borderTop: `1px solid ${theme.palette.border.light}`,
  color: theme.palette.text.secondary,
  '.MuiTablePagination-displayedRows': {
    fontFamily: theme.typography.mono.fontFamily,
  },
  '.MuiTablePagination-toolbar': {
    minHeight: 48,
  },
});

const SearchResultsTable = <T,>({
  columns,
  rows,
  totalCount,
  emptyLabel,
  errorLabel,
  getRowKey,
  isError,
  isLoading,
  minWidth,
  onRowClick,
  onPageChange,
  onRowsPerPageChange,
  page,
  rowsPerPage,
  rowsPerPageOptions,
}: SearchResultsTableProps<T>) => (
  <Card elevation={0} sx={searchTableCardSx}>
    {isLoading && (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )}
    {isError && !isLoading && (
      <Alert severity="error" sx={{ m: 2 }}>
        {errorLabel}
      </Alert>
    )}
    {!isLoading && !isError && totalCount === 0 ? (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">{emptyLabel}</Typography>
      </Box>
    ) : null}
    {!isLoading && !isError && totalCount > 0 ? (
      <>
        <TableContainer sx={searchTableContainerSx}>
          <Table stickyHeader size="small" sx={{ ...searchTableSx, minWidth }}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    align={column.align}
                    sx={[
                      searchHeaderCellSx,
                      ...(column.width !== undefined
                        ? [{ width: column.width }]
                        : []),
                      ...(column.headerSx ? [column.headerSx] : []),
                    ]}
                  >
                    {column.header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((item) => (
                <TableRow
                  key={getRowKey(item)}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  sx={onRowClick ? searchClickableRowSx : undefined}
                >
                  {columns.map((column) => {
                    const customCellSx =
                      typeof column.cellSx === 'function'
                        ? column.cellSx(item)
                        : column.cellSx;

                    return (
                      <TableCell
                        key={column.key}
                        align={column.align}
                        sx={[
                          searchBodyCellSx,
                          ...(column.width !== undefined
                            ? [{ width: column.width }]
                            : []),
                          ...(customCellSx ? [customCellSx] : []),
                        ]}
                      >
                        {column.renderCell(item)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
          sx={searchTablePaginationSx}
        />
      </>
    ) : null}
  </Card>
);

export default SearchResultsTable;
