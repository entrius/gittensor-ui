import React from 'react';
import { Avatar, Box, Card, Typography } from '@mui/material';
import { useMinerGithubData, useMinerPRs } from '../../api';
import { CHART_COLORS, scrollbarSx } from '../../theme';
import { getGithubAvatarSrc, type SortOrder } from '../../utils/ExplorerUtils';
import { DataTable, type DataTableColumn, ScrollAwareTooltip, WatchlistButton } from '../common';
import { RankIcon } from './RankIcon';
import {
  type LeaderboardVariant,
  type MinerStats,
  type SortOption,
} from './types';

type ActivityMode = 'prs' | 'issues';

const SEGMENT_COLORS = [
  CHART_COLORS.merged,
  CHART_COLORS.open,
  CHART_COLORS.closed,
];

const cellTypographySx = {
  fontSize: '0.75rem',
  fontWeight: 600,
} as const;

interface MinersListProps {
  miners: MinerStats[];
  variant: LeaderboardVariant;
  sortOption: SortOption;
  sortDirection: SortOrder;
  onSort: (option: SortOption) => void;
  getHref: (miner: MinerStats) => string;
  linkState?: Record<string, unknown>;
}

export const MinersList: React.FC<MinersListProps> = ({
  miners,
  variant,
  sortOption,
  sortDirection,
  onSort,
  getHref,
  linkState,
}) => {
  const isWatchlist = variant === 'watchlist';
  const isDiscoveries = variant === 'discoveries';
  const singleActivityMode: ActivityMode = isDiscoveries ? 'issues' : 'prs';
  const singleActivityLabel = isDiscoveries ? 'Issues' : 'PRs';
  const singleActivitySortKey: SortOption = isDiscoveries
    ? 'totalIssues'
    : 'totalPRs';

  const activityColumns: DataTableColumn<MinerStats, SortOption>[] = isWatchlist
    ? [
        {
          key: 'prs',
          header: 'PRs',
          width: '11%',
          align: 'right',
          sortKey: 'totalPRs',
          renderCell: (miner) => (
            <MinerActivitySegments miner={miner} mode="prs" />
          ),
        },
        {
          key: 'issues',
          header: 'Issues',
          width: '11%',
          align: 'right',
          sortKey: 'totalIssues',
          renderCell: (miner) => (
            <MinerActivitySegments miner={miner} mode="issues" />
          ),
        },
      ]
    : [
        {
          key: 'activity',
          header: singleActivityLabel,
          width: '18%',
          align: 'right',
          sortKey: singleActivitySortKey,
          renderCell: (miner) => (
            <MinerActivitySegments miner={miner} mode={singleActivityMode} />
          ),
        },
      ];

  const columns: DataTableColumn<MinerStats, SortOption>[] = [
    {
      key: 'rank',
      header: 'Rank',
      width: '60px',
      cellSx: { pr: 0 },
      renderCell: (miner) => <RankIcon rank={miner.rank ?? 0} />,
    },
    {
      key: 'miner',
      header: 'Miner',
      width: '25%',
      cellSx: { pl: 1.5 },
      renderCell: (miner) => <MinerIdentityCell miner={miner} />,
    },
    {
      key: 'usdPerDay',
      header: 'Earnings/day',
      width: '14%',
      align: 'right',
      sortKey: 'usdPerDay',
      renderCell: (miner) => (
        <Typography
          sx={{
            ...cellTypographySx,
            color: miner.isEligible ? 'status.merged' : 'text.secondary',
          }}
        >
          ${Math.round(miner.usdPerDay || 0).toLocaleString()}
        </Typography>
      ),
    },
    ...activityColumns,
    {
      key: 'credibility',
      header: 'Credibility',
      width: '12%',
      align: 'right',
      sortKey: 'credibility',
      renderCell: (miner) => (
        <Typography sx={{ ...cellTypographySx, color: 'text.primary' }}>
          {((miner.credibility ?? 0) * 100).toFixed(0)}%
        </Typography>
      ),
    },
    {
      key: 'totalScore',
      header: isWatchlist ? 'OSS' : 'Score',
      width: '11%',
      align: 'right',
      sortKey: 'totalScore',
      renderCell: (miner) => (
        <Typography sx={{ ...cellTypographySx, color: 'text.primary' }}>
          {Number(miner.totalScore).toFixed(2)}
        </Typography>
      ),
    },
    ...(isWatchlist
      ? ([
          {
            key: 'discovery',
            header: 'Discovery',
            width: '11%',
            align: 'right' as const,
            sortKey: 'issueDiscoveryScore',
            renderCell: (miner: MinerStats) => (
              <Typography sx={{ ...cellTypographySx, color: 'text.primary' }}>
                {Number(miner.issueDiscoveryScore ?? 0).toFixed(2)}
              </Typography>
            ),
          },
        ] satisfies DataTableColumn<MinerStats, SortOption>[])
      : []),
    {
      key: 'watch',
      header: '\u2605',
      width: '52px',
      align: 'center',
      sortKey: 'watch',
      cellSx: { p: 0 },
      renderCell: (miner) =>
        miner.githubId ? (
          <WatchlistButton
            category="miners"
            itemKey={miner.githubId}
            size="small"
          />
        ) : null,
    },
  ];

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        overflow: 'hidden',
        maxHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        '& .MuiTableContainer-root': {
          flex: 1,
          overflowY: 'auto',
          ...scrollbarSx,
        },
      }}
    >
      <DataTable<MinerStats, SortOption>
        columns={columns}
        rows={miners}
        getRowKey={(miner) => miner.id}
        getRowHref={getHref}
        linkState={linkState}
        getRowSx={(miner) => ({
          opacity: (miner.isEligible ?? false) ? 1 : 0.5,
          transition: 'opacity 0.2s, background-color 0.2s',
        })}
        minWidth="1020px"
        stickyHeader
        sort={{
          field: sortOption,
          order: sortDirection,
          onChange: onSort,
        }}
      />
    </Card>
  );
};

