import React from 'react';
import { Box } from '@mui/material';
import { type CommitLog } from '../../api/models/Dashboard';
import { getGithubAvatarSrc } from '../../utils';
import SearchResultsTable, {
  type SearchResultsTableColumn,
} from './SearchResultsTable';
import {
  SearchAvatarContentCell,
  SearchTruncatedText,
} from './SearchTableCells';

const formatPrScore = (pr: CommitLog) => {
  if (pr.prState === 'CLOSED' && !pr.mergedAt) return '-';
  if (!pr.score) return '-';

  return Number(pr.score).toFixed(4);
};

const formatPrDateOrStatus = (pr: CommitLog) => {
  if (pr.mergedAt) return new Date(pr.mergedAt).toLocaleDateString();
  if (pr.prState === 'CLOSED') return 'Closed';
  return 'Open';
};

const prColumns: SearchResultsTableColumn<CommitLog>[] = [
  {
    key: 'prNumber',
    header: 'PR #',
    width: 96,
    renderCell: (pr: CommitLog) => `#${pr.pullRequestNumber}`,
    cellSx: {
      fontWeight: 600,
    },
  },
  {
    key: 'title',
    header: 'Title',
    width: '40%',
    renderCell: (pr: CommitLog) => {
      const prTitle = pr.pullRequestTitle || 'Untitled pull request';

      return (
        <SearchTruncatedText
          tooltip={prTitle}
          sx={(theme) => ({
            fontFamily: theme.typography.mono.fontFamily,
            color: theme.palette.text.primary,
          })}
          text={prTitle}
        />
      );
    },
  },
  {
    key: 'repository',
    header: 'Repository',
    width: '20%',
    renderCell: (pr: CommitLog) => {
      const repositoryOwner = pr.repository.split('/')[0];

      return (
        <SearchAvatarContentCell
          avatarAlt={repositoryOwner}
          avatarSrc={getGithubAvatarSrc(repositoryOwner)}
        >
          <SearchTruncatedText
            tooltip={pr.repository}
            sx={(theme) => ({
              color: theme.palette.text.primary,
              fontWeight: 600,
            })}
            text={pr.repository}
          />
        </SearchAvatarContentCell>
      );
    },
  },
  {
    key: 'delta',
    header: '+/-',
    width: '12%',
    align: 'right',
    renderCell: (pr: CommitLog) => (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box
          component="span"
          sx={(theme) => ({
            color: theme.palette.diff.additions,
            fontFamily: theme.typography.mono.fontFamily,
          })}
        >
          +{pr.additions || 0}
        </Box>
        <Box
          component="span"
          sx={(theme) => ({
            color: theme.palette.diff.deletions,
            fontFamily: theme.typography.mono.fontFamily,
          })}
        >
          -{pr.deletions || 0}
        </Box>
      </Box>
    ),
  },
  {
    key: 'score',
    header: 'Score',
    width: '12%',
    align: 'right',
    renderCell: (pr: CommitLog) => formatPrScore(pr),
    cellSx: {
      fontWeight: 600,
    },
  },
  {
    key: 'date',
    header: 'Date',
    width: '14%',
    align: 'right',
    renderCell: (pr: CommitLog) => formatPrDateOrStatus(pr),
    cellSx: {
      color: 'text.secondary',
    },
  },
];

type PullRequestsTabProps = {
  isError: boolean;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onSelectPr: (repository: string, pullRequestNumber: number) => void;
  page: number;
  paginatedPrResults: CommitLog[];
  prResults: CommitLog[];
  rowsPerPage: number;
  rowsPerPageOptions: number[];
};

const PullRequestsTab: React.FC<PullRequestsTabProps> = ({
  isError,
  isLoading,
  onPageChange,
  onRowsPerPageChange,
  onSelectPr,
  page,
  paginatedPrResults,
  prResults,
  rowsPerPage,
  rowsPerPageOptions,
}) => (
  <SearchResultsTable
    columns={prColumns}
    emptyLabel="No pull request matches."
    errorLabel="Failed to load pull requests for search."
    getRowKey={(pr: CommitLog) => `${pr.repository}-${pr.pullRequestNumber}`}
    isError={isError}
    isLoading={isLoading}
    minWidth={960}
    onPageChange={onPageChange}
    onRowClick={(pr: CommitLog) =>
      onSelectPr(pr.repository, pr.pullRequestNumber)
    }
    onRowsPerPageChange={onRowsPerPageChange}
    page={page}
    rows={paginatedPrResults}
    rowsPerPage={rowsPerPage}
    rowsPerPageOptions={rowsPerPageOptions}
    totalCount={prResults.length}
  />
);

export default PullRequestsTab;
