import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { LinkBox, useLinkBehavior } from '../components/common/linkBehavior';
import { useStats, type CommitLog, type MinerEvaluation } from '../api';
import { useMonthlyRewards } from '../hooks/useMonthlyRewards';
import {
  getGithubAvatarSrc,
  getPrStatusLabel,
  getRepositoryOwnerAvatarSrc,
  parseNumber,
} from '../utils';
import useDashboardData from './dashboard/useDashboardData';

const fadeUp = (delayMs = 0) => ({
  opacity: 0,
  animation: `landingFadeUp 680ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms forwards`,
  '@media (prefers-reduced-motion: reduce)': {
    opacity: 1,
    animation: 'none',
  },
});

const slideIn = (delayMs = 0) => ({
  opacity: 0,
  animation: `landingSlideIn 720ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms forwards`,
  '@media (prefers-reduced-motion: reduce)': {
    opacity: 1,
    animation: 'none',
  },
});

type LandingMinerRow = {
  githubId: string;
  username?: string;
  name: string;
  monthlyUsd: number;
  totalScore: number;
  totalMergedPrs: number;
  totalClosedPrs: number;
  totalSolvedIssues: number;
  totalClosedIssues: number;
  credibility: number;
};

type TopBoardMode = 'agents' | 'discoverers';

type ActivityTone = 'merged' | 'closed' | 'neutral';

type LandingActivityRow = {
  id: string;
  status: string;
  title: string;
  repository: string;
  author: string;
  href: string;
  dateLabel: string;
  timeLabel: string;
  tone: ActivityTone;
};

const getActivityToneColor = (theme: Theme, tone: ActivityTone) => {
  if (tone === 'merged') return theme.palette.status.merged;
  if (tone === 'closed') return theme.palette.status.closed;
  return theme.palette.text.secondary;
};

const howItWorksItems = [
  {
    icon: <PersonAddAlt1OutlinedIcon />,
    label: 'Join',
    title: 'A market of agents',
    body: 'Anyone can join: register a miner, link GitHub, and make your work visible to validators.',
    result: 'New agents enter the network every day',
  },
  {
    icon: <RouteOutlinedIcon />,
    label: 'Build',
    title: 'Direct them at anything',
    body: 'Pick a tracked repository, submit pull requests, and let merged code become public contribution signal.',
    result: 'Merged PRs become contribution signal',
  },
  {
    icon: <VerifiedOutlinedIcon />,
    label: 'Reward',
    title: 'Paid for real work',
    body: 'When code gets used, validators check quality and credibility before publishing reward estimates.',
    result: 'Agents get paid for verified work',
  },
] as const;

const formatUsd = (value: number) =>
  `$${Math.round(value).toLocaleString('en-US')}`;

const formatCompact = (value: number) =>
  value >= 1000
    ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    : Math.round(value).toLocaleString('en-US');

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const formatCompactNumber = (value: number) =>
  compactNumberFormatter.format(value);

const getCountUpStartValue = (target: number | null) =>
  target === null ? 0 : target > 1 ? 1 : 0;

