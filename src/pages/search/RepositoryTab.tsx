import React from 'react';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { type Repository } from '../../api/models/Dashboard';
import { TIER_COLORS } from '../../theme';
import { getGithubAvatarSrc } from '../../utils';
import { type SearchRepositoryMetrics } from './searchData';
import {
  bodyCellSx,
  clickableRowSx,
  headerCellSx,
  tableCardSx,
  tableContainerSx,
  tablePaginationSx,
  tableSx,
} from './styles';

type RepositoryTabProps = {
  emptyLabel: string;
  isError: boolean;
  isLoading: boolean;
  onPageChange: (_event: unknown, newPage: number) => void;
  onRowsPerPageChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onSelectRepository: (fullName: string) => void;
  page: number;
  paginatedRepositoryResults: Repository[];
  rowsPerPage: number;
  rowsPerPageOptions: number[];
  repositoryMetricsByName: Map<string, SearchRepositoryMetrics>;
  repositoryRankByName: Map<string, number>;
  repositoryResults: Repository[];
};

const RepositoryTab: React.FC<RepositoryTabProps> = ({
  emptyLabel,
  isError,
  isLoading,
  onPageChange,
  onRowsPerPageChange,
  onSelectRepository,
  page,
  paginatedRepositoryResults,
  rowsPerPage,
  rowsPerPageOptions,
  repositoryMetricsByName,
  repositoryRankByName,
  repositoryResults,
}) => (
  <Card elevation={0} sx={tableCardSx}>
    {isLoading && (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )}
    {isError && !isLoading && (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load repositories for search.
      </Alert>
    )}
    {!isLoading && !isError && repositoryResults.length === 0 ? (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">{emptyLabel}</Typography>
      </Box>
    ) : null}
    {!isLoading && !isError && repositoryResults.length > 0 ? (
      <>
        <TableContainer sx={tableContainerSx}>
          <Table stickyHeader size="small" sx={{ ...tableSx, minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: 56,
                    backgroundColor: theme.palette.background.paper,
                  })}
                >
                  Rank
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '38%',
                    backgroundColor: theme.palette.background.paper,
                  })}
                >
                  Repository
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '14%',
                    textAlign: 'right',
                    backgroundColor: theme.palette.background.paper,
                  })}
                >
                  Weight
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '16%',
                    textAlign: 'right',
                    backgroundColor: theme.palette.background.paper,
                  })}
                >
                  Total Score
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '12%',
                    textAlign: 'right',
                    backgroundColor: theme.palette.background.paper,
                  })}
                >
                  PRs
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '12%',
                    textAlign: 'right',
                    backgroundColor: theme.palette.background.paper,
                  })}
                >
                  Contributors
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRepositoryResults.map((repo) => {
                const rank = repositoryRankByName.get(
                  repo.fullName.toLowerCase(),
                );
                const metrics = repositoryMetricsByName.get(
                  repo.fullName.toLowerCase(),
                );

                return (
                  <TableRow
                    key={repo.fullName}
                    onClick={() => onSelectRepository(repo.fullName)}
                    sx={(theme) => ({
                      ...clickableRowSx(theme),
                      '&:hover': {
                        backgroundColor: theme.palette.surface.light,
                      },
                    })}
                  >
                    <TableCell
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        width: 56,
                        pr: 0,
                      })}
                    >
                      <Box sx={(theme) => getRankBadgeSx(theme, rank ?? 0)}>
                        <Typography
                          component="span"
                          sx={(theme) => ({
                            color: getRankTextColor(theme, rank ?? 0),
                            fontFamily:
                              theme.typography.mono.fontFamily ||
                              theme.typography.fontFamily,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            lineHeight: 1,
                          })}
                        >
                          {rank ?? '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        width: '38%',
                        pl: 1.5,
                      })}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.25,
                          minWidth: 0,
                        }}
                      >
                        <Avatar
                          src={getGithubAvatarSrc(repo.owner)}
                          alt={repo.owner}
                          sx={(theme) => ({
                            width: 22,
                            height: 22,
                            border: `1px solid ${theme.palette.border.light}`,
                            backgroundColor: getRepositoryOwnerAccent(),
                          })}
                        />
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            minWidth: 0,
                          }}
                        >
                          <Tooltip title={repo.fullName} placement="top">
                            <Typography
                              component="span"
                              sx={(theme) => ({
                                color: theme.palette.text.primary,
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              })}
                            >
                              {repo.fullName}
                            </Typography>
                          </Tooltip>
                          <Box
                            component="span"
                            sx={(theme) =>
                              repositoryTierLabelSx(theme, repo.tier)
                            }
                          >
                            {repo.tier || 'Unranked'}
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        width: '14%',
                        textAlign: 'right',
                        fontWeight: 600,
                      })}
                    >
                      {Number(repo.weight).toFixed(2)}
                    </TableCell>
                    <TableCell
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        width: '16%',
                        textAlign: 'right',
                        fontWeight: 600,
                        color:
                          (metrics?.totalScore || 0) > 0
                            ? theme.palette.text.primary
                            : theme.palette.text.secondary,
                      })}
                    >
                      {(metrics?.totalScore || 0) > 0
                        ? metrics?.totalScore.toFixed(2)
                        : '-'}
                    </TableCell>
                    <TableCell
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        width: '12%',
                        textAlign: 'right',
                        fontWeight: 600,
                        color:
                          (metrics?.totalPRs || 0) > 0
                            ? theme.palette.text.primary
                            : theme.palette.text.secondary,
                      })}
                    >
                      {(metrics?.totalPRs || 0) > 0 ? metrics?.totalPRs : '-'}
                    </TableCell>
                    <TableCell
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        width: '12%',
                        textAlign: 'right',
                        fontWeight: 600,
                        color:
                          (metrics?.contributors || 0) > 0
                            ? theme.palette.text.primary
                            : theme.palette.text.secondary,
                      })}
                    >
                      {(metrics?.contributors || 0) > 0
                        ? metrics?.contributors
                        : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={repositoryResults.length}
          labelRowsPerPage="Rows"
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          onRowsPerPageChange={onRowsPerPageChange}
          showFirstButton
          showLastButton
          sx={tablePaginationSx}
        />
      </>
    ) : null}
  </Card>
);

