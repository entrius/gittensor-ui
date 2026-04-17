import React, { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import { useRepositoryIssues, useRepoIssues } from '../../api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatTokenAmount } from '../../utils/format';
import {
  getIssueStatusMeta,
  getBountyAmountColor,
} from '../../utils/issueStatus';
import { readEnumParam, writeEnumParam } from '../../utils/urlTableState';
import {
  STATUS_COLORS,
  TEXT_OPACITY,
  scrollbarSx,
  headerCellStyle,
  bodyCellStyle,
} from '../../theme';
import FilterButton from '../FilterButton';

type IssueStatusFilter = 'all' | 'open' | 'closed';
const ISSUE_STATUS_FILTERS: readonly IssueStatusFilter[] = [
  'all',
  'open',
  'closed',
];
const DEFAULT_ISSUE_FILTER: IssueStatusFilter = 'all';
const ISSUE_FILTER_PARAM = 'issueStatus';

interface RepositoryIssuesTableProps {
  repositoryFullName: string;
}

const RepositoryIssuesTable: React.FC<RepositoryIssuesTableProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: issues, isLoading } = useRepositoryIssues(repositoryFullName);
  const { data: bounties } = useRepoIssues(repositoryFullName);

  const filter = readEnumParam<IssueStatusFilter>(
    searchParams,
    ISSUE_FILTER_PARAM,
    ISSUE_STATUS_FILTERS,
    DEFAULT_ISSUE_FILTER,
  );
  const setFilter = useCallback(
    (next: IssueStatusFilter) => {
      setSearchParams(
        (prev) =>
          writeEnumParam(prev, ISSUE_FILTER_PARAM, next, DEFAULT_ISSUE_FILTER),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const counts = useMemo(() => {
    if (!issues) return { total: 0, open: 0, closed: 0 };
    return {
      total: issues.length,
      open: issues.filter((issue) => !issue.closedAt).length,
      closed: issues.filter((issue) => issue.closedAt).length,
    };
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    if (filter === 'all') return issues;
    if (filter === 'open') return issues.filter((issue) => !issue.closedAt);
    if (filter === 'closed') return issues.filter((issue) => issue.closedAt);
    return issues;
  }, [issues, filter]);

  const sortedIssues = useMemo(
    () =>
      [...filteredIssues].sort((a, b) => {
        // Sort by creation date, most recent first
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }),
    [filteredIssues],
  );

  if (isLoading) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.border.light}`,
          backgroundColor: 'transparent',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              color: 'text.primary',
            }}
          >
            Issues
          </Typography>
        </Box>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Bounties Section */}
      {bounties && bounties.length > 0 && (
        <Card
          sx={{
            borderRadius: 3,
            border: `1px solid ${theme.palette.border.light}`,
            backgroundColor: 'transparent',
            p: 0,
            overflow: 'hidden',
          }}
          elevation={0}
        >
          <Box
            sx={{
              p: 3,
              borderBottom: `1px solid ${theme.palette.border.light}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: 'text.primary',
                fontSize: '1.1rem',
                fontWeight: 500,
              }}
            >
              Bounties ({bounties.length})
            </Typography>
          </Box>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {bounties.map((bounty) => {
              const meta = getIssueStatusMeta(bounty.status);
              return (
                <Box
                  key={bounty.id}
                  onClick={() =>
                    navigate(`/bounties/details?id=${bounty.id}`, {
                      state: { backLabel: `Back to ${repositoryFullName}` },
                    })
                  }
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                    backgroundColor: 'surface.subtle',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'surface.light',
                      borderColor: alpha(theme.palette.common.white, 0.15),
                      transform: 'translateX(2px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      minWidth: 0,
                    }}
                  >
                    <Chip
                      label={meta.text}
                      size="small"
                      sx={{
                        backgroundColor: meta.bgColor,
                        color: meta.color,
                        border: `1px solid ${meta.borderColor}`,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        height: '22px',
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                    <Typography
                      sx={{
                        color: STATUS_COLORS.open,
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      #{bounty.issueNumber}
                    </Typography>
                    <Typography
                      sx={{
                        color: 'text.primary',
                        fontSize: '0.85rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {issues?.find(
                        (i) =>
                          i.number === bounty.issueNumber &&
                          i.repositoryFullName === bounty.repositoryFullName,
                      )?.title || `${repositoryFullName}#${bounty.issueNumber}`}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        color: getBountyAmountColor(
                          bounty.status,
                          alpha(theme.palette.common.white, TEXT_OPACITY.muted),
                        ),
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      {`${formatTokenAmount(bounty.targetBounty)} ل`}
                    </Typography>
                    <ArrowForwardIcon
                      sx={{
                        color: alpha(
                          theme.palette.common.white,
                          TEXT_OPACITY.ghost,
                        ),
                        fontSize: 16,
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Card>
      )}

      {/* GitHub Issues Table */}
      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.border.light}`,
          backgroundColor: 'transparent',
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        elevation={0}
      >
        <Box
          sx={{
            p: 3,
            borderBottom: `1px solid ${theme.palette.border.light}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: 'text.primary',
              fontSize: '1.1rem',
              fontWeight: 500,
            }}
          >
            Issues ({sortedIssues.length})
          </Typography>

          <Stack direction="row" spacing={1}>
            <FilterButton
              label="All"
              isActive={filter === 'all'}
              onClick={() => setFilter('all')}
              count={counts.total}
              color={STATUS_COLORS.open}
              activeTextColor="text.primary"
            />
            <FilterButton
              label="Open"
              isActive={filter === 'open'}
              onClick={() => setFilter('open')}
              count={counts.open}
              color={STATUS_COLORS.open}
              activeTextColor="text.primary"
            />
            <FilterButton
              label="Closed"
              isActive={filter === 'closed'}
              onClick={() => setFilter('closed')}
              count={counts.closed}
              color={STATUS_COLORS.merged}
              activeTextColor="text.primary"
            />
          </Stack>
        </Box>

        {sortedIssues.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography
              sx={{
                color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
                fontSize: '0.9rem',
              }}
            >
              No issues found
            </Typography>
          </Box>
        ) : (
          <TableContainer
            sx={{
              maxHeight: '500px',
              overflow: 'auto',
              ...scrollbarSx,
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellStyle}>Issue #</TableCell>
                  <TableCell sx={headerCellStyle}>Title</TableCell>
                  <TableCell sx={headerCellStyle}>Status</TableCell>
                  <TableCell sx={headerCellStyle}>Linked PR</TableCell>
                  <TableCell align="right" sx={headerCellStyle}>
                    Created
                  </TableCell>
                  <TableCell align="right" sx={headerCellStyle}>
                    Closed
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedIssues.map((issue, index) => {
                  const isOpen = !issue.closedAt;
                  return (
                    <TableRow
                      key={`${issue.number}-${index}`}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'surface.light',
                        },
                        transition: 'background-color 0.2s',
                      }}
                      onClick={() => {
                        window.open(
                          `https://github.com/${issue.repositoryFullName}/issues/${issue.number}`,
                          '_blank',
                        );
                      }}
                    >
                      <TableCell sx={bodyCellStyle}>
                        <a
                          href={`https://github.com/${issue.repositoryFullName}/issues/${issue.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'inherit',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          #{issue.number}
                        </a>
                      </TableCell>
                      <TableCell sx={bodyCellStyle}>
                        <Box
                          sx={{
                            maxWidth: '400px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {issue.title}
                        </Box>
                      </TableCell>
                      <TableCell sx={bodyCellStyle}>
                        <Chip
                          variant="status"
                          icon={
                            isOpen ? (
                              <RadioButtonUncheckedIcon />
                            ) : (
                              <CheckCircleIcon />
                            )
                          }
                          label={isOpen ? 'OPEN' : 'CLOSED'}
                          sx={{
                            color: isOpen
                              ? STATUS_COLORS.open
                              : STATUS_COLORS.merged,
                            borderColor: isOpen
                              ? STATUS_COLORS.open
                              : STATUS_COLORS.merged,
                            '& .MuiChip-icon': { color: 'inherit' },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellStyle}>
                        {issue.prNumber ? (
                          <a
                            href={`https://github.com/${issue.repositoryFullName}/pull/${issue.prNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: STATUS_COLORS.info,
                              textDecoration: 'none',
                              fontWeight: 500,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            #{issue.prNumber}
                          </a>
                        ) : (
                          <span
                            style={{
                              color: alpha(
                                theme.palette.common.white,
                                TEXT_OPACITY.faint,
                              ),
                            }}
                          >
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={bodyCellStyle}>
                        {issue.createdAt
                          ? new Date(issue.createdAt).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell align="right" sx={bodyCellStyle}>
                        {issue.closedAt
                          ? new Date(issue.closedAt).toLocaleDateString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
};

export default RepositoryIssuesTable;
