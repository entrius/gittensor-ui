import React from 'react';
import { alpha, Avatar, Box, Card, Tooltip, Typography } from '@mui/material';
import {
  CheckCircleOutline as UnlockedIcon,
  LockOutlined as LockedIcon,
} from '@mui/icons-material';
import type { MinerRepositoryEvaluation } from '../../api/models/Dashboard';
import { STATUS_COLORS, tooltipSlotProps } from '../../theme';
import { credibilityColor } from '../../utils/format';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import { linkResetSx, useLinkBehavior } from '../common/linkBehavior';
import type {
  GateProgress,
  RepoUnlock,
  ViewMode,
} from '../../utils/minerProgress';

const FONT_MONO = '"JetBrains Mono", monospace';
const TABULAR = '"tnum" 1, "ss01" 1';

export const repoMinersHref = (repositoryFullName: string): string =>
  `/miners/repository?name=${encodeURIComponent(repositoryFullName)}&tab=miners`;

/** A single eligibility gate's progress bar with "what's left" affordance. */
export const GateBar: React.FC<{
  label: string;
  progress: GateProgress;
  kind: 'count' | 'percent';
  accent: string;
}> = ({ label, progress, kind, accent }) => {
  const color = progress.met ? STATUS_COLORS.success : accent;
  const have =
    kind === 'percent'
      ? `${(progress.have * 100).toFixed(0)}%`
      : `${progress.have}`;
  const need =
    kind === 'percent'
      ? `${(progress.need * 100).toFixed(0)}%`
      : `${progress.need}`;
  const remaining =
    progress.met || progress.remaining <= 0
      ? null
      : kind === 'percent'
        ? `+${Math.max(1, Math.round(progress.remaining * 100))}%`
        : `${progress.remaining} more`;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
          mb: 0.5,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.68rem',
            color: 'text.secondary',
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 600,
            fontFeatureSettings: TABULAR,
          }}
        >
          <Box
            component="span"
            sx={{
              color: progress.met ? STATUS_COLORS.success : 'text.primary',
            }}
          >
            {have}
          </Box>
          <Box component="span" sx={{ color: 'text.tertiary' }}>
            {' '}
            / {need}
          </Box>
          {remaining && (
            <Box component="span" sx={{ color: accent, ml: 0.75 }}>
              {remaining}
            </Box>
          )}
        </Typography>
      </Box>
      <Box
        sx={{
          width: '100%',
          height: 5,
          borderRadius: 999,
          backgroundColor: 'border.light',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${progress.pct * 100}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 999,
            transition: 'width 0.3s ease',
          }}
        />
      </Box>
    </Box>
  );
};

const StatusChip: React.FC<{ unlocked: boolean }> = ({ unlocked }) => {
  const color = unlocked ? STATUS_COLORS.success : STATUS_COLORS.neutral;
  const Icon = unlocked ? UnlockedIcon : LockedIcon;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.9,
        py: 0.35,
        borderRadius: 1,
        border: `1px solid ${alpha(color, 0.45)}`,
        backgroundColor: 'transparent',
        flexShrink: 0,
      }}
    >
      <Icon sx={{ fontSize: '0.85rem', color }} />
      <Typography
        sx={{
          fontSize: '0.64rem',
          fontWeight: 700,
          color,
          letterSpacing: '0.04em',
        }}
      >
        {unlocked ? 'EARNING' : 'LOCKED'}
      </Typography>
    </Box>
  );
};

interface MinerRepositoryCardProps {
  repo: MinerRepositoryEvaluation;
  unlock: RepoUnlock;
  viewMode: ViewMode;
  /** Repo's emission share (payout weight) of the OSS reward pool, 0–1. */
  pays?: number;
}

/**
 * One repository's standing + unlock progress, consolidated into a single card.
 * For locked repos the gate bars show exactly what's left to start earning; for
 * unlocked repos they confirm the gates are cleared. Replaces the old
 * standings-only card so the per-repo story lives in one place.
 */
