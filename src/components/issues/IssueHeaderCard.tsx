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
import {
  formatTokenAmount,
  formatDate,
  formatAlphaToUsd,
} from '../../utils/format';
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
        p: { xs: 2, md: 3 },
      }}
      elevation={0}
    >
      <Stack spacing={2}>
        {/* Repository and Issue Number */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1, sm: 2 },
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
              fontSize: { xs: '0.85rem', sm: '1rem' },
              color: STATUS_COLORS.info,
              textDecoration: 'none',
              wordBreak: 'break-all',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {issue.repositoryFullName} #{issue.issueNumber}
            <OpenInNewIcon sx={{ fontSize: 16, opacity: 0.5, flexShrink: 0 }} />
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
              fontSize: { xs: '1.15rem', sm: '1.5rem' },
              fontWeight: 600,
              color: 'text.primary',
              wordBreak: 'break-word',
              lineHeight: 1.3,
            }}
          >
            {issue.title}
          </Typography>
        )}

        {/* Bounty and metadata row.
            On mobile: 2-column grid with Bounty + Author on row 1, and
            Created spanning the full width on row 2 — keeps the date
            from being squeezed into a tiny third column.
            On desktop: flex row with subtle vertical dividers between
            cells so the row reads as a clean stat strip. */}
        <Box
          sx={{
            display: { xs: 'grid', sm: 'flex' },
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'unset' },
            alignItems: 'flex-start',
            columnGap: { xs: 1.5, sm: 0 },
            rowGap: { xs: 1.5, sm: 3 },
            flexWrap: 'wrap',
            py: { xs: 1, sm: 0 },
            borderTop: { xs: '1px solid', sm: 'none' },
            borderBottom: { xs: '1px solid', sm: 'none' },
            borderColor: { xs: 'border.light', sm: 'transparent' },
          }}
        >
          <Box sx={{ minWidth: 0, pr: { xs: 0, sm: 3 } }}>
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
                  flexWrap: 'wrap',
                  gap: 0.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: '0.95rem', sm: '1.25rem' },
                    fontWeight: 600,
                    color: STATUS_COLORS.warning,
                  }}
                >
                  {formatTokenAmount(issue.bountyAmount)}
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.9rem' },
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
                  fontSize: { xs: '0.95rem', sm: '1.25rem' },
                  fontWeight: 600,
                  color: STATUS_COLORS.merged,
                }}
              >
                {formatTokenAmount(issue.targetBounty)} ل
              </Typography>
            ) : (
              <Typography
                sx={{
                  fontSize: { xs: '0.95rem', sm: '1.25rem' },
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
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
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
              sx={{
                minWidth: 0,
                pl: { xs: 0, sm: 3 },
                pr: { xs: 0, sm: 3 },
                borderLeft: { xs: 'none', sm: '1px solid' },
                borderColor: { sm: 'border.light' },
              }}
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
                  mb: 0.5,
                }}
              >
                Author
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.9rem',
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {issue.authorLogin}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              minWidth: 0,
              gridColumn: { xs: '1 / -1', sm: 'auto' },
              pl: { xs: 0, sm: 3 },
              borderLeft: { xs: 'none', sm: '1px solid' },
              borderColor: { sm: 'border.light' },
            }}
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
              Created
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '0.85rem', sm: '0.9rem' },
                color: 'text.primary',
                whiteSpace: 'nowrap',
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
