import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  ButtonBase,
  Card,
  Chip,
  Divider,
  Link,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import GitHubIcon from '@mui/icons-material/GitHub';
import { IssueBounty } from '../../api/models/Issues';
import { linkResetSx, useLinkBehavior } from '../common/linkBehavior';
import { WatchlistButton } from '../common';
import BountyProgress from './BountyProgress';
import { getIssueStatusMeta } from '../../utils/issueStatus';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import {
  formatTokenAmount,
  formatDate,
  formatAlphaToUsd,
} from '../../utils/format';
import { STATUS_COLORS, TEXT_OPACITY } from '../../theme';
import { useClipboardCopy } from '../../hooks/useClipboardCopy';

/** Subpixel / rounding tolerance for line-clamp overflow checks. */
const LINE_CLAMP_OVERFLOW_TOLERANCE_PX = 1;

/** Matches `BountySidebar` / list previews for SS58-style addresses. */
const HOTKEY_PREVIEW_HEAD_CHARS = 6;
const HOTKEY_PREVIEW_TAIL_CHARS = 4;

const PAYOUT_HOTKEY_COPIED_LIVE_MESSAGE = 'Payout address copied to clipboard';

function formatHotkeyPreviewShort(hotkey: string): string {
  if (
    hotkey.length <=
    HOTKEY_PREVIEW_HEAD_CHARS + HOTKEY_PREVIEW_TAIL_CHARS + 1
  )
    return hotkey;
  return `${hotkey.slice(0, HOTKEY_PREVIEW_HEAD_CHARS)}…${hotkey.slice(-HOTKEY_PREVIEW_TAIL_CHARS)}`;
}

/** Copy only the payout hotkey; does not steal clicks from the surrounding bounty card link. */
const PayoutHotkeyCopy: React.FC<{ hotkey: string }> = ({ hotkey }) => {
  const { copied, copy, liveRegion } = useClipboardCopy({
    copiedMessage: PAYOUT_HOTKEY_COPIED_LIVE_MESSAGE,
  });
  const preview = formatHotkeyPreviewShort(hotkey);

  return (
    <>
      <Tooltip
        title={copied ? 'Copied to clipboard' : 'Click to copy full hotkey'}
        arrow
      >
        <ButtonBase
          disableRipple
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void copy(hotkey);
          }}
          aria-label="Copy payout hotkey"
          sx={{
            borderRadius: 0.5,
            color: STATUS_COLORS.info,
            textAlign: 'left',
            px: 0.25,
            mx: -0.25,
            '&:hover': {
              backgroundColor: 'surface.light',
            },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: '0.75rem',
              fontWeight: copied ? 600 : 400,
              color: copied ? 'status.success' : 'inherit',
            }}
          >
            {copied ? 'Copied to clipboard' : preview}
          </Typography>
        </ButtonBase>
      </Tooltip>
      {liveRegion}
    </>
  );
};

interface BountyCardProps {
  issue: IssueBounty;
  href?: string;
  linkState?: Record<string, unknown>;
  taoPrice?: number;
  alphaPrice?: number;
  /**
   * Compact variant: smaller avatar, no forced 2-line title minHeight, and
   * the GitHub link row is hidden so card height matches PRCard / RepoCard
   * in the Watchlist tabs.
   */
  compact?: boolean;
}

