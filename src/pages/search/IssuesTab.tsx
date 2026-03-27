import React from 'react';
import {
  Alert,
  Avatar,
  Box,
  Card,
  Chip,
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
import { type IssueBounty } from '../../api/models/Issues';
import { STATUS_COLORS } from '../../theme';
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

type IssuesTabProps = {
  emptyLabel: string;
  isError: boolean;
  isLoading: boolean;
  issueResults: IssueBounty[];
  onPageChange: (_event: unknown, newPage: number) => void;
  onRowsPerPageChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onSelectIssue: (id: number) => void;
  page: number;
  paginatedIssueResults: IssueBounty[];
  rowsPerPage: number;
  rowsPerPageOptions: number[];
};

const getStatusBadge = (
  status: IssueBounty['status'],
): { color: string; bgColor: string; text: string } => {
  switch (status) {
    case 'registered':
      return {
        color: STATUS_COLORS.warning,
        bgColor: 'rgba(245, 158, 11, 0.15)',
        text: 'Pending',
      };
    case 'active':
      return {
        color: STATUS_COLORS.info,
        bgColor: 'rgba(88, 166, 255, 0.15)',
        text: 'Available',
      };
    case 'completed':
      return {
        color: STATUS_COLORS.merged,
        bgColor: 'rgba(63, 185, 80, 0.15)',
        text: 'Completed',
      };
    case 'cancelled':
      return {
        color: STATUS_COLORS.error,
        bgColor: 'rgba(239, 68, 68, 0.15)',
        text: 'Cancelled',
      };
    default:
      return {
        color: STATUS_COLORS.open,
        bgColor: 'rgba(139, 148, 158, 0.15)',
        text: status,
      };
  }
};

const IssuesTab: React.FC<IssuesTabProps> = ({
  emptyLabel,
  isError,
  isLoading,
  issueResults,
  onPageChange,
  onRowsPerPageChange,
  onSelectIssue,
  page,
  paginatedIssueResults,
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
        Failed to load issues for search.
      </Alert>
    )}
    {!isLoading && !isError && issueResults.length === 0 ? (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">{emptyLabel}</Typography>
      </Box>
    ) : null}
    {!isLoading && !isError && issueResults.length > 0 ? (
      <>
        <TableContainer sx={tableContainerSx}>
          <Table stickyHeader size="small" sx={{ ...tableSx, minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: 100,
                  })}
                >
                  Issue #
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
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '42%',
                  })}
                >
                  Issue
                </TableCell>
                <TableCell
                  sx={(theme) => ({
                    ...headerCellSx(theme),
                    width: '18%',
                    textAlign: 'center',
                  })}
                >
                  Status
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedIssueResults.map((issue) => {
                const statusBadge = getStatusBadge(issue.status);
                const repositoryOwner = issue.repositoryFullName.split('/')[0];

                return (
                  <TableRow
                    key={issue.id}
                    onClick={() => onSelectIssue(issue.id)}
                    sx={(theme) => clickableRowSx(theme)}
                  >
                    <TableCell
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        color: theme.palette.text.secondary,
                      })}
                    >
                      #{issue.issueNumber}
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
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
                          sx={{ width: 22, height: 22, borderRadius: 1 }}
                        />
                        <Tooltip
                          title={issue.repositoryFullName}
                          placement="top"
                        >
                          <Typography
                            sx={(theme) => ({
                              fontFamily: theme.typography.mono.fontFamily,
                              fontSize: '0.85rem',
                              color: STATUS_COLORS.info,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            })}
                          >
                            {issue.repositoryFullName}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                          minWidth: 0,
                        }}
                      >
                        <Tooltip
                          title={issue.title || 'Untitled issue'}
                          placement="top"
                        >
                          <Typography
                            sx={(theme) => ({
                              fontFamily: theme.typography.mono.fontFamily,
                              fontSize: '0.85rem',
                              color: theme.palette.text.primary,
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            })}
                          >
                            {issue.title || 'Untitled issue'}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={(theme) => ({
                        ...bodyCellSx(theme),
                        textAlign: 'center',
                      })}
                    >
                      <Chip
                        label={statusBadge.text}
                        size="small"
                        sx={(theme) => ({
                          fontFamily: theme.typography.mono.fontFamily,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: statusBadge.bgColor,
                          color: statusBadge.color,
                          border: `1px solid ${statusBadge.color}40`,
                        })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={issueResults.length}
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

export default IssuesTab;
