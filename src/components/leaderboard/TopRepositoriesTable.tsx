import React, { useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Avatar,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { RepositorySocialLinksInline } from '../repositories';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import {
  formatWeight,
  getRepositoryOwnerAvatarSrc,
  truncateText,
} from '../../utils';
import { useDataTableParams } from '../../hooks/useDataTableParams';
import { RankIcon } from './RankIcon';
import { getRepositoryOwnerAvatarBackground, type RepoStats } from './types';
import { scrollbarSx } from '../../theme';

type SortColumn =
  | 'rank'
  | 'repository'
  | 'weight'
  | 'totalScore'
  | 'totalPRs'
  | 'contributors'
  | 'medianReviewMs'
  | 'activeMiners'
  | 'eligibleMiners'
  | 'lastActivityAt'
  | 'discoveryScore'
  | 'discoveryIssues'
  | 'discoveryContributors';

interface TopRepositoriesTableProps {
  repositories: RepoStats[];
  isLoading?: boolean;
  getRepositoryHref: (repositoryFullName: string) => string;
  linkState?: Record<string, unknown>;
}

const VALID_SORT_COLUMNS: readonly SortColumn[] = [
  'rank',
  'repository',
  'weight',
  'totalScore',
  'totalPRs',
  'contributors',
  'medianReviewMs',
  'activeMiners',
  'eligibleMiners',
  'lastActivityAt',
  'discoveryScore',
  'discoveryIssues',
  'discoveryContributors',
] as const;

/** List view: show numeric zeros when the row has OSS activity (avoids PRs > 0 with OSS score "-"). */
const repoHasOssActivity = (repo: RepoStats) =>
  (repo.totalPRs ?? 0) > 0 || (repo.totalScore ?? 0) > 0;

const formatDuration = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return '-';
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)}d`;
};

const formatRelativeTime = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return '-';
  const diffMs = Date.now() - time;
  if (diffMs < 60_000) return 'now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
};

const getActivityTime = (repo: RepoStats): number => {
  if (!repo.lastActivityAt) return 0;
  const time = new Date(repo.lastActivityAt).getTime();
  return Number.isFinite(time) ? time : 0;
};

const ColumnHeader: React.FC<{ label: string; tooltip: string }> = ({
  label,
  tooltip,
}) => (
  <Tooltip title={tooltip} placement="top" arrow>
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
      {label}
    </Box>
  </Tooltip>
);

const TopRepositoriesTable: React.FC<TopRepositoriesTableProps> = ({
  repositories,
  isLoading,
  getRepositoryHref,
  linkState,
}) => {
  const navigate = useNavigate();

  const {
    sortField: sortColumn,
    sortOrder: sortDirection,
    setSort: handleSort,
  } = useDataTableParams<SortColumn>({
    sortKeys: VALID_SORT_COLUMNS,
    defaultSortKey: 'weight',
    // Repository sorts A-Z by default; numeric columns default to desc.
    defaultOrderOverrides: { repository: 'asc' },
  });

  const rankedRepositories = useMemo(() => {
    // First, sort by the current sort column
    const sorted = [...repositories].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'repository':
          comparison = a.repository.localeCompare(b.repository);
          break;
        case 'weight':
          comparison = a.weight - b.weight;
          break;
        case 'totalScore':
          comparison = a.totalScore - b.totalScore;
          break;
        case 'totalPRs':
          comparison = a.totalPRs - b.totalPRs;
          break;
        case 'contributors':
          comparison = a.uniqueMiners.size - b.uniqueMiners.size;
          break;
        case 'medianReviewMs':
          comparison =
            (a.medianReviewMs ?? Number.POSITIVE_INFINITY) -
            (b.medianReviewMs ?? Number.POSITIVE_INFINITY);
          break;
        case 'activeMiners':
          comparison =
            (a.activeMiners?.size ?? 0) - (b.activeMiners?.size ?? 0);
          break;
        case 'eligibleMiners':
          comparison =
            (a.eligibleMiners?.size ?? 0) - (b.eligibleMiners?.size ?? 0);
          break;
        case 'lastActivityAt':
          comparison = getActivityTime(a) - getActivityTime(b);
          break;
        case 'discoveryScore':
          comparison = a.discoveryScore - b.discoveryScore;
          break;
        case 'discoveryIssues':
          comparison = a.discoveryIssues - b.discoveryIssues;
          break;
        case 'discoveryContributors':
          comparison =
            a.discoveryContributors.size - b.discoveryContributors.size;
          break;
        default:
          // Default to totalScore descending (original behavior)
          comparison = b.totalScore - a.totalScore;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Then add rank based on sorted order
    return sorted.map((repo, index) => ({ ...repo, rank: index + 1 }));
  }, [repositories, sortColumn, sortDirection]);

  const filteredRepositories = rankedRepositories;

  const compactSortableHeaderSx = {
    whiteSpace: 'nowrap',
    '& .MuiTableSortLabel-root': {
      whiteSpace: 'nowrap',
      maxWidth: '100%',
    },
    '& .MuiTableSortLabel-icon': {
      ml: 0.25,
    },
  } as const;

  const listColumns: DataTableColumn<RepoStats, SortColumn>[] = [
    {
      key: 'rank',
      header: (
        <ColumnHeader
          label="Rank"
          tooltip="Current position after the active sort is applied."
        />
      ),
      width: '60px',
      cellSx: { pr: 0 },
      renderCell: (repo) => <RankIcon rank={repo.rank || 0} />,
    },
    {
      key: 'repository',
      header: (
        <ColumnHeader
          label="Repository"
          tooltip="Tracked GitHub repository. Social icons open the repo's discovered website or community links."
        />
      ),
      width: '28%',
      sortKey: 'repository',
      headerSx: compactSortableHeaderSx,
      cellSx: { pl: 1.5 },
      renderCell: (repo) => {
        const owner = (repo.repository || '').split('/')[0] || '';
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 0,
              cursor: 'pointer',
              '&:hover': {
                '& .MuiTypography-root': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
              },
            }}
          >
            <Avatar
              src={getRepositoryOwnerAvatarSrc(owner) || undefined}
              alt={owner}
              sx={{
                width: 20,
                height: 20,
                border: '1px solid',
                borderColor: 'border.medium',
                backgroundColor: getRepositoryOwnerAvatarBackground(owner),
              }}
            >
              {(owner[0] || '?').toUpperCase()}
            </Avatar>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                minWidth: 0,
                maxWidth: '100%',
                overflow: 'hidden',
              }}
            >
              <Typography
                component="span"
                sx={{
                  color: 'text.primary',
                  fontWeight: 500,
                  transition: 'color 0.2s',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  flexShrink: 1,
                  display: 'inline-block',
                }}
              >
                {truncateText(repo.repository || '', 40)}
              </Typography>
              <RepositorySocialLinksInline
                repositoryFullName={repo.repository || ''}
              />
            </Box>
          </Box>
        );
      },
    },
    {
      key: 'weight',
      header: (
        <ColumnHeader
          label="Weight"
          tooltip="Current repo allocation weight. Higher weight means more incentive directed to this repository."
        />
      ),
      width: '10%',
      align: 'right',
      sortKey: 'weight',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => (
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          {formatWeight(repo.weight)}
        </Typography>
      ),
    },
    {
      key: 'totalPRs',
      header: (
        <ColumnHeader
          label="PRs"
          tooltip="Merged PRs counted for OSS scoring in this repository."
        />
      ),
      width: '8%',
      align: 'right',
      sortKey: 'totalPRs',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => {
        const active = repoHasOssActivity(repo);
        const n = repo.totalPRs ?? 0;
        return (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: active && n > 0 ? 'text.primary' : 'text.secondary',
            }}
          >
            {active ? String(n) : '-'}
          </Typography>
        );
      },
    },
    {
      key: 'discoveryIssues',
      header: (
        <ColumnHeader
          label="Issues"
          tooltip="Solved issue-discovery items counted for this repository."
        />
      ),
      width: '8%',
      align: 'right',
      sortKey: 'discoveryIssues',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => {
        const count = repo.discoveryIssues ?? 0;
        return (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: count > 0 ? 'text.primary' : 'text.secondary',
            }}
          >
            {count > 0 ? String(count) : '-'}
          </Typography>
        );
      },
    },
    {
      key: 'activeMiners',
      header: (
        <ColumnHeader
          label="Active miners"
          tooltip="Unique miners with PR activity in this repository during the last 30 days."
        />
      ),
      width: '12%',
      align: 'right',
      sortKey: 'activeMiners',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => {
        const count = repo.activeMiners?.size ?? 0;
        return (
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: count > 0 ? 600 : 400,
              color: count > 0 ? 'text.primary' : 'text.secondary',
            }}
          >
            {count}
          </Typography>
        );
      },
    },
    {
      key: 'eligibleMiners',
      header: (
        <ColumnHeader
          label="Eligible miners"
          tooltip="Eligible OSS miners with scored contributions in this repository."
        />
      ),
      width: '13%',
      align: 'right',
      sortKey: 'eligibleMiners',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => {
        const count = repo.eligibleMiners?.size ?? 0;
        return (
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: count > 0 ? 600 : 400,
              color: count > 0 ? 'text.primary' : 'text.secondary',
            }}
          >
            {count}
          </Typography>
        );
      },
    },
    {
      key: 'medianReviewMs',
      header: (
        <ColumnHeader
          label="Median review"
          tooltip="Median time from PR opened to merged for scored PRs in this repository."
        />
      ),
      width: '13%',
      align: 'right',
      sortKey: 'medianReviewMs',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => (
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: repo.medianReviewMs ? 600 : 400,
            color: repo.medianReviewMs ? 'text.primary' : 'text.secondary',
          }}
        >
          {formatDuration(repo.medianReviewMs)}
        </Typography>
      ),
    },
    {
      key: 'lastActivityAt',
      header: (
        <ColumnHeader
          label="Last activity"
          tooltip="Most recent known PR activity in this repository."
        />
      ),
      width: '12%',
      align: 'right',
      sortKey: 'lastActivityAt',
      headerSx: compactSortableHeaderSx,
      renderCell: (repo) => (
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: repo.lastActivityAt ? 600 : 400,
            color: repo.lastActivityAt ? 'text.primary' : 'text.secondary',
          }}
        >
          {formatRelativeTime(repo.lastActivityAt)}
        </Typography>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      elevation={0}
    >
      <Box sx={{ overflowY: 'auto', ...scrollbarSx }}>
        <DataTable<RepoStats, SortColumn>
          columns={listColumns}
          rows={filteredRepositories}
          isLoading={isLoading}
          emptyLabel="No repositories to display."
          getRowKey={(repo) => repo.repository || ''}
          onRowClick={(repo) =>
            navigate(getRepositoryHref(repo.repository || ''), {
              state: linkState,
            })
          }
          getRowSx={() => ({
            '&:hover': { backgroundColor: 'border.subtle' },
            transition: 'all 0.2s',
            borderBottom: '1px solid',
            borderColor: 'surface.light',
          })}
          minWidth="960px"
          stickyHeader
          sort={{
            field: sortColumn,
            order: sortDirection,
            onChange: handleSort,
          }}
        />
      </Box>
    </Card>
  );
};

export default TopRepositoriesTable;
