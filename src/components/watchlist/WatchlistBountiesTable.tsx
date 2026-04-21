import React, { useCallback, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { IssueBounty } from '../../api/models/Issues';
import { usePrices } from '../../hooks/usePrices';
import { formatTokenAmount, formatAlphaToUsd } from '../../utils/format';
import { getIssueStatusMeta } from '../../utils/issueStatus';
import { STATUS_COLORS, TEXT_OPACITY, scrollbarSx } from '../../theme';
import { LinkTableRow } from '../common/linkBehavior';
import { WatchlistButton } from '../common/WatchlistButton';

type SortDirection = 'asc' | 'desc';
type SortKey = 'repository' | 'issue' | 'bounty' | 'status';

interface WatchlistBountiesTableProps {
  issues: IssueBounty[];
  getIssueHref: (id: number) => string;
  linkState?: Record<string, unknown>;
}

const parseAmount = (value: string | null | undefined): number => {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

const WatchlistBountiesTable: React.FC<WatchlistBountiesTableProps> = ({
  issues,
  getIssueHref,
  linkState,
}) => {
  const theme = useTheme();
  const { taoPrice, alphaPrice } = usePrices();
  const [sortKey, setSortKey] = useState<SortKey>('bounty');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const headerCellSx = useMemo(
    () => ({
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '0.7rem',
      fontWeight: 600,
      letterSpacing: '0.5px',
      textTransform: 'uppercase' as const,
      color: 'text.secondary',
      borderBottom: '1px solid',
      borderColor: 'border.light',
      py: 1.5,
    }),
    [],
  );

  const bodyCellSx = {
    fontSize: '0.85rem',
    color: 'text.primary',
    borderBottom: '1px solid',
    borderBottomColor: 'border.subtle',
    py: 1.5,
  };

  const getDefaultSortDirection = useCallback(
    (key: SortKey): SortDirection => (key === 'bounty' ? 'desc' : 'asc'),
    [],
  );

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return;
      }
      setSortKey(key);
      setSortDirection(getDefaultSortDirection(key));
    },
    [getDefaultSortDirection, sortKey],
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
        case 'repository':
          value = (issue.repositoryFullName || '').toLowerCase();
          break;
        case 'issue':
          value = `${(issue.title || '').toLowerCase()}::${String(issue.issueNumber).padStart(10, '0')}`;
          break;
        case 'bounty':
          value = parseAmount(issue.targetBounty);
          break;
        case 'status':
          value = getIssueStatusMeta(issue.status).text;
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

    return decorated.map((d) => d.issue);
  }, [issues, sortKey, sortDirection]);

  const renderSortableHeader = useCallback(
    (
      label: string,
      key: SortKey,
      align: 'left' | 'center' | 'right' = 'left',
      width?: string,
    ) => (
      <TableCell
        onClick={() => handleSort(key)}
        sx={{
          ...headerCellSx,
          textAlign: align,
          width,
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover .MuiTableSortLabel-root': { color: 'secondary.main' },
        }}
      >
        <TableSortLabel
          active={sortKey === key}
          direction={sortKey === key ? sortDirection : 'asc'}
          onClick={(event) => event.preventDefault()}
          hideSortIcon={sortKey !== key}
          sx={{
            color: 'text.secondary',
            width: '100%',
            justifyContent:
              align === 'right'
                ? 'flex-end'
                : align === 'center'
                  ? 'center'
                  : 'flex-start',
            '&:hover': { color: 'secondary.main' },
            '&.Mui-active': { color: 'secondary.main' },
          }}
        >
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </Typography>
        </TableSortLabel>
      </TableCell>
    ),
    [handleSort, headerCellSx, sortDirection, sortKey],
  );

  return (
    <Card
      sx={{
        backgroundColor: 'background.default',
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%',
      }}
      elevation={0}
    >
      <TableContainer sx={{ ...scrollbarSx }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {renderSortableHeader(
                'Repository',
                'repository',
                'left',
                '220px',
              )}
              {renderSortableHeader('Issue', 'issue')}
              {renderSortableHeader('Bounty', 'bounty', 'right', '140px')}
              {renderSortableHeader('Status', 'status', 'center', '110px')}
              <TableCell
                sx={{ ...headerCellSx, textAlign: 'center', width: '56px' }}
                aria-label="Watchlist action"
              />
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedIssues.map((issue) => {
              const statusBadge = getIssueStatusMeta(issue.status);
              const href = getIssueHref(issue.id);
              const usdDisplay = formatAlphaToUsd(
                issue.targetBounty,
                taoPrice,
                alphaPrice,
              );
              return (
                <LinkTableRow
                  key={issue.id}
                  href={href}
                  linkState={linkState}
                  sx={{
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.common.white, 0.03),
                    },
                  }}
                >
                  <TableCell sx={bodyCellSx}>
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                    >
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${issue.repositoryFullName.split('/')[0]}`}
                        sx={{ width: 24, height: 24, borderRadius: 1 }}
                      />
                      <Typography
                        sx={{ fontSize: '0.85rem', color: STATUS_COLORS.info }}
                      >
                        {issue.repositoryFullName}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={bodyCellSx}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                      }}
                    >
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
                      <Link
                        href={issue.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          fontSize: '0.75rem',
                          color: alpha(
                            theme.palette.common.white,
                            TEXT_OPACITY.tertiary,
                          ),
                          textDecoration: 'none',
                          '&:hover': {
                            color: STATUS_COLORS.info,
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        #{issue.issueNumber}
                        <OpenInNewIcon sx={{ fontSize: 12, opacity: 0.5 }} />
                      </Link>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ ...bodyCellSx, textAlign: 'right' }}>
                    <Typography
                      sx={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: STATUS_COLORS.merged,
                      }}
                    >
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
                  </TableCell>
                  <TableCell sx={{ ...bodyCellSx, textAlign: 'center' }}>
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
                  </TableCell>
                  <TableCell sx={{ ...bodyCellSx, textAlign: 'center', p: 0 }}>
                    <WatchlistButton
                      category="bounties"
                      itemKey={String(issue.id)}
                    />
                  </TableCell>
                </LinkTableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

export default WatchlistBountiesTable;