interface MinerIdentityCellProps {
  miner: MinerStats;
}

const MinerIdentityCell: React.FC<MinerIdentityCellProps> = ({ miner }) => {
  const isNumericId = (value?: string) => !value || /^\d+$/.test(value);
  const shouldFetch = !!miner.githubId && isNumericId(miner.author);
  const { data: githubData } = useMinerGithubData(miner.githubId, shouldFetch);
  const { data: prs } = useMinerPRs(miner.githubId, shouldFetch);

  const username =
    githubData?.login ||
    prs?.[0]?.author ||
    (!isNumericId(miner.author) ? miner.author : miner.githubId) ||
    miner.githubId ||
    '';
  const avatarSrc = githubData?.avatarUrl || getGithubAvatarSrc(username);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Avatar
        src={avatarSrc}
        sx={{
          width: 24,
          height: 24,
          flexShrink: 0,
          border: '1px solid',
          borderColor: 'border.medium',
        }}
      />
      <ScrollAwareTooltip title={username} placement="top">
        <Typography
          component="span"
          sx={{
            fontSize: '0.8rem',
            fontWeight: 500,
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            display: 'inline-block',
          }}
        >
          {username}
        </Typography>
      </ScrollAwareTooltip>
    </Box>
  );
};

interface MinerActivitySegmentsProps {
  miner: MinerStats;
  mode: ActivityMode;
}

const MinerActivitySegments: React.FC<MinerActivitySegmentsProps> = ({
  miner,
  mode,
}) => {
  const segments =
    mode === 'issues'
      ? [
          { label: 'Solved', value: miner.totalSolvedIssues ?? 0 },
          { label: 'Open', value: miner.totalOpenIssues ?? 0 },
          { label: 'Closed', value: miner.totalClosedIssues ?? 0 },
        ]
      : [
          { label: 'Merged', value: miner.totalMergedPrs ?? 0 },
          { label: 'Open', value: miner.totalOpenPrs ?? 0 },
          { label: 'Closed', value: miner.totalClosedPrs ?? 0 },
        ];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1.25,
      }}
    >
      {segments.map((segment, i) => (
        <ScrollAwareTooltip
          key={segment.label}
          title={segment.label}
          arrow
          placement="top"
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: SEGMENT_COLORS[i],
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1 }}
            >
              {segment.value}
            </Typography>
          </Box>
        </ScrollAwareTooltip>
      ))}
    </Box>
  );
};
