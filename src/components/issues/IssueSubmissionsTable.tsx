import React from 'react';
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { IssueSubmission } from '../../api/models/Issues';
import { STATUS_COLORS, TEXT_OPACITY } from '../../theme';
import { formatDate } from '../../utils/format';
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
  const linkState = backLabel ? { backLabel } : undefined;

  const columns: DataTableColumn<IssueSubmission>[] = [
    {
      key: 'pr',
      header: 'PR',
      renderCell: (submission) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          #{submission.number}
          {submission.isWinner && (
            <EmojiEventsIcon
              sx={{ fontSize: 16, color: STATUS_COLORS.award }}
            />
          )}
        </Box>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      cellSx: {
        maxWidth: 300,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      renderCell: (submission) => submission.title,
    },
    {
      key: 'author',
      header: 'Author',
      renderCell: (submission) =>
        submission.authorGithubId ? (
          <LinkBox
            component={Typography}
            href={`/miners/details?githubId=${submission.authorGithubId}`}
            linkState={linkState}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            sx={{
              fontSize: '0.85rem',
              color: STATUS_COLORS.info,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {submission.authorLogin}
          </LinkBox>
        ) : (
          <Typography sx={{ fontSize: '0.85rem', color: STATUS_COLORS.info }}>
            {submission.authorLogin}
          </Typography>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
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
      align: 'right',
      renderCell: (submission) => (
        <Typography
          sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}
        >
          {Number(submission.tokenScore).toLocaleString()}
        </Typography>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      align: 'center',
      renderCell: (submission) => (
        <Typography
          sx={{
            fontSize: '0.8rem',
            color: alpha(theme.palette.common.white, 0.6),
          }}
        >
          {formatDate(submission.prCreatedAt)}
        </Typography>
      ),
    },
  ];

  return (
    <Card
      sx={{
        backgroundColor: 'background.default',
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: 3,
        overflow: 'hidden',
        // Original IssueSubmissionsTable used `py: 1.5` (12px) on every cell;
        // DataTable's `size="small"` defaults to ~6px. Restore the original
        // breathing room.
        '& .MuiTableCell-root': { py: 1.5 },
      }}
      elevation={0}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography
          sx={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Submissions ({submissions?.length || 0})
        </Typography>
      </Box>
      {isLoading ? (
        // Preserve original loading UI: smaller spinner, tighter padding.
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <DataTable
          columns={columns}
          rows={submissions ?? []}
          getRowKey={(submission) =>
            `${submission.repositoryFullName}-${submission.number}`
          }
          emptyState={
            <Box sx={{ p: 4, pt: 2, textAlign: 'center' }}>
              <Typography
                sx={{
                  color: alpha(
                    theme.palette.common.white,
                    TEXT_OPACITY.tertiary,
                  ),
                  fontSize: '0.9rem',
                }}
              >
                No submissions yet
              </Typography>
            </Box>
          }
          getRowHref={(submission) =>
            `/miners/pr?repo=${encodeURIComponent(submission.repositoryFullName)}&number=${submission.number}`
          }
          linkState={linkState}
        />
      )}
    </Card>
  );
};

export default IssueSubmissionsTable;
