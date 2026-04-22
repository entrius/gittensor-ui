import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { getRankColors } from '../../components/leaderboard/types';
import { getGithubAvatarSrc } from '../../utils';
import { type DataTableColumn } from '../../components/common/DataTable';
import SearchResultsCard from './SearchResultsCard';
import {
  SearchAvatarContentCell,
  SearchTruncatedText,
} from './SearchTableCells';
import { type RepoSearchData } from './searchData';

const getRankBadgeSx = (theme: Theme, rank: number) => {
  const rankAccentColor = rank <= 3 ? getRankColors(rank).color : null;

  return {
    backgroundColor: theme.palette.background.default,
    borderRadius: 0.5,
    minWidth: 22,
    height: 22,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    px: 0.75,
    border: '1px solid',
    borderColor: rankAccentColor
      ? alpha(rankAccentColor, 0.4)
      : theme.palette.border.light,
    boxShadow: rankAccentColor
      ? `0 0 12px ${alpha(rankAccentColor, 0.4)}, 0 0 4px ${alpha(rankAccentColor, 0.2)}`
      : 'none',
  };
};

const getPositiveValueCellSx = (value: number) => ({
  fontWeight: 600,
  color: value > 0 ? 'text.primary' : 'text.secondary',
});

const repositoryColumns: DataTableColumn<RepoSearchData>[] = [
  {
    key: 'rank',
    header: 'Rank',
    width: 56,
    renderCell: (repo: RepoSearchData) => (
      <Box sx={(theme) => getRankBadgeSx(theme, repo.rank)}>
        <Typography
          component="span"
          sx={(theme) => ({
            color:
              (repo.rank <= 3 ? getRankColors(repo.rank).color : null) ||
              theme.palette.text.secondary,

            fontSize: '0.65rem',
            fontWeight: 600,
            lineHeight: 1,
          })}
        >
          {repo.rank}
        </Typography>
      </Box>
    ),
  },
  {
    key: 'repository',
    header: 'Repository',
    width: '38%',
    renderCell: (repo: RepoSearchData) => (
      <SearchAvatarContentCell
        avatarAlt={repo.owner}
        avatarSrc={getGithubAvatarSrc(repo.owner)}
      >
        <SearchTruncatedText
          tooltip={repo.fullName}
          sx={(theme) => ({
            color: theme.palette.text.primary,
            fontWeight: 600,
          })}
          text={repo.fullName}
        />
      </SearchAvatarContentCell>
    ),
  },
  {
    key: 'weight',
    header: 'Weight',
    width: '14%',
    align: 'right',
    renderCell: (repo: RepoSearchData) => repo.weight.toFixed(2),
    cellSx: {
      fontWeight: 600,
    },
  },
  {
    key: 'totalScore',
    header: 'Total Score',
    width: '16%',
    align: 'right',
    renderCell: (repo: RepoSearchData) =>
      repo.totalScore > 0 ? repo.totalScore.toFixed(2) : '-',
    cellSx: (repo: RepoSearchData) => getPositiveValueCellSx(repo.totalScore),
  },
  {
    key: 'prs',
    header: 'PRs',
    width: '12%',
    align: 'right',
    renderCell: (repo: RepoSearchData) =>
      repo.totalPRs > 0 ? repo.totalPRs : '-',
    cellSx: (repo: RepoSearchData) => getPositiveValueCellSx(repo.totalPRs),
  },
  {
    key: 'contributors',
    header: 'Contributors',
    width: '12%',
    align: 'right',
    renderCell: (repo: RepoSearchData) =>
      repo.contributors > 0 ? repo.contributors : '-',
    cellSx: (repo: RepoSearchData) => getPositiveValueCellSx(repo.contributors),
  },
];

type RepositoryTabProps = {
  isError: boolean;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  getRepositoryHref: (repo: RepoSearchData) => string;
  linkState?: Record<string, unknown>;
  page: number;
  paginatedRepositoryResults: RepoSearchData[];
  rowsPerPage: number;
  rowsPerPageOptions: number[];
  repositoryResults: RepoSearchData[];
};

const RepositoryTab: React.FC<RepositoryTabProps> = ({
  isError,
  isLoading,
  onPageChange,
  onRowsPerPageChange,
  getRepositoryHref,
  linkState,
  page,
  paginatedRepositoryResults,
  rowsPerPage,
  rowsPerPageOptions,
  repositoryResults,
}) => (
  <SearchResultsCard
    columns={repositoryColumns}
    emptyLabel="No repository matches."
    errorLabel="Failed to load repositories for search."
    getRowKey={(repo: RepoSearchData) => repo.fullName}
    isError={isError}
    isLoading={isLoading}
    minWidth={1000}
    onPageChange={onPageChange}
    getRowHref={getRepositoryHref}
    linkState={linkState}
    onRowsPerPageChange={onRowsPerPageChange}
    page={page}
    rows={paginatedRepositoryResults}
    rowsPerPage={rowsPerPage}
    rowsPerPageOptions={rowsPerPageOptions}
    totalCount={repositoryResults.length}
  />
);

export default RepositoryTab;
