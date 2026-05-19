import React, { useMemo } from 'react';
import {
  alpha,
  Avatar,
  Box,
  ButtonBase,
  Card,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  Business as CompanyIcon,
  GitHub as GitHubIcon,
  Language as WebsiteIcon,
  LocationOn as LocationIcon,
  People as FollowersIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import {
  useMinerGithubData,
  useMinerPRs,
  useMinerStats,
  type MinerRepositoryEvaluation,
} from '../../api';
import { useClipboardCopy } from '../../hooks/useClipboardCopy';
import { STATUS_COLORS } from '../../theme';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import { formatUsdPerDay } from '../../utils/format';
import MinerInsightsCard from './MinerInsightsCard';

type ViewMode = 'prs' | 'issues';

interface MinerIdentityRailProps {
  githubId: string;
  viewMode?: ViewMode;
}

const COPY_FEEDBACK_MS = 1500;
const HOTKEY_VISIBLE_EDGE_CHARS = 5;

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) {
    const mins = diffMins % 60;
    return mins > 0 ? `${diffHours}h ${mins}m ago` : `${diffHours}h ago`;
  }
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

const formatHotkeyPreview = (hotkey: string): string => {
  if (!hotkey) return '';
  if (hotkey.length <= HOTKEY_VISIBLE_EDGE_CHARS * 2 + 3) return hotkey;
  return `${hotkey.slice(0, HOTKEY_VISIBLE_EDGE_CHARS)}...${hotkey.slice(
    -HOTKEY_VISIBLE_EDGE_CHARS,
  )}`;
};

/** Copy-to-clipboard hotkey button. Lifted verbatim from MinerScoreCard. */
const CopyableHotkey: React.FC<{ hotkey: string }> = ({ hotkey }) => {
  const { copied, copy, liveRegion } = useClipboardCopy({
    resetMs: COPY_FEEDBACK_MS,
    copiedMessage: 'Hotkey copied to clipboard',
  });

  if (!hotkey) return null;

  const hotkeyTextSx = {
    color: 'inherit',
    fontSize: '0.62rem',
    fontFamily: '"JetBrains Mono", monospace',
    overflowWrap: 'anywhere',
    lineHeight: 1,
  } as const;

  return (
    <>
      <ButtonBase
        onClick={() => void copy(hotkey)}
        aria-label="Copy hotkey"
        disableRipple
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          textAlign: 'left',
          borderRadius: '4px',
          lineHeight: 1,
          p: 0,
          m: 0,
          maxWidth: '100%',
          overflow: 'hidden',
          color: (t) =>
            copied
              ? t.palette.status.success
              : alpha(t.palette.text.primary, 0.45),
          transition: 'color 0.15s ease',
          '&:hover': {
            color: (t) =>
              copied
                ? t.palette.status.success
                : alpha(t.palette.text.primary, 0.8),
          },
          '&:focus-visible': {
            outline: (t) => `2px solid ${t.palette.primary.main}`,
            outlineOffset: '2px',
          },
        }}
      >
        <Box component="span" sx={hotkeyTextSx}>
          {copied ? '✓ Copied to clipboard' : formatHotkeyPreview(hotkey)}
        </Box>
      </ButtonBase>
      {liveRegion}
    </>
  );
};

/** Honest, counts-only standing summary — no averages or MAX rollups. */
interface SummaryCounts {
  repoCount: number;
  ossEligible: number;
  issueEligible: number;
}

const computeSummaryCounts = (
  repositories: MinerRepositoryEvaluation[],
): SummaryCounts => ({
  repoCount: repositories.length,
  ossEligible: repositories.filter((r) => r.isEligible).length,
  issueEligible: repositories.filter((r) => r.isIssueEligible).length,
});

const SummaryRow: React.FC<{
  label: string;
  value: string;
  accent?: boolean;
}> = ({ label, value, accent }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 1.5,
    }}
  >
    <Typography
      sx={{
        fontSize: '0.78rem',
        color: (t) => alpha(t.palette.text.primary, 0.6),
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: '0.92rem',
        fontWeight: 600,
        color: accent ? STATUS_COLORS.success : 'text.primary',
      }}
    >
      {value}
    </Typography>
  </Box>
);

/** Compact rail card shell — transparent, hairline border, matches the page. */
const RailCard: React.FC<{
  title: string;
  children: React.ReactNode;
  hint?: string;
}> = ({ title, children, hint }) => (
  <Card
    sx={{
      borderRadius: 3,
      border: '1px solid',
      borderColor: 'border.light',
      backgroundColor: 'transparent',
      p: 2.5,
    }}
    elevation={0}
  >
    <Typography
      variant="statLabel"
      sx={{ display: 'block', mb: hint ? 0.4 : 1.5 }}
    >
      {title}
    </Typography>
    {hint && (
      <Typography
        sx={{
          fontSize: '0.72rem',
          color: (t) => alpha(t.palette.text.primary, 0.45),
          mb: 1.5,
        }}
      >
        {hint}
      </Typography>
    )}
    {children}
  </Card>
);

/**
 * Left-rail content for the miner details page — the only genuinely
 * miner-wide surfaces: identity, an honest counts-only standing summary,
 * network-wide earnings, and per-repo-aware insights.
 *
 * Per-repo scoring means averaged/MAX rollups (a single credibility %, a
 * SUM score) are misleading; this rail deliberately shows counts only.
 */
