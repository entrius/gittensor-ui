import React, { useMemo } from 'react';
import {
  alpha,
  Avatar,
  Box,
  Button,
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
  OpenInNew as OpenInNewIcon,
  People as FollowersIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import {
  useMinerGithubData,
  useMinerPRs,
  useMinerStats,
  type CommitLog,
} from '../../api';
import { useClipboardCopy } from '../../hooks/useClipboardCopy';
import { LEADERBOARD_TRACK_COLORS, STATUS_COLORS } from '../../theme';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import { deriveMinerStatus, StatusBadge } from '../leaderboard/MinerStatus';
import type { MinerActivity } from '../leaderboard/useMinerActivityIndex';

interface MinerProfileHeroProps {
  githubId: string;
}

const COPY_FEEDBACK_MS = 1500;
const HOTKEY_VISIBLE_EDGE_CHARS = 6;
const MS_PER_DAY = 86_400_000;

/** Meta chips are border-only — the page keeps a single background colour. */
const INFO_CHIP_SX = { backgroundColor: 'transparent' } as const;

const startOfUtcDay = (ms: number): number => {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
};

const formatTimeAgo = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / MS_PER_DAY);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) {
    const rem = mins % 60;
    return rem > 0 ? `${hours}h ${rem}m ago` : `${hours}h ago`;
  }
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

const formatHotkeyPreview = (hotkey: string): string => {
  if (!hotkey) return '';
  if (hotkey.length <= HOTKEY_VISIBLE_EDGE_CHARS * 2 + 3) return hotkey;
  return `${hotkey.slice(0, HOTKEY_VISIBLE_EDGE_CHARS)}…${hotkey.slice(
    -HOTKEY_VISIBLE_EDGE_CHARS,
  )}`;
};

/**
 * Build the last-30-day `dailyMerged` series the momentum status derivation
 * needs, straight from the miner's own PRs (the network activity index only
 * covers the 500 most-recent commits and may miss this miner).
 */
const buildActivityFromPrs = (prs: CommitLog[] | undefined): MinerActivity => {
  const lookbackDays = 30;
  const today = startOfUtcDay(Date.now());
  const windowStart = today - (lookbackDays - 1) * MS_PER_DAY;
  const dailyMerged = new Array<number>(lookbackDays).fill(0);
  let lastActiveAt: string | null = null;
  (prs ?? []).forEach((pr) => {
    if (pr.mergedAt) {
      const t = Date.parse(pr.mergedAt);
      if (Number.isFinite(t) && t >= windowStart) {
        const slot = Math.round((startOfUtcDay(t) - windowStart) / MS_PER_DAY);
        if (slot >= 0 && slot < lookbackDays) dailyMerged[slot] += 1;
      }
    }
    const iso = pr.mergedAt ?? pr.prCreatedAt ?? null;
    if (iso && (!lastActiveAt || Date.parse(iso) > Date.parse(lastActiveAt))) {
      lastActiveAt = iso;
    }
  });
  return {
    dailyMerged,
    dailyOss: [],
    dailyDiscovery: [],
    topRepos: [],
    lastActiveAt,
    reviewHits: 0,
  };
};

/** Copy-to-clipboard hotkey, monospace with truncated preview. */
const CopyableHotkey: React.FC<{ hotkey: string }> = ({ hotkey }) => {
  const { copied, copy, liveRegion } = useClipboardCopy({
    resetMs: COPY_FEEDBACK_MS,
    copiedMessage: 'Hotkey copied to clipboard',
  });
  if (!hotkey) return null;
  return (
    <>
      <ButtonBase
        onClick={() => void copy(hotkey)}
        aria-label="Copy hotkey"
        disableRipple
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'border.light',
          backgroundColor: 'transparent',
          fontSize: '0.66rem',
          lineHeight: 1,
          color: (t) =>
            copied
              ? t.palette.status.success
              : alpha(t.palette.text.primary, 0.6),
          transition: 'color 0.15s ease, border-color 0.15s ease',
          '&:hover': {
            borderColor: 'border.medium',
            color: (t) =>
              copied
                ? t.palette.status.success
                : alpha(t.palette.text.primary, 0.9),
          },
          '&:focus-visible': {
            outline: (t) => `2px solid ${t.palette.primary.main}`,
            outlineOffset: '2px',
          },
        }}
      >
        <Box
          component="span"
          sx={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          {copied ? '✓ Copied' : formatHotkeyPreview(hotkey)}
        </Box>
      </ButtonBase>
      {liveRegion}
    </>
  );
};

/** Eligibility summary pill — "PR-eligible 4 / 15". */
const EligibilityPill: React.FC<{
  label: string;
  eligible: number;
  total: number;
  color: string;
}> = ({ label, eligible, total, color }) => {
  const active = eligible > 0;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1,
        py: 0.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: active ? alpha(color, 0.45) : 'border.light',
        backgroundColor: 'transparent',
      }}
    >
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: active ? color : 'text.tertiary',
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontSize: '0.72rem',
          color: (t) => alpha(t.palette.text.primary, 0.7),
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.78rem',
          fontWeight: 700,
          color: active ? color : 'text.tertiary',
        }}
      >
        {eligible}
        <Box component="span" sx={{ color: 'text.tertiary', fontWeight: 500 }}>
          {' '}
          / {total}
        </Box>
      </Typography>
    </Box>
  );
};