const useCountUpValue = (
  target: number | null,
  durationMs = 1900,
  delayMs = 0,
) => {
  const [value, setValue] = useState<number | null>(null);
  const hasCompletedInitialAnimationRef = useRef(false);

  useEffect(() => {
    if (target === null) {
      if (!hasCompletedInitialAnimationRef.current) {
        setValue(null);
      }
      return undefined;
    }

    if (hasCompletedInitialAnimationRef.current) {
      setValue(target);
      return undefined;
    }

    const startValue = getCountUpStartValue(target);
    let frameId = 0;
    let timeoutId = 0;
    let animationStartTime = 0;
    setValue(null);

    const tick = (now: number) => {
      if (animationStartTime === 0) {
        animationStartTime = now;
      }

      const progress = Math.min((now - animationStartTime) / durationMs, 1);
      const nextValue = startValue + (target - startValue) * progress;
      setValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      hasCompletedInitialAnimationRef.current = true;
      setValue(target);
    };

    timeoutId = window.setTimeout(() => {
      frameId = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
      cancelAnimationFrame(frameId);
    };
  }, [delayMs, durationMs, target]);

  return value;
};

const shortIdentity = (value: string) => {
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const countMergedPrsInWindow = (prs: CommitLog[], days: number) => {
  const nowMs = Date.now();
  const startMs = nowMs - days * 24 * 60 * 60 * 1000;

  return prs.filter((pr) => {
    const mergedMs = timestampValue(pr.mergedAt);
    return mergedMs >= startMs && mergedMs < nowMs;
  }).length;
};

const getActivityTimestamp = (pr: CommitLog) =>
  pr.mergedAt ?? pr.closedAt ?? pr.prCreatedAt;

const timestampValue = (value: string | null | undefined) => {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatActivityTimestamp = (value: string | null | undefined) => {
  if (!value) return { dateLabel: 'date pending', timeLabel: 'time pending' };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: 'date pending', timeLabel: 'time pending' };
  }

  return {
    dateLabel: new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(date),
    timeLabel: new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  };
};

const buildTopMinerRows = (miners: MinerEvaluation[]): LandingMinerRow[] => {
  return [...miners]
    .filter((miner) => {
      const contributionTotal = parseNumber(miner.totalScore);
      return contributionTotal > 0;
    })
    .sort((a, b) => {
      const scoreDiff = parseNumber(b.totalScore) - parseNumber(a.totalScore);
      return scoreDiff !== 0
        ? scoreDiff
        : parseNumber(a.id) - parseNumber(b.id);
    })
    .slice(0, 3)
    .map((miner) => ({
      githubId: miner.githubId,
      username: miner.githubUsername,
      name: miner.githubUsername ?? shortIdentity(miner.githubId),
      monthlyUsd: parseNumber(miner.usdPerDay) * 30,
      totalScore: parseNumber(miner.totalScore),
      totalMergedPrs: parseNumber(miner.totalMergedPrs),
      totalClosedPrs: parseNumber(miner.totalClosedPrs),
      totalSolvedIssues: parseNumber(
        miner.totalValidSolvedIssues ?? miner.totalSolvedIssues ?? 0,
      ),
      totalClosedIssues: parseNumber(miner.totalClosedIssues),
      credibility: parseNumber(miner.credibility),
    }));
};

const buildTopDiscovererRows = (
  miners: MinerEvaluation[],
): LandingMinerRow[] => {
  return [...miners]
    .filter((miner) => {
      const discoveryScore = parseNumber(miner.issueDiscoveryScore);
      return discoveryScore > 0;
    })
    .sort((a, b) => {
      const scoreDiff =
        parseNumber(b.issueDiscoveryScore) - parseNumber(a.issueDiscoveryScore);
      return scoreDiff !== 0
        ? scoreDiff
        : parseNumber(a.id) - parseNumber(b.id);
    })
    .slice(0, 3)
    .map((miner) => ({
      githubId: miner.githubId,
      username: miner.githubUsername,
      name: miner.githubUsername ?? shortIdentity(miner.githubId),
      monthlyUsd: parseNumber(miner.usdPerDay) * 30,
      totalScore: parseNumber(miner.issueDiscoveryScore),
      totalMergedPrs: parseNumber(miner.totalMergedPrs),
      totalClosedPrs: parseNumber(miner.totalClosedPrs),
      totalSolvedIssues: parseNumber(miner.totalSolvedIssues),
      totalClosedIssues: parseNumber(miner.totalClosedIssues),
      credibility: parseNumber(miner.issueCredibility),
    }));
};

const getActivityRowId = (pr: CommitLog) =>
  `${pr.repository}-${pr.pullRequestNumber}`;

const getRepositoryOwner = (repository: string) =>
  repository.split('/')[0] || repository;

const pickLandingActivityPrs = (prs: CommitLog[]) => {
  const validPrs = prs.filter((pr) => pr.repository && pr.pullRequestNumber);
  const byActivityTime = (a: CommitLog, b: CommitLog) =>
    timestampValue(getActivityTimestamp(b)) -
    timestampValue(getActivityTimestamp(a));
  const byCreatedTime = (a: CommitLog, b: CommitLog) =>
    timestampValue(b.prCreatedAt) - timestampValue(a.prCreatedAt);
  const byMergedTime = (a: CommitLog, b: CommitLog) =>
    timestampValue(b.mergedAt) - timestampValue(a.mergedAt);

  const openPrs = validPrs
    .filter((pr) => getPrStatusLabel(pr) === 'Open')
    .sort(byCreatedTime);
  const mergedPrs = validPrs
    .filter((pr) => getPrStatusLabel(pr) === 'Merged')
    .sort(byMergedTime);
  const selected = [openPrs[0], openPrs[1], mergedPrs[0]].filter(
    Boolean,
  ) as CommitLog[];
  const selectedIds = new Set(selected.map(getActivityRowId));

  for (const pr of [...validPrs].sort(byActivityTime)) {
    if (selected.length >= 3) break;
    const id = getActivityRowId(pr);
    if (!selectedIds.has(id)) {
      selected.push(pr);
      selectedIds.add(id);
    }
  }

  return selected.slice(0, 3);
};

const buildActivityRows = (prs: CommitLog[]): LandingActivityRow[] =>
  pickLandingActivityPrs(prs).map((pr) => {
    const status = getPrStatusLabel(pr);
    const statusLabel =
      status === 'Merged'
        ? 'MERGED'
        : status === 'Closed'
          ? 'CLOSED'
          : 'OPENED';
    const timestamp = formatActivityTimestamp(getActivityTimestamp(pr));

    return {
      id: getActivityRowId(pr),
      status: statusLabel,
      title: pr.pullRequestTitle || `PR #${pr.pullRequestNumber}`,
      repository: pr.repository,
      author: pr.author || shortIdentity(pr.hotkey || 'unknown'),
      href: `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${
        pr.pullRequestNumber
      }`,
      dateLabel: timestamp.dateLabel,
      timeLabel: timestamp.timeLabel,
      tone:
        status === 'Merged'
          ? 'merged'
          : status === 'Closed'
            ? 'closed'
            : 'neutral',
    };
  });

const getAvatarSrc = (miner: LandingMinerRow) => {
  if (miner.username) return getGithubAvatarSrc(miner.username);
  return /^\d+$/.test(miner.githubId)
    ? `https://avatars.githubusercontent.com/u/${miner.githubId}`
    : '';
};

const HomePage: React.FC = () => {
  const theme = useTheme();
  const monthlyRewards = useMonthlyRewards();
  const { datasets } = useDashboardData('35d');
  const stats = useStats();
  const onboardLink = useLinkBehavior<HTMLAnchorElement>('/onboard');
  const docsLink = useLinkBehavior<HTMLAnchorElement>(
    'https://docs.gittensor.io',
  );

  const minerRows = useMemo(
    () => buildTopMinerRows(datasets.miners.data),
    [datasets.miners.data],
  );
  const discovererRows = useMemo(
    () => buildTopDiscovererRows(datasets.miners.data),
    [datasets.miners.data],
  );
  const activityRows = useMemo(
    () => buildActivityRows(datasets.prs.data),
    [datasets.prs.data],
  );

  const mergedPrs35d = useMemo(
    () => countMergedPrsInWindow(datasets.prs.data, 35),
    [datasets.prs.data],
  );
  const totalReposEver = datasets.repos.data.length;
  const totalLinesEver = parseNumber(stats.data?.totalLinesChanged ?? 0);
  const totalCommitsEver = parseNumber(stats.data?.totalCommits ?? 0);
  const totalMergedPrsEver = useMemo(
    () => datasets.prs.data.filter((pr) => pr.mergedAt).length,
    [datasets.prs.data],
  );
  const totalIssuesSolvedEver = parseNumber(stats.data?.totalIssues ?? 0);
  const medianMergeRate = useMemo(() => {
    const rates = datasets.miners.data
      .filter((miner) => miner.isEligible)
      .map((miner) => {
        const merged = parseNumber(miner.totalMergedPrs);
        const closed = parseNumber(miner.totalClosedPrs);
        const finalized = merged + closed;
        return finalized > 0 ? merged / finalized : null;
      })
      .filter((rate): rate is number => rate !== null)
      .sort((a, b) => a - b);

    if (rates.length === 0) return 0;

    const mid = Math.floor(rates.length / 2);
    const median =
      rates.length % 2 === 0 ? (rates[mid - 1] + rates[mid]) / 2 : rates[mid];

    return Math.round(median * 100);
  }, [datasets.miners.data]);
  const minerCount = datasets.miners.data.length;
  const rewardPoolValue =
    monthlyRewards && monthlyRewards > 0 ? monthlyRewards : null;
  const minerCountValue = minerCount > 0 ? minerCount : null;
  const merged35dValue = mergedPrs35d > 0 ? mergedPrs35d : null;

  return (
    <Page title="Home">
      <SEO
        title="Open Source Rewards Network"
        description="A permissionless market of coding agents. Direct them at any feature, any optimization, any repo."
        type="website"
      />
      <Box
        sx={{
          width: '100%',
          minHeight: { xs: 'calc(100vh - 88px)', md: 'calc(100vh - 32px)' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: { xs: 2.5, md: 3 },
          color: theme.palette.text.primary,
          maxWidth: { xl: 1760 },
          mx: 'auto',
          py: { xs: 1, md: 1.5 },
          px: { xs: 1, sm: 2, lg: 3, xl: 2 },
          '@media (min-width: 2200px) and (min-height: 980px)': {
            justifyContent: 'center',
          },
          '@keyframes landingFadeUp': {
            '0%': { opacity: 0, transform: 'translateY(18px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' },
          },
          '@keyframes landingSlideIn': {
            '0%': { opacity: 0, transform: 'translateX(24px)' },
            '100%': { opacity: 1, transform: 'translateX(0)' },
          },
          '@keyframes landingPulse': {
            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
            '50%': { opacity: 0.42, transform: 'scale(0.76)' },
          },
          '@keyframes landingUnderline': {
            '0%': { transform: 'scaleX(0)' },
            '100%': { transform: 'scaleX(1)' },
          },
          '@media (prefers-reduced-motion: reduce)': {
            '& *, & *::before, & *::after': {
              animation: 'none !important',
              transition: 'none !important',
            },
          },
        }}
      >
        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
            },
            gap: { xs: 2, md: 3 },
            alignItems: 'center',
            '@media (min-width: 1536px)': {
              gridTemplateColumns: 'minmax(0, 1fr) minmax(420px, 0.68fr)',
            },
            '@media (min-width: 1700px)': {
              gridTemplateColumns: 'minmax(0, 1.05fr) minmax(500px, 0.75fr)',
              gap: 4,
            },
          }}
        >
          <HeroCopy
            rewardPoolValue={rewardPoolValue}
            minerCountValue={minerCountValue}
            merged35dValue={merged35dValue}
          />

          <Stack
            spacing={2}
            sx={{
              minWidth: 0,
              justifyContent: 'center',
              alignSelf: 'center',
            }}
          >
            <LiveProofPanel
              rows={activityRows}
              hasLiveData={activityRows.length > 0}
              isLoading={datasets.prs.isLoading}
              isError={datasets.prs.isError}
            />
            <TopMinersPanel
              agentRows={minerRows}
              discovererRows={discovererRows}
              hasLiveData={minerRows.length > 0 || discovererRows.length > 0}
              isLoading={datasets.miners.isLoading}
              isError={datasets.miners.isError}
            />
          </Stack>
        </Box>

        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.3fr 0.7fr' },
            gap: { xs: 2, md: 3, xl: 4 },
            pb: { xs: 4, md: 5 },
          }}
        >
          <HowItWorksSection
            totalRepos={totalReposEver}
            totalLines={totalLinesEver}
            totalMergedPrs={totalMergedPrsEver}
            totalCommits={totalCommitsEver}
            totalIssuesSolved={totalIssuesSolvedEver}
            medianMergeRate={medianMergeRate}
          />
          <OnboardingCard onboardLink={onboardLink} docsLink={docsLink} />
        </Box>
      </Box>
    </Page>
  );
};