const MinerIdentityRail: React.FC<MinerIdentityRailProps> = ({
  githubId,
  viewMode = 'prs',
}) => {
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);
  const { data: githubData } = useMinerGithubData(githubId);
  const { data: prs } = useMinerPRs(githubId);

  const isIssueMode = viewMode === 'issues';
  const username = githubData?.login || prs?.[0]?.author || githubId;

  // Pre-migration placeholder rows carry an empty repo name — drop them so
  // the counts only reflect real repositories.
  const summary = useMemo<SummaryCounts | null>(() => {
    if (!minerStats) return null;
    const repositories = (minerStats.repositories ?? []).filter(
      (r) => r.repositoryFullName.trim().length > 0,
    );
    return computeSummaryCounts(repositories);
  }, [minerStats]);

  if (isLoading) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }} elevation={0}>
        <CircularProgress size={32} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  if (error || !minerStats || !summary) {
    return (
      <Card sx={{ p: 3 }} elevation={0}>
        <Typography
          sx={{ color: alpha(STATUS_COLORS.error, 0.9), fontSize: '0.9rem' }}
        >
          No data found for GitHub user: {githubId}
        </Typography>
      </Card>
    );
  }

  const repoNoun = summary.repoCount === 1 ? 'repository' : 'repositories';
  const eligibleCount = isIssueMode
    ? summary.issueEligible
    : summary.ossEligible;
  const eligibleLabel = isIssueMode ? 'Issue-eligible' : 'PR-eligible';
  const usdPerDay = minerStats.usdPerDay ?? 0;
  const lifetimeUsd = minerStats.lifetimeUsd ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── Identity ─────────────────────────────────────────── */}
      <Card sx={{ p: 2.5, position: 'relative' }} elevation={0}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 1.25,
          }}
        >
          <Avatar
            src={getRepositoryOwnerAvatarSrc(username)}
            alt={username}
            sx={{
              width: 64,
              height: 64,
              border: '2px solid',
              borderColor: 'border.light',
            }}
          />
          <Box sx={{ minWidth: 0, width: '100%' }}>
            <Typography
              sx={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'text.primary',
                overflowWrap: 'break-word',
                lineHeight: 1.25,
              }}
            >
              {githubData?.name || username}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 0.35,
                mt: 0.5,
                minWidth: 0,
              }}
            >
              <Typography
                component="a"
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'primary.main',
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                <GitHubIcon sx={{ fontSize: '1rem' }} />@{username}
              </Typography>
              <CopyableHotkey hotkey={minerStats.hotkey || ''} />
            </Box>
          </Box>
        </Box>

        {githubData?.bio && (
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.7),
              fontSize: '0.8rem',
              mt: 1.25,
              lineHeight: 1.5,
            }}
          >
            {githubData.bio}
          </Typography>
        )}

        {githubData && (
          <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1.25 }}>
            {githubData.company && (
              <Chip
                variant="info"
                icon={<CompanyIcon />}
                label={githubData.company}
                size="small"
              />
            )}
            {githubData.location && (
              <Chip
                variant="info"
                icon={<LocationIcon />}
                label={githubData.location}
                size="small"
              />
            )}
            {githubData.blog && (
              <Chip
                variant="info"
                component="a"
                href={
                  githubData.blog.startsWith('http')
                    ? githubData.blog
                    : `https://${githubData.blog}`
                }
                target="_blank"
                rel="noopener noreferrer"
                icon={<WebsiteIcon />}
                label="Website"
                clickable
                size="small"
              />
            )}
            <Chip
              variant="info"
              icon={<FollowersIcon />}
              label={`${githubData.followers ?? 0} followers`}
              size="small"
            />
          </Stack>
        )}

        {minerStats.updatedAt && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 1.5,
              color: (t) => alpha(t.palette.text.primary, 0.4),
            }}
          >
            <UpdateIcon sx={{ fontSize: '0.85rem' }} />
            <Typography sx={{ fontSize: '0.72rem' }}>
              Updated {formatTimeAgo(new Date(minerStats.updatedAt))}
            </Typography>
          </Box>
        )}
      </Card>

      {/* ── Standing summary — counts only ───────────────────── */}
      <RailCard title="Standing summary">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.9 }}>
          <SummaryRow
            label={`Evaluated ${repoNoun}`}
            value={String(summary.repoCount)}
          />
          <SummaryRow
            label={`${eligibleLabel} repositories`}
            value={`${eligibleCount} of ${summary.repoCount}`}
            accent={eligibleCount > 0}
          />
        </Box>
      </RailCard>

      {/* ── Earnings — explicitly network-wide ───────────────── */}
      <RailCard
        title="Earnings"
        hint="Network-wide. Derived from the metagraph incentive distribution, not any single repository."
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography
            sx={{
              fontSize: '1.7rem',
              fontWeight: 700,
              lineHeight: 1,
              color: usdPerDay > 0 ? STATUS_COLORS.success : 'text.primary',
            }}
          >
            {formatUsdPerDay(usdPerDay, {
              includeApprox: true,
              includePeriod: false,
            })}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.8rem',
              fontWeight: 500,
              color: (t) => alpha(t.palette.text.primary, 0.5),
            }}
          >
            /day
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: (t) => alpha(t.palette.text.primary, 0.45),
            mt: 0.6,
          }}
        >
          ~$
          {((usdPerDay || 0) * 30)
            .toFixed(0)
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          /mo · ~$
          {(lifetimeUsd || 0)
            .toFixed(0)
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}{' '}
          lifetime
        </Typography>
      </RailCard>

      {/* ── Insights — per-repo-aware ────────────────────────── */}
      <MinerInsightsCard githubId={githubId} viewMode={viewMode} />
    </Box>
  );
};

export default MinerIdentityRail;
