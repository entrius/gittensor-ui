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
import { type CommitLog } from '../../api/models/Dashboard';
import { getGithubAvatarSrc } from '../../utils';
import {
  bodyCellSx,
  clickableRowSx,
  headerCellSx,
  tableCardSx,
  tableContainerSx,
  tablePaginationSx,
  tableSx,
} from './styles';

type PullRequestsTabProps = {
  emptyLabel: string;
  isError: boolean;
  isLoading: boolean;
  onPageChange: (_event: unknown, newPage: number) => void;
  onRowsPerPageChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onSelectPr: (repository: string, pullRequestNumber: number) => void;
  page: number;
  paginatedPrResults: CommitLog[];
  prResults: CommitLog[];
  rowsPerPage: number;
  rowsPerPageOptions: number[];
};

const formatPrScore = (pr: CommitLog) => {
  if (pr.prState === 'CLOSED' && !pr.mergedAt) return '-';
  if (!pr.score) return '-';

  return Number(pr.score).toFixed(4);
};

const formatPrDateOrStatus = (pr: CommitLog) => {
  if (pr.mergedAt) return new Date(pr.mergedAt).toLocaleDateString();
  if (pr.prState === 'CLOSED') return 'Closed';
  return 'Open';
};

const PullRequestsTab: React.FC<PullRequestsTabProps> = ({
  emptyLabel,
  isError,
  isLoading,
  onPageChange,
  onRowsPerPageChange,
  onSelectPr,
  page,
  paginatedPrResults,
  prResults,
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
        Failed to load pull requests for search.
      </Alert>
    )}
    {!isLoading && !isError && prResults.length === 0 ? (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">{emptyLabel}</Typography>
      </Box>
    ) : null}
    {!isLoading && !isError && prResults.length > 0 ? (
      <>
        <TableContainer sx={tableContainerSx}>
          <Table stickyHeader size="small" sx={{ ...tableSx, minWidth: 960 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: 96,
                  })}
                >
                  PR #
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '32%',
                  })}
                >
                  Title
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '30%',
                  })}
                >
                  Repository
                </TableCell>
                <TableCell
                  align="right"
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '12%',
                  })}
                >
                  +/-
                </TableCell>
                <TableCell
                  align="right"
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '12%',
                  })}
                >
                  Score
                </TableCell>
                <TableCell
                  align="right"
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '14%',
                  })}
                >
                  Date
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPrResults.map((pr) => {
                const repositoryOwner = pr.repository.split('/')[0];

                return (
                  <TableRow
                    key={`${pr.repository}-${pr.pullRequestNumber}`}
                    onClick={() =>
                      onSelectPr(pr.repository, pr.pullRequestNumber)
                    }
                    sx={(theme) => clickableRowSx(theme)}
                  >
                    <TableCell
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        fontWeight: 600,
                      })}
                    >
                      #{pr.pullRequestNumber}
                    </TableCell>
                    <TableCell
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        pr: 2,
                      })}
                    >
                      <Tooltip
                        title={pr.pullRequestTitle || 'Untitled pull request'}
                        placement="top"
                      >
                        <Typography
                          sx={(theme) => ({
                            fontFamily: theme.typography.mono.fontFamily,
                            fontSize: '0.85rem',
                            color: theme.palette.text.primary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: { xs: 180, md: 500 },
                          })}
                        >
                          {pr.pullRequestTitle || 'Untitled pull request'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        pr: 2,
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
                          src={getGithubAvatarSrc(repositoryOwner)}
                          alt={repositoryOwner}
                          sx={(theme) => ({
                            width: 22,
                            height: 22,
                            flexShrink: 0,
                            border: `1px solid ${theme.palette.border.light}`,
                            backgroundColor: 'transparent',
                          })}
                        />
                        <Tooltip title={pr.repository} placement="top">
                          <Typography
                            component="span"
                            sx={(theme) => ({
                              color: theme.palette.text.primary,
                              fontWeight: 600,
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            })}
                          >
                            {pr.repository}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={bodyCellSx}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Box
                          component="span"
                          sx={(theme) => ({
                            color: theme.palette.diff.additions,
                            fontFamily: theme.typography.mono.fontFamily,
                          })}
                        >
                          +{pr.additions || 0}
                        </Box>
                        <Box
                          component="span"
                          sx={(theme) => ({
                            color: theme.palette.diff.deletions,
                            fontFamily: theme.typography.mono.fontFamily,
                          })}
                        >
                          -{pr.deletions || 0}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        fontWeight: 600,
                      })}
                    >
                      {formatPrScore(pr)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        color: theme.palette.text.secondary,
                      })}
                    >
                      {formatPrDateOrStatus(pr)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={prResults.length}
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

export default PullRequestsTab;
