import React, { useMemo, useState } from 'react';
import { LinkBox, linkResetSx } from '../common/linkBehavior';
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
  STATUS_COLORS,
  TEXT_OPACITY,
  scrollbarSx,
  headerCellStyle,
  bodyCellStyle,
} from '../../theme';
import FilterButton from '../FilterButton';

interface RepositoryIssuesTableProps {
  repositoryFullName: string;
}

const RepositoryIssuesTable: React.FC<RepositoryIssuesTableProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const { data: issues, isLoading } = useRepositoryIssues(repositoryFullName);
  const { data: bounties } = useRepoIssues(repositoryFullName);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

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
              fontFamily: '"JetBrains Mono", monospace',
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
      {bounties &&
        bounties.length > 0 &&
        (() => {
          const getStatusColor = (status: string) => {
            switch (status) {
              case 'active':
                return {
                  bg: alpha(STATUS_COLORS.info, 0.15),
                  border: alpha(STATUS_COLORS.info, 0.4),
                  text: STATUS_COLORS.info,
                };
              case 'completed':
                return {
                  bg: alpha(STATUS_COLORS.merged, 0.15),
                  border: alpha(STATUS_COLORS.merged, 0.4),
                  text: STATUS_COLORS.merged,
                };
              case 'registered':
                return {
                  bg: alpha(STATUS_COLORS.warning, 0.15),
                  border: alpha(STATUS_COLORS.warning, 0.4),
                  text: STATUS_COLORS.warning,
                };
              case 'cancelled':
                return {
                  bg: alpha(STATUS_COLORS.error, 0.15),
                  border: alpha(STATUS_COLORS.error, 0.4),
                  text: STATUS_COLORS.error,
                };
              default:
                return {
                  bg: alpha(STATUS_COLORS.neutral, 0.15),
                  border: alpha(STATUS_COLORS.neutral, 0.4),
                  text: STATUS_COLORS.open,
                };
            }
          };
          const getStatusLabel = (status: string) => {
            switch (status) {
              case 'active':
                return 'Available';
              case 'completed':
                return 'Completed';
              case 'registered':
                return 'Pending';
              case 'cancelled':
                return 'Cancelled';
              default:
                return status;
            }
          };
          const getBountyAmountColor = (status: string) => {
            switch (status) {
              case 'active':
                return STATUS_COLORS.merged;
              case 'registered':
                return STATUS_COLORS.warning;
              case 'completed':
                return STATUS_COLORS.merged;
              case 'cancelled':
                return alpha(theme.palette.common.white, TEXT_OPACITY.muted);
              default:
                return alpha(theme.palette.common.white, 0.6);
            }
          };
          return (
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
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '1.1rem',
                    fontWeight: 500,
                  }}
                >
                  Bounties ({bounties.length})
                </Typography>
              </Box>
              <Box
                sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
              >
                {bounties.map((bounty) => {
                  const statusColors = getStatusColor(bounty.status);
                  return (
                    <LinkBox
                      key={bounty.id}
                      href={`/bounties/details?id=${bounty.id}`}
                      linkState={{ backLabel: `Back to ${repositoryFullName}` }}
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
                          label={getStatusLabel(bounty.status)}
                          size="small"
                          sx={{
                            backgroundColor: statusColors.bg,
                            color: statusColors.text,
                            border: `1px solid ${statusColors.border}`,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            fontFamily: '"JetBrains Mono", monospace',
                            height: '22px',
                            '& .MuiChip-label': { px: 1 },
                          }}
                        />
                        <Typography
                          sx={{
                            color: STATUS_COLORS.open,
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          #{bounty.issueNumber}
                        </Typography>
                        <Typography
                          sx={{
                            color: 'text.primary',
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.85rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {issues?.find(
                            (i) =>
                              i.number === bounty.issueNumber &&
                              i.repositoryFullName ===
                                bounty.repositoryFullName,
                          )?.title ||
                            `${repositoryFullName}#${bounty.issueNumber}`}
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
                            color: getBountyAmountColor(bounty.status),
                            fontFamily: '"JetBrains Mono", monospace',
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
                    </LinkBox>
                  );
                })}
              </Box>
            </Card>
          );
        })()}

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
              fontFamily: '"JetBrains Mono", monospace',
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
                fontFamily: '"JetBrains Mono", monospace',
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
                      component="a"
                      href={`https://github.com/${issue.repositoryFullName}/issues/${issue.number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        ...linkResetSx,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'surface.light',
                        },
                        transition: 'background-color 0.2s',
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
