import React from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { type UseQueryResult } from '@tanstack/react-query';

export type QueryBranch = 'loading' | 'error' | 'empty' | 'data';

type MinimalQueryResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
};

// Pure branch selector, exposed for unit testing. Determines which of the four
// UI branches a query result should render, using the same precedence the
// component uses: loading > error > empty > data.
export const selectQueryBranch = <T,>(
  query: MinimalQueryResult<T>,
  isEmpty?: (data: T) => boolean,
): QueryBranch => {
  if (query.isLoading) return 'loading';
  if (query.isError) return 'error';
  if (query.data === undefined || query.data === null) return 'empty';
  if (isEmpty && isEmpty(query.data)) return 'empty';
  return 'data';
};

type QueryBoundaryProps<T> = {
  query: UseQueryResult<T>;
  children: (data: T) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: unknown) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  isEmpty?: (data: T) => boolean;
};

const centeredBoxSx = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '50vh',
  flexDirection: 'column' as const,
  gap: 2,
};

const DefaultLoading: React.FC = () => (
  <Box sx={centeredBoxSx}>
    <CircularProgress />
  </Box>
);

const DefaultError: React.FC<{ error: unknown }> = ({ error }) => (
  <Box sx={centeredBoxSx}>
    <Alert severity="error">
      {error instanceof Error && error.message
        ? error.message
        : 'Something went wrong while loading this page.'}
    </Alert>
  </Box>
);

const DefaultEmpty: React.FC = () => (
  <Box sx={centeredBoxSx}>
    <Typography variant="h6" color="text.secondary">
      No data available
    </Typography>
  </Box>
);

export function QueryBoundary<T>({
  query,
  children,
  renderLoading,
  renderError,
  renderEmpty,
  isEmpty,
}: QueryBoundaryProps<T>): React.ReactElement {
  const branch = selectQueryBranch(query, isEmpty);

  if (branch === 'loading') {
    return <>{renderLoading ? renderLoading() : <DefaultLoading />}</>;
  }
  if (branch === 'error') {
    return (
      <>
        {renderError ? (
          renderError(query.error)
        ) : (
          <DefaultError error={query.error} />
        )}
      </>
    );
  }
  if (branch === 'empty') {
    return <>{renderEmpty ? renderEmpty() : <DefaultEmpty />}</>;
  }
  return <>{children(query.data as T)}</>;
}

export default QueryBoundary;
