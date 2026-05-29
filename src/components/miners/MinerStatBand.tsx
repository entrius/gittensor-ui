import React, { useMemo } from 'react';
import { alpha, Box, Skeleton, Tooltip, Typography } from '@mui/material';
import {
  BoltOutlined as EarningsIcon,
  EmojiEventsOutlined as ScoreIcon,
  FolderOpenOutlined as RepoIcon,
  InsightsOutlined as ActivityIcon,
  LeaderboardOutlined as RankIcon,
  VerifiedUserOutlined as CredibilityIcon,
} from '@mui/icons-material';
import { useAllMiners, useMinerStats } from '../../api';
import {
  LEADERBOARD_TRACK_COLORS,
  STATUS_COLORS,
  tooltipSlotProps,
} from '../../theme';
import { credibilityColor } from '../../utils/format';
import {
  aggregateMinerTotals,
  computeNetworkRank,
} from '../../utils/minerProgress';

interface MinerStatBandProps {
  githubId: string;
}

const toNum = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatCompact = (n: number): string => {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
};

const ACCENT = {
  oss: LEADERBOARD_TRACK_COLORS.oss,
  disc: LEADERBOARD_TRACK_COLORS.discovery,
} as const;

/* ── Tile primitives ──────────────────────────────────────────────── */

