import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  Skeleton,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { IssueBounty } from '../../api/models/Issues';
import { usePrices } from '../../hooks/usePrices';
import { formatDate } from '../../utils/format';
import { STATUS_COLORS, TEXT_OPACITY } from '../../theme';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';
import BountyProgress from './BountyProgress';
import {
  getIssueSortValue,
  issueBountyColumn,
  issueRepositoryColumn,
  issueStatusColumn,
  issueTitleColumn,
  issueWatchColumn,
  parseBountyAmount,
  sortIssues,
  type IssueSortBasis,
} from './issueColumns';

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

  const getSortValue = useCallback(
    (issue: IssueBounty, key: SortKey): number | string => {
      switch (key) {
        case 'id':
          return issue.id;
        case 'funding': {
          const target = parseBountyAmount(issue.targetBounty);
          return target > 0
            ? parseBountyAmount(issue.bountyAmount) / target
            : 0;
        }
        case 'solver':
          return (issue.solverHotkey ?? '').toLowerCase();
        case 'date':
          return new Date(issue.completedAt || issue.updatedAt || 0).getTime();
        default:
          return getIssueSortValue(issue, key as IssueSortBasis);
      }
    },
    [],
  );

  const sortedIssues = useMemo(
    () => sortIssues(issues, getSortValue, sortKey, sortDirection),
    [issues, getSortValue, sortKey, sortDirection],
  );

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

    const common = [
      idColumn,
      issueRepositoryColumn<SortKey>('repository'),
      issueTitleColumn<SortKey>('issue', theme),
    ];

    if (listType === 'available') {
      return [
        ...common,
        issueBountyColumn<SortKey>('bounty', taoPrice, alphaPrice, theme, {
          label: 'Bounty',
          width: '120px',
        }),
        issueStatusColumn<SortKey>('status', '100px'),
        issueWatchColumn<SortKey>(),
      ];
    }
    if (listType === 'pending') {
      return [
        ...common,
        issueBountyColumn<SortKey>('bounty', taoPrice, alphaPrice, theme, {
          label: 'Target Bounty',
          color: STATUS_COLORS.award,
        }),
        fundingColumn,
        issueStatusColumn<SortKey>('status'),
        issueWatchColumn<SortKey>(),
      ];
    }
    return [
      ...common,
      issueBountyColumn<SortKey>('bounty', taoPrice, alphaPrice, theme, {
        label: 'Payout',
        color: (issue) =>
          issue.status === 'completed'
            ? STATUS_COLORS.merged
            : alpha(theme.palette.common.white, TEXT_OPACITY.muted),
      }),
      solverColumn,
      issueStatusColumn<SortKey>('status'),
      dateColumn,
      issueWatchColumn<SortKey>(),
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
