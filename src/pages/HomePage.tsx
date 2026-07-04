import React, { useEffect, useMemo, useState } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SEO } from '../components';
import { useLinkBehavior } from '../components/common/linkBehavior';
import {
  type CommitLog,
  type Repository,
  useRecentCommits,
  useReposAndWeights,
} from '../api';
import useCountUp from '../hooks/useCountUp';
import {
  getRepositoryOwnerAvatarSrc,
  minerRepositoryPath,
  parseNumber,
} from '../utils';

// ─────────────────────────────────────────────────────────────────────────────
// The landing fits a single viewport: land, see everything, no scroll.
// Dead center: the claim. Scattered around it: one orbiting loop per top
// repository, sized by its network weight, its owner avatar at the core.
// Color is spent on one hue (merge green) and it always means the same
// thing: a merge. The CTA, the live pulse, and the spotlight that hops the
// constellation lighting up whichever repo merged code, expanding its most
// recent PR beside it. Everything else stays grayscale; avatars reveal
// their color on hover or while lit.
// ─────────────────────────────────────────────────────────────────────────────

const fadeUp = (delayMs = 0) => ({
  opacity: 0,
  animation: `landingFadeUp 640ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms forwards`,
  '@media (prefers-reduced-motion: reduce)': {
    opacity: 1,
    animation: 'none',
  },
});