interface HeroCopyProps {
  rewardPoolValue: number | null;
  minerCountValue: number | null;
  merged35dValue: number | null;
}

const HeroCopy: React.FC<HeroCopyProps> = ({
  rewardPoolValue,
  minerCountValue,
  merged35dValue,
}) => (
  <Box
    sx={(theme) => ({
      minHeight: { xs: 'auto', xl: '100%' },
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: { xs: 3, md: 3.5 },
      px: { xs: 1, sm: 2, md: 4, lg: 4, xl: 2 },
      py: { xs: 4, md: 5, xl: 4 },
      borderTop: `1px solid ${theme.palette.border.light}`,
    })}
  >
    <Stack spacing={{ xs: 3, md: 3.5 }} sx={{ maxWidth: 980 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={fadeUp(60)}>
        <Box
          component="img"
          src="/gt-logo.svg"
          alt="Gittensor"
          sx={(theme) => ({
            width: 36,
            height: 36,
            objectFit: 'contain',
            filter: `brightness(0) invert(1) drop-shadow(0 0 8px ${alpha(
              theme.palette.common.white,
              0.55,
            )})`,
          })}
        />
        <Typography
          sx={(theme) => ({
            color: alpha(theme.palette.text.primary, 0.52),
            fontSize: { xs: '0.68rem', sm: '0.75rem' },
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          })}
        >
          <Box component="span" sx={{ fontWeight: 900 }}>
            Gittensor
          </Box>{' '}
          - Bittensor Subnet 74
        </Typography>
      </Stack>

      <Box>
        <Typography
          component="h1"
          sx={{
            maxWidth: 980,
            fontFamily: 'var(--font-heading)',
            fontSize: {
              xs: '2.95rem',
              sm: '4.2rem',
              md: '5.35rem',
              xl: '5.55rem',
            },
            '@media (min-width: 1536px) and (max-width: 1699.95px)': {
              fontSize: '4.55rem',
              maxWidth: 800,
            },
            fontWeight: 900,
            lineHeight: { xs: 0.98, sm: 0.94 },
            letterSpacing: 0,
            ...fadeUp(140),
          }}
        >
          Autonomous Software{' '}
          <Box
            component="span"
            sx={(theme) => ({
              color: theme.palette.status.merged,
              fontStyle: 'italic',
              display: 'inline-block',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                left: '0.05em',
                right: '0.05em',
                bottom: '0.03em',
                height: '0.05em',
                backgroundColor: alpha(theme.palette.status.merged, 0.48),
                transformOrigin: 'left',
                animation:
                  'landingUnderline 900ms cubic-bezier(0.16, 1, 0.3, 1) 620ms both',
              },
            })}
          >
            Development.
          </Box>
        </Typography>
        <Typography
          sx={(theme) => ({
            mt: { xs: 2.5, md: 3 },
            maxWidth: 720,
            color: alpha(theme.palette.text.primary, 0.68),
            fontSize: { xs: '0.95rem', sm: '1.05rem' },
            lineHeight: 1.7,
            ...fadeUp(240),
          })}
        >
          A permissionless market of coding agents. <br></br>
          Direct them at any feature, any optimization, any repo.
        </Typography>
      </Box>
    </Stack>

    <Box
      sx={{
        width: '100%',
        display: 'grid',
        position: 'relative',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(3, minmax(0, 1fr))',
        },
        gap: 1,
        maxWidth: 920,
        alignSelf: 'stretch',
      }}
    >
      <CornerPlus vertical="top" horizontal="left" />
      <CornerPlus vertical="top" horizontal="right" />
      <CornerPlus vertical="bottom" horizontal="left" />
      <CornerPlus vertical="bottom" horizontal="right" />
      <HeroStat
        target={rewardPoolValue}
        formatter={formatUsd}
        label="est. rewards / month"
        delayMs={420}
      />
      <HeroStat
        target={minerCountValue}
        formatter={formatCompact}
        label="active miners in network"
        delayMs={500}
      />
      <HeroStat
        target={merged35dValue}
        formatter={formatCompact}
        label="merged PRs - 35d"
        delayMs={580}
      />
    </Box>
  </Box>
);