/**
 * Identity header for the miner performance dashboard — who the miner is, their
 * momentum, and an at-a-glance eligibility summary. The headline performance
 * numbers live in the stat band below; this card is deliberately about
 * identity + standing context.
 */
const MinerProfileHero: React.FC<MinerProfileHeroProps> = ({ githubId }) => {
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);
  const { data: githubData } = useMinerGithubData(githubId);
  const { data: prs } = useMinerPRs(githubId);

  const username = githubData?.login || prs?.[0]?.author || githubId;

  const repoCount = useMemo(
    () =>
      (minerStats?.repositories ?? []).filter(
        (r) => r.repositoryFullName.trim().length > 0,
      ).length,
    [minerStats],
  );

  const status = useMemo(() => {
    if (!minerStats) return null;
    return deriveMinerStatus(minerStats, buildActivityFromPrs(prs));
  }, [minerStats, prs]);

  if (isLoading) {
    return (
      <Card
        sx={{ p: 4, display: 'flex', justifyContent: 'center' }}
        elevation={0}
      >
        <CircularProgress size={28} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  if (error || !minerStats) {
    return (
      <Card sx={{ p: 3 }} elevation={0}>
        <Typography sx={{ color: alpha(STATUS_COLORS.error, 0.9) }}>
          No data found for GitHub user: {githubId}
        </Typography>
      </Card>
    );
  }

  return (
    <Card sx={{ p: { xs: 2, md: 2.5 } }} elevation={0}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'flex-start' },
          justifyContent: 'space-between',
          gap: { xs: 2, md: 3 },
        }}
      >
        {/* ── Identity cluster ─────────────────────────────────── */}
        <Box sx={{ display: 'flex', gap: 2, minWidth: 0 }}>
          <Avatar
            src={getRepositoryOwnerAvatarSrc(username)}
            alt={username}
            sx={{
              width: { xs: 56, md: 72 },
              height: { xs: 56, md: 72 },
              border: '2px solid',
              borderColor: 'border.light',
              flexShrink: 0,
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                  fontWeight: 700,
                  lineHeight: 1.15,
                  color: 'text.primary',
                  overflowWrap: 'break-word',
                }}
              >
                {githubData?.name || username}
              </Typography>
              {status && <StatusBadge status={status} />}
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
                mt: 0.75,
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
              <Chip
                label={`UID ${minerStats.uid}`}
                size="small"
                variant="info"
                sx={{ ...INFO_CHIP_SX, height: 20, fontSize: '0.68rem' }}
              />
              <CopyableHotkey hotkey={minerStats.hotkey || ''} />
            </Box>

            {githubData?.bio && (
              <Typography
                sx={{
                  color: (t) => alpha(t.palette.text.primary, 0.7),
                  fontSize: '0.82rem',
                  mt: 1,
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {githubData.bio}
              </Typography>
            )}

            {/* Eligibility summary — what the miner has unlocked */}
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
              <EligibilityPill
                label="PR-eligible"
                eligible={minerStats.eligibleRepoCount ?? 0}
                total={repoCount}
                color={LEADERBOARD_TRACK_COLORS.oss}
              />
              <EligibilityPill
                label="Discovery"
                eligible={minerStats.issueEligibleRepoCount ?? 0}
                total={repoCount}
                color={LEADERBOARD_TRACK_COLORS.discovery}
              />
            </Stack>
          </Box>
        </Box>

        {/* ── Meta cluster ─────────────────────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'flex-start', md: 'flex-end' },
            gap: 1.25,
            flexShrink: 0,
          }}
        >
          <Button
            component="a"
            href={githubData?.htmlUrl || `https://github.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<OpenInNewIcon sx={{ fontSize: '0.9rem' }} />}
            sx={{
              textTransform: 'none',
              fontSize: '0.78rem',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'border.light',
              borderRadius: 1.5,
              px: 1.5,
              py: 0.5,
              '&:hover': {
                backgroundColor: 'surface.light',
                borderColor: 'border.medium',
              },
            }}
          >
            GitHub profile
          </Button>

          {githubData && (
            <Stack
              direction="row"
              gap={0.75}
              flexWrap="wrap"
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
            >
              <Chip
                variant="info"
                icon={<FollowersIcon />}
                label={`${(githubData.followers ?? 0).toLocaleString()} followers`}
                size="small"
                sx={INFO_CHIP_SX}
              />
              {githubData.company && (
                <Chip
                  variant="info"
                  icon={<CompanyIcon />}
                  label={githubData.company}
                  size="small"
                  sx={INFO_CHIP_SX}
                />
              )}
              {githubData.location && (
                <Chip
                  variant="info"
                  icon={<LocationIcon />}
                  label={githubData.location}
                  size="small"
                  sx={INFO_CHIP_SX}
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
                  sx={INFO_CHIP_SX}
                />
              )}
            </Stack>
          )}

          {minerStats.updatedAt && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: (t) => alpha(t.palette.text.primary, 0.4),
              }}
            >
              <UpdateIcon sx={{ fontSize: '0.85rem' }} />
              <Typography sx={{ fontSize: '0.72rem' }}>
                Updated {formatTimeAgo(new Date(minerStats.updatedAt))}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  );
};

export default MinerProfileHero;
