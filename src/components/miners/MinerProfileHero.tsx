import React, { useMemo } from 'react';
import {
  alpha,
  Avatar,
  Box,
  ButtonBase,
  Card,
  CircularProgress,
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
  type CommitLog,
} from '../../api';
import { useClipboardCopy } from '../../hooks/useClipboardCopy';
import { formatRelativeTimeAgo } from '../../utils/format';
import { LEADERBOARD_TRACK_COLORS, STATUS_COLORS } from '../../theme';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import { deriveMinerStatus, StatusBadge } from '../leaderboard/MinerStatus';
import type { MinerActivity } from '../leaderboard/useMinerActivityIndex';

interface MinerProfileHeroProps {
  githubId: string;
  /** Optional action affordance pinned to the card's top-right (e.g. watch star). */
  action?: React.ReactNode;
}

const COPY_FEEDBACK_MS = 1500;
const HOTKEY_VISIBLE_EDGE_CHARS = 6;
const MS_PER_DAY = 86_400_000;

const startOfUtcDay = (ms: number): number => {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
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

/** Thin middot divider between inline metadata items. */
const SepDot: React.FC = () => (
  <Box
    component="span"
    sx={{
      width: 3,
      height: 3,
      borderRadius: '50%',
      bgcolor: 'text.tertiary',
      flexShrink: 0,
    }}
  />
);

/** One muted metadata item — icon + text, rendered as a link when `href` set. */
const MetaItem: React.FC<{
  icon: React.ReactNode;
  href?: string;
  children: React.ReactNode;
}> = ({ icon, href, children }) => {
  const body = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          color: 'text.tertiary',
          '& svg': { fontSize: '0.9rem' },
        }}
      >
        {icon}
      </Box>
      <Typography
        component="span"
        sx={{
          fontSize: '0.76rem',
          color: (t) => alpha(t.palette.text.primary, 0.6),
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {children}
      </Typography>
    </Box>
  );
  if (!href) return body;
  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        textDecoration: 'none',
        minWidth: 0,
        '&:hover .MuiTypography-root': {
          color: 'text.primary',
          textDecoration: 'underline',
        },
      }}
    >
      {body}
    </Box>
  );
};

/** Compact eligibility standing pill — "OSS 4 / 15". */
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
        borderColor: active ? alpha(color, 0.4) : 'border.light',
        backgroundColor: active ? alpha(color, 0.1) : 'transparent',
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
          whiteSpace: 'nowrap',
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
 * Identity header for the miner performance dashboard. A single, flat card:
 * avatar + name + handle on the left, a muted GitHub-metadata line beneath the
 * bio, and the last-updated timestamp tucked top-right. Deliberately about
 * identity — the performance numbers (eligibility included) live in the stat
 * band below.
 */
const MinerProfileHero: React.FC<MinerProfileHeroProps> = ({
  githubId,
  action,
}) => {
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

  // Muted GitHub-metadata line — only the fields the profile actually has.
  const metaItems: { key: string; node: React.ReactNode }[] = [];
  if (githubData) {
    metaItems.push({
      key: 'followers',
      node: (
        <MetaItem icon={<FollowersIcon />}>
          {(githubData.followers ?? 0).toLocaleString()} followers
        </MetaItem>
      ),
    });
    if (githubData.company) {
      metaItems.push({
        key: 'company',
        node: <MetaItem icon={<CompanyIcon />}>{githubData.company}</MetaItem>,
      });
    }
    if (githubData.location) {
      metaItems.push({
        key: 'location',
        node: (
          <MetaItem icon={<LocationIcon />}>{githubData.location}</MetaItem>
        ),
      });
    }
    if (githubData.blog) {
      const href = githubData.blog.startsWith('http')
        ? githubData.blog
        : `https://${githubData.blog}`;
      metaItems.push({
        key: 'website',
        node: (
          <MetaItem icon={<WebsiteIcon />} href={href}>
            Website
          </MetaItem>
        ),
      });
    }
  }

  return (
    <Card sx={{ p: { xs: 2, md: 2.5 } }} elevation={0}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: { xs: 1.5, md: 2 },
        }}
      >
        {/* ── Identity ─────────────────────────────────────────── */}
        <Avatar
          src={getRepositoryOwnerAvatarSrc(username)}
          alt={username}
          sx={{
            width: { xs: 48, md: 64 },
            height: { xs: 48, md: 64 },
            border: '2px solid',
            borderColor: 'border.light',
            flexShrink: 0,
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Name + momentum status + last-updated */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              rowGap: 0.5,
              flexWrap: 'wrap',
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: '1.15rem', md: '1.4rem' },
                fontWeight: 700,
                lineHeight: 1.15,
                color: 'text.primary',
                overflowWrap: 'anywhere',
                minWidth: 0,
              }}
            >
              {githubData?.name || username}
            </Typography>
            {status && <StatusBadge status={status} />}

            {(minerStats.updatedAt || action) && (
              <Box
                sx={{
                  ml: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  flexShrink: 0,
                }}
              >
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
                    <Typography
                      sx={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                    >
                      Updated {formatRelativeTimeAgo(minerStats.updatedAt)}
                    </Typography>
                  </Box>
                )}
                {action}
              </Box>
            )}
          </Box>

          {/* Handle · UID · hotkey */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              flexWrap: 'wrap',
              mt: 0.5,
            }}
          >
            <Typography
              component="a"
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                fontSize: '0.82rem',
                fontWeight: 500,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.4,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              <GitHubIcon sx={{ fontSize: '0.95rem' }} />@{username}
            </Typography>
            <SepDot />
            <Typography
              component="span"
              sx={{ fontSize: '0.76rem', color: 'text.tertiary' }}
            >
              UID {minerStats.uid}
            </Typography>
            <CopyableHotkey hotkey={minerStats.hotkey || ''} />
          </Box>

          {/* Bio */}
          {githubData?.bio && (
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.7),
                fontSize: '0.82rem',
                mt: 0.85,
                lineHeight: 1.45,
                maxWidth: 560,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {githubData.bio}
            </Typography>
          )}

          {/* Muted GitHub metadata */}
          {metaItems.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 0.75,
                mt: 1,
              }}
            >
              {metaItems.map((item, i) => (
                <React.Fragment key={item.key}>
                  {i > 0 && <SepDot />}
                  {item.node}
                </React.Fragment>
              ))}
            </Box>
          )}

          {/* Eligibility standing — repos with earning unlocked, per track */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.25 }}>
            <EligibilityPill
              label="OSS"
              eligible={minerStats.eligibleRepoCount ?? 0}
              total={repoCount}
              color={LEADERBOARD_TRACK_COLORS.oss}
            />
            <EligibilityPill
              label="Disc"
              eligible={minerStats.issueEligibleRepoCount ?? 0}
              total={repoCount}
              color={LEADERBOARD_TRACK_COLORS.discovery}
            />
          </Box>
        </Box>
      </Box>
    </Card>
  );
};

export default MinerProfileHero;
