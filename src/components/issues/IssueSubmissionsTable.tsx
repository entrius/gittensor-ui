import React from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { IssueSubmission } from '../../api/models/Issues';
import { STATUS_COLORS } from '../../theme';
import { formatDate } from '../../utils/format';
import { getGithubAvatarSrc } from '../../utils';
import { LinkBox } from '../common/linkBehavior';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';

interface IssueSubmissionsTableProps {
  submissions: IssueSubmission[] | undefined;
  isLoading: boolean;
  backLabel?: string;
}

const IssueSubmissionsTable: React.FC<IssueSubmissionsTableProps> = ({
  submissions,
  isLoading,
  backLabel,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const linkState = backLabel ? { backLabel } : undefined;
  const winnerSubmission =
    submissions?.find((submission) => submission.isWinner) ?? null;
  const otherSubmissions =
    submissions?.filter((submission) => !submission.isWinner) ?? [];
  const formatScore = (score: number) =>
    Number(score).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  const metaLabelSx = {
    fontSize: '0.68rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'text.tertiary',
    mb: 0.6,
  };

  const columns: DataTableColumn<IssueSubmission>[] = [
    {
      key: 'pr',
      header: 'PR',
      width: 50,
      renderCell: (submission) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          #{submission.number}
        </Box>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      width: 220,
      cellSx: {
        maxWidth: 220,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      renderCell: (submission) => submission.title,
    },
    {
      key: 'author',
      header: 'Author',
      width: 170,
      cellSx: {
        whiteSpace: 'nowrap',
      },
      renderCell: (submission) =>
        submission.authorGithubId ? (
          <LinkBox
            component={Typography}
            href={`/miners/details?githubId=${submission.authorGithubId}`}
            linkState={linkState}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            sx={{
              fontSize: '0.85rem',
              color: theme.palette.status.info,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {submission.authorLogin}
          </LinkBox>
        ) : (
          <Typography
            sx={{ fontSize: '0.85rem', color: theme.palette.status.info }}
          >
            {submission.authorLogin}
          </Typography>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 110,
      align: 'center',
      cellSx: {
        whiteSpace: 'nowrap',
      },
      renderCell: (submission) => {
        const state = submission.mergedAt
          ? 'MERGED'
          : submission.prState === 'OPEN'
            ? 'OPEN'
            : 'CLOSED';
        const color =
          state === 'MERGED'
            ? theme.palette.status.merged
            : state === 'OPEN'
              ? theme.palette.status.open
              : theme.palette.status.closed;
        return (
          <Chip
            variant="status"
            label={state}
            sx={{ color, borderColor: color }}
          />
        );
      },
    },
    {
      key: 'tokens',
      header: 'Tokens',
      width: 126,
      align: 'right',
      cellSx: {
        whiteSpace: 'nowrap',
      },
      renderCell: (submission) => (
        <Typography
          sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}
        >
          {formatScore(submission.tokenScore)}
        </Typography>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      width: 124,
      align: 'center',
      cellSx: {
        whiteSpace: 'nowrap',
      },
      renderCell: (submission) => (
        <Typography
          sx={{
            fontSize: '0.8rem',
            color: 'text.secondary',
          }}
        >
          {formatDate(submission.prCreatedAt)}
        </Typography>
      ),
    },
  ];

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
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={24} />
        </Box>
      </Card>
    );
  }

  if (!winnerSubmission && otherSubmissions.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor: 'background.default',
          border: `1px solid ${theme.palette.border.light}`,
          borderRadius: 3,
        }}
        elevation={0}
      >
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography
            sx={{
              color: 'text.tertiary',
              fontSize: '0.9rem',
            }}
          >
            No submissions yet
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {winnerSubmission && (
        <LinkBox
          href={`/miners/pr?repo=${encodeURIComponent(winnerSubmission.repositoryFullName)}&number=${winnerSubmission.number}`}
          linkState={linkState}
          sx={{ textDecoration: 'none', display: 'block' }}
        >
          <Card
            sx={{
              backgroundColor: 'background.default',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.status.merged, 0.6)}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              minHeight: { md: 132 },
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                borderTopLeftRadius: theme.shape.borderRadius * 1.5,
                borderBottomLeftRadius: theme.shape.borderRadius * 1.5,
                backgroundColor: theme.palette.status.merged,
                boxShadow: `0 0 14px ${alpha(theme.palette.status.merged, 0.35)}`,
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: { xs: 46, md: 72 },
                pointerEvents: 'none',
                background: `linear-gradient(90deg, ${alpha(theme.palette.status.merged, 0.12)} 0%, transparent 100%)`,
              },
            }}
            elevation={0}
          >
            <Box
              sx={{
                p: 2,
                pl: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flex: { md: 1.45 },
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 1.5,
                  backgroundColor: alpha(theme.palette.text.primary, 0.04),
                  border: `1px solid ${theme.palette.border.light}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <EmojiEventsIcon
                  sx={{ fontSize: 34, color: STATUS_COLORS.award }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'text.tertiary',
                  }}
                >
                  Winning Submission
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 0.35,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '1.12rem',
                      fontWeight: 600,
                      color: 'text.primary',
                    }}
                  >
                    #{winnerSubmission.number}
                  </Typography>
                  <Chip
                    label="MERGED"
                    variant="status"
                    sx={{
                      color: theme.palette.status.merged,
                      borderColor: theme.palette.status.merged,
                      height: 22,
                      '& .MuiChip-label': { px: 0.85, fontSize: '0.68rem' },
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    mt: 0.45,
                    fontSize: '0.98rem',
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: { xs: '100%', md: 420 },
                  }}
                >
                  {winnerSubmission.title}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                p: 2,
                pt: { xs: 0, md: 2 },
                display: 'flex',
                flex: { md: 1 },
                flexWrap: 'wrap',
                rowGap: 1.5,
                columnGap: 3,
                alignItems: 'center',
                justifyContent: { md: 'space-between' },
              }}
            >
              <Box>
                <Typography sx={metaLabelSx}>Contributor</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Avatar
                    src={getGithubAvatarSrc(winnerSubmission.authorLogin)}
                    alt={winnerSubmission.authorLogin}
                    sx={{ width: 24, height: 24, fontSize: '0.78rem' }}
                  />
                  <Box>
                    {winnerSubmission.authorGithubId ? (
                      <LinkBox
                        component={Typography}
                        href={`/miners/details?githubId=${winnerSubmission.authorGithubId}`}
                        linkState={linkState}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        sx={{
                          fontSize: '0.92rem',
                          color: STATUS_COLORS.info,
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {winnerSubmission.authorLogin}
                      </LinkBox>
                    ) : (
                      <Typography
                        sx={{ fontSize: '0.92rem', color: STATUS_COLORS.info }}
                      >
                        {winnerSubmission.authorLogin}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ ml: { md: 'auto' }, minWidth: { md: 150 } }}>
                <Typography sx={metaLabelSx}>Merged On</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <CalendarTodayOutlinedIcon
                    sx={{ fontSize: 12, color: 'text.secondary' }}
                  />
                  <Typography
                    sx={{ fontSize: '0.9rem', color: 'text.primary' }}
                  >
                    {formatDate(
                      winnerSubmission.mergedAt || winnerSubmission.prCreatedAt,
                    )}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Card>
        </LinkBox>
      )}

      {otherSubmissions.length > 0 && (
        <Card
          sx={{
            backgroundColor: 'background.default',
            borderRadius: 3,
            border: `1px solid ${theme.palette.border.light}`,
            overflow: 'hidden',
            '& .MuiTableCell-root': { py: 1.5 },
          }}
          elevation={0}
        >
          <Box
            sx={{
              pl: 2.75,
              pr: 2.25,
              pt: 2,
              pb: 1.5,
              borderBottom: `1px solid ${theme.palette.border.light}`,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'text.tertiary',
              }}
            >
              Other submissions ({otherSubmissions.length})
            </Typography>
          </Box>
          <DataTable
            columns={columns}
            rows={otherSubmissions}
            minWidth={isMobile ? 832 : undefined}
            getRowKey={(submission) =>
              `${submission.repositoryFullName}-${submission.number}`
            }
            getRowHref={(submission) =>
              `/miners/pr?repo=${encodeURIComponent(submission.repositoryFullName)}&number=${submission.number}`
            }
            linkState={linkState}
          />
        </Card>
      )}

      {winnerSubmission && otherSubmissions.length === 0 && (
        <Card
          sx={{
            backgroundColor: 'background.default',
            border: `1px solid ${theme.palette.border.light}`,
            borderRadius: 3,
          }}
          elevation={0}
        >
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography
              sx={{
                color: 'text.tertiary',
                fontSize: '0.9rem',
              }}
            >
              No other submissions
            </Typography>
          </Box>
        </Card>
      )}
    </Box>
  );
};

export default IssueSubmissionsTable;
