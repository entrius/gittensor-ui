import { type Theme } from '@mui/material/styles';

export const headerCellSx = (theme: Theme) => ({
  ...theme.typography.tableHeader,
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.border.light}`,
  py: 1.5,
});

export const bodyCellSx = (theme: Theme) => ({
  fontFamily: theme.typography.mono.fontFamily,
  fontSize: '0.85rem',
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.border.subtle}`,
  py: 1.5,
});

export const tableCardSx = (theme: Theme) => ({
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.border.light}`,
  borderRadius: 3,
  overflow: 'hidden',
});

export const tableContainerSx = (theme: Theme) => ({
  overflowX: 'auto',
  '&::-webkit-scrollbar': {
    height: 8,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: theme.palette.surface.subtle,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.border.light,
    borderRadius: 1,
  },
});

export const tableSx = {
  tableLayout: 'fixed',
  width: '100%',
} as const;

export const tablePaginationSx = (theme: Theme) => ({
  borderTop: `1px solid ${theme.palette.border.light}`,
  color: theme.palette.text.secondary,
  '.MuiTablePagination-displayedRows': {
    fontFamily: theme.typography.mono.fontFamily || theme.typography.fontFamily,
  },
  '.MuiTablePagination-toolbar': {
    minHeight: 48,
  },
});

export const clickableRowSx = (theme: Theme) => ({
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.surface.subtle,
  },
});