const getRankBadgeSx = (theme: Theme, rank: number) => ({
  backgroundColor: theme.palette.background.default,
  borderRadius: 0.5,
  width: '22px',
  height: '22px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  border: '1px solid',
  borderColor:
    rank === 1
      ? alpha(TIER_COLORS.gold, 0.4)
      : rank === 2
        ? alpha(TIER_COLORS.silver, 0.4)
        : rank === 3
          ? alpha(TIER_COLORS.bronze, 0.4)
          : theme.palette.border.light,
  boxShadow:
    rank === 1
      ? `0 0 12px ${alpha(TIER_COLORS.gold, 0.4)}, 0 0 4px ${alpha(TIER_COLORS.gold, 0.2)}`
      : rank === 2
        ? `0 0 12px ${alpha(TIER_COLORS.silver, 0.4)}, 0 0 4px ${alpha(TIER_COLORS.silver, 0.2)}`
        : rank === 3
          ? `0 0 12px ${alpha(TIER_COLORS.bronze, 0.4)}, 0 0 4px ${alpha(TIER_COLORS.bronze, 0.2)}`
          : 'none',
});

const getRankTextColor = (theme: Theme, rank: number) => {
  if (rank === 1) return TIER_COLORS.gold;
  if (rank === 2) return TIER_COLORS.silver;
  if (rank === 3) return TIER_COLORS.bronze;
  return theme.palette.text.secondary;
};

const getRepositoryOwnerAccent = () => 'transparent';

const repositoryTierLabelSx = (
  theme: Parameters<typeof bodyCellSx>[0],
  tier?: string,
) => {
  const normalizedTier = (tier || '').toLowerCase();
  const tierPalette = {
    gold: {
      color: TIER_COLORS.gold,
      borderColor: alpha(TIER_COLORS.gold, 0.4),
      backgroundColor: alpha(TIER_COLORS.gold, 0.08),
    },
    silver: {
      color: TIER_COLORS.silver,
      borderColor: alpha(TIER_COLORS.silver, 0.35),
      backgroundColor: alpha(TIER_COLORS.silver, 0.08),
    },
    bronze: {
      color: TIER_COLORS.bronze,
      borderColor: alpha(TIER_COLORS.bronze, 0.35),
      backgroundColor: alpha(TIER_COLORS.bronze, 0.08),
    },
  }[normalizedTier] || {
    color: theme.palette.text.secondary,
    borderColor: theme.palette.border.light,
    backgroundColor: theme.palette.surface.subtle,
  };

  return {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid',
    borderRadius: 1.25,
    px: 1,
    py: 0.35,
    fontFamily: theme.typography.mono.fontFamily,
    fontSize: '0.72rem',
    fontWeight: 600,
    lineHeight: 1,
    textTransform: 'uppercase',
    ...tierPalette,
  };
};

export default RepositoryTab;
