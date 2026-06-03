import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  alpha,
  type Theme,
} from '@mui/material';
import {
  CalendarToday as CalendarTodayIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import { usePullRequestDetails } from '../../api';
import type { CommitLog } from '../../api/models/Dashboard';
import { WatchlistButton } from '../common';
import { linkResetSx, useLinkBehavior } from '../common/linkBehavior';
import { serializePRKey } from '../../hooks/useWatchlist';
import { STATUS_COLORS } from '../../theme';
import {
  formatMinerPrScoreDisplay,
  getMinerPrCardDisplayDate,
  getMinerPrEffectiveScore,
  getPrStatusChipMeta,
  getRepositoryOwnerAvatarSrc,
  isClosedUnmergedPr,
  isMergedPr,
  isOutsideScoringWindow,
  minerPrPath,
} from '../../utils';
import {
  buildMinerPrCardBadges,
  type MinerPrCardBadge,
} from '../../utils/multiplierDefs';

const IMPACT_EPSILON = 0.0001;
const COLLAPSED_LABEL_COUNT = 2;
const HEADER_ACTION_SIZE = 22;
const LABEL_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 0.5,
} as const;

const headerActionSx = {
  width: HEADER_ACTION_SIZE,
  height: HEADER_ACTION_SIZE,
  minWidth: HEADER_ACTION_SIZE,
  minHeight: HEADER_ACTION_SIZE,
  p: 0,
};

const statusChipSx = (statusColor: string) => ({
  color: statusColor,
  borderColor: alpha(statusColor, 0.35),
  backgroundColor: alpha(statusColor, 0.12),
  height: HEADER_ACTION_SIZE,
  minHeight: HEADER_ACTION_SIZE,
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& .MuiChip-label': {
    fontSize: '0.65rem',
    fontWeight: 600,
    lineHeight: 1,
    px: 1,
    py: 0,
    display: 'flex',
    alignItems: 'center',
  },
});

const labelToggleSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 28,
  minWidth: 28,
  minHeight: 28,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'border.light',
  backgroundColor: (t: Theme) => alpha(t.palette.common.white, 0.03),
  cursor: 'pointer',
  p: 0,
  color: 'text.tertiary',
  transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
  '&:hover': {
    color: 'text.primary',
    backgroundColor: 'surface.light',
    borderColor: 'border.medium',
  },
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 2,
  },
};

const footerLineSx = {
  fontSize: '0.7rem',
  fontWeight: 200,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1,
  whiteSpace: 'nowrap',
} as const;

const footerScoreSx = {
  fontSize: '0.8rem',
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1,
  whiteSpace: 'nowrap',
} as const;

const stopNav =
  (fn: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

const isImpactMultiplier = (value: number): boolean =>
  Math.abs(value - 1) > IMPACT_EPSILON;

const pickCollapsedBadges = (
  badges: MinerPrCardBadge[],
): MinerPrCardBadge[] => {
  if (badges.length <= COLLAPSED_LABEL_COUNT) return badges;
  const impacts = badges.filter((b) => isImpactMultiplier(b.value));
  const rest = badges.filter((b) => !isImpactMultiplier(b.value));
  return [...impacts, ...rest].slice(0, COLLAPSED_LABEL_COUNT);
};

const cardLeftBorderColor = (pr: CommitLog): string => {
  if (isMergedPr(pr)) return STATUS_COLORS.merged;
  if (isClosedUnmergedPr(pr)) return STATUS_COLORS.closed;
  return '#ffffff';
};

const badgeAccent = (value: number): string =>
  value === 1
    ? STATUS_COLORS.neutral
    : value > 1
      ? STATUS_COLORS.success
      : STATUS_COLORS.warningOrange;

const BadgeCell: React.FC<{ badge: MinerPrCardBadge }> = ({ badge }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 0.5,
      px: 0.75,
      py: 0.4,
      borderRadius: 1,
      border: '1px solid',
      borderColor: 'border.light',
      backgroundColor: (t) => alpha(t.palette.common.white, 0.03),
      minWidth: 0,
      height: '100%',
    }}
  >
    <Typography
      sx={{
        fontSize: '0.58rem',
        fontWeight: 600,
        color: 'text.secondary',
        letterSpacing: '0.04em',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {badge.label}
    </Typography>
    <Typography
      sx={{
        fontSize: '0.68rem',
        fontWeight: 700,
        color: badgeAccent(badge.value),
        flexShrink: 0,
      }}
    >
      ×{badge.value.toFixed(2)}
    </Typography>
  </Box>
);

const LabelTailRow: React.FC<{
  badges: MinerPrCardBadge[];
  expanded: boolean;
  onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void;
}> = ({ badges, expanded, onToggle }) => (
  <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 0.5 }}>
    {badges.map((badge) => (
      <Box key={badge.key} sx={{ flex: 1, minWidth: 0 }}>
        <BadgeCell badge={badge} />
      </Box>
    ))}
    <Box
      component="button"
      type="button"
      aria-label={expanded ? 'Show fewer multipliers' : 'Show all multipliers'}
      onClick={onToggle}
      sx={{ ...labelToggleSx, alignSelf: 'stretch' }}
    >
      {expanded ? (
        <ExpandLessIcon sx={{ fontSize: '1.15rem', color: 'inherit' }} />
      ) : (
        <ExpandMoreIcon sx={{ fontSize: '1.15rem', color: 'inherit' }} />
      )}
    </Box>
  </Box>
);

