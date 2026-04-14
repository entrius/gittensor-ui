import React from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Skeleton,
  Link,
  Tooltip,
  Avatar,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { IssueBounty } from '../../api/models/Issues';
import { useStats } from '../../api';
import { formatTokenAmount } from '../../utils/format';
import { STATUS_COLORS } from '../../theme';
import BountyProgress from './BountyProgress';
import {
  formatIssueDate,
  formatIssueUsdEstimate,
  getIssueStatusBadge,
} from './issueFormatting';

type ListType = 'available' | 'pending' | 'history';

interface IssuesListProps {
  issues: IssueBounty[];
  isLoading?: boolean;
  listType: ListType;
  onSelectIssue?: (id: number) => void;
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
  onSelectIssue,
}) => {
  const { data: dashStats } = useStats();
  const taoPrice = dashStats?.prices?.tao?.data?.price ?? 0;
  const alphaPrice = dashStats?.prices?.alpha?.data?.price ?? 0;

  const toUsd = (alphaAmount: string): string | null =>
    formatIssueUsdEstimate(alphaAmount, taoPrice, alphaPrice);
  const headerCellSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    color: 'rgba(255, 255, 255, 0.3)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    py: 1.5,
  };

  const bodyCellSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.85rem',
    color: 'text.primary',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    py: 1.5,
  };

  if (isLoading) {
    return (
      <Card
        sx={{
          backgroundColor: 'background.default',
          border: '1px solid rgba(255, 255, 255, 0.1)',
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
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          {emptyMessages[listType]}
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: 'background.default',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        overflow: 'hidden',
      }}
      elevation={0}
    >
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellSx, width: '60px' }}>ID</TableCell>
              <TableCell sx={{ ...headerCellSx, width: '220px' }}>
                Repository
              </TableCell>
              <TableCell sx={headerCellSx}>Issue</TableCell>

              {/* Available Issues columns */}
              {listType === 'available' && (
                <>
                  <TableCell
                    sx={{
                      ...headerCellSx,
                      textAlign: 'right',
                      width: '120px',
                    }}
                  >
                    Bounty
                  </TableCell>
                  <TableCell
                    sx={{
                      ...headerCellSx,
                      textAlign: 'center',
                      width: '100px',
                    }}
                  >
                    Status
                  </TableCell>
                </>
              )}

              {/* Pending Issues columns */}
              {listType === 'pending' && (
                <>
                  <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>
                    Target Bounty
                  </TableCell>
                  <TableCell
                    sx={{
                      ...headerCellSx,
                      textAlign: 'center',
                      width: '140px',
                    }}
                  >
                    Funding
                  </TableCell>
                  <TableCell sx={{ ...headerCellSx, textAlign: 'center' }}>
                    Status
                  </TableCell>
                </>
              )}

              {/* History columns */}
              {listType === 'history' && (
                <>
                  <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>
                    Payout
                  </TableCell>
                  <TableCell sx={{ ...headerCellSx, textAlign: 'center' }}>
                    Solver
                  </TableCell>
                  <TableCell sx={{ ...headerCellSx, textAlign: 'center' }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ ...headerCellSx, textAlign: 'center' }}>
                    Date
                  </TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {issues.map((issue) => {
              const statusBadge = getIssueStatusBadge(issue.status);

              return (
                <TableRow
                  key={issue.id}
                  onClick={() => onSelectIssue?.(issue.id)}
                  sx={{
                    cursor: onSelectIssue ? 'pointer' : 'default',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    },
                  }}
                >
                  {/* Common columns */}
                  <TableCell sx={bodyCellSx}>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.8rem',
                        color: 'rgba(255, 255, 255, 0.6)',
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
                          fontFamily: '"JetBrains Mono", monospace',
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
                            fontFamily: '"JetBrains Mono", monospace',
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
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.5)',
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
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: STATUS_COLORS.merged,
                          }}
                        >
                          {formatTokenAmount(issue.targetBounty)} ل
                        </Typography>
                        {toUsd(issue.targetBounty) && (
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.7rem',
                              color: 'rgba(255, 255, 255, 0.35)',
                            }}
                          >
                            {toUsd(issue.targetBounty)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ ...bodyCellSx, textAlign: 'center' }}>
                        <Chip
                          label={statusBadge.text}
                          size="small"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
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
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: STATUS_COLORS.award,
                          }}
                        >
                          {formatTokenAmount(issue.targetBounty)} ل
                        </Typography>
                        {toUsd(issue.targetBounty) && (
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.7rem',
                              color: 'rgba(255, 255, 255, 0.35)',
                            }}
                          >
                            {toUsd(issue.targetBounty)}
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
                            fontFamily: '"JetBrains Mono", monospace',
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
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color:
                              issue.status === 'completed'
                                ? STATUS_COLORS.merged
                                : 'rgba(255, 255, 255, 0.4)',
                          }}
                        >
                          {`${formatTokenAmount(issue.targetBounty)} ل`}
                        </Typography>
                        {toUsd(issue.targetBounty) && (
                          <Typography
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.7rem',
                              color: 'rgba(255, 255, 255, 0.35)',
                            }}
                          >
                            {toUsd(issue.targetBounty)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ ...bodyCellSx, textAlign: 'center' }}>
                        {issue.solverHotkey ? (
                          <Tooltip title={issue.solverHotkey} arrow>
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
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
                              color: 'rgba(255, 255, 255, 0.3)',
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
                            fontFamily: '"JetBrains Mono", monospace',
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
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.8rem',
                            color: 'rgba(255, 255, 255, 0.6)',
                          }}
                        >
                          {formatIssueDate(
                            issue.completedAt || issue.updatedAt,
                          )}
                        </Typography>
                      </TableCell>
                    </>
                  )}
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
