import React from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  Link,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { IssueDetails } from '../../api/models/Issues';
import { useStats } from '../../api';
import { formatTokenAmount } from '../../utils/format';
import { STATUS_COLORS } from '../../theme';

const getStatusBadge = (
  status: string,
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

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

interface IssueHeaderCardProps {
  issue: IssueDetails;
}

const IssueHeaderCard: React.FC<IssueHeaderCardProps> = ({ issue }) => {
  const theme = useTheme();
  const statusBadge = getStatusBadge(issue.status);
  const { data: dashStats } = useStats();
  const taoPrice = dashStats?.prices?.tao?.data?.price ?? 0;
  const alphaPrice = dashStats?.prices?.alpha?.data?.price ?? 0;

  const usdEstimate = React.useMemo(() => {
    if (taoPrice <= 0 || alphaPrice <= 0) return null;
    const amount = parseFloat(issue.targetBounty);
    if (isNaN(amount) || amount === 0) return null;
    const usd = amount * alphaPrice * taoPrice;
    return `~${usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`;
  }, [issue.targetBounty, taoPrice, alphaPrice]);

  return (
    <Card
      sx={{
        backgroundColor: theme.palette.background.default,
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: 3,
        p: 3,
      }}
      elevation={0}
    >
      <Stack spacing={2}>
        {/* Repository and Issue Number */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href={issue.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1rem',
              color: STATUS_COLORS.info,
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {issue.repositoryFullName} #{issue.issueNumber}
            <OpenInNewIcon sx={{ fontSize: 16, opacity: 0.5 }} />
          </Link>
          <Chip
            label={statusBadge.text}
            size="small"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: statusBadge.bgColor,
              color: statusBadge.color,
              border: `1px solid ${statusBadge.color}40`,
            }}
          />
        </Box>

        {/* Title */}
        {issue.title && (
          <Typography
            sx={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {issue.title}
          </Typography>
        )}

        {/* Bounty and metadata row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                color: theme.palette.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.5,
              }}
            >
              {issue.status === 'completed' ? 'Payout' : 'Bounty'}
            </Typography>
            {issue.status === 'registered' ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 0.5,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: STATUS_COLORS.warning,
                  }}
                >
                  {formatTokenAmount(issue.bountyAmount)}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.9rem',
                    color: theme.palette.text.secondary,
                  }}
                >
                  / {formatTokenAmount(issue.targetBounty)} ل
                </Typography>
              </Box>
            ) : issue.status === 'completed' ? (
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: STATUS_COLORS.merged,
                }}
              >
                {formatTokenAmount(issue.targetBounty)} ل
              </Typography>
            ) : (
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color:
                    issue.status === 'active'
                      ? STATUS_COLORS.merged
                      : alpha(theme.palette.text.primary, 0.6),
                }}
              >
                {formatTokenAmount(issue.targetBounty)} ل
              </Typography>
            )}
            {usdEstimate && (
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.8rem',
                  color: alpha(theme.palette.text.primary, 0.4),
                  mt: 0.25,
                }}
              >
                {usdEstimate}
              </Typography>
            )}
          </Box>

          {issue.authorLogin && (
            <Box>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.7rem',
                  color: theme.palette.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 0.5,
                }}
              >
                Author
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.9rem',
                  color: theme.palette.text.primary,
                }}
              >
                {issue.authorLogin}
              </Typography>
            </Box>
          )}

          <Box>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                color: theme.palette.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.5,
              }}
            >
              Created
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.9rem',
                color: theme.palette.text.primary,
              }}
            >
              {formatDate(issue.createdAt)}
            </Typography>
          </Box>
        </Box>

        {/* Labels */}
        {issue.labels && issue.labels.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {issue.labels.map((label) => (
              <Chip
                key={label}
                label={label}
                size="small"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.7rem',
                  backgroundColor: theme.palette.surface.subtle,
                  color: theme.palette.text.primary,
                }}
              />
            ))}
          </Box>
        )}
      </Stack>
    </Card>
  );
};

export default IssueHeaderCard;