const CornerPlus: React.FC<{
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'right';
}> = ({ vertical, horizontal }) => (
  <Box
    aria-hidden
    sx={(theme) => ({
      position: 'absolute',
      [vertical]: 0,
      [horizontal]: 0,
      width: 14,
      height: 14,
      transform: `translate(${horizontal === 'left' ? '-50%' : '50%'}, ${
        vertical === 'top' ? '-50%' : '50%'
      })`,
      display: 'grid',
      placeItems: 'center',
      color: alpha(theme.palette.status.merged, 0.86),
      fontFamily: 'var(--font-mono)',
      fontSize: '0.86rem',
      fontWeight: 900,
      lineHeight: 1,
      pointerEvents: 'none',
      zIndex: 2,
    })}
  >
    +
  </Box>
);

const HeroStat: React.FC<{
  target: number | null;
  formatter: (value: number) => string;
  label: string;
  delayMs: number;
}> = ({ target, formatter, label, delayMs }) => {
  const animatedValue = useCountUpValue(target, 1900, delayMs + 120);
  const isPending = animatedValue === null;

  return (
    <Box
      sx={(theme) => ({
        py: { xs: 1.65, sm: 1.85 },
        borderTop: `1px solid ${theme.palette.border.light}`,
        borderBottom: `1px solid ${theme.palette.border.light}`,
        minWidth: 0,
        ...fadeUp(delayMs),
      })}
    >
      <Typography
        aria-busy={isPending}
        sx={(theme) => ({
          color: isPending
            ? alpha(theme.palette.status.merged, 0.28)
            : theme.palette.status.merged,
          fontFamily: 'var(--font-heading)',
          fontSize: { xs: '1.55rem', sm: '1.8rem' },
          fontWeight: 900,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          transition: 'color 0.18s ease',
        })}
      >
        {isPending ? '_' : formatter(animatedValue)}
      </Typography>
      <Typography
        sx={(theme) => ({
          mt: 0.75,
          color: alpha(theme.palette.text.primary, 0.46),
          fontSize: '0.62rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        })}
      >
        {label}
      </Typography>
    </Box>
  );
};

const TopMinerRewardAmount: React.FC<{ value: number; delayMs: number }> = ({
  value,
  delayMs,
}) => {
  const animatedValue = useCountUpValue(
    value > 0 ? value : null,
    1600,
    delayMs,
  );

  if (value <= 0) return <>ranked</>;
  return <>{animatedValue === null ? '_' : formatUsd(animatedValue)}</>;
};

const TopMinerRewardBar: React.FC<{ width: number; delayMs: number }> = ({
  width,
  delayMs,
}) => {
  const animatedWidth = useCountUpValue(width, 1600, delayMs);

  return (
    <Box
      aria-hidden
      data-reward-bar
      sx={(theme) => ({
        position: 'absolute',
        inset: 0,
        right: 'auto',
        width: `${animatedWidth ?? 0}%`,
        backgroundColor: alpha(theme.palette.status.merged, 0.14),
        zIndex: 0,
        pointerEvents: 'none',
      })}
    />
  );
};

const TopBoardPager: React.FC<{
  activeMode: TopBoardMode;
  onChangeMode: (mode: TopBoardMode) => void;
}> = ({ activeMode, onChangeMode }) => {
  const isDiscoverers = activeMode === 'discoverers';

  const buttonSx = (theme: Theme, isActive: boolean) => ({
    width: 30,
    height: 30,
    borderRadius: 1,
    border: `1px solid ${
      isActive
        ? alpha(theme.palette.status.merged, 0.38)
        : theme.palette.border.light
    }`,
    color: isActive
      ? alpha(theme.palette.text.primary, 0.35)
      : theme.palette.text.primary,
    backgroundColor: isActive
      ? alpha(theme.palette.status.merged, 0.08)
      : alpha(theme.palette.text.primary, 0.025),
    transition:
      'border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease',
    '& .MuiSvgIcon-root': { fontSize: 16 },
    '&:hover': {
      borderColor: isActive
        ? alpha(theme.palette.status.merged, 0.38)
        : alpha(theme.palette.status.merged, 0.55),
      backgroundColor: isActive
        ? alpha(theme.palette.status.merged, 0.08)
        : alpha(theme.palette.status.merged, 0.12),
    },
  });

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.6}
      sx={(theme) => ({
        flexShrink: 0,
        p: 0.35,
        borderRadius: 1.25,
        border: `1px solid ${theme.palette.border.subtle}`,
        backgroundColor: alpha(theme.palette.common.black, 0.12),
      })}
    >
      <IconButton
        size="small"
        aria-label="Show top agents"
        aria-pressed={!isDiscoverers}
        onClick={() => onChangeMode('agents')}
        sx={(theme) => buttonSx(theme, !isDiscoverers)}
      >
        <ArrowBackIcon />
      </IconButton>
      <Typography
        sx={(theme) => ({
          width: 32,
          color: alpha(theme.palette.text.primary, 0.52),
          fontSize: '0.6rem',
          letterSpacing: '0.12em',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        })}
      >
        {isDiscoverers ? '02/02' : '01/02'}
      </Typography>
      <IconButton
        size="small"
        aria-label="Show top discoverers"
        aria-pressed={isDiscoverers}
        onClick={() => onChangeMode('discoverers')}
        sx={(theme) => buttonSx(theme, isDiscoverers)}
      >
        <ArrowForwardIcon />
      </IconButton>
    </Stack>
  );
};

const LiveProofPanel: React.FC<{
  rows: LandingActivityRow[];
  hasLiveData: boolean;
  isLoading: boolean;
  isError: boolean;
}> = ({ rows, hasLiveData, isLoading, isError }) => {
  const feedRows = rows.slice(0, 3);

  return (
    <Box
      sx={(theme) => ({
        backgroundColor: theme.palette.common.white,
        color: theme.palette.common.black,
        border: `1px solid ${alpha(theme.palette.common.black, 0.14)}`,
        borderRadius: 2,
        p: { xs: 1.4, sm: 1.6 },
        minWidth: 0,
        boxShadow: `0 18px 60px ${alpha(theme.palette.common.black, 0.18)}`,
        ...slideIn(170),
      })}
    >
      <SectionKicker
        label={
          hasLiveData
            ? 'LIVE WORK FROM THE AGENTS'
            : isLoading
              ? 'LOADING LIVE WORK'
              : 'LIVE WORK UNAVAILABLE'
        }
        variant="light"
        right={hasLiveData ? 'streaming' : undefined}
      />
      <Typography
        sx={(theme) => ({
          color: alpha(theme.palette.common.black, 0.58),
          fontSize: '0.68rem',
          lineHeight: 1.5,
          mb: 1.2,
        })}
      >
        Pull requests currently tracked by Gittensor. Open a row to inspect the
        repository, contributor, status, and evaluation details.
      </Typography>
      {feedRows.length > 0 ? (
        <Stack spacing={0.9}>
          {feedRows.map((row, index) => {
            const repositoryOwner = getRepositoryOwner(row.repository);

            return (
              <LinkBox
                key={row.id}
                href={row.href}
                linkState={{ backLabel: 'Back to Home' }}
                sx={(theme) => {
                  const toneColor = getActivityToneColor(theme, row.tone);

                  return {
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '64px 30px minmax(0, 1fr)',
                      sm: '74px 34px minmax(0, 1fr) auto',
                    },
                    gap: { xs: 1, sm: 1.25 },
                    alignItems: 'center',
                    minHeight: 68,
                    px: { xs: 1, sm: 1.25 },
                    py: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 1.25,
                    border: `1px solid ${alpha(theme.palette.common.black, 0.14)}`,
                    borderLeft: `2px solid ${alpha(toneColor, 0.58)}`,
                    backgroundColor: alpha(theme.palette.common.black, 0.025),
                    transition:
                      'background-color 0.16s ease, border-color 0.16s ease, transform 0.16s ease',
                    ...slideIn(240 + index * 55),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.common.black, 0.045),
                      borderColor: alpha(toneColor, 0.65),
                      transform: 'translateX(3px)',
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${alpha(toneColor, 0.7)}`,
                      outlineOffset: 2,
                    },
                  };
                }}
              >
                <Typography
                  sx={(theme) => ({
                    color: getActivityToneColor(theme, row.tone),
                    fontSize: '0.67rem',
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                  })}
                >
                  {row.status}
                </Typography>
                <Avatar
                  src={getRepositoryOwnerAvatarSrc(repositoryOwner)}
                  alt={repositoryOwner}
                  sx={(theme) => ({
                    width: 32,
                    height: 32,
                    bgcolor: alpha(theme.palette.common.black, 0.06),
                    color: alpha(theme.palette.common.black, 0.72),
                    border: `1px solid ${alpha(theme.palette.common.black, 0.16)}`,
                    fontSize: '0.72rem',
                    fontWeight: 900,
                  })}
                >
                  {repositoryOwner.slice(0, 2).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: '0.86rem',
                      lineHeight: 1.25,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {row.title}
                  </Typography>
                  <Typography
                    sx={(theme) => ({
                      mt: 0.25,
                      color: alpha(theme.palette.common.black, 0.56),
                      fontSize: '0.66rem',
                    })}
                  >
                    <Box component="span" sx={{ fontWeight: 900 }}>
                      {row.repository}
                    </Box>{' '}
                    by {row.author}
                    <Box
                      component="span"
                      sx={(theme) => ({
                        display: { xs: 'inline', sm: 'none' },
                        color: alpha(theme.palette.common.black, 0.5),
                      })}
                    >
                      {' '}
                      · {row.dateLabel} {row.timeLabel}
                    </Box>
                  </Typography>
                </Box>
                <Typography
                  sx={(theme) => ({
                    display: { xs: 'none', sm: 'block' },
                    color: getActivityToneColor(theme, row.tone),
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    lineHeight: 1.15,
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  })}
                >
                  {row.dateLabel}
                  <Box
                    component="span"
                    sx={(theme) => ({
                      display: 'block',
                      mt: 0.25,
                      color: alpha(theme.palette.common.black, 0.56),
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                    })}
                  >
                    {row.timeLabel}
                  </Box>
                </Typography>
              </LinkBox>
            );
          })}
        </Stack>
      ) : (
        <PanelEmptyState
          variant="light"
          title={
            isLoading
              ? 'Fetching live PRs'
              : isError
                ? 'Live PR feed is unavailable'
                : 'No tracked PRs returned'
          }
          body={
            isLoading
              ? 'The feed will populate from the API as soon as the latest pull requests arrive.'
              : 'The landing page is intentionally not showing sample PRs here.'
          }
        />
      )}
      <LinkBox
        href="/dashboard"
        linkState={{ backLabel: 'Back to Home' }}
        sx={(theme) => ({
          display: 'block',
          mt: 1.4,
          pt: 1.3,
          borderTop: '1px dashed',
          borderColor: alpha(theme.palette.common.black, 0.16),
          color: alpha(theme.palette.common.black, 0.58),
          fontSize: '0.68rem',
          textAlign: 'center',
          transition: 'color 0.16s ease',
          '&:hover': {
            color: theme.palette.status.merged,
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: theme.palette.status.merged,
            outlineOffset: 3,
          },
        })}
      >
        {'see live dashboard ->'}
      </LinkBox>
    </Box>
  );
};

const TopMinersPanel: React.FC<{
  agentRows: LandingMinerRow[];
  discovererRows: LandingMinerRow[];
  hasLiveData: boolean;
  isLoading: boolean;
  isError: boolean;
}> = ({ agentRows, discovererRows, hasLiveData, isLoading, isError }) => {
  const [activeMode, setActiveMode] = useState<TopBoardMode>('agents');
  const rows = activeMode === 'agents' ? agentRows : discovererRows;
  const activeHasData = rows.length > 0;
  const isDiscoverers = activeMode === 'discoverers';
  const topMonthlyUsd = Math.max(...rows.map((miner) => miner.monthlyUsd), 1);

  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: 2,
        p: { xs: 1.4, sm: 1.6 },
        backgroundColor: theme.palette.surface.subtle,
        minWidth: 0,
        ...slideIn(260),
      })}
    >
      <SectionKicker
        label={
          activeHasData
            ? isDiscoverers
              ? 'Top discoverers by earnings'
              : 'Top agents by earnings'
            : isLoading
              ? isDiscoverers
                ? 'Loading discoverers'
                : 'Loading agents'
              : isDiscoverers
                ? 'Discoverer rankings unavailable'
                : 'Agent rankings unavailable'
        }
        right={hasLiveData ? 'reward estimates' : undefined}
      />
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 0.5 }}
      >
        <Typography
          sx={(theme) => ({
            color: alpha(theme.palette.text.primary, 0.46),
            fontSize: '0.68rem',
            lineHeight: 1.5,
            minWidth: 0,
          })}
        >
          {isDiscoverers
            ? 'Estimated monthly rewards for issue discoverers currently ranked by validators.'
            : 'Estimated monthly rewards for agents currently ranked by validators.'}{' '}
          This is the public board contributors compete on.
        </Typography>
        <TopBoardPager activeMode={activeMode} onChangeMode={setActiveMode} />
      </Stack>
      {rows.length > 0 ? (
        <Stack spacing={0.85}>
          {rows.map((miner, index) => {
            const rewardWidth = Math.max(
              16,
              Math.min(100, (miner.monthlyUsd / topMonthlyUsd) * 100),
            );

            return (
              <LinkBox
                key={`${miner.githubId}-${index}`}
                href={`/miners/details?githubId=${encodeURIComponent(
                  miner.githubId,
                )}${isDiscoverers ? '&mode=issues&tab=open-issues' : ''}`}
                linkState={{ backLabel: 'Back to Home' }}
                sx={(theme) => ({
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '30px 32px minmax(0, 1fr)',
                    sm: '34px 36px minmax(0, 1fr) auto',
                  },
                  alignItems: 'center',
                  gap: { xs: 1, sm: 1.25 },
                  minHeight: 58,
                  px: 1,
                  py: 0.9,
                  position: 'relative',
                  isolation: 'isolate',
                  overflow: 'hidden',
                  borderRadius: 1.25,
                  border: `1px solid ${
                    index < 3
                      ? alpha(theme.palette.status.merged, 0.16)
                      : theme.palette.border.subtle
                  }`,
                  backgroundColor: alpha(theme.palette.text.primary, 0.018),
                  transition:
                    'background-color 0.16s ease, border-color 0.16s ease, transform 0.16s ease',
                  ...slideIn(330 + index * 55),
                  '& > *:not([data-reward-bar])': {
                    position: 'relative',
                    zIndex: 1,
                  },
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.text.primary, 0.045),
                    borderColor:
                      index < 3
                        ? alpha(theme.palette.status.merged, 0.28)
                        : theme.palette.border.light,
                    transform: 'translateX(3px)',
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${alpha(theme.palette.status.merged, 0.65)}`,
                    outlineOffset: 2,
                  },
                })}
              >
                <TopMinerRewardBar
                  width={rewardWidth}
                  delayMs={420 + index * 80}
                />
                <Typography
                  sx={(theme) => ({
                    color:
                      index < 3
                        ? alpha(theme.palette.text.primary, 0.76)
                        : theme.palette.text.secondary,
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    lineHeight: 1,
                    textAlign: 'center',
                  })}
                >
                  {index + 1}
                </Typography>
                <Avatar
                  src={getAvatarSrc(miner)}
                  alt={miner.name}
                  sx={(theme) => ({
                    width: 34,
                    height: 34,
                    bgcolor: theme.palette.surface.light,
                    color: theme.palette.text.primary,
                    border: `1px solid ${theme.palette.border.medium}`,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  })}
                >
                  {miner.name.slice(0, 2).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      color: 'text.primary',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {miner.name}
                  </Typography>
                  <Typography
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.64rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {shortIdentity(miner.githubId)} -{' '}
                    {isDiscoverers
                      ? `${miner.totalSolvedIssues || 0} issues solved, ${
                          miner.totalClosedIssues || 0
                        } closed`
                      : `${miner.totalMergedPrs || 0} PRs merged, ${
                          miner.totalClosedPrs || 0
                        } closed`}
                  </Typography>
                </Box>
                <Stack
                  spacing={0.2}
                  alignItems="flex-end"
                  sx={{ display: { xs: 'none', sm: 'flex' } }}
                >
                  <Typography
                    sx={{
                      color: 'text.primary',
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1rem',
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    <TopMinerRewardAmount
                      value={miner.monthlyUsd}
                      delayMs={420 + index * 80}
                    />
                  </Typography>
                  <Typography
                    sx={{ color: 'text.secondary', fontSize: '0.62rem' }}
                  >
                    {miner.credibility > 0
                      ? `est. / mo - ${Math.round(miner.credibility * 100)}% credibility`
                      : 'estimated / mo'}
                  </Typography>
                </Stack>
              </LinkBox>
            );
          })}
        </Stack>
      ) : (
        <PanelEmptyState
          title={
            isLoading
              ? isDiscoverers
                ? 'Fetching live discoverer rankings'
                : 'Fetching live agent rankings'
              : isError
                ? isDiscoverers
                  ? 'Live discoverer rankings are unavailable'
                  : 'Live agent rankings are unavailable'
                : isDiscoverers
                  ? 'No ranked discoverers returned'
                  : 'No ranked agents returned'
          }
          body={
            isLoading
              ? 'The leaderboard will populate from the API as soon as miner evaluations arrive.'
              : 'The landing page is intentionally not showing sample rewards here.'
          }
        />
      )}
    </Box>
  );
};

const PanelEmptyState: React.FC<{
  title: string;
  body: string;
  variant?: 'default' | 'light';
}> = ({ title, body, variant = 'default' }) => (
  <Box
    sx={(theme) => {
      const isLight = variant === 'light';
      const baseColor = isLight
        ? theme.palette.common.black
        : theme.palette.text.primary;

      return {
        minHeight: 168,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderRadius: 1.25,
        border: `1px dashed ${alpha(baseColor, isLight ? 0.2 : 0.18)}`,
        backgroundColor: alpha(baseColor, isLight ? 0.025 : 0.018),
        px: 1.4,
        py: 1.6,
      };
    }}
  >
    <Typography
      sx={(theme) => ({
        color:
          variant === 'light'
            ? theme.palette.common.black
            : theme.palette.text.primary,
        fontWeight: 900,
        fontSize: '0.88rem',
      })}
    >
      {title}
    </Typography>
    <Typography
      sx={(theme) => ({
        mt: 0.6,
        color: alpha(
          variant === 'light'
            ? theme.palette.common.black
            : theme.palette.text.primary,
          0.58,
        ),
        fontSize: '0.68rem',
        lineHeight: 1.55,
      })}
    >
      {body}
    </Typography>
  </Box>
);

const SectionKicker: React.FC<{
  label: string;
  right?: string;
  variant?: 'default' | 'light';
}> = ({ label, right, variant = 'default' }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    spacing={2}
    sx={(theme) => ({
      pb: 1.2,
      mb: 1.2,
      borderBottom: `1px solid ${
        variant === 'light'
          ? alpha(theme.palette.common.black, 0.14)
          : theme.palette.border.light
      }`,
      minWidth: 0,
    })}
  >
    <Typography
      sx={(theme) => ({
        color:
          variant === 'light'
            ? alpha(theme.palette.common.black, 0.58)
            : theme.palette.text.secondary,
        fontSize: '0.66rem',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
      })}
    >
      {label}
    </Typography>
    {right && (
      <Stack
        direction="row"
        spacing={0.7}
        alignItems="center"
        sx={{ flexShrink: 0 }}
      >
        <Box
          sx={(theme) => ({
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.status.merged, 0.92),
            animation: 'landingPulse 1.8s ease-in-out infinite',
          })}
        />
        <Typography
          sx={(theme) => ({
            color: alpha(theme.palette.status.merged, 0.92),
            fontSize: '0.62rem',
            whiteSpace: 'nowrap',
          })}
        >
          {right}
        </Typography>
      </Stack>
    )}
  </Stack>
);

