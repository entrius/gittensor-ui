import React from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  Divider,
  Link,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import GitHubIcon from '@mui/icons-material/GitHub';
import { IssueBounty } from '../../api/models/Issues';
import { linkResetSx, useLinkBehavior } from '../common/linkBehavior';
import { WatchlistButton } from '../common';
import BountyProgress from './BountyProgress';
import { getIssueStatusMetaForTheme } from '../../utils/issueStatus';
import {
  formatTokenAmount,
  formatDate,
  formatAlphaToUsd,
} from '../../utils/format';
import { TEXT_OPACITY } from '../../theme';

interface BountyCardProps {
  issue: IssueBounty;
  href?: string;
  linkState?: Record<string, unknown>;
  taoPrice?: number;
  alphaPrice?: number;
}

export const BountyCard: React.FC<BountyCardProps> = ({
  issue,
  href,
  linkState,
  taoPrice,
  alphaPrice,
}) => {
  const theme = useTheme();
  const owner = issue.repositoryFullName.split('/')[0] || '';
  const statusMeta = getIssueStatusMetaForTheme(issue.status, theme);
  const usdDisplay = formatAlphaToUsd(
    issue.targetBounty,
    taoPrice ?? 0,
    alphaPrice ?? 0,
  );
  const isPending = issue.status === 'registered';
  const isHistory =
    issue.status === 'completed' || issue.status === 'cancelled';
  const bountyLabel = isPending
    ? 'Target Bounty'
    : isHistory
      ? 'Payout'
      : 'Bounty';
  const bountyColor = isPending
    ? theme.palette.status.award
    : theme.palette.status.merged;

  const linkProps = useLinkBehavior<HTMLAnchorElement>(href ?? '', {
    state: linkState,
  });

  return (
    <Card
      component={href ? 'a' : 'div'}
      {...(href ? linkProps : {})}
      aria-label={issue.title || `Issue #${issue.id}`}
      sx={(theme) => ({
        ...(href ? linkResetSx : {}),
        p: 2,
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: theme.palette.border.light,
        backgroundColor: theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        cursor: href ? 'pointer' : 'default',
        transition: 'all 0.2s',
        ...(href && {
          '&:hover': {
            backgroundColor: theme.palette.surface.light,
            borderColor: theme.palette.border.medium,
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: theme.palette.primary.main,
            outlineOffset: '2px',
          },
        }),
      })}
      elevation={0}
    >
      {/* Repository header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Avatar
          src={`https://avatars.githubusercontent.com/${owner}`}
          alt={owner}
          sx={(theme) => ({
            width: 36,
            height: 36,
            flexShrink: 0,
            border: '1px solid',
            borderColor: theme.palette.border.medium,
          })}
        />
        <Tooltip title={issue.repositoryFullName} placement="top" arrow>
          <Typography
            sx={(t) => ({
              fontSize: '0.88rem',
              fontWeight: 500,
              color: t.palette.status.info,
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            })}
          >
            {issue.repositoryFullName}
          </Typography>
        </Tooltip>
        <Chip
          label={statusMeta.text}
          size="small"
          sx={{
            flexShrink: 0,
            fontSize: '0.7rem',
            fontWeight: 600,
            backgroundColor: statusMeta.bgColor,
            color: statusMeta.color,
            border: `1px solid ${statusMeta.color}40`,
            height: 22,
            '& .MuiChip-label': { px: 1 },
          }}
        />
        <WatchlistButton
          category="bounties"
          itemKey={String(issue.id)}
          size="small"
          sx={{
            backgroundColor: 'border.subtle',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'border.medium' },
          }}
        />
      </Box>

      {/* Issue title + GitHub link */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        <Tooltip title={issue.title} placement="bottom" arrow>
          <Typography
            sx={{
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.4,
              minHeight: 'calc(2 * 1.4em)',
            }}
          >
            {issue.title}
          </Typography>
        </Tooltip>
        <Link
          href={issue.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.6,
            width: 'fit-content',
            fontSize: '0.78rem',
            fontWeight: 500,
            color: alpha(theme.palette.text.primary, TEXT_OPACITY.secondary),
            textDecoration: 'none',
            px: 1,
            py: 0.5,
            borderRadius: 1.5,
            border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
            backgroundColor: alpha(theme.palette.text.primary, 0.05),
            transition: 'all 0.15s',
            '&:hover': {
              color: theme.palette.text.primary,
              borderColor: alpha(theme.palette.text.primary, 0.28),
              backgroundColor: alpha(theme.palette.text.primary, 0.1),
              textDecoration: 'none',
            },
          })}
        >
          <GitHubIcon sx={{ fontSize: 13 }} />#{issue.issueNumber} Open on
          GitHub
          <OpenInNewIcon sx={{ fontSize: 11, opacity: 0.6 }} />
        </Link>
      </Box>

      <Divider sx={{ borderColor: 'border.light', opacity: 0.6 }} />

      {/* Bounty amount */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.62rem',
            color: 'text.tertiary',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {bountyLabel}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
          <Typography
            sx={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: bountyColor,
            }}
          >
            {formatTokenAmount(issue.targetBounty)} ل
          </Typography>
          {usdDisplay && (
            <Typography
              sx={(theme) => ({
                fontSize: '0.7rem',
                color: alpha(theme.palette.text.primary, 0.35),
              })}
            >
              {usdDisplay}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Pending: funding progress */}
      {isPending && (
        <BountyProgress
          bountyAmount={issue.bountyAmount}
          targetBounty={issue.targetBounty}
        />
      )}

      {/* History: solver + date */}
      {isHistory && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {issue.solverHotkey ? (
            <Tooltip title={issue.solverHotkey} arrow>
              <Typography
                sx={(t) => ({
                  fontSize: '0.75rem',
                  color: t.palette.status.info,
                  cursor: 'default',
                })}
              >
                {`${issue.solverHotkey.slice(0, 6)}…${issue.solverHotkey.slice(-4)}`}
              </Typography>
            </Tooltip>
          ) : (
            <Typography
              sx={(theme) => ({
                fontSize: '0.75rem',
                color: alpha(theme.palette.text.primary, TEXT_OPACITY.faint),
              })}
            >
              -
            </Typography>
          )}
          <Typography
            sx={(theme) => ({
              fontSize: '0.72rem',
              color: alpha(theme.palette.text.primary, TEXT_OPACITY.muted),
              whiteSpace: 'nowrap',
            })}
          >
            {formatDate(issue.completedAt || issue.updatedAt)}
          </Typography>
        </Box>
      )}
    </Card>
  );
};

export default BountyCard;
