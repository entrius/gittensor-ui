import React from 'react';
import { Avatar, Box, Card, Tooltip, Typography } from '@mui/material';
import { useMinerGithubData, useMinerPRs } from '../../api';
import { CHART_COLORS } from '../../theme';
import { getGithubAvatarSrc, type SortOrder } from '../../utils/ExplorerUtils';
import { DataTable, type DataTableColumn, WatchlistButton } from '../common';
import { RankIcon } from './RankIcon';
import {
  type LeaderboardVariant,
  type MinerStats,
  type SortOption,
} from './types';

type ActivityMode = 'prs' | 'issues';

/** OSS / PR rewards track — mirrors `minerMapper` (`ossIsEligible` ← API eligible). */
const ossTrackEligible = (m: MinerStats) =>
  Boolean(m.ossIsEligible ?? m.isEligible);

/** Issue-discovery rewards track — mirrors mapper (`discoveriesIsEligible`). */
const discoveryTrackEligible = (m: MinerStats) =>
  Boolean(m.discoveriesIsEligible ?? m.isIssueEligible ?? false);

const watchlistAnyRewardEligible = (m: MinerStats) =>
  ossTrackEligible(m) || discoveryTrackEligible(m);

const watchlistBothTracksIneligible = (m: MinerStats) =>
  !ossTrackEligible(m) && !discoveryTrackEligible(m);

/** Mute PR/Issue column counts when that watchlist track is ineligible. */
const TRACK_INACTIVE_OPACITY = 0.48;

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
  pagination?: React.ReactNode;
}

export const MinersList: React.FC<MinersListProps> = ({
  miners,
  variant,
  sortOption,
  sortDirection,
  onSort,
  getHref,
  linkState,
  pagination,
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
          width: '14%',
          align: 'right',
          sortKey: 'totalPRs',
          headerSx: { pl: 2 },
          cellSx: { pl: 2 },
          renderCell: (miner) => (
            <MinerActivitySegments
              miner={miner}
              mode="prs"
              trackEligible={ossTrackEligible(miner)}
            />
          ),
        },
        {
          key: 'issues',
          header: 'Issues',
          width: '13%',
          align: 'right',
          sortKey: 'totalIssues',
          headerSx: { pl: 1.5 },
          cellSx: { pl: 1.5 },
          renderCell: (miner) => (
            <MinerActivitySegments
              miner={miner}
              mode="issues"
              trackEligible={discoveryTrackEligible(miner)}
            />
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
      width: isWatchlist ? '23%' : '25%',
      cellSx: { pl: 1.5 },
      sortKey: 'username',
      renderCell: (miner) => <MinerIdentityCell miner={miner} />,
    },
    {
      key: 'usdPerDay',
      header: 'Earnings/day',
      width: isWatchlist ? '10%' : '14%',
      align: 'right',
      sortKey: 'usdPerDay',
      ...(isWatchlist ? { headerSx: { pr: 2 }, cellSx: { pr: 2 } } : {}),
      renderCell: (miner) => {
        const earningsHighlighted = isWatchlist
          ? watchlistAnyRewardEligible(miner)
          : Boolean(miner.isEligible);
        return (
          <Typography
            sx={{
              ...cellTypographySx,
              color: earningsHighlighted ? 'status.merged' : 'text.secondary',
            }}
          >
            ${Math.round(miner.usdPerDay || 0).toLocaleString()}
          </Typography>
        );
      },
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
      renderCell: (miner) => {
        const active = !isWatchlist || ossTrackEligible(miner);
        return (
          <Typography
            sx={{
              ...cellTypographySx,
              color: active ? 'text.primary' : 'text.secondary',
              opacity: active ? 1 : TRACK_INACTIVE_OPACITY,
            }}
          >
            {Number(miner.totalScore).toFixed(2)}
          </Typography>
        );
      },
    },
    ...(isWatchlist
      ? ([
          {
            key: 'discovery',
            header: 'Discovery',
            width: '11%',
            align: 'right' as const,
            sortKey: 'issueDiscoveryScore',
            renderCell: (miner: MinerStats) => {
              const active = discoveryTrackEligible(miner);
              return (
                <Typography
                  sx={{
                    ...cellTypographySx,
                    color: active ? 'text.primary' : 'text.secondary',
                    opacity: active ? 1 : TRACK_INACTIVE_OPACITY,
                  }}
                >
                  {Number(miner.issueDiscoveryScore ?? 0).toFixed(2)}
                </Typography>
              );
            },
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
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <DataTable<MinerStats, SortOption>
        columns={columns}
        rows={miners}
        getRowKey={(miner) => miner.id}
        getRowHref={getHref}
        linkState={linkState}
        getRowSx={(miner) => ({
          opacity: isWatchlist
            ? watchlistBothTracksIneligible(miner)
              ? 0.48
              : 1
            : miner.isEligible
              ? 1
              : 0.5,
          transition: 'opacity 0.2s, background-color 0.2s',
        })}
        minWidth="1020px"
        stickyHeader
        sort={{
          field: sortOption,
          order: sortDirection,
          onChange: onSort,
        }}
        pagination={pagination}
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
        alt={username}
        sx={{
          width: 24,
          height: 24,
          flexShrink: 0,
          border: '1px solid',
          borderColor: 'border.medium',
        }}
      />
      <Tooltip title={username} placement="top">
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
      </Tooltip>
    </Box>
  );
};

interface MinerActivitySegmentsProps {
  miner: MinerStats;
  mode: ActivityMode;
  /** Watchlist: mute counts when this column's track is ineligible. */
  trackEligible?: boolean;
}

const MinerActivitySegments: React.FC<MinerActivitySegmentsProps> = ({
  miner,
  mode,
  trackEligible = true,
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
        gap: 1,
        minWidth: 0,
        maxWidth: '100%',
        opacity: trackEligible ? 1 : TRACK_INACTIVE_OPACITY,
      }}
    >
      {segments.map((segment, i) => (
        <Tooltip
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
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                lineHeight: 1,
                color: trackEligible ? 'text.primary' : 'text.secondary',
              }}
            >
              {segment.value}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
};
