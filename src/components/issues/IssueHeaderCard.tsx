import React from 'react';
import {
  Avatar,
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
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import { IssueDetails } from '../../api/models/Issues';
import {
  formatTokenAmount,
  formatDate,
  formatAlphaToUsd,
} from '../../utils/format';
import { getGithubAvatarSrc } from '../../utils';
import { usePrices } from '../../hooks/usePrices';
import { getIssueStatusMeta } from '../../utils/issueStatus';
import { STATUS_COLORS, TEXT_OPACITY } from '../../theme';

interface IssueHeaderCardProps {
  issue: IssueDetails;
}

const IssueHeaderCard: React.FC<IssueHeaderCardProps> = ({ issue }) => {
  const theme = useTheme();
  const statusBadge = getIssueStatusMeta(issue.status);
  const { taoPrice, alphaPrice, hasPrices } = usePrices();
  const usdEstimate = hasPrices
    ? formatAlphaToUsd(issue.targetBounty, taoPrice, alphaPrice)
    : null;

  return (
    <Card
      sx={{
        backgroundColor: 'background.default',
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: 3,
        p: { xs: 2, sm: 3 },
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
              flexWrap: 'wrap',
              gap: 0.5,
              fontSize: { xs: '0.95rem', sm: '1rem' },
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
              fontSize: { xs: '1.2rem', sm: '1.5rem' },
              fontWeight: 600,
              color: 'text.primary',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
          >
            {issue.title}
          </Typography>
        )}

        {/* Bounty and metadata row */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'auto auto auto' },
            columnGap: { xs: 2, sm: 4 },
            rowGap: { xs: 1.75, sm: 2 },
            alignItems: 'flex-start',
          }}
        >
          <Box
            sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, minWidth: { sm: 170 } }}
          >
            <Typography
              sx={{
                fontSize: '0.7rem',
                color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
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
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: STATUS_COLORS.warning,
                  }}
                >
                  {formatTokenAmount(issue.bountyAmount)}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    color: alpha(
                      theme.palette.common.white,
                      TEXT_OPACITY.tertiary,
                    ),
                  }}
                >
                  / {formatTokenAmount(issue.targetBounty)} ل
                </Typography>
              </Box>
            ) : issue.status === 'completed' ? (
              <Typography
                sx={{
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
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color:
                    issue.status === 'active'
                      ? STATUS_COLORS.merged
                      : alpha(theme.palette.common.white, 0.6),
                }}
              >
                {formatTokenAmount(issue.targetBounty)} ل
              </Typography>
            )}
            {usdEstimate && (
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
                  mt: 0.25,
                }}
              >
                {usdEstimate}
              </Typography>
            )}
          </Box>

          {issue.authorLogin && (
            <Box
              sx={{ minWidth: { sm: 140 } }}
            >
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: alpha(
                    theme.palette.common.white,
                    TEXT_OPACITY.tertiary,
                  ),
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 0.9,
                }}
              >
                Author
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  src={getGithubAvatarSrc(issue.authorLogin)}
                  alt={issue.authorLogin}
                  sx={{
                    width: { xs: 18, sm: 20 },
                    height: { xs: 18, sm: 20 },
                    fontSize: '0.72rem',
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    color: 'text.primary',
                    lineHeight: 1.2,
                  }}
                >
                  {issue.authorLogin}
                </Typography>
              </Box>
            </Box>
          )}

          <Box
            sx={{ minWidth: { sm: 160 } }}
          >
            <Typography
              sx={{
                fontSize: '0.7rem',
                color: alpha(theme.palette.common.white, TEXT_OPACITY.tertiary),
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.9,
              }}
            >
              Created
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CalendarTodayOutlinedIcon
                sx={{
                  fontSize: { xs: 12, sm: 13 },
                  color: 'text.secondary',
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.9rem',
                  color: 'text.primary',
                  lineHeight: 1.2,
                }}
              >
                {formatDate(issue.createdAt)}
              </Typography>
            </Box>
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
                  fontSize: '0.7rem',
                  backgroundColor: alpha(theme.palette.common.white, 0.1),
                  color: 'text.primary',
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
