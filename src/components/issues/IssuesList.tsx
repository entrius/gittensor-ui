import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  Skeleton,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { IssueBounty } from '../../api/models/Issues';
import { usePrices } from '../../hooks/usePrices';
import {
  formatTokenAmount,
  formatDate,
  formatAlphaToUsd,
} from '../../utils/format';
import { getIssueStatusMeta } from '../../utils/issueStatus';
import { STATUS_COLORS, TEXT_OPACITY } from '../../theme';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';
import { GithubNumberLink } from '../common';
import BountyProgress from './BountyProgress';

type ListType = 'available' | 'pending' | 'history';
type SortDirection = 'asc' | 'desc';
type SortKey =
  | 'id'
  | 'repository'
  | 'issue'
  | 'bounty'
  | 'status'
  | 'funding'
  | 'solver'
  | 'date';

interface IssuesListProps {
  issues: IssueBounty[];
  isLoading?: boolean;
  listType: ListType;
  getIssueHref?: (id: number) => string;
  linkState?: Record<string, unknown>;
}

const truncateAddress = (address: string | null): string => {
  if (!address) return '-';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const IssuesList: React.FC<IssuesListProps> = ({
  issues,
  isLoading = false,
  listType,
  getIssueHref,
  linkState,
}) => {
  const theme = useTheme();
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { taoPrice, alphaPrice } = usePrices();

  const parseAmount = (value: string | null | undefined): number => {
    const parsed = Number.parseFloat(value ?? '0');
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getLowerText = (value: string | null | undefined): string =>
    (value ?? '').toLowerCase();

  // String columns feel natural ascending by default, numeric/date desc.
  const getDefaultSortDirection = useCallback(
    (key: SortKey): SortDirection =>
      key === 'id' || key === 'bounty' || key === 'date' ? 'desc' : 'asc',
    [],
  );

  const visibleSortKeys = useMemo<SortKey[]>(() => {
    const common: SortKey[] = ['id', 'repository', 'issue'];
    if (listType === 'available') return [...common, 'bounty', 'status'];
    if (listType === 'pending')
      return [...common, 'bounty', 'funding', 'status'];
    return [...common, 'bounty', 'solver', 'status', 'date'];
  }, [listType]);

  useEffect(() => {
    if (!visibleSortKeys.includes(sortKey)) {
      setSortKey('id');
      setSortDirection('desc');
    }
  }, [sortKey, visibleSortKeys]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (!visibleSortKeys.includes(key)) return;
      if (sortKey === key) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return;
      }
      setSortKey(key);
      setSortDirection(getDefaultSortDirection(key));
    },
    [getDefaultSortDirection, sortKey, visibleSortKeys],
  );

  const sortedIssues = useMemo(() => {
    const directionFactor = sortDirection === 'asc' ? 1 : -1;
    const collator = new Intl.Collator(undefined, {
      sensitivity: 'base',
      numeric: true,
    });
    const decorated = issues.map((issue) => {
      let value: number | string;
      switch (sortKey) {
        case 'id':
          value = issue.id;
          break;
        case 'repository':
          value = getLowerText(issue.repositoryFullName);
          break;
        case 'issue':
          value = `${getLowerText(issue.title)}::${String(issue.issueNumber).padStart(10, '0')}`;
          break;
        case 'bounty':
          value = parseAmount(issue.targetBounty);
          break;
        case 'status':
          value = getIssueStatusMeta(issue.status).text;
          break;
        case 'funding': {
          const target = parseAmount(issue.targetBounty);
          value = target > 0 ? parseAmount(issue.bountyAmount) / target : 0;
          break;
        }
        case 'solver':
          value = getLowerText(issue.solverHotkey);
          break;
        case 'date':
          value = new Date(issue.completedAt || issue.updatedAt || 0).getTime();
          break;
      }
      return { issue, value };
    });
    decorated.sort((a, b) => {
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        return (a.value - b.value) * directionFactor;
      }
      return (
        collator.compare(String(a.value), String(b.value)) * directionFactor
      );
    });
    return decorated.map((item) => item.issue);
  }, [issues, sortDirection, sortKey]);

  const columns = useMemo<DataTableColumn<IssueBounty, SortKey>[]>(() => {
    const idColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'id',
      header: 'ID',
      width: '60px',
      sortKey: 'id',
      renderCell: (issue) => (
        <Typography
          sx={{
            fontSize: '0.8rem',
            color: alpha(theme.palette.common.white, 0.6),
          }}
        >
          #{issue.id}
        </Typography>
      ),
    };

    const repositoryColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'repository',
      header: 'Repository',
      width: '220px',
      sortKey: 'repository',
      renderCell: (issue) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={`https://avatars.githubusercontent.com/${issue.repositoryFullName.split('/')[0]}`}
            sx={{ width: 24, height: 24, borderRadius: 1 }}
          />
          <Typography sx={{ fontSize: '0.85rem', color: STATUS_COLORS.info }}>
            {issue.repositoryFullName}
          </Typography>
        </Box>
      ),
    };

    const issueColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'issue',
      header: 'Issue',
      sortKey: 'issue',
      renderCell: (issue) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {issue.title && (
            <Typography
              sx={{
                fontSize: '0.85rem',
                color: 'text.primary',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '600px',
              }}
            >
              {issue.title}
            </Typography>
          )}
          <GithubNumberLink href={issue.githubUrl} number={issue.issueNumber} />
        </Box>
      ),
    };

    const bountyColumn = (
      label: string,
      colorOverride?: (issue: IssueBounty) => string,
    ): DataTableColumn<IssueBounty, SortKey> => ({
      key: 'bounty',
      header: label,
      width: listType === 'available' ? '120px' : undefined,
      align: 'right',
      sortKey: 'bounty',
      renderCell: (issue) => {
        const usdDisplay = formatAlphaToUsd(
          issue.targetBounty,
          taoPrice,
          alphaPrice,
        );
        const color =
          colorOverride?.(issue) ??
          (listType === 'pending' ? STATUS_COLORS.award : STATUS_COLORS.merged);
        return (
          <>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color }}>
              {formatTokenAmount(issue.targetBounty)} ل
            </Typography>
            {usdDisplay && (
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: alpha(theme.palette.common.white, 0.35),
                }}
              >
                {usdDisplay}
              </Typography>
            )}
          </>
        );
      },
    });

    const statusColumn = (
      width?: string,
    ): DataTableColumn<IssueBounty, SortKey> => ({
      key: 'status',
      header: 'Status',
      width,
      align: 'center',
      sortKey: 'status',
      renderCell: (issue) => {
        const statusBadge = getIssueStatusMeta(issue.status);
        return (
          <Chip
            label={statusBadge.text}
            size="small"
            sx={{
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: statusBadge.bgColor,
              color: statusBadge.color,
              border: `1px solid ${statusBadge.color}40`,
            }}
          />
        );
      },
    });

    const fundingColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'funding',
      header: 'Funding',
      width: '140px',
      align: 'center',
      sortKey: 'funding',
      renderCell: (issue) => (
        <BountyProgress
          bountyAmount={issue.bountyAmount}
          targetBounty={issue.targetBounty}
        />
      ),
    };

    const solverColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'solver',
      header: 'Solver',
      align: 'center',
      sortKey: 'solver',
      renderCell: (issue) =>
        issue.solverHotkey ? (
          <Tooltip title={issue.solverHotkey} arrow>
            <Typography
              sx={{
                fontSize: '0.8rem',
                color: STATUS_COLORS.info,
                cursor: 'pointer',
              }}
            >
              {truncateAddress(issue.solverHotkey)}
            </Typography>
          </Tooltip>
        ) : (
          <Typography
            sx={{
              fontSize: '0.8rem',
              color: alpha(theme.palette.common.white, TEXT_OPACITY.faint),
            }}
          >
            -
          </Typography>
        ),
    };

    const dateColumn: DataTableColumn<IssueBounty, SortKey> = {
      key: 'date',
      header: 'Date',
      align: 'center',
      sortKey: 'date',
      renderCell: (issue) => (
        <Typography
          sx={{
            fontSize: '0.8rem',
            color: alpha(theme.palette.common.white, 0.6),
          }}
        >
          {formatDate(issue.completedAt || issue.updatedAt)}
        </Typography>
      ),
    };

    if (listType === 'available') {
      return [
        idColumn,
        repositoryColumn,
        issueColumn,
        bountyColumn('Bounty'),
        statusColumn('100px'),
      ];
    }
    if (listType === 'pending') {
      return [
        idColumn,
        repositoryColumn,
        issueColumn,
        bountyColumn('Target Bounty'),
        fundingColumn,
        statusColumn(),
      ];
    }
    return [
      idColumn,
      repositoryColumn,
      issueColumn,
      bountyColumn('Payout', (issue) =>
        issue.status === 'completed'
          ? STATUS_COLORS.merged
          : alpha(theme.palette.common.white, TEXT_OPACITY.muted),
      ),
      solverColumn,
      statusColumn(),
      dateColumn,
    ];
  }, [listType, theme, taoPrice, alphaPrice]);

  if (isLoading) {
    return (
      <Card
        sx={{
          backgroundColor: 'background.default',
          border: `1px solid ${theme.palette.border.light}`,
          borderRadius: 3,
        }}
        elevation={0}
      >
        <Box sx={{ p: 2 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={48}
              sx={{ mb: 1, borderRadius: 1 }}
            />
          ))}
        </Box>
      </Card>
    );
  }

  const emptyMessages: Record<ListType, string> = {
    available: 'No active issues available for solving',
    pending: 'No pending issues awaiting funding',
    history: 'No completed or cancelled issues yet',
  };

  if (issues.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor: 'background.default',
          border: `1px solid ${theme.palette.border.light}`,
          borderRadius: 3,
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <Typography
          sx={{
            color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
          }}
        >
          {emptyMessages[listType]}
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: 'background.default',
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: 3,
        overflow: 'hidden',
        // Original IssuesList used `py: 1.5` (12px) on every cell;
        // restore the original row spacing on top of `size="small"`.
        '& .MuiTableCell-root': { py: 1.5 },
      }}
      elevation={0}
    >
      <DataTable<IssueBounty, SortKey>
        columns={columns}
        rows={sortedIssues}
        getRowKey={(issue) => issue.id}
        getRowHref={
          getIssueHref ? (issue) => getIssueHref(issue.id) : undefined
        }
        linkState={linkState}
        sort={{
          field: sortKey,
          order: sortDirection,
          onChange: handleSort,
        }}
      />
    </Card>
  );
};

export default IssuesList;