const LabelSection: React.FC<{
  badges: MinerPrCardBadge[];
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}> = ({ badges, expanded, setExpanded }) => {
  const canExpand = badges.length > COLLAPSED_LABEL_COUNT;
  if (!canExpand) {
    return (
      <Box sx={LABEL_GRID_SX}>
        {badges.map((badge) => (
          <BadgeCell key={badge.key} badge={badge} />
        ))}
      </Box>
    );
  }
  if (expanded) {
    const head = badges.slice(0, -2);
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {head.length > 0 && (
          <Box sx={LABEL_GRID_SX}>
            {head.map((badge) => (
              <BadgeCell key={badge.key} badge={badge} />
            ))}
          </Box>
        )}
        <LabelTailRow
          badges={badges.slice(-2)}
          expanded
          onToggle={stopNav(() => setExpanded(false))}
        />
      </Box>
    );
  }
  return (
    <LabelTailRow
      badges={pickCollapsedBadges(badges)}
      expanded={false}
      onToggle={stopNav(() => setExpanded(true))}
    />
  );
};

const CONVENTIONAL_COMMIT_RE = /^(\w+)(?:\([^)]+\))?!:\s+/;

const PrTitle: React.FC<{
  pullRequestNumber: number;
  title: string;
}> = ({ pullRequestNumber, title }) => {
  const titleSx = {
    fontSize: '0.85rem',
    fontWeight: 600,
    lineHeight: 1.35,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  };
  const numberPrefix = (
    <Box
      component="span"
      sx={{ color: 'text.primary', fontFamily: '"JetBrains Mono", monospace' }}
    >
      #{pullRequestNumber}{' '}
    </Box>
  );
  const colonIdx = title.indexOf(':');
  const match = title.match(CONVENTIONAL_COMMIT_RE);
  if (!match || colonIdx < 0) {
    return (
      <Typography component="div" sx={titleSx}>
        {numberPrefix}
        <Box component="span" sx={{ color: 'text.primary' }}>
          {title}
        </Box>
      </Typography>
    );
  }
  return (
    <Typography component="div" sx={titleSx}>
      {numberPrefix}
      <Box component="span" sx={{ color: 'primary.main' }}>
        {title.slice(0, colonIdx + 1)}
      </Box>
      {title.slice(colonIdx + 1).trimStart() ? (
        <Box component="span" sx={{ color: 'text.primary' }}>
          {' '}
          {title.slice(colonIdx + 1).trimStart()}
        </Box>
      ) : null}
    </Typography>
  );
};

interface MinerPrCardProps {
  pr: CommitLog;
}

