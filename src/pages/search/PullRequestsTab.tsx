import React from 'react';
import { Chip } from '@mui/material';
import { type CommitLog } from '../../api/models/Dashboard';
import { WatchlistButton } from '../../components/common';
import { getGithubAvatarSrc } from '../../utils';
import {
  type DataTableColumn,
  type DataTableSort,
} from '../../components/common/DataTable';
import { serializePRKey } from '../../hooks/useWatchlist';
import { STATUS_COLORS } from '../../theme';
import { isClosedUnmergedPr, isMergedPr } from '../../utils/prStatus';
import SearchResultsCard from './SearchResultsCard';
import { type PrSearchSortKey } from './searchSort';
import {
  SearchAvatarContentCell,
  SearchTruncatedText,
} from './SearchTableCells';

const formatPrScore = (pr: CommitLog) => {
  if (pr.prState === 'CLOSED' && !pr.mergedAt) return '-';
  if (!pr.score) return '-';

  return parseFloat(pr.score).toFixed(4);
};

/** Matches Watchlist PR table `prStatusMeta` + status `Chip` styling. */
const prStatusMeta = (pr: CommitLog) => {
  const merged = isMergedPr(pr);
  const closed = isClosedUnmergedPr(pr);
  const label = merged ? 'MERGED' : closed ? 'CLOSED' : 'OPEN';
  const color = merged
    ? STATUS_COLORS.merged
    : closed
      ? STATUS_COLORS.closed
      : STATUS_COLORS.open;
  return { label, color };
};

const prColumns: DataTableColumn<CommitLog, PrSearchSortKey>[] = [
  {
    key: 'prNumber',
    header: 'PR',
    width: 96,
    sortKey: 'prNumber',
    renderCell: (pr: CommitLog) => `#${pr.pullRequestNumber}`,
    cellSx: {
      fontWeight: 600,
    },
  },
  {
    key: 'title',
    header: 'Title',
    width: '40%',
    sortKey: 'title',
    renderCell: (pr: CommitLog) => {
      const prTitle = pr.pullRequestTitle || 'Untitled pull request';

      return (
        <SearchTruncatedText
          tooltip={prTitle}
          sx={(theme) => ({
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
    width: '23%',
    sortKey: 'repository',
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
    key: 'author',
    header: 'Author',
    width: '13%',
    sortKey: 'author',
    renderCell: (pr: CommitLog) => (
      <SearchAvatarContentCell
        avatarAlt={pr.author}
        avatarSrc={getGithubAvatarSrc(pr.author)}
      >
        <SearchTruncatedText
          tooltip={pr.author}
          sx={(theme) => ({
            color: theme.palette.text.primary,
          })}
          text={pr.author || '-'}
        />
      </SearchAvatarContentCell>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: '11%',
    align: 'center',
    sortKey: 'status',
    renderCell: (pr: CommitLog) => {
      const { label, color } = prStatusMeta(pr);
      return (
        <Chip
          variant="status"
          label={label}
          sx={{ color, borderColor: color }}
        />
      );
    },
  },
  {
    key: 'score',
    header: 'Score',
    width: '10%',
    align: 'right',
    sortKey: 'score',
    renderCell: (pr: CommitLog) => formatPrScore(pr),
    cellSx: {
      fontWeight: 600,
    },
  },
  {
    key: 'watch',
    header: '★',
    width: 52,
    align: 'center',
    cellSx: { p: 0 },
    renderCell: (pr: CommitLog) => (
      <WatchlistButton
        category="prs"
        itemKey={serializePRKey(pr.repository, pr.pullRequestNumber)}
        size="small"
      />
    ),
  },
];

type PullRequestsTabProps = {
  isError: boolean;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  getPrHref: (pr: CommitLog) => string;
  linkState?: Record<string, unknown>;
  page: number;
  paginatedPrResults: CommitLog[];
  prResults: CommitLog[];
  rowsPerPage: number;
  rowsPerPageOptions: number[];
  sort: DataTableSort<PrSearchSortKey>;
};

const PullRequestsTab: React.FC<PullRequestsTabProps> = ({
  isError,
  isLoading,
  onPageChange,
  onRowsPerPageChange,
  getPrHref,
  linkState,
  page,
  paginatedPrResults,
  prResults,
  rowsPerPage,
  rowsPerPageOptions,
  sort,
}) => (
  <SearchResultsCard
    columns={prColumns}
    emptyLabel="No pull request matches."
    errorLabel="Failed to load pull requests for search."
    getRowKey={(pr: CommitLog) => `${pr.repository}-${pr.pullRequestNumber}`}
    isError={isError}
    isLoading={isLoading}
    minWidth={1120}
    onPageChange={onPageChange}
    getRowHref={getPrHref}
    linkState={linkState}
    onRowsPerPageChange={onRowsPerPageChange}
    page={page}
    rows={paginatedPrResults}
    rowsPerPage={rowsPerPage}
    rowsPerPageOptions={rowsPerPageOptions}
    sort={sort}
    totalCount={prResults.length}
  />
);

export default PullRequestsTab;