const timeAgo = (iso: string): string => {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const compactNumber = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

// Circle motion path of radius `r` centered at (`c`, `c`), starting at
// 12 o'clock, drawn as two half arcs so SMIL can follow it.
const circlePath = (c: number, r: number): string =>
  `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c} ${c + r} A ${r} ${r} 0 1 1 ${c} ${c - r}`;

// Small seeded PRNG (mulberry32) so the random repo pick and slot layout are
// stable for the life of the mount instead of reshuffling on every refetch.
const mulberry32 = (seed: number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleWith = <T,>(list: T[], rand: () => number): T[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// ── Stats ────────────────────────────────────────────────────────────────────

interface StatBlockProps {
  label: string;
  value: number;
  compact?: boolean;
  delayMs: number;
}

const StatBlock: React.FC<StatBlockProps> = ({
  label,
  value,
  compact = false,
  delayMs,
}) => {
  const animated = useCountUp(value, 1800, delayMs);

  return (
    <Box sx={{ minWidth: 0, textAlign: 'center' }}>
      <Typography
        sx={(theme) => ({
          fontSize: 'clamp(1.15rem, 1.9vh + 0.55rem, 1.6rem)',
          fontWeight: 700,
          lineHeight: 1.2,
          color: theme.palette.text.primary,
          fontVariantNumeric: 'tabular-nums',
          // Slightly oversized while the count spins, settling as it lands.
          animation: `landingStatLand 420ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs + 1400}ms both`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        })}
      >
        {compact ? compactNumber(animated) : animated.toLocaleString('en-US')}
      </Typography>
      <Typography
        sx={(theme) => ({
          fontSize: '0.66rem',
          letterSpacing: '0.1em',
          color: theme.palette.text.secondary,
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: `landingFadeIn 600ms ease-out ${delayMs + 300}ms forwards`,
          '@media (prefers-reduced-motion: reduce)': {
            opacity: 1,
            animation: 'none',
          },
        })}
      >
        {label}
      </Typography>
    </Box>
  );
};

// ── Repo loops ───────────────────────────────────────────────────────────────

interface WeightedRepo {
  fullName: string;
  owner: string;
  weight: number;
}

// Scatter slots (percent of the stage). Hand-placed to ring the centered
// copy without colliding with it or each other, with enough edge margin
// that any slot can hold the largest ring; repos land on them at random.
const SCATTER_SLOTS = [
  { left: 15, top: 26 },
  { left: 85, top: 24 },
  { left: 89, top: 58 },
  { left: 73, top: 84 },
  { left: 27, top: 84 },
  { left: 10, top: 58 },
  { left: 35, top: 13 },
  { left: 65, top: 12 },
];

// A ring can carry this many orbiting dots before they blur together; a
// busier repo is still legibly busy without becoming a smear.
const MAX_ORBIT_DOTS = 20;

interface RepoLoopProps {
  repo: WeightedRepo;
  size: number;
  index: number;
  placement?: { left: number; top: number };
  /** One orbiting dot per PR this repo closed in the last 24 hours: `true`
   * for a merged PR (solid dot), `false` for a closed-unmerged PR (hollow). */
  orbitDots: boolean[];
  /** When set, this repo is the merge spotlight: it lights up green and
   * expands a small card with its most recent merged PR. */
  activeMerge?: CommitLog;
}

// Where the active PR card expands, relative to the ring: away from the
// nearest stage edge so it never gets clipped.
const cardSideFor = (placement?: { left: number; top: number }) => {
  if (!placement) return 'right';
  if (placement.top < 38) return 'below';
  if (placement.top > 62) return 'above';
  return placement.left < 50 ? 'right' : 'left';
};

const CARD_SIDE_SX = {
  right: {
    left: 'calc(100% + 10px)',
    top: '50%',
    transformOrigin: 'left center',
    keyframes: 'landingCardX',
  },
  left: {
    right: 'calc(100% + 10px)',
    top: '50%',
    transformOrigin: 'right center',
    keyframes: 'landingCardX',
  },
  below: {
    top: 'calc(100% + 10px)',
    left: '50%',
    transformOrigin: 'center top',
    keyframes: 'landingCardY',
  },
  above: {
    bottom: 'calc(100% + 10px)',
    left: '50%',
    transformOrigin: 'center bottom',
    keyframes: 'landingCardY',
  },
} as const;

const RepoLoop: React.FC<RepoLoopProps> = ({
  repo,
  size,
  index,
  placement,
  orbitDots,
  activeMerge,
}) => {
  const link = useLinkBehavior<HTMLAnchorElement>(
    minerRepositoryPath(repo.fullName),
  );
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarSrc = getRepositoryOwnerAvatarSrc(repo.owner);
  const isActive = Boolean(activeMerge);
  const cardSide = cardSideFor(placement);

  // Keep the card mounted briefly after the spotlight moves on so it can
  // animate back down instead of vanishing.
  const [shownMerge, setShownMerge] = useState<CommitLog | undefined>(
    activeMerge,
  );
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (activeMerge) {
      setShownMerge(activeMerge);
      setClosing(false);
      return undefined;
    }
    if (!shownMerge) return undefined;
    setClosing(true);
    const timer = setTimeout(() => {
      setShownMerge(undefined);
      setClosing(false);
    }, 240);
    return () => clearTimeout(timer);
  }, [activeMerge, shownMerge]);

  const orbitDur = 13 + (index % 5) * 2.2;
  const orbitBegin = -(index * 2.9);
  const floatDur = 9 + (index % 4) * 2;
  const floatBegin = -(index * 1.7);
  const baseTransform = placement ? 'translate(-50%, -50%)' : 'none';

  return (
    <Tooltip title={repo.fullName} placement="top" arrow>
      <Box
        component="a"
        {...link}
        aria-label={`Open ${repo.fullName}`}
        sx={{
          display: 'block',
          width: size,
          aspectRatio: '1 / 1',
          flexShrink: 0,
          borderRadius: '50%',
          ...(placement
            ? {
                position: 'absolute',
                left: `${placement.left}%`,
                top: `${placement.top}%`,
              }
            : { position: 'relative' }),
          transform: `${baseTransform} scale(${isActive ? 1.08 : 1})`,
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: isActive ? 4 : 1,
          opacity: 0,
          animation: `landingFadeIn 800ms ease-out ${200 + index * 80}ms forwards`,
          '&:hover .repo-avatar': { filter: 'none', opacity: 1 },
          '&:hover .repo-ring': { stroke: 'rgba(255, 255, 255, 0.35)' },
          '@media (prefers-reduced-motion: reduce)': {
            opacity: 1,
            animation: 'none',
            '& .loop-orbit': { display: 'none' },
            '& .loop-float': { animation: 'none' },
            '& .loop-ripple': { display: 'none' },
          },
        }}
      >
        <Box
          className="loop-float"
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            animation: `landingFloat ${floatDur}s ease-in-out ${floatBegin}s infinite alternate`,
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 100 100"
            sx={{
              width: '100%',
              height: '100%',
              display: 'block',
              overflow: 'visible',
            }}
          >
            <Box
              component="circle"
              className="repo-ring"
              cx={50}
              cy={50}
              r={47}
              fill="none"
              strokeWidth={0.8}
              sx={(theme) => ({
                stroke: isActive
                  ? alpha(theme.palette.status.merged, 0.6)
                  : alpha(theme.palette.common.white, 0.14),
                filter: isActive
                  ? `drop-shadow(0 0 4px ${alpha(theme.palette.status.merged, 0.5)})`
                  : 'none',
                transition: 'stroke 0.35s ease, filter 0.35s ease',
              })}
            />
            {/* One dot per PR closed in the last 24h, evenly spaced around
                the ring: solid for merged, hollow outline for closed. */}
            <Box
              component="g"
              className="loop-orbit"
              sx={(theme) => ({
                filter: isActive
                  ? `drop-shadow(0 0 5px ${alpha(theme.palette.status.merged, 0.9)})`
                  : 'none',
              })}
            >
              {orbitDots.map((merged, dotIndex) => (
                <g key={dotIndex}>
                  <Box
                    component="circle"
                    r={2.4}
                    sx={(theme) => {
                      const tone = isActive
                        ? theme.palette.status.merged
                        : alpha(theme.palette.common.white, 0.55);
                      return {
                        fill: merged ? tone : 'none',
                        stroke: merged ? 'none' : tone,
                        strokeWidth: merged ? 0 : 1,
                        transition: 'fill 0.35s ease, stroke 0.35s ease',
                      };
                    }}
                  />
                  <animateMotion
                    dur={`${orbitDur}s`}
                    begin={`${orbitBegin - (dotIndex / orbitDots.length) * orbitDur}s`}
                    repeatCount="indefinite"
                    path={circlePath(50, 47)}
                  />
                </g>
              ))}
            </Box>
          </Box>
          {/* The merge landing: a ripple out from the core. */}
          {activeMerge && (
            <Box
              key={`ripple-${activeMerge.pullRequestNumber}`}
              className="loop-ripple"
              sx={(theme) => ({
                position: 'absolute',
                inset: '27%',
                borderRadius: '50%',
                border: `1px solid ${alpha(theme.palette.status.merged, 0.55)}`,
                pointerEvents: 'none',
                animation: 'landingRipple 1.1s ease-out both',
              })}
            />
          )}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {avatarSrc && !avatarFailed ? (
              <Box
                component="img"
                className="repo-avatar"
                src={avatarSrc}
                alt={repo.fullName}
                onError={() => setAvatarFailed(true)}
                sx={(theme) => ({
                  width: '46%',
                  height: '46%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `1px solid ${
                    isActive
                      ? alpha(theme.palette.status.merged, 0.5)
                      : alpha(theme.palette.common.white, 0.15)
                  }`,
                  boxShadow: isActive
                    ? `0 0 22px ${alpha(theme.palette.status.merged, 0.3)}`
                    : 'none',
                  filter: isActive ? 'none' : 'grayscale(1) brightness(1.05)',
                  opacity: isActive ? 1 : 0.88,
                  transition:
                    'filter 0.35s ease, opacity 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
                })}
              />
            ) : (
              <Typography
                sx={(theme) => ({
                  fontSize: size * 0.2,
                  fontWeight: 700,
                  color: theme.palette.text.secondary,
                })}
              >
                {repo.owner.charAt(0).toUpperCase()}
              </Typography>
            )}
          </Box>
        </Box>
        {/* The merged PR, expanding off the lit ring and dropping back down. */}
        {shownMerge && (
          <Box
            key={`card-${shownMerge.pullRequestNumber}`}
            sx={(theme) => {
              const { keyframes, ...sideSx } = CARD_SIDE_SX[cardSide];
              return {
                position: 'absolute',
                ...sideSx,
                animation: closing
                  ? `${keyframes} 240ms ease-in reverse both`
                  : `${keyframes} 300ms ease-out both`,
                zIndex: 5,
                minWidth: 170,
                maxWidth: 250,
                px: 1.25,
                py: 0.9,
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
                backgroundColor: alpha(theme.palette.common.black, 0.72),
                backdropFilter: 'blur(8px)',
                textAlign: 'left',
                pointerEvents: 'none',
                '@media (prefers-reduced-motion: reduce)': {
                  animation: 'none',
                  opacity: closing ? 0 : 1,
                },
              };
            }}
          >
            <Typography
              sx={(theme) => ({
                fontSize: '0.68rem',
                fontWeight: 700,
                lineHeight: 1.45,
                color: theme.palette.text.primary,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              })}
            >
              {shownMerge.pullRequestTitle}
            </Typography>
            <Typography
              sx={(theme) => ({
                mt: 0.4,
                fontSize: '0.62rem',
                color: theme.palette.text.secondary,
                whiteSpace: 'nowrap',
              })}
            >
              {`#${shownMerge.pullRequestNumber} merged ${shownMerge.mergedAt ? timeAgo(shownMerge.mergedAt) : ''} · `}
              <Box
                component="span"
                sx={(theme) => ({
                  color: theme.palette.status.merged,
                  fontWeight: 700,
                })}
              >
                {`+${shownMerge.additions}`}
              </Box>{' '}
              <Box
                component="span"
                sx={(theme) => ({
                  color: theme.palette.status.closed,
                  fontWeight: 700,
                })}
              >
                {`-${shownMerge.deletions}`}
              </Box>
            </Typography>
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};

// ── Live merge line ──────────────────────────────────────────────────────────

interface LiveMergeLineProps {
  merges: CommitLog[];
}

const LiveMergeLine: React.FC<LiveMergeLineProps> = ({ merges }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (merges.length < 2) return undefined;
    const interval = setInterval(
      () => setActiveIndex((prev) => (prev + 1) % merges.length),
      4200,
    );
    return () => clearInterval(interval);
  }, [merges.length]);

  const active = merges.length
    ? merges[activeIndex % merges.length]
    : undefined;

  if (!active) return null;

  return (
    <Stack
      key={`${active.repository}-${active.pullRequestNumber}`}
      direction="row"
      spacing={0.75}
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
        animation: 'landingFadeIn 420ms ease-out both',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Box
        className="loop-pulse"
        sx={(theme) => ({
          width: 6,
          height: 6,
          borderRadius: '50%',
          flexShrink: 0,
          backgroundColor: theme.palette.status.merged,
          animation: 'landingLivePulse 2.4s ease-in-out infinite',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        })}
      />
      <Typography
        sx={(theme) => ({
          fontSize: '0.72rem',
          color: theme.palette.text.secondary,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        })}
      >
        {`${active.repository} #${active.pullRequestNumber} merged ${active.mergedAt ? timeAgo(active.mergedAt) : ''}`}
      </Typography>
    </Stack>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

const toWeightedRepos = (repos: Repository[] | undefined): WeightedRepo[] =>
  (repos ?? [])
    .map((repo) => ({
      fullName: repo.fullName,
      owner: repo.owner || repo.fullName.split('/')[0] || '',
      weight: parseNumber(repo.config?.emissionShare),
    }))
    .filter((repo) => repo.fullName && repo.weight > 0)
    .sort((a, b) => b.weight - a.weight);

const HomePage: React.FC = () => {
  // Default limit shares the query cache with the dashboard, and the deep
  // window lets the spotlight find a recent merge for most scattered repos.
  const { data: recentCommits } = useRecentCommits();
  const { data: repos } = useReposAndWeights();

  const merges = useMemo(
    () =>
      (recentCommits ?? [])
        .filter((pr) => pr.prState === 'MERGED' && pr.mergedAt)
        .slice(0, 12),
    [recentCommits],
  );

  // Orbiting dots per repo: one per PR resolved in the last 24 hours. A
  // merged PR is windowed by its merge time (solid dot); a closed-unmerged
  // PR has no closedAt in the feed, so we window it by creation time
  // (hollow dot). Most recent first, so the cap keeps the freshest.
  const orbitDotsByRepo = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const map = new Map<string, { merged: boolean; at: number }[]>();
    (recentCommits ?? []).forEach((pr) => {
      const isMerged = pr.prState === 'MERGED' && pr.mergedAt;
      const isClosed = pr.prState === 'CLOSED' && pr.prCreatedAt;
      const stamp = isMerged ? pr.mergedAt : isClosed ? pr.prCreatedAt : null;
      if (!stamp) return;
      const at = new Date(stamp).getTime();
      if (at < dayAgo) return;
      const list = map.get(pr.repository);
      const entry = { merged: Boolean(isMerged), at };
      if (list) list.push(entry);
      else map.set(pr.repository, [entry]);
    });
    map.forEach((list) => list.sort((a, b) => b.at - a.at));
    return map;
  }, [recentCommits]);

  const orbitDotsFor = (fullName: string): boolean[] =>
    (orbitDotsByRepo.get(fullName) ?? [])
      .slice(0, MAX_ORBIT_DOTS)
      .map((entry) => entry.merged);

  // Only repos with activity (a merged or closed PR) in the last 24 hours
  // are eligible for the stage. Up to 8 land on the slots, picked at random
  // when more than 8 are active; if fewer, we show exactly those. Seeded
  // per mount: stable across refetches, fresh on every visit.
  const [scatterSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const scatterRepos = useMemo(() => {
    const rand = mulberry32(scatterSeed);
    const active = toWeightedRepos(repos).filter((repo) =>
      orbitDotsByRepo.has(repo.fullName),
    );
    const picked = shuffleWith(active, rand).slice(0, SCATTER_SLOTS.length);
    const slots = shuffleWith(SCATTER_SLOTS, rand);
    return picked.map((repo, index) => ({ repo, slot: slots[index] }));
  }, [repos, scatterSeed, orbitDotsByRepo]);

  // Spotlight pool: every PR merged in the last 24 hours on a scattered
  // repo. The scheduler shows each repo's PRs without repeats until that
  // repo's list is exhausted, then reshuffles it. If the last day was
  // quiet, fall back to each repo's most recent merge so the stage never
  // goes dark.
  const spotlightPool = useMemo(() => {
    const merged = (recentCommits ?? []).filter(
      (merge) =>
        merge.prState === 'MERGED' &&
        merge.mergedAt &&
        scatterRepos.some(({ repo }) => repo.fullName === merge.repository),
    );
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const lastDay = merged.filter(
      (merge) => new Date(merge.mergedAt as string).getTime() >= dayAgo,
    );
    if (lastDay.length) return lastDay;
    const seen = new Set<string>();
    return merged.filter((merge) => {
      if (seen.has(merge.repository)) return false;
      seen.add(merge.repository);
      return true;
    });
  }, [recentCommits, scatterRepos]);

  // Whack-a-mole scheduler: merges pop up on random rings at random beats,
  // dwell a few seconds, and drop back down while others are still up, so
  // several repos visibly receive work at once. Repos take turns via a
  // shuffled rotation (a repo with 150 merges appears no more often than
  // one with 2), and within each repo its PRs cycle without repeats until
  // its own list runs dry.
  const [litMerges, setLitMerges] = useState<Record<string, CommitLog>>({});

  useEffect(() => {
    if (!spotlightPool.length) return undefined;
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const litNow = new Map<string, CommitLog>();

    const prsByRepo = new Map<string, CommitLog[]>();
    spotlightPool.forEach((merge) => {
      const list = prsByRepo.get(merge.repository);
      if (list) list.push(merge);
      else prsByRepo.set(merge.repository, [merge]);
    });

    let rotation: string[] = [];
    const repoDecks = new Map<string, CommitLog[]>();

    // Next unlit repo in the rotation, then the next PR from that repo's
    // own shuffled deck; both reshuffle once exhausted.
    const draw = (): CommitLog | undefined => {
      if (!rotation.length) {
        rotation = shuffleWith([...prsByRepo.keys()], Math.random);
      }
      const index = rotation.findIndex((name) => !litNow.has(name));
      if (index === -1) return undefined;
      const repoName = rotation.splice(index, 1)[0];
      let deck = repoDecks.get(repoName);
      if (!deck || !deck.length) {
        deck = shuffleWith(prsByRepo.get(repoName) ?? [], Math.random);
        repoDecks.set(repoName, deck);
      }
      return deck.pop();
    };

    const later = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!cancelled) fn();
      }, ms);
      timers.add(id);
    };

    const publish = () => {
      setLitMerges(Object.fromEntries(litNow));
    };

    const pop = () => {
      if (litNow.size < 3) {
        const pick = draw();
        if (pick) {
          litNow.set(pick.repository, pick);
          publish();
          later(
            () => {
              litNow.delete(pick.repository);
              publish();
            },
            3800 + Math.random() * 2800,
          );
        }
      }
      later(pop, 1100 + Math.random() * 1700);
    };

    // Let the constellation settle in before the first merge lands.
    later(pop, 1200);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [spotlightPool]);

  const maxWeight = Math.max(
    ...scatterRepos.map(({ repo }) => repo.weight),
    0.0001,
  );
  // Area tracks weight, so diameter scales with sqrt(weight).
  const sizeFor = (weight: number, min: number, max: number) =>
    Math.round(min + (max - min) * Math.sqrt(weight / maxWeight));

  // The stat row speaks the same 24-hour window as the rings and the
  // spotlight: how much the network shipped in the last day.
  const dayStats = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let prsMerged = 0;
    let linesChanged = 0;
    const contributors = new Set<string>();
    (recentCommits ?? []).forEach((pr) => {
      if (pr.prState !== 'MERGED' || !pr.mergedAt) return;
      if (new Date(pr.mergedAt).getTime() < dayAgo) return;
      prsMerged += 1;
      linesChanged += (pr.additions ?? 0) + (pr.deletions ?? 0);
      if (pr.author) contributors.add(pr.author);
    });
    return { prsMerged, contributors: contributors.size, linesChanged };
  }, [recentCommits]);

  const statItems = [
    { label: 'PRs merged', value: dayStats.prsMerged, compact: false },
    { label: 'contributors', value: dayStats.contributors, compact: false },
    { label: 'lines changed', value: dayStats.linesChanged, compact: true },
  ];

  return (
    <Box
      sx={{
        position: 'relative',
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: { xs: 'flex-start', md: 'center' },
        overflow: { xs: 'auto', md: 'hidden' },
        py: { xs: 4, md: 0 },
        '@keyframes landingFadeUp': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@keyframes landingFadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        '@keyframes landingFloat': {
          from: { transform: 'translateY(4px)' },
          to: { transform: 'translateY(-6px)' },
        },
        '@keyframes landingLivePulse': {
          '0%': { opacity: 1 },
          '50%': { opacity: 0.3 },
          '100%': { opacity: 1 },
        },
        '@keyframes landingCardX': {
          from: { opacity: 0, transform: 'translateY(-50%) scale(0.92)' },
          to: { opacity: 1, transform: 'translateY(-50%) scale(1)' },
        },
        '@keyframes landingCardY': {
          from: { opacity: 0, transform: 'translateX(-50%) scale(0.92)' },
          to: { opacity: 1, transform: 'translateX(-50%) scale(1)' },
        },
        '@keyframes landingRipple': {
          from: { opacity: 0.75, transform: 'scale(1)' },
          to: { opacity: 0, transform: 'scale(2.1)' },
        },
        '@keyframes landingStatLand': {
          from: { transform: 'scale(1.05)' },
          to: { transform: 'none' },
        },
      }}
    >
      <SEO
        title="Autonomous software development"
        description="A permissionless market of miners on Bittensor Subnet 74. We direct the pool; it ships the software."
        type="website"
      />

      {/* ── The constellation: one loop per top repo, sized by weight ── */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: { xs: 'none', md: 'block' },
          zIndex: 1,
        }}
      >
        {scatterRepos.map(({ repo, slot }, index) => (
          <RepoLoop
            key={repo.fullName}
            repo={repo}
            index={index}
            size={sizeFor(repo.weight, 64, 170)}
            placement={slot}
            orbitDots={orbitDotsFor(repo.fullName)}
            activeMerge={litMerges[repo.fullName]}
          />
        ))}
      </Box>

      {/* ── Dead center: the claim ── */}
      <Stack
        spacing={{ xs: 2.25, md: 'clamp(14px, 2.4vh, 26px)' }}
        sx={{
          position: 'relative',
          zIndex: 2,
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: { xs: 620, md: 'min(94vw, 860px)' },
          px: 2,
        }}
      >
        <Typography
          sx={(theme) => ({
            ...fadeUp(0),
            fontSize: '0.68rem',
            letterSpacing: '0.18em',
            color: theme.palette.text.secondary,
          })}
        >
          Bittensor Subnet 74
        </Typography>
        <Typography
          component="h1"
          sx={(theme) => ({
            ...fadeUp(60),
            fontSize: 'clamp(2.6rem, 5.5vw, 4.4rem)',
            fontWeight: 900,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            color: theme.palette.text.primary,
          })}
        >
          Gittensor
        </Typography>
        <Typography
          component="h2"
          sx={(theme) => ({
            ...fadeUp(140),
            fontSize: 'clamp(0.82rem, 1.5vw, 1.02rem)',
            fontWeight: 500,
            letterSpacing: '0.14em',
            whiteSpace: 'nowrap',
            color: theme.palette.text.secondary,
          })}
        >
          Autonomous Software Development
        </Typography>
        {/* On desktop the spotlight on the rings carries this; keep the
            ticker for mobile where the constellation is tucked below. */}
        <Box
          sx={{
            ...fadeUp(280),
            minHeight: 20,
            display: { xs: 'block', md: 'none' },
          }}
        >
          <LiveMergeLine merges={merges} />
        </Box>
        <Stack spacing={1.5} sx={{ ...fadeUp(340), alignItems: 'center' }}>
          <Box
            sx={(theme) => ({
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              rowGap: 1.5,
              '& > * + *': {
                borderLeft: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
              },
              '& > *': {
                px: { xs: 2.5, md: 3.5 },
              },
            })}
          >
            {statItems.map((item, index) => (
              <StatBlock
                key={item.label}
                label={item.label}
                value={item.value}
                compact={item.compact}
                delayMs={340 + index * 140}
              />
            ))}
          </Box>
          <Typography
            sx={(theme) => ({
              fontSize: '0.62rem',
              letterSpacing: '0.14em',
              color: theme.palette.text.secondary,
              opacity: 0,
              animation: 'landingFadeIn 600ms ease-out 1000ms forwards',
              '@media (prefers-reduced-motion: reduce)': {
                opacity: 1,
                animation: 'none',
              },
            })}
          >
            last 24 hours
          </Typography>
        </Stack>
      </Stack>

      {/* ── Mobile: the loops flow below the copy instead of scattering ── */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2.5,
          mt: 4,
          px: 2,
        }}
      >
        {scatterRepos.slice(0, 6).map(({ repo }, index) => (
          <RepoLoop
            key={repo.fullName}
            repo={repo}
            index={index}
            size={sizeFor(repo.weight, 52, 84)}
            orbitDots={orbitDotsFor(repo.fullName)}
          />
        ))}
      </Box>
    </Box>
  );
};

export default HomePage;