const MinerPrCard: React.FC<MinerPrCardProps> = ({ pr }) => {
  const { label: statusLabel, color: statusColor } = getPrStatusChipMeta(pr);
  const isMerged = isMergedPr(pr);
  const isStale = !!pr.mergedAt && isOutsideScoringWindow(pr.mergedAt);
  const isCollateral =
    !pr.mergedAt && !!pr.collateralScore && pr.prState !== 'CLOSED';
  const score = getMinerPrEffectiveScore(pr);
  const leftBorderColor = cardLeftBorderColor(pr);
  const repoOwner = pr.repository.split('/')[0] ?? '';

  const { data: prDetails } = usePullRequestDetails(
    pr.repository,
    pr.pullRequestNumber,
    isMerged,
  );
  const badges = useMemo(
    () => buildMinerPrCardBadges(pr, prDetails),
    [pr, prDetails],
  );
  const [labelsExpanded, setLabelsExpanded] = useState(false);

  useEffect(() => {
    setLabelsExpanded(false);
  }, [pr.repository, pr.pullRequestNumber]);

  const prLinkProps = useLinkBehavior<HTMLAnchorElement>(
    minerPrPath(pr.repository, pr.pullRequestNumber),
  );
  const githubHref = `https://github.com/${pr.repository}/pull/${pr.pullRequestNumber}`;
  const showLabels = badges.length > 0;

  return (
    <Card
      component="a"
      {...prLinkProps}
      elevation={0}
      aria-label={`PR #${pr.pullRequestNumber}: ${pr.pullRequestTitle}`}
      sx={(t) => ({
        ...linkResetSx,
        p: 1.5,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'border.light',
        borderLeft: '2px solid',
        borderLeftColor: alpha(leftBorderColor, 0.4),
        backgroundColor: t.palette.background.default,
        cursor: 'pointer',
        textDecoration: 'none',
        transition:
          'background-color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        ...(isStale && { opacity: 0.4, filter: 'grayscale(0.5)' }),
        '&:hover': {
          backgroundColor: t.palette.surface.elevated,
          borderColor: t.palette.border.medium,
          borderLeftColor: alpha(leftBorderColor, 0.65),
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px -6px ${alpha(t.palette.common.black, 0.45)}`,
          textDecoration: 'none',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      })}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              minWidth: 0,
              flex: 1,
            }}
          >
            <Avatar
              src={getRepositoryOwnerAvatarSrc(repoOwner)}
              alt={repoOwner}
              sx={{
                width: 20,
                height: 20,
                flexShrink: 0,
                border: '1px solid',
                borderColor: 'border.medium',
              }}
            />
            <Typography
              noWrap
              sx={{ fontSize: '0.72rem', color: 'text.secondary' }}
            >
              {pr.repository}
            </Typography>
          </Box>
          <Box
            sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Chip
              variant="status"
              label={statusLabel}
              size="small"
              sx={statusChipSx(statusColor)}
            />
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 0.5 }}
            >
              <Tooltip title="Open on GitHub" arrow placement="top">
                <IconButton
                  size="small"
                  aria-label="Open on GitHub"
                  onClick={stopNav(() =>
                    window.open(githubHref, '_blank', 'noopener,noreferrer'),
                  )}
                  sx={{
                    ...headerActionSx,
                    color: 'text.tertiary',
                    '&:hover': {
                      color: 'text.primary',
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  <GitHubIcon sx={{ fontSize: '0.95rem' }} />
                </IconButton>
              </Tooltip>
              <WatchlistButton
                category="prs"
                itemKey={serializePRKey(pr.repository, pr.pullRequestNumber)}
                size="small"
                sx={headerActionSx}
              />
            </Box>
          </Box>
        </Box>

        <PrTitle
          pullRequestNumber={pr.pullRequestNumber}
          title={pr.pullRequestTitle}
        />

        {showLabels && (
          <LabelSection
            badges={badges}
            expanded={labelsExpanded}
            setExpanded={setLabelsExpanded}
          />
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.75,
          flexWrap: 'nowrap',
          width: '100%',
          flexShrink: 0,
          mt: showLabels ? 1.5 : 1.25,
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.35,
            minWidth: 0,
            flex: 1,
          }}
        >
          <CalendarTodayIcon
            sx={{ fontSize: '0.7rem', color: 'text.tertiary', flexShrink: 0 }}
          />
          <Typography
            component="span"
            noWrap
            sx={{ fontSize: '0.68rem', lineHeight: 1, color: 'text.tertiary' }}
          >
            {getMinerPrCardDisplayDate(pr)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: 0.5,
            flexShrink: 0,
          }}
        >
          <Box
            component="span"
            sx={{ ...footerLineSx, color: 'diff.additions' }}
          >
            +{pr.additions}
          </Box>
          <Box
            component="span"
            sx={{ ...footerLineSx, color: 'diff.deletions' }}
          >
            -{pr.deletions}
          </Box>
          <Box
            component="span"
            sx={{
              ...footerScoreSx,
              ml: 1,
              color: isCollateral ? 'status.warningOrange' : 'text.primary',
            }}
          >
            {formatMinerPrScoreDisplay(pr, score, isCollateral)}
          </Box>
        </Box>
      </Box>
    </Card>
  );
};

export default MinerPrCard;
