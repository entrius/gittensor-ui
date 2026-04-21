import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Chip,
  Skeleton,
  Link,
  Tooltip,
  Avatar,
  alpha,
  useTheme,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { IssueBounty } from '../../api/models/Issues';
import { usePrices } from '../../hooks/usePrices';
import {
  formatTokenAmount,
  formatDate,
  formatAlphaToUsd,
} from '../../utils/format';
import { getIssueStatusMeta } from '../../utils/issueStatus';
import { STATUS_COLORS, TEXT_OPACITY, scrollbarSx } from '../../theme';
import BountyProgress from './BountyProgress';
import { LinkTableRow } from '../common/linkBehavior';
import { WatchlistButton } from '../common';

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

/**
 * Truncate wallet address for display
 */
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

  const parseAmount = (value: string | null | undefined): number => {
    const parsed = Number.parseFloat(value ?? '0');
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getLowerText = (value: string | null | undefined): string =>
    (value ?? '').toLowerCase();

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
        setSortDirection((prevDirection) =>
          prevDirection === 'asc' ? 'desc' : 'asc',
        );
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
          '&:hover .MuiTableSortLabel-root': {
            color: 'secondary.main',
          },
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
            '&:hover': {
              color: 'secondary.main',
            },
            '&.Mui-active': {
              color: 'secondary.main',
            },
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
      }}
      elevation={0}
    >
      <TableContainer sx={{ ...scrollbarSx }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {renderSortableHeader('ID', 'id', 'left', '60px')}
              {renderSortableHeader(
                'Repository',
                'repository',
                'left',
                '220px',
              )}
              {renderSortableHeader('Issue', 'issue')}

              {/* Available Issues columns */}
              {listType === 'available' && (
                <>
                  {renderSortableHeader('Bounty', 'bounty', 'right', '120px')}
                  {renderSortableHeader('Status', 'status', 'center', '100px')}
                </>
              )}

              {/* Pending Issues columns */}
              {listType === 'pending' && (
                <>
                  {renderSortableHeader('Target Bounty', 'bounty', 'right')}
                  {renderSortableHeader(
                    'Funding',
                    'funding',
                    'center',
                    '140px',
                  )}
                  {renderSortableHeader('Status', 'status', 'center')}
                </>
              )}

              {/* History columns */}
              {listType === 'history' && (
                <>
                  {renderSortableHeader('Payout', 'bounty', 'right')}
                  {renderSortableHeader('Solver', 'solver', 'center')}
                  {renderSortableHeader('Status', 'status', 'center')}
                  {renderSortableHeader('Date', 'date', 'center')}
                </>
              )}

              {/* Watchlist action */}
              <TableCell
                sx={{ ...headerCellSx, textAlign: 'center', width: '56px' }}
              >
                {'★'}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedIssues.map((issue) => {
              const statusBadge = getIssueStatusMeta(issue.status);
              const href = getIssueHref?.(issue.id);
              const usdDisplay = formatAlphaToUsd(
                issue.targetBounty,
                taoPrice,
                alphaPrice,
              );
              const rowSx = {
                cursor: href ? 'pointer' : 'default',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.03),
                },
              };
              const cells = (
                <>
                  {/* Common columns */}
                  <TableCell sx={bodyCellSx}>
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        color: alpha(theme.palette.common.white, 0.6),
                      }}
                    >
                      #{issue.id}
                    </Typography>
                  </TableCell>
                  <TableCell sx={bodyCellSx}>
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                    >
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${issue.repositoryFullName.split('/')[0]}`}
                        sx={{ width: 24, height: 24, borderRadius: 1 }}
                      />
                      <Typography
                        sx={{
                          fontSize: '0.85rem',
                          color: STATUS_COLORS.info,
                        }}
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

                  {/* Available Issues columns */}
                  {listType === 'available' && (
                    <>
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
                    </>
                  )}

                  {/* Pending Issues columns */}
                  {listType === 'pending' && (
                    <>
                      <TableCell sx={{ ...bodyCellSx, textAlign: 'right' }}>
                        <Typography
                          sx={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: STATUS_COLORS.award,
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
                        <BountyProgress
                          bountyAmount={issue.bountyAmount}
                          targetBounty={issue.targetBounty}
                        />
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
                    </>
                  )}

                  {/* History columns */}
                  {listType === 'history' && (
                    <>
                      <TableCell sx={{ ...bodyCellSx, textAlign: 'right' }}>
                        <Typography
                          sx={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color:
                              issue.status === 'completed'
                                ? STATUS_COLORS.merged
                                : alpha(
                                    theme.palette.common.white,
                                    TEXT_OPACITY.muted,
                                  ),
                          }}
                        >
                          {`${formatTokenAmount(issue.targetBounty)} ل`}
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
                        {issue.solverHotkey ? (
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
                              color: alpha(
                                theme.palette.common.white,
                                TEXT_OPACITY.faint,
                              ),
                            }}
                          >
                            -
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
                      <TableCell sx={{ ...bodyCellSx, textAlign: 'center' }}>
                        <Typography
                          sx={{
                            fontSize: '0.8rem',
                            color: alpha(theme.palette.common.white, 0.6),
                          }}
                        >
                          {formatDate(issue.completedAt || issue.updatedAt)}
                        </Typography>
                      </TableCell>
                    </>
                  )}

                  {/* Watchlist action */}
                  <TableCell sx={{ ...bodyCellSx, textAlign: 'center', p: 0 }}>
                    <WatchlistButton
                      category="bounties"
                      itemKey={String(issue.id)}
                    />
                  </TableCell>
                </>
              );

              return href ? (
                <LinkTableRow
                  key={issue.id}
                  href={href}
                  linkState={linkState}
                  sx={rowSx}
                >
                  {cells}
                </LinkTableRow>
              ) : (
                <TableRow key={issue.id} sx={rowSx}>
                  {cells}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

export default IssuesList;