const TileHeader: React.FC<{
  icon: React.ReactNode;
  label: string;
  tone?: string;
  tooltip?: string;
}> = ({ icon, label, tone, tooltip }) => {
  const head = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      <Box
        sx={{
          color: tone ?? ((t) => alpha(t.palette.text.primary, 0.45)),
          display: 'inline-flex',
          '& svg': { fontSize: '0.95rem' },
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="statLabel"
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
  if (!tooltip) return head;
  return (
    <Tooltip title={tooltip} arrow placement="top" slotProps={tooltipSlotProps}>
      <Box sx={{ display: 'inline-flex', cursor: 'help' }}>{head}</Box>
    </Tooltip>
  );
};

const BigValue: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color,
}) => (
  <Typography
    sx={{
      fontSize: { xs: '1.35rem', md: '1.55rem' },
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.1,
      color: color ?? 'text.primary',
      mt: 0.75,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </Typography>
);

const SubStat: React.FC<{
  label: string;
  value: React.ReactNode;
  accent?: keyof typeof ACCENT;
}> = ({ label, value, accent }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 0.75,
      minWidth: 0,
    }}
  >
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        minWidth: 0,
      }}
    >
      {accent && (
        <Box
          sx={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: ACCENT[accent],
            flexShrink: 0,
          }}
        />
      )}
      <Typography
        sx={{
          fontSize: '0.66rem',
          color: 'text.tertiary',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </Typography>
    </Box>
    <Typography
      sx={{
        fontSize: '0.74rem',
        fontWeight: 600,
        color: (t) => alpha(t.palette.text.primary, 0.85),
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </Typography>
  </Box>
);

const Subs: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
    {children}
  </Box>
);

const IntensityBar: React.FC<{ value: number; color: string }> = ({
  value,
  color,
}) => (
  <Box
    sx={{
      mt: 1,
      width: '100%',
      height: 4,
      borderRadius: 999,
      backgroundColor: 'border.light',
      overflow: 'hidden',
    }}
  >
    <Box
      sx={{
        width: `${Math.min(100, Math.max(0, value * 100))}%`,
        height: '100%',
        backgroundColor: color,
        borderRadius: 999,
      }}
    />
  </Box>
);

const Tile: React.FC<{
  children: React.ReactNode;
  span2?: boolean;
}> = ({ children, span2 }) => (
  <Box
    sx={{
      p: { xs: 1.75, md: 2 },
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'border.light',
      backgroundColor: 'surface.subtle',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gridColumn: span2 ? { xs: '1 / -1', sm: 'span 2', lg: 'span 2' } : 'auto',
    }}
  >
    {children}
  </Box>
);

/**
 * Headline performance band — the numbers a miner checks first: earnings,
 * score, credibility, activity, unlocked-repo coverage and subnet rank. All
 * values come straight from the API; earnings are the honest network-wide
 * figure (the API exposes no per-track split).
 */
const MinerStatBand: React.FC<MinerStatBandProps> = ({ githubId }) => {
  const { data: m, isLoading } = useMinerStats(githubId);
  const { data: allMiners } = useAllMiners();

  const rank = useMemo(
    () => computeNetworkRank(allMiners, githubId),
    [allMiners, githubId],
  );

  if (isLoading || !m) {
    return (
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            lg: 'repeat(6, 1fr)',
          },
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={104}
            sx={{ borderRadius: 2, bgcolor: 'surface.subtle' }}
          />
        ))}
      </Box>
    );
  }

  // The single-miner endpoint serves SUM'd float columns as broken strings;
  // aggregateMinerTotals sources them from the clean leaderboard row (or sums
  // the per-repo rows). Counts/credibility/earnings stay from the single row.
  const listed = allMiners?.find((x) => x.githubId === githubId);
  const totals = aggregateMinerTotals(m, listed);
  const {
    ossScore,
    discScore,
    combinedScore,
    baseScore,
    additions,
    deletions,
  } = totals;
  const cred = totals.ossCred;
  const issueCred = totals.issueCred;
  const blendedCred = totals.blendedCred;
  const credPct = Math.round(blendedCred * 100);

  const usdPerDay = toNum(m.usdPerDay);
  const lifetimeUsd = toNum(m.lifetimeUsd);
  const lifetimeTao = toNum(m.lifetimeTao);
  const lifetimeAlpha = toNum(m.lifetimeAlpha);

  const totalIssues =
    totals.solvedIssues + totals.closedIssues + totals.openIssues;

  const repoCount = (m.repositories ?? []).filter(
    (r) => r.repositoryFullName.trim().length > 0,
  ).length;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          lg: 'repeat(6, 1fr)',
        },
      }}
    >
      {/* Earnings — network-wide, total only */}
      <Tile span2>
        <TileHeader
          icon={<EarningsIcon />}
          label="Earnings / day"
          tone={usdPerDay > 0 ? STATUS_COLORS.success : undefined}
          tooltip="Network-wide daily earnings, derived from the metagraph incentive distribution — not split per repository or track."
        />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <BigValue color={usdPerDay > 0 ? STATUS_COLORS.success : undefined}>
            ~${Math.round(usdPerDay).toLocaleString()}
          </BigValue>
          <Typography
            sx={{
              fontSize: '0.72rem',
              color: 'text.tertiary',
              whiteSpace: 'nowrap',
            }}
          >
            {usdPerDay > 0
              ? `~$${Math.round(usdPerDay * 30).toLocaleString()}/mo`
              : 'not earning yet'}
          </Typography>
        </Box>
        <Subs>
          <SubStat
            label="Lifetime"
            value={`~$${Math.round(lifetimeUsd).toLocaleString()}`}
          />
          <SubStat
            label="Tokens"
            value={`${lifetimeTao.toFixed(2)}τ · ${lifetimeAlpha.toFixed(2)}α`}
          />
        </Subs>
      </Tile>

      {/* Score */}
      <Tile>
        <TileHeader
          icon={<ScoreIcon />}
          label="Score"
          tooltip="Combined OSS contribution + issue-discovery score across all repositories."
        />
        <BigValue>{combinedScore.toFixed(2)}</BigValue>
        <Subs>
          <SubStat label="Base" value={baseScore.toFixed(2)} />
          <SubStat label="OSS" value={ossScore.toFixed(2)} accent="oss" />
          <SubStat label="Disc" value={discScore.toFixed(2)} accent="disc" />
        </Subs>
      </Tile>

      {/* Credibility */}
      <Tile>
        <TileHeader
          icon={<CredibilityIcon />}
          label="Credibility"
          tooltip="Score-weighted blend of OSS merge-rate and issue-discovery solve-rate credibility."
        />
        <BigValue
          color={
            combinedScore > 0 || cred + issueCred > 0
              ? credibilityColor(blendedCred)
              : undefined
          }
        >
          {combinedScore > 0 || cred + issueCred > 0 ? `${credPct}%` : '—'}
        </BigValue>
        {cred + issueCred > 0 && (
          <IntensityBar
            value={blendedCred}
            color={credibilityColor(blendedCred)}
          />
        )}
        <Subs>
          <SubStat
            label="OSS"
            value={`${Math.round(cred * 100)}%`}
            accent="oss"
          />
          <SubStat
            label="Disc"
            value={`${Math.round(issueCred * 100)}%`}
            accent="disc"
          />
        </Subs>
      </Tile>

      {/* Activity */}
      <Tile>
        <TileHeader
          icon={<ActivityIcon />}
          label="Activity"
          tooltip="Lifetime merged PRs and verified solved issues, with code volume."
        />
        <Box
          sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 0.75 }}
        >
          <Tooltip title="Merged PRs" arrow slotProps={tooltipSlotProps}>
            <Box
              sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.4 }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  bgcolor: ACCENT.oss,
                  alignSelf: 'center',
                }}
              />
              <Typography
                sx={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1 }}
              >
                {totals.mergedPrs.toLocaleString()}
              </Typography>
            </Box>
          </Tooltip>
          <Tooltip title="Solved issues" arrow slotProps={tooltipSlotProps}>
            <Box
              sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.4 }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  bgcolor: ACCENT.disc,
                  alignSelf: 'center',
                }}
              />
              <Typography
                sx={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1 }}
              >
                {totals.solvedIssues.toLocaleString()}
              </Typography>
            </Box>
          </Tooltip>
        </Box>
        <Subs>
          <SubStat
            label="PRs"
            value={totals.prs.toLocaleString()}
            accent="oss"
          />
          <SubStat
            label="Issues"
            value={totalIssues.toLocaleString()}
            accent="disc"
          />
          <SubStat
            label="Lines"
            value={
              additions + deletions > 0 ? (
                <Box component="span">
                  <Box component="span" sx={{ color: 'diff.additions' }}>
                    +{formatCompact(additions)}
                  </Box>{' '}
                  <Box component="span" sx={{ color: 'diff.deletions' }}>
                    −{formatCompact(deletions)}
                  </Box>
                </Box>
              ) : (
                '—'
              )
            }
          />
        </Subs>
      </Tile>

      {/* Eligible repos */}
      <Tile>
        <TileHeader
          icon={<RepoIcon />}
          label="Eligible repos"
          tooltip="Repositories where the miner has unlocked earning (cleared the eligibility gate), out of all evaluated."
        />
        <BigValue>
          {m.eligibleRepoCount ?? 0}
          <Box
            component="span"
            sx={{ fontSize: '0.9rem', color: 'text.tertiary', fontWeight: 500 }}
          >
            {' '}
            / {repoCount}
          </Box>
        </BigValue>
        <Subs>
          <SubStat label="OSS" value={m.eligibleRepoCount ?? 0} accent="oss" />
          <SubStat
            label="Disc"
            value={m.issueEligibleRepoCount ?? 0}
            accent="disc"
          />
        </Subs>
      </Tile>

      {/* Network rank */}
      <Tile>
        <TileHeader
          icon={<RankIcon />}
          label="Network rank"
          tooltip="Standing among active miners on the subnet (by metagraph rank)."
        />
        <BigValue>{rank ? `#${rank.rank}` : '—'}</BigValue>
        <Subs>
          <SubStat
            label="of miners"
            value={rank ? rank.total.toLocaleString() : '—'}
          />
        </Subs>
      </Tile>
    </Box>
  );
};

export default MinerStatBand;
