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
import { alpha } from '@mui/material/styles';
import { CREDIBILITY_COLORS, TIER_COLORS } from '../../theme';
import { getGithubAvatarSrc } from '../../utils';
import { type SearchMiner } from './searchData';
import {
  bodyCellSx,
  clickableRowSx,
  headerCellSx,
  tableCardSx,
  tableContainerSx,
  tablePaginationSx,
  tableSx,
} from './styles';

type MinerTabProps = {
  emptyLabel: string;
  isError: boolean;
  isLoading: boolean;
  minerResults: SearchMiner[];
  onPageChange: (_event: unknown, newPage: number) => void;
  onRowsPerPageChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onSelectMiner: (githubId: string) => void;
  page: number;
  paginatedMinerResults: SearchMiner[];
  rowsPerPage: number;
  rowsPerPageOptions: number[];
};

const MinerTab: React.FC<MinerTabProps> = ({
  emptyLabel,
  isError,
  isLoading,
  minerResults,
  onPageChange,
  onRowsPerPageChange,
  onSelectMiner,
  page,
  paginatedMinerResults,
  rowsPerPage,
  rowsPerPageOptions,
}) => (
  <Card elevation={0} sx={tableCardSx}>
    {isLoading && (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )}
    {isError && !isLoading && (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load miners for search.
      </Alert>
    )}
    {!isLoading && !isError && minerResults.length === 0 ? (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">{emptyLabel}</Typography>
      </Box>
    ) : null}
    {!isLoading && !isError && minerResults.length > 0 ? (
      <>
        <TableContainer sx={tableContainerSx}>
          <Table stickyHeader size="small" sx={{ ...tableSx, minWidth: 980 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: 72,
                  })}
                >
                  Rank
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '28%',
                  })}
                >
                  Miner
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '12%',
                  })}
                >
                  Tier
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '14%',
                    textAlign: 'right',
                  })}
                >
                  Credibility
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '14%',
                    textAlign: 'right',
                  })}
                >
                  Token Score
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '12%',
                    textAlign: 'right',
                  })}
                >
                  PRs
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '14%',
                    textAlign: 'right',
                  })}
                >
                  Score
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedMinerResults.map((miner) => (
                <TableRow
                  key={miner.githubId}
                  onClick={() => onSelectMiner(miner.githubId)}
                  sx={(theme) => clickableRowSx(theme)}
                >
                  <TableCell
                    sx={(theme) => ({
                      ...bodyCellSx(theme),
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color:
                        miner.leaderboardRank > 0
                          ? theme.palette.text.primary
                          : theme.palette.text.secondary,
                    })}
                  >
                    {miner.leaderboardRank > 0
                      ? `#${miner.leaderboardRank}`
                      : '-'}
                  </TableCell>
                  <TableCell
                    sx={(theme) => ({
                      ...bodyCellSx(theme),
                      minWidth: 260,
                    })}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        minWidth: 0,
                      }}
                    >
                      <Avatar
                        src={getGithubAvatarSrc(miner.githubUsername)}
                        sx={(theme) => ({
                          width: 32,
                          height: 32,
                          border: `1px solid ${theme.palette.border.light}`,
                        })}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Tooltip
                          title={miner.githubUsername || miner.githubId}
                          placement="top"
                        >
                          <Typography
                            sx={(theme) => ({
                              fontFamily: theme.typography.mono.fontFamily,
                              fontSize: '0.95rem',
                              fontWeight: 600,
                              color: theme.palette.text.primary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            })}
                          >
                            {miner.githubUsername || miner.githubId}
                          </Typography>
                        </Tooltip>
                        <Typography
                          sx={(theme) => ({
                            fontFamily: theme.typography.mono.fontFamily,
                            fontSize: '0.72rem',
                            color: theme.palette.text.secondary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          })}
                        >
                          GitHub ID · {miner.githubId}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={bodyCellSx}>
                    {miner.currentTier ? (
                      <Box
                        component="span"
                        sx={(theme) =>
                          minerTierLabelSx(theme, miner.currentTier)
                        }
                      >
                        {miner.currentTier}
                      </Box>
                    ) : null}
                  </TableCell>
                  <TableCell
                    sx={(theme) => ({
                      ...bodyCellSx(theme),
                      textAlign: 'right',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color:
                        miner.credibility > 0
                          ? getCredibilityColor(miner.credibility)
                          : theme.palette.text.secondary,
                    })}
                  >
                    {miner.credibility > 0
                      ? `${(miner.credibility * 100).toFixed(1)}%`
                      : '-'}
                  </TableCell>
                  <TableCell
                    sx={(theme) => ({
                      ...bodyCellSx(theme),
                      textAlign: 'right',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color:
                        miner.totalTokenScore > 0
                          ? theme.palette.text.primary
                          : theme.palette.text.secondary,
                    })}
                  >
                    {miner.totalTokenScore > 0
                      ? miner.totalTokenScore.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })
                      : '-'}
                  </TableCell>
                  <TableCell
                    sx={(theme) => ({
                      ...bodyCellSx(theme),
                      textAlign: 'right',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color:
                        miner.totalPrs > 0
                          ? theme.palette.text.primary
                          : theme.palette.text.secondary,
                    })}
                  >
                    {miner.totalPrs > 0 ? miner.totalPrs.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell
                    sx={(theme) => ({
                      ...bodyCellSx(theme),
                      textAlign: 'right',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    })}
                  >
                    {miner.totalScore.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={minerResults.length}
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

const getCredibilityColor = (credibility: number) => {
  if (credibility >= 0.9) return CREDIBILITY_COLORS.excellent;
  if (credibility >= 0.7) return CREDIBILITY_COLORS.good;
  if (credibility >= 0.5) return CREDIBILITY_COLORS.moderate;
  if (credibility >= 0.3) return CREDIBILITY_COLORS.low;
  return CREDIBILITY_COLORS.poor;
};

const minerTierLabelSx = (
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

export default MinerTab;
