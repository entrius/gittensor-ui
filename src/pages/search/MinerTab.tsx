import React from 'react';
import { Box } from '@mui/material';
import { type Theme } from '@mui/material/styles';
import { getGithubAvatarSrc } from '../../utils';
import { type DataTableColumn } from '../../components/common/DataTable';
import SearchResultsCard from './SearchResultsCard';
import {
  SearchAvatarContentCell,
  SearchTruncatedText,
} from './SearchTableCells';
import { type MinerSearchData } from './searchData';

const getCredibilityTone = (
  credibility: number,
): keyof Theme['palette']['credibility'] => {
  if (credibility >= 0.9) return 'excellent';
  if (credibility >= 0.7) return 'good';
  if (credibility >= 0.5) return 'moderate';
  if (credibility >= 0.3) return 'low';
  return 'poor';
};

const numericCellSx = {
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
} as const;

const minerColumns: DataTableColumn<MinerSearchData>[] = [
  {
    key: 'rank',
    header: 'Rank',
    width: 72,
    renderCell: (miner: MinerSearchData) =>
      miner.leaderboardRank > 0 ? `#${miner.leaderboardRank}` : '-',
    cellSx: (miner: MinerSearchData) => ({
      ...numericCellSx,
      color: miner.leaderboardRank > 0 ? 'text.primary' : 'text.secondary',
    }),
  },
  {
    key: 'miner',
    header: 'Miner',
    width: '28%',
    renderCell: (miner: MinerSearchData) => (
      <SearchAvatarContentCell
        avatarAlt={miner.githubUsername || miner.githubId}
        avatarSize={32}
        avatarSrc={getGithubAvatarSrc(miner.githubUsername)}
        gap={1.5}
      >
        <Box>
          <SearchTruncatedText
            sx={(theme) => ({
              ...theme.typography.mono,
              fontWeight: 600,
              color: theme.palette.text.primary,
            })}
            text={miner.githubUsername || miner.githubId}
          />
          <SearchTruncatedText
            sx={(theme) => ({
              ...theme.typography.monoSmall,
              color: theme.palette.text.secondary,
            })}
            text={`GitHub ID · ${miner.githubId}`}
          />
        </Box>
      </SearchAvatarContentCell>
    ),
    cellSx: {
      minWidth: 260,
    },
  },
  {
    key: 'credibility',
    header: 'Credibility',
    width: '14%',
    align: 'right',
    renderCell: (miner: MinerSearchData) =>
      miner.credibility > 0 ? (
        <Box
          component="span"
          sx={(theme) => ({
            color:
              theme.palette.credibility[getCredibilityTone(miner.credibility)],
          })}
        >
          {(miner.credibility * 100).toFixed(1)}%
        </Box>
      ) : (
        '-'
      ),
    cellSx: numericCellSx,
  },
  {
    key: 'tokenScore',
    header: 'Token Score',
    width: '14%',
    align: 'right',
    renderCell: (miner: MinerSearchData) =>
      miner.totalTokenScore > 0
        ? miner.totalTokenScore.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })
        : '-',
    cellSx: (miner: MinerSearchData) => ({
      ...numericCellSx,
      color: miner.totalTokenScore > 0 ? 'text.primary' : 'text.secondary',
    }),
  },
  {
    key: 'prs',
    header: 'PRs',
    width: '12%',
    align: 'right',
    renderCell: (miner: MinerSearchData) =>
      miner.totalPrs > 0 ? miner.totalPrs.toLocaleString() : '-',
    cellSx: (miner: MinerSearchData) => ({
      ...numericCellSx,
      color: miner.totalPrs > 0 ? 'text.primary' : 'text.secondary',
    }),
  },
  {
    key: 'score',
    header: 'Score',
    width: '14%',
    align: 'right',
    renderCell: (miner: MinerSearchData) =>
      miner.totalScore.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    cellSx: numericCellSx,
  },
];

type MinerTabProps = {
  isError: boolean;
  isLoading: boolean;
  minerResults: MinerSearchData[];
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  getMinerHref: (miner: MinerSearchData) => string;
  linkState?: Record<string, unknown>;
  page: number;
  paginatedMinerResults: MinerSearchData[];
  rowsPerPage: number;
  rowsPerPageOptions: number[];
};

const MinerTab: React.FC<MinerTabProps> = ({
  isError,
  isLoading,
  minerResults,
  onPageChange,
  onRowsPerPageChange,
  getMinerHref,
  linkState,
  page,
  paginatedMinerResults,
  rowsPerPage,
  rowsPerPageOptions,
}) => (
  <SearchResultsCard
    columns={minerColumns}
    emptyLabel="No miner matches."
    errorLabel="Failed to load miners for search."
    getRowKey={(miner: MinerSearchData) => miner.githubId}
    isError={isError}
    isLoading={isLoading}
    minWidth={980}
    onPageChange={onPageChange}
    getRowHref={getMinerHref}
    linkState={linkState}
    onRowsPerPageChange={onRowsPerPageChange}
    page={page}
    rows={paginatedMinerResults}
    rowsPerPage={rowsPerPage}
    rowsPerPageOptions={rowsPerPageOptions}
    totalCount={minerResults.length}
  />
);

export default MinerTab;