const MinerRepositoryCard: React.FC<MinerRepositoryCardProps> = ({
  repo,
  unlock,
  viewMode,
  pays = 0,
}) => {
  const isIssue = viewMode === 'issues';
  const linkProps = useLinkBehavior<HTMLAnchorElement>(
    repoMinersHref(repo.repositoryFullName),
  );

  const credibility = isIssue ? repo.issueCredibility : repo.credibility;
  const score = isIssue ? repo.issueDiscoveryScore : repo.totalScore;
  const owner = repo.repositoryFullName.split('/')[0];
  const repoName =
    repo.repositoryFullName.split('/').slice(1).join('/') ||
    repo.repositoryFullName;

  const counts = isIssue
    ? [
        { label: 'Solved', value: repo.totalSolvedIssues },
        { label: 'Valid', value: repo.totalValidSolvedIssues },
        { label: 'Open', value: repo.totalOpenIssues },
      ]
    : [
        { label: 'Merged', value: repo.totalMergedPrs },
        { label: 'Open', value: repo.totalOpenPrs },
        { label: 'Closed', value: repo.totalClosedPrs },
      ];

  const accent = STATUS_COLORS.info;

  return (
    <Card
      component="a"
      {...linkProps}
      elevation={0}
      sx={(theme) => ({
        ...linkResetSx,
        p: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: 2,
        backgroundColor: 'transparent',
        opacity: unlock.unlocked ? 1 : 0.92,
        transition:
          'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          borderColor: alpha(
            unlock.unlocked
              ? theme.palette.status.success
              : theme.palette.status.info,
            0.4,
          ),
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px -8px ${alpha(theme.palette.common.black, 0.4)}`,
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '2px',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
        },
      })}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.75,
          py: 1.1,
        }}
      >
        <Avatar
          src={getRepositoryOwnerAvatarSrc(owner)}
          alt={owner}
          sx={{
            width: 28,
            height: 28,
            border: '1px solid',
            borderColor: 'border.light',
            filter: unlock.unlocked ? 'none' : 'grayscale(60%)',
            flexShrink: 0,
          }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            title={repo.repositoryFullName}
            sx={{
              fontFamily: FONT_MONO,
              fontSize: '0.88rem',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            {repoName}
          </Typography>
          <Typography
            sx={{
              fontFamily: FONT_MONO,
              fontSize: '0.64rem',
              color: 'text.tertiary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {owner}
          </Typography>
        </Box>
        <StatusChip unlocked={unlock.unlocked} />
      </Box>

      {/* Hero metrics */}
      <Box
        sx={(theme) => ({
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          borderTop: `1px solid ${theme.palette.border.light}`,
          borderBottom: `1px solid ${theme.palette.border.light}`,
        })}
      >
        <Box sx={{ px: 1.75, py: 0.9, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '0.56rem',
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            {isIssue ? 'Discovery score' : 'Repo score'}
          </Typography>
          <Typography
            sx={{
              fontFamily: FONT_MONO,
              fontSize: '1.2rem',
              fontWeight: 700,
              lineHeight: 1.1,
              fontFeatureSettings: TABULAR,
              letterSpacing: '-0.02em',
              color: unlock.unlocked ? 'text.primary' : alpha('#fff', 0.5),
            }}
          >
            {score.toFixed(2)}
          </Typography>
          {pays > 0 && (
            <Typography
              sx={{ fontSize: '0.58rem', color: 'text.tertiary', mt: 0.3 }}
            >
              pays {(pays * 100).toFixed(pays >= 0.1 ? 1 : 2)}% of pool
            </Typography>
          )}
        </Box>
        <Box
          sx={(theme) => ({
            px: 1.75,
            py: 0.9,
            borderLeft: `1px solid ${theme.palette.border.light}`,
            textAlign: 'right',
            minWidth: 92,
          })}
        >
          <Typography
            sx={{
              fontSize: '0.56rem',
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            Credibility
          </Typography>
          <Typography
            sx={{
              fontFamily: FONT_MONO,
              fontSize: '0.95rem',
              fontWeight: 700,
              fontFeatureSettings: TABULAR,
              color: credibilityColor(credibility),
            }}
          >
            {(credibility * 100).toFixed(1)}%
          </Typography>
        </Box>
      </Box>

      {/* Unlock progress */}
      <Box
        sx={{
          px: 1.75,
          py: 1.1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.85,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.56rem',
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          {unlock.unlocked ? 'Eligibility · cleared' : 'Unlock progress'}
        </Typography>
        <GateBar
          label={isIssue ? 'Valid solved issues' : 'Valid merged PRs'}
          progress={unlock.count}
          kind="count"
          accent={accent}
        />
        <GateBar
          label="Credibility"
          progress={unlock.credibility}
          kind="percent"
          accent={accent}
        />

        {/* Activity counts */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1.25,
            flexWrap: 'wrap',
            mt: 0.25,
          }}
        >
          {counts.map((c) => (
            <Box
              key={c.label}
              sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5 }}
            >
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  color: 'text.tertiary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {c.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONT_MONO,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontFeatureSettings: TABULAR,
                }}
              >
                {c.value.toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Box>

        {!unlock.unlocked && repo.failedReason && (
          <Tooltip
            title={repo.failedReason}
            arrow
            placement="top"
            slotProps={tooltipSlotProps}
          >
            <Typography
              sx={{
                fontSize: '0.7rem',
                color: (t) => alpha(t.palette.text.primary, 0.5),
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {repo.failedReason}
            </Typography>
          </Tooltip>
        )}
      </Box>
    </Card>
  );
};

export default MinerRepositoryCard;