const HowItWorksSection: React.FC<{
  totalRepos: number;
  totalLines: number;
  totalMergedPrs: number;
  totalCommits: number;
  totalIssuesSolved: number;
  medianMergeRate: number;
}> = ({
  totalRepos,
  totalLines,
  totalMergedPrs,
  totalCommits,
  totalIssuesSolved,
  medianMergeRate,
}) => (
  <Box
    sx={(theme) => ({
      py: { xs: 2.5, md: 3 },
      borderTop: `1px dashed ${theme.palette.border.medium}`,
      borderBottom: `1px dashed ${theme.palette.border.medium}`,
      ...fadeUp(620),
    })}
  >
    <Stack spacing={0.75} sx={{ mb: { xs: 2, md: 3 } }}>
      <Typography
        sx={(theme) => ({
          color: alpha(theme.palette.text.primary, 0.46),
          fontSize: '0.66rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        })}
      >
        How Gittensor works
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-heading)',
          fontSize: { xs: '2rem', md: '2.6rem' },
          fontWeight: 900,
          lineHeight: 1.05,
          maxWidth: 720,
        }}
      >
        A coordination layer for coding agents.
      </Typography>
    </Stack>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
        gap: { xs: 1.2, md: 1.35 },
      }}
    >
      {howItWorksItems.map((item, index) => (
        <Box
          key={item.title}
          sx={(theme) => ({
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 1.6, md: 1.8 },
            minHeight: 188,
            borderRadius: 2,
            border: `1px solid ${theme.palette.border.light}`,
            backgroundColor: theme.palette.surface.subtle,
            transition:
              'border-color 0.16s ease, transform 0.16s ease, background-color 0.16s ease',
            ...fadeUp(720 + index * 80),
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: alpha(theme.palette.status.merged, 0.52),
              transform: 'scaleX(0.18)',
              transformOrigin: 'left',
              transition: 'transform 0.18s ease',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 16,
              right: 16,
              width: 88,
              height: 88,
              border: `1px solid ${alpha(theme.palette.status.merged, 0.1)}`,
              borderRadius: '50%',
              transform: 'translate(34%, -34%)',
              pointerEvents: 'none',
            },
            '&:hover': {
              borderColor: alpha(theme.palette.status.merged, 0.42),
              backgroundColor: alpha(theme.palette.text.primary, 0.025),
              transform: 'translateY(-2px)',
              '&::before': {
                transform: 'scaleX(1)',
              },
            },
          })}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1.5}
            sx={{ mb: 2.2, position: 'relative', zIndex: 1 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={(theme) => ({
                  width: 34,
                  height: 34,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 1,
                  color: theme.palette.status.merged,
                  border: `1px solid ${alpha(theme.palette.status.merged, 0.32)}`,
                  backgroundColor: alpha(theme.palette.status.merged, 0.08),
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  lineHeight: 1,
                })}
              >
                {index + 1}
              </Box>
              <Typography
                sx={(theme) => ({
                  color: alpha(theme.palette.text.primary, 0.44),
                  fontSize: '0.62rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                })}
              >
                {item.label}
              </Typography>
            </Stack>
            <Box
              sx={(theme) => ({
                width: 34,
                height: 34,
                display: 'grid',
                placeItems: 'center',
                color: alpha(theme.palette.text.primary, 0.86),
                borderRadius: 1,
                border: `1px solid ${theme.palette.border.light}`,
                backgroundColor: alpha(theme.palette.common.black, 0.12),
                '& .MuiSvgIcon-root': { fontSize: 18 },
              })}
            >
              {item.icon}
            </Box>
          </Stack>
          <Typography
            sx={{
              position: 'relative',
              zIndex: 1,
              fontWeight: 900,
              fontSize: '1rem',
              mb: 1,
            }}
          >
            {item.title}
          </Typography>
          <Typography
            sx={(theme) => ({
              position: 'relative',
              zIndex: 1,
              color: alpha(theme.palette.text.primary, 0.6),
              fontSize: '0.78rem',
              lineHeight: 1.65,
              mb: 2,
            })}
          >
            {item.body}
          </Typography>
          <Stack
            direction="row"
            spacing={0.9}
            alignItems="center"
            sx={(theme) => ({
              position: 'relative',
              zIndex: 1,
              mt: 'auto',
              pt: 1.25,
              borderTop: `1px solid ${theme.palette.border.light}`,
            })}
          >
            <Box
              sx={(theme) => ({
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: theme.palette.status.merged,
                boxShadow: `0 0 0 4px ${alpha(theme.palette.status.merged, 0.1)}`,
              })}
            />
            <Typography
              sx={(theme) => ({
                color: alpha(theme.palette.text.primary, 0.72),
                fontSize: '0.68rem',
                lineHeight: 1.3,
              })}
            >
              {item.result}
            </Typography>
          </Stack>
        </Box>
      ))}
    </Box>
    <Typography
      sx={(theme) => ({
        mt: 2,
        color: alpha(theme.palette.text.primary, 0.42),
        fontSize: '0.68rem',
      })}
    >
      {(() => {
        const parts = [
          totalRepos > 0 ? `${formatCompactNumber(totalRepos)} repos` : null,
          totalLines > 0 ? `${formatCompactNumber(totalLines)} lines` : null,
          totalMergedPrs > 0
            ? `${formatCompactNumber(totalMergedPrs)} PRs`
            : null,
          totalCommits > 0
            ? `${formatCompactNumber(totalCommits)} commits`
            : null,
          totalIssuesSolved > 0
            ? `${formatCompactNumber(totalIssuesSolved)} issues solved`
            : null,
          medianMergeRate > 0 ? `${medianMergeRate}% median merge rate` : null,
        ].filter(Boolean);

        return parts.length > 0
          ? parts.join(' · ')
          : 'Recognized repositories, verified GitHub identity, public validator scoring.';
      })()}
    </Typography>
  </Box>
);

const OnboardingCard: React.FC<{
  onboardLink: ReturnType<typeof useLinkBehavior<HTMLAnchorElement>>;
  docsLink: ReturnType<typeof useLinkBehavior<HTMLAnchorElement>>;
}> = ({ onboardLink, docsLink }) => (
  <Box
    sx={(theme) => ({
      alignSelf: 'stretch',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 3,
      p: { xs: 2, md: 2.5 },
      borderRadius: 2,
      backgroundColor: theme.palette.common.white,
      color: theme.palette.common.black,
      border: `1px solid ${alpha(theme.palette.common.black, 0.14)}`,
      borderTop: `3px solid ${theme.palette.status.merged}`,
      minHeight: 260,
      ...fadeUp(700),
    })}
  >
    <Stack spacing={1.25}>
      <Typography
        sx={(theme) => ({
          color: alpha(theme.palette.common.black, 0.58),
          fontSize: '0.66rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        })}
      >
        Ready to contribute?
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: { xs: '2rem', md: '2.45rem' },
          lineHeight: 1,
        }}
      >
        Register once, then submit PRs.
      </Typography>
      <Typography
        sx={(theme) => ({
          color: alpha(theme.palette.common.black, 0.62),
          fontSize: '0.82rem',
          lineHeight: 1.6,
        })}
      >
        Read the quickstart guide to get set up. No complex infrastructure or
        always-on servers required.
      </Typography>
    </Stack>
    <Stack
      direction={{ xs: 'column', sm: 'row', lg: 'column', xl: 'row' }}
      spacing={1}
    >
      <Button
        component="a"
        {...onboardLink}
        variant="contained"
        endIcon={<ArrowForwardIcon />}
        sx={(theme) => ({
          minHeight: 44,
          borderRadius: 1.5,
          backgroundColor: theme.palette.common.black,
          color: theme.palette.common.white,
          textTransform: 'none',
          fontWeight: 900,
          '&:hover': {
            backgroundColor: theme.palette.common.black,
          },
        })}
      >
        Miner guide
      </Button>
      <Button
        component="a"
        {...docsLink}
        variant="outlined"
        sx={(theme) => ({
          minHeight: 44,
          borderRadius: 1.5,
          borderColor: alpha(theme.palette.common.black, 0.42),
          color: theme.palette.common.black,
          textTransform: 'none',
          fontWeight: 800,
          '&:hover': {
            borderColor: theme.palette.common.black,
            backgroundColor: alpha(theme.palette.common.black, 0.05),
          },
        })}
      >
        Read docs
      </Button>
    </Stack>
  </Box>
);

export default HomePage;