export const BountyCard: React.FC<BountyCardProps> = ({
  issue,
  href,
  linkState,
  taoPrice,
  alphaPrice,
  compact = false,
}) => {
  const owner = issue.repositoryFullName.split('/')[0] || '';
  const statusMeta = getIssueStatusMeta(issue.status);
  const usdDisplay = formatAlphaToUsd(
    issue.targetBounty,
    taoPrice ?? 0,
    alphaPrice ?? 0,
  );
  const isPending = issue.status === 'registered';
  const isCompleted = issue.status === 'completed';
  const isCancelled = issue.status === 'cancelled';
  const isHistory = isCompleted || isCancelled;
  const bountyLabel = isPending
    ? 'Target Bounty'
    : isCompleted
      ? 'Payout'
      : 'Bounty';
  const bountyColor = isPending
    ? STATUS_COLORS.award
    : isCancelled
      ? 'text.tertiary'
      : STATUS_COLORS.merged;

  const linkProps = useLinkBehavior<HTMLAnchorElement>(href ?? '', {
    state: linkState,
  });

  const titleRef = useRef<HTMLElement>(null);
  const [titleTruncated, setTitleTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el || !issue.title) {
      setTitleTruncated(false);
      return;
    }

    const measure = () => {
      const t = titleRef.current;
      if (!t) return;
      setTitleTruncated(
        t.scrollHeight > t.clientHeight + LINE_CLAMP_OVERFLOW_TOLERANCE_PX,
      );
    };

    measure();
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measure)
        : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [issue.title, compact]);

  const bountyAmountRow = (
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
              color: alpha(theme.palette.common.white, 0.35),
            })}
          >
            {usdDisplay}
          </Typography>
        )}
      </Box>
    </Box>
  );

  const historyRow = (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {issue.solverHotkey ? (
        <PayoutHotkeyCopy hotkey={issue.solverHotkey} />
      ) : (
        <Typography
          sx={(theme) => ({
            fontSize: '0.75rem',
            color: alpha(theme.palette.common.white, TEXT_OPACITY.faint),
          })}
        >
          -
        </Typography>
      )}
      <Typography
        sx={(theme) => ({
          fontSize: '0.72rem',
          color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
          whiteSpace: 'nowrap',
        })}
      >
        {formatDate(issue.completedAt || issue.updatedAt)}
      </Typography>
    </Box>
  );

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
        backgroundColor: theme.palette.surface.transparent,
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
          src={getRepositoryOwnerAvatarSrc(owner)}
          alt={owner}
          sx={(theme) => ({
            width: compact ? 28 : 36,
            height: compact ? 28 : 36,
            flexShrink: 0,
            border: '1px solid',
            borderColor: theme.palette.border.medium,
          })}
        />
        <Tooltip title={issue.repositoryFullName} placement="top" arrow>
          <Typography
            sx={{
              fontSize: '0.88rem',
              fontWeight: 500,
              color: STATUS_COLORS.info,
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
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
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
          }}
        />
      </Box>

      {/* Issue title + GitHub link */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        <Tooltip
          title={issue.title}
          placement="bottom"
          arrow
          disableHoverListener={!titleTruncated}
          disableFocusListener={!titleTruncated}
          disableTouchListener={!titleTruncated}
        >
          <Typography
            ref={titleRef}
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
              ...(compact ? {} : { minHeight: 'calc(2 * 1.4em)' }),
            }}
          >
            {issue.title}
          </Typography>
        </Tooltip>
        {!compact && (
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
              color: alpha(theme.palette.common.white, TEXT_OPACITY.secondary),
              textDecoration: 'none',
              px: 1,
              py: 0.5,
              borderRadius: 1.5,
              border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
              backgroundColor: alpha(theme.palette.common.white, 0.05),
              transition: 'all 0.15s',
              '&:hover': {
                color: theme.palette.common.white,
                borderColor: alpha(theme.palette.common.white, 0.28),
                backgroundColor: alpha(theme.palette.common.white, 0.1),
                textDecoration: 'none',
              },
            })}
          >
            <GitHubIcon sx={{ fontSize: 13 }} />#{issue.issueNumber} Open on
            GitHub
            <OpenInNewIcon sx={{ fontSize: 11, opacity: 0.6 }} />
          </Link>
        )}
      </Box>

      <Divider sx={{ borderColor: 'border.light', opacity: 0.6 }} />

      {bountyAmountRow}
      {isPending && (
        <BountyProgress
          bountyAmount={issue.bountyAmount}
          targetBounty={issue.targetBounty}
        />
      )}
      {isHistory && historyRow}
    </Card>
  );
};

export default BountyCard;
