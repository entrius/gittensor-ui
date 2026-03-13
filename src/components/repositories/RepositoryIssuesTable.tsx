import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Button,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import { useRepositoryIssues, useRepoIssues } from '../../api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatTokenAmount } from '../../utils/format';
import { STATUS_COLORS } from '../../theme';

interface RepositoryIssuesTableProps {
  repositoryFullName: string;
}

const RepositoryIssuesTable: React.FC<RepositoryIssuesTableProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
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

  const FilterButton = ({
    label,
    value,
    count,
    color,
  }: {
    label: string;
    value: typeof filter;
    count?: number;
    color: string;
  }) => (
    <Button
      size="small"
      onClick={() => setFilter(value)}
      sx={{
        color:
          filter === value
            ? theme.palette.text.primary
            : theme.palette.text.secondary,
        backgroundColor:
          filter === value ? theme.palette.surface.subtle : 'transparent',
        borderRadius: '6px',
        px: 2,
        minWidth: 'auto',
        textTransform: 'none',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.8rem',
        border:
          filter === value ? `1px solid ${color}` : '1px solid transparent',
        '&:hover': {
          backgroundColor: theme.palette.surface.light,
        },
      }}
    >
      {label}{' '}
      {count !== undefined && (
        <span style={{ opacity: 0.6, marginLeft: '6px', fontSize: '0.75rem' }}>
          {count}
        </span>
      )}
    </Button>
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
                  bg: 'rgba(88, 166, 255, 0.15)',
                  border: 'rgba(88, 166, 255, 0.4)',
                  text: STATUS_COLORS.info,
                };
              case 'completed':
                return {
                  bg: 'rgba(63, 185, 80, 0.15)',
                  border: 'rgba(63, 185, 80, 0.4)',
                  text: STATUS_COLORS.merged,
                };
              case 'registered':
                return {
                  bg: 'rgba(245, 158, 11, 0.15)',
                  border: 'rgba(245, 158, 11, 0.4)',
                  text: STATUS_COLORS.warning,
                };
              case 'cancelled':
                return {
                  bg: 'rgba(239, 68, 68, 0.15)',
                  border: 'rgba(239, 68, 68, 0.4)',
                  text: STATUS_COLORS.error,
                };
              default:
                return {
                  bg: 'rgba(139, 148, 158, 0.15)',
                  border: 'rgba(139, 148, 158, 0.4)',
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
                return alpha(theme.palette.text.primary, 0.4);
              default:
                return alpha(theme.palette.text.primary, 0.6);
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
                    <Box
                      key={bounty.id}
                      onClick={() =>
                        navigate(`/issues/details?id=${bounty.id}`, {
                          state: { backLabel: `Back to ${repositoryFullName}` },
                        })
                      }
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.border.subtle}`,
                        backgroundColor: theme.palette.surface.subtle,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: theme.palette.surface.light,
                          borderColor: theme.palette.border.light,
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
                            color: theme.palette.text.primary,
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
                            color: theme.palette.text.disabled,
                            fontSize: 16,
                          }}
                        />
                      </Box>
                    </Box>
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
              value="all"
              count={counts.total}
              color={STATUS_COLORS.open}
            />
            <FilterButton
              label="Open"
              value="open"
              count={counts.open}
              color={STATUS_COLORS.open}
            />
            <FilterButton
              label="Closed"
              value="closed"
              count={counts.closed}
              color={STATUS_COLORS.merged}
            />
          </Stack>
        </Box>

        {sortedIssues.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography
              sx={{
                color: 'text.secondary',
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
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.border.light,
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: theme.palette.border.medium,
                },
              },
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={getHeaderCellStyle(theme)}>Issue #</TableCell>
                  <TableCell sx={getHeaderCellStyle(theme)}>Title</TableCell>
                  <TableCell sx={getHeaderCellStyle(theme)}>Status</TableCell>
                  <TableCell sx={getHeaderCellStyle(theme)}>
                    Linked PR
                  </TableCell>
                  <TableCell align="right" sx={getHeaderCellStyle(theme)}>
                    Created
                  </TableCell>
                  <TableCell align="right" sx={getHeaderCellStyle(theme)}>
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
                          backgroundColor: theme.palette.surface.subtle,
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
                      <TableCell sx={getBodyCellStyle(theme)}>
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
                      <TableCell sx={getBodyCellStyle(theme)}>
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
                      <TableCell sx={getBodyCellStyle(theme)}>
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
                      <TableCell sx={getBodyCellStyle(theme)}>
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
                          <span style={{ color: theme.palette.text.disabled }}>
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={getBodyCellStyle(theme)}>
                        {issue.createdAt
                          ? new Date(issue.createdAt).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell align="right" sx={getBodyCellStyle(theme)}>
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getHeaderCellStyle = (t: any) => ({
  backgroundColor:
    t.palette.mode === 'dark'
      ? 'rgba(18, 18, 20, 0.95)'
      : 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(8px)',
  color: alpha(t.palette.text.primary, 0.7),
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: '0.75rem',
  borderBottom: `1px solid ${t.palette.border.light}`,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getBodyCellStyle = (t: any) => ({
  color: t.palette.text.primary,
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: `1px solid ${t.palette.border.light}`,
  fontSize: '0.85rem',
});

export default RepositoryIssuesTable;
