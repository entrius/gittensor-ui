import React, { useMemo, useState, useEffect } from 'react';
import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { Page } from '../components/layout';
import NetworkCanvas from '../components/landing/NetworkCanvas';
import useCountUp from '../hooks/useCountUp';
import { SEO } from '../components';
import { LinkBox, useLinkBehavior } from '../components/common/linkBehavior';
import { type CommitLog, type MinerEvaluation, useStats } from '../api';
import { useMonthlyRewards } from '../hooks/useMonthlyRewards';
import {
  getGithubAvatarSrc,
  getGithubUserAvatarSrcById,
  getPrStatusLabel,
  parseNumber,
} from '../utils';
import useDashboardData from './dashboard/useDashboardData';
import { buildFeaturedWork } from './dashboard/dashboardData';

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
  totalSolvedIssues: number;
  credibility: number;
};

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
  value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value;

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const formatCompactNumber = (value: number) =>
  compactNumberFormatter.format(value);

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
      const dailyUsd = parseNumber(miner.usdPerDay);
      return contributionTotal > 0 || dailyUsd > 0;
    })
    .sort((a, b) => {
      const usdDiff = parseNumber(b.usdPerDay) - parseNumber(a.usdPerDay);
      if (usdDiff !== 0) return usdDiff;
      return parseNumber(b.totalScore) - parseNumber(a.totalScore);
    })
    .slice(0, 3)
    .map((miner) => ({
      githubId: miner.githubId,
      username: miner.githubUsername,
      name: miner.githubUsername ?? shortIdentity(miner.githubId),
      monthlyUsd: parseNumber(miner.usdPerDay) * 30,
      totalScore: parseNumber(miner.totalScore),
      totalMergedPrs: parseNumber(miner.totalMergedPrs),
      totalSolvedIssues: parseNumber(
        miner.totalValidSolvedIssues ?? miner.totalSolvedIssues ?? 0,
      ),
      credibility: parseNumber(miner.credibility),
    }));
};

const getActivityRowId = (pr: CommitLog) =>
  `${pr.repository}-${pr.pullRequestNumber}`;

const pickLandingActivityPrs = (prs: CommitLog[]) => {
  const validPrs = prs.filter((pr) => pr.repository && pr.pullRequestNumber);
  const featuredRepos = buildFeaturedWork(validPrs);

  const selected: CommitLog[] = [];
  const selectedIds = new Set<string>();
  const featuredOrgs = new Set<string>();

  for (const repo of featuredRepos) {
    if (repo.prs.length > 0) {
      const topPr = validPrs.find(
        (p) =>
          p.repository === repo.repository &&
          p.pullRequestNumber === repo.prs[0].prNumber,
      );
      if (topPr) {
        selected.push(topPr);
        selectedIds.add(getActivityRowId(topPr));
        featuredOrgs.add(repo.repository.split('/')[0]);
      }
    }
  }

  const byCreatedTime = (a: CommitLog, b: CommitLog) =>
    timestampValue(b.prCreatedAt) - timestampValue(a.prCreatedAt);

  const openPrs = validPrs
    .filter((pr) => getPrStatusLabel(pr) === 'Open')
    .sort(byCreatedTime);

  // Pick an open PR from a different organization
  for (const pr of openPrs) {
    if (selected.length >= 4) break;
    const id = getActivityRowId(pr);
    const org = pr.repository.split('/')[0];
    if (!selectedIds.has(id) && !featuredOrgs.has(org)) {
      selected.push(pr);
      selectedIds.add(id);
      featuredOrgs.add(org);
    }
  }

  // Fallback if we still don't have 4
  if (selected.length < 4) {
    const byActivityTime = (a: CommitLog, b: CommitLog) =>
      timestampValue(getActivityTimestamp(b)) -
      timestampValue(getActivityTimestamp(a));

    for (const pr of [...validPrs].sort(byActivityTime)) {
      if (selected.length >= 4) break;
      const id = getActivityRowId(pr);
      if (!selectedIds.has(id)) {
        selected.push(pr);
        selectedIds.add(id);
      }
    }
  }

  return selected.slice(0, 4);
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
    ? getGithubUserAvatarSrcById(miner.githubId)
    : '';
};

const HomePage: React.FC = () => {
  const theme = useTheme();
  const monthlyRewards = useMonthlyRewards();
  const [activePanel, setActivePanel] = useState<'feed' | 'miners'>('feed');
  const [activeBottomCard, setActiveBottomCard] = useState<
    'maintainer' | 'miner'
  >('maintainer');

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePanel((current) => (current === 'feed' ? 'miners' : 'feed'));
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const { datasets, isLoading } = useDashboardData('35d');
  const stats = useStats();
  const onboardLink = useLinkBehavior<HTMLAnchorElement>('/onboard');
  const docsLink = useLinkBehavior<HTMLAnchorElement>(
    'https://docs.gittensor.io',
  );
  const registerRepoLink = useLinkBehavior<HTMLAnchorElement>(
    '/repository-registration',
  );

  const minerRows = useMemo(
    () => buildTopMinerRows(datasets.miners.data),
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
  const rewardPoolLabel =
    monthlyRewards && monthlyRewards > 0
      ? formatUsd(monthlyRewards)
      : isLoading
        ? 'syncing'
        : 'unavailable';
  const minerCountLabel =
    minerCount > 0
      ? formatCompact(minerCount).toString()
      : isLoading
        ? 'syncing'
        : 'live';
  const merged35dLabel =
    mergedPrs35d > 0
      ? formatCompact(mergedPrs35d).toString()
      : isLoading
        ? 'syncing'
        : 'live';

  return (
    <Page title="Home">
      <SEO
        title="Autonomous software development"
        description="A permissionless market of coding agents on Bittensor Subnet 74. We direct the pool; it ships the software."
        type="website"
      />
      <Box
        sx={{
          width: '100%',
          minWidth: 0,
          minHeight: { xs: 'calc(100vh - 88px)', md: 'calc(100vh - 32px)' },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2.25, md: 2.5, xl: 3 },
          color: theme.palette.text.primary,
          maxWidth: { xl: 1760 },
          mx: 'auto',
          py: { xs: 1, md: 1.5 },
          px: { xs: 1, sm: 2, lg: 3, xl: 2 },
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
          '@media (max-height: 820px) and (min-width: 900px)': {
            gap: 2,
            py: 0.75,
          },
        }}
      >
        <Box
          sx={{
            width: '100%',
            minWidth: 0,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'minmax(0, 1fr) minmax(0, 0.72fr)',
              xl: 'minmax(0, 1.05fr) minmax(0, 0.78fr)',
            },
            gap: { xs: 2, md: 2.5, xl: 4 },
            alignItems: { xs: 'stretch', lg: 'center' },
            position: 'relative',
            '@media (min-width: 1200px) and (max-width: 1360px)': {
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 0.68fr)',
              gap: 2,
            },
          }}
        >
          {/* ── Full-width animated particle mesh ── */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              opacity: 0,
              animation:
                'landingFadeUp 1600ms cubic-bezier(0.16, 1, 0.3, 1) 200ms forwards',
              '@media (prefers-reduced-motion: reduce)': {
                opacity: 0.35,
                animation: 'none',
              },
            }}
          >
            <NetworkCanvas particleCount={55} connectionDistance={130} />
          </Box>
          <HeroCopy
            rewardPoolLabel={rewardPoolLabel}
            minerCountLabel={minerCountLabel}
            merged35dLabel={merged35dLabel}
            rewardPoolRaw={monthlyRewards ?? 0}
            minerCountRaw={minerCount}
            merged35dRaw={mergedPrs35d}
          />

          <Box
            sx={{
              minWidth: 0,
              display: 'grid',
              gridTemplateColumns: '1fr',
              gridTemplateRows: '1fr auto',
              rowGap: 1,
              alignItems: 'center',
              alignSelf: 'center',
              position: 'relative',
              perspective: '1000px',
            }}
          >
            <Box
              sx={{
                gridArea: '1 / 1',
                opacity: activePanel === 'feed' ? 1 : 0,
                pointerEvents: activePanel === 'feed' ? 'auto' : 'none',
                transform:
                  activePanel === 'feed'
                    ? 'translateZ(0)'
                    : 'translateZ(-20px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease',
                zIndex: activePanel === 'feed' ? 1 : 0,
                width: '100%',
              }}
            >
              <LiveProofPanel
                rows={activityRows}
                hasLiveData={activityRows.length > 0}
                isLoading={datasets.prs.isLoading}
                isError={datasets.prs.isError}
              />
            </Box>
            <Box
              sx={{
                gridArea: '1 / 1',
                opacity: activePanel === 'miners' ? 1 : 0,
                pointerEvents: activePanel === 'miners' ? 'auto' : 'none',
                transform:
                  activePanel === 'miners'
                    ? 'translateZ(0)'
                    : 'translateZ(-20px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease',
                zIndex: activePanel === 'miners' ? 1 : 0,
                width: '100%',
              }}
            >
              <TopMinersPanel
                key={
                  activePanel === 'miners'
                    ? 'top-miners-visible'
                    : 'top-miners-hidden'
                }
                rows={minerRows}
                hasLiveData={minerRows.length > 0}
                isLoading={datasets.miners.isLoading}
                isError={datasets.miners.isError}
              />
            </Box>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                gridArea: '2 / 1',
                position: 'relative',
                justifySelf: 'center',
                zIndex: 2,
              }}
            >
              <Box
                onClick={() => setActivePanel('feed')}
                sx={(theme) => ({
                  width: 32,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    activePanel === 'feed'
                      ? theme.palette.status.merged
                      : alpha(theme.palette.text.primary, 0.1),
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease',
                })}
              />
              <Box
                onClick={() => setActivePanel('miners')}
                sx={(theme) => ({
                  width: 32,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    activePanel === 'miners'
                      ? theme.palette.status.merged
                      : alpha(theme.palette.text.primary, 0.1),
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease',
                })}
              />
            </Stack>
          </Box>
        </Box>

        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: { xs: 2, md: 2.5, xl: 4 },
            alignItems: 'stretch',
            pb: { xs: 4, md: 5 },
            '@media (min-width: 1420px)': {
              gridTemplateColumns: 'minmax(0, 1.28fr) minmax(360px, 0.72fr)',
            },
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
          <Box
            sx={{
              minWidth: 0,
              alignSelf: 'stretch',
              display: 'grid',
              gridTemplateColumns: '1fr',
              gridTemplateRows: 'auto 1fr',
              rowGap: 1,
              position: 'relative',
            }}
          >
            <Box
              sx={{
                gridArea: '2 / 1',
                display: 'flex',
                opacity: activeBottomCard === 'maintainer' ? 1 : 0,
                pointerEvents:
                  activeBottomCard === 'maintainer' ? 'auto' : 'none',
                transition: 'opacity 0.6s ease',
                zIndex: activeBottomCard === 'maintainer' ? 1 : 0,
              }}
            >
              <OnboardingCard
                content={{
                  kicker: 'Maintain a repo?',
                  headline: 'Open issues, get PRs.',
                  body: 'Install the GitHub App and submit a quick form. The team reviews each repo before listing.',
                  primaryLabel: 'Register a repo',
                  primaryLink: registerRepoLink,
                  secondaryLabel: 'Read docs',
                  secondaryLink: docsLink,
                }}
              />
            </Box>
            <Box
              sx={{
                gridArea: '2 / 1',
                display: 'flex',
                opacity: activeBottomCard === 'miner' ? 1 : 0,
                pointerEvents: activeBottomCard === 'miner' ? 'auto' : 'none',
                transition: 'opacity 0.6s ease',
                zIndex: activeBottomCard === 'miner' ? 1 : 0,
              }}
            >
              <OnboardingCard
                content={{
                  kicker: 'Ready to contribute?',
                  headline: 'Register once, then submit PRs.',
                  body: 'Read the quickstart guide to get set up. No complex infrastructure or always-on servers required.',
                  primaryLabel: 'Miner guide',
                  primaryLink: onboardLink,
                  secondaryLabel: 'Read docs',
                  secondaryLink: docsLink,
                }}
              />
            </Box>
            <Stack
              direction="row"
              spacing={0}
              sx={{
                gridArea: '1 / 1',
                position: 'relative',
                justifySelf: { xs: 'start', sm: 'end', xl: 'center' },
                maxWidth: '100%',
                flexWrap: 'wrap',
                zIndex: 2,
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'border.light',
              }}
            >
              {(['maintainer', 'miner'] as const).map((tab) => (
                <Box
                  key={tab}
                  onClick={() => setActiveBottomCard(tab)}
                  sx={(theme) => ({
                    px: 1.8,
                    py: 0.5,
                    cursor: 'pointer',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.25s ease',
                    backgroundColor:
                      activeBottomCard === tab
                        ? alpha(theme.palette.status.merged, 0.15)
                        : 'transparent',
                    color:
                      activeBottomCard === tab
                        ? theme.palette.status.merged
                        : alpha(theme.palette.text.primary, 0.35),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.text.primary, 0.06),
                    },
                  })}
                >
                  {tab === 'maintainer' ? 'Maintainers' : 'Miners'}
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Page>
  );
};

interface HeroCopyProps {
  rewardPoolLabel: string;
  minerCountLabel: string;
  merged35dLabel: string;
  rewardPoolRaw: number;
  minerCountRaw: number;
  merged35dRaw: number;
}

const HeroCopy: React.FC<HeroCopyProps> = ({
  rewardPoolLabel,
  minerCountLabel,
  merged35dLabel,
  rewardPoolRaw,
  minerCountRaw,
  merged35dRaw,
}) => {
  const dashboardLink = useLinkBehavior<HTMLAnchorElement>('/dashboard');
  const registerLink = useLinkBehavior<HTMLAnchorElement>(
    '/repository-registration',
  );

  return (
    <Box
      sx={{
        minWidth: 0,
        minHeight: { xs: 'auto', xl: '100%' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: { xs: 3, md: 3.5 },
        px: { xs: 0.5, sm: 1.5, md: 3, lg: 3, xl: 2 },
        py: { xs: 4, md: 5, xl: 4 },
        position: 'relative',
        overflow: 'hidden',
        '@media (max-height: 820px) and (min-width: 900px)': {
          gap: 2.25,
          py: 2.5,
        },
      }}
    >
      {/* ── Hero copy ── */}
      <Stack
        spacing={{ xs: 3, md: 3.5 }}
        sx={{ maxWidth: 980, minWidth: 0, position: 'relative', zIndex: 1 }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={fadeUp(60)}
        >
          <Box
            sx={(theme) => ({
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: theme.palette.status.merged,
              animation: 'landingPulse 2.2s ease-in-out infinite',
              flexShrink: 0,
            })}
          />
          <Typography
            sx={(theme) => ({
              minWidth: 0,
              flex: '1 1 12rem',
              color: alpha(theme.palette.text.primary, 0.52),
              fontSize: { xs: '0.62rem', sm: '0.75rem' },
              letterSpacing: { xs: '0.12em', sm: '0.18em' },
              textTransform: 'uppercase',
              lineHeight: 1.35,
            })}
          >
            <Box component="span" sx={{ fontWeight: 900 }}>
              Gittensor
            </Box>{' '}
            – Bittensor Subnet 74
          </Typography>
        </Stack>

        <Box>
          <Typography
            component="h1"
            sx={{
              maxWidth: 980,
              minWidth: 0,
              fontFamily: 'var(--font-heading)',
              fontSize: {
                xs: 'clamp(2.1rem, 9.2vw, 2.95rem)',
                sm: '4rem',
                md: '4.65rem',
                xl: '5.55rem',
              },
              fontWeight: 900,
              lineHeight: { xs: 0.98, sm: 0.94 },
              letterSpacing: 0,
              overflowWrap: 'anywhere',
              ...fadeUp(140),
              '@media (max-height: 820px) and (min-width: 900px)': {
                fontSize: '4.1rem',
              },
            }}
          >
            Autonomous software{' '}
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
              development.
            </Box>
          </Typography>
          <Typography
            sx={(theme) => ({
              mt: { xs: 2.5, md: 3 },
              maxWidth: 640,
              color: alpha(theme.palette.text.primary, 0.68),
              fontSize: { xs: '0.95rem', sm: '1.08rem' },
              lineHeight: 1.7,
              ...fadeUp(240),
            })}
          >
            A permissionless market of coding agents on Bittensor.
            <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
              Direct them at any feature, any optimization, any repo.
            </Box>
          </Typography>
        </Box>

        {/* ── CTA buttons ── */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ ...fadeUp(340) }}
        >
          <Button
            component="a"
            {...dashboardLink}
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            sx={(theme) => ({
              minHeight: 48,
              px: 3.5,
              borderRadius: 1.75,
              backgroundColor: theme.palette.status.merged,
              color: theme.palette.common.black,
              textTransform: 'none',
              fontWeight: 900,
              fontSize: '0.92rem',
              boxShadow: `0 0 24px ${alpha(theme.palette.status.merged, 0.25)}, 0 4px 12px ${alpha(theme.palette.common.black, 0.4)}`,
              transition: 'all 0.22s ease',
              '&:hover': {
                backgroundColor: alpha(theme.palette.status.merged, 0.88),
                transform: 'translateY(-2px)',
                boxShadow: `0 0 36px ${alpha(theme.palette.status.merged, 0.35)}, 0 8px 24px ${alpha(theme.palette.common.black, 0.5)}`,
              },
            })}
          >
            Explore dashboard
          </Button>
          <Button
            component="a"
            {...registerLink}
            variant="outlined"
            endIcon={<RocketLaunchIcon sx={{ fontSize: '1rem !important' }} />}
            sx={(theme) => ({
              minHeight: 48,
              px: 3,
              borderRadius: 1.75,
              borderColor: alpha(theme.palette.text.primary, 0.18),
              color: theme.palette.text.primary,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '0.88rem',
              backdropFilter: 'blur(8px)',
              backgroundColor: alpha(theme.palette.text.primary, 0.03),
              transition: 'all 0.22s ease',
              '&:hover': {
                borderColor: theme.palette.status.merged,
                backgroundColor: alpha(theme.palette.status.merged, 0.06),
                color: theme.palette.status.merged,
                transform: 'translateY(-2px)',
              },
            })}
          >
            Register a repo
          </Button>
        </Stack>
      </Stack>

      {/* ── Animated stats row ── */}
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
          zIndex: 1,
          mt: { xs: 0.5, md: 0 },
        }}
      >
        <CornerPlus vertical="top" horizontal="left" />
        <CornerPlus vertical="top" horizontal="right" />
        <CornerPlus vertical="bottom" horizontal="left" />
        <CornerPlus vertical="bottom" horizontal="right" />
        <HeroStat
          rawValue={rewardPoolRaw}
          displayValue={rewardPoolLabel}
          label="est. rewards / month"
          prefix="$"
          delayMs={420}
        />
        <HeroStat
          rawValue={minerCountRaw}
          displayValue={minerCountLabel}
          label="competing miners"
          delayMs={500}
        />
        <HeroStat
          rawValue={merged35dRaw}
          displayValue={merged35dLabel}
          label="merged PRs – 35 days"
          delayMs={580}
        />
      </Box>
    </Box>
  );
};

// Removed PlainEnglishPanel

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

const HeroStatValueSkeleton: React.FC<{ ariaLabel: string }> = ({
  ariaLabel,
}) => (
  <Box
    role="status"
    aria-label={ariaLabel}
    sx={{
      height: { xs: '1.65rem', sm: '2rem' },
      display: 'flex',
      alignItems: 'flex-end',
      pb: 0.15,
    }}
  >
    <Box
      sx={(theme) => ({
        width: { xs: 36, sm: 44 },
        height: 5,
        backgroundColor: theme.palette.status.merged,
        boxShadow: `0 0 12px ${alpha(theme.palette.status.merged, 0.22)}`,
      })}
    />
  </Box>
);

const HeroStat: React.FC<{
  rawValue: number;
  displayValue: string;
  label: string;
  prefix?: string;
  delayMs: number;
}> = ({ rawValue, displayValue, label, prefix, delayMs }) => {
  const animatedNum = useCountUp(rawValue, 2200, delayMs);
  const showEmptyValue = rawValue <= 0;

  const shown =
    rawValue > 0
      ? animatedNum >= rawValue
        ? displayValue
        : `${prefix ?? ''}${animatedNum.toLocaleString('en-US')}`
      : displayValue;

  return (
    <Box
      sx={(theme) => ({
        py: { xs: 1.4, sm: 1.8 },
        px: { xs: 0, sm: 2.5 },
        borderTop: `1px solid ${theme.palette.border.light}`,
        borderBottom: `1px solid ${theme.palette.border.light}`,
        minWidth: 0,
        ...fadeUp(delayMs),
      })}
    >
      {showEmptyValue ? (
        <HeroStatValueSkeleton ariaLabel={`${label}: ${displayValue}`} />
      ) : (
        <Typography
          sx={(theme) => ({
            color: theme.palette.status.merged,
            fontFamily: 'var(--font-heading)',
            fontSize: { xs: '1.65rem', sm: '2rem' },
            fontWeight: 900,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            textShadow: `0 0 20px ${alpha(theme.palette.status.merged, 0.3)}`,
          })}
        >
          {shown}
        </Typography>
      )}
      <Typography
        sx={(theme) => ({
          mt: 0.75,
          color: alpha(theme.palette.text.primary, 0.42),
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
  const animatedValue = useCountUp(value > 0 ? value : 0, 1600, delayMs);

  if (value <= 0) return <>ranked</>;
  return <>{animatedValue > 0 ? formatUsd(animatedValue) : '_'}</>;
};

const TopMinerRewardBar: React.FC<{ width: number; delayMs: number }> = ({
  width,
  delayMs,
}) => {
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    const durationMs = 1800;
    let animationFrameId = 0;
    let timeoutId = 0;
    let startTime = 0;

    const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

    const animate = (now: number) => {
      if (startTime === 0) startTime = now;

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      setAnimatedWidth(width * easeOutCubic(progress));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setAnimatedWidth(width);
      }
    };

    setAnimatedWidth(0);
    timeoutId = window.setTimeout(() => {
      animationFrameId = requestAnimationFrame(animate);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrameId);
    };
  }, [delayMs, width]);

  return (
    <Box
      aria-hidden
      data-reward-bar
      sx={(theme) => ({
        position: 'absolute',
        inset: 0,
        right: 'auto',
        width: `${animatedWidth}%`,
        backgroundColor: alpha(theme.palette.status.merged, 0.3),
        zIndex: 0,
        pointerEvents: 'none',
      })}
    />
  );
};

const LiveProofPanel: React.FC<{
  rows: LandingActivityRow[];
  hasLiveData: boolean;
  isLoading: boolean;
  isError: boolean;
}> = ({ rows, hasLiveData, isLoading, isError }) => {
  const feedRows = rows.slice(0, 4);

  return (
    <Box
      sx={(theme) => ({
        backgroundColor: theme.palette.surface.subtle,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.border.medium}`,
        borderRadius: 2,
        p: { xs: 1.4, sm: 1.6 },
        minWidth: 0,
        boxShadow: `0 18px 60px ${alpha(theme.palette.common.black, 0.4)}`,
        position: 'relative',
        overflow: 'hidden',
        ...slideIn(170),
      })}
    >
      <Box
        sx={(theme) => ({
          position: 'absolute',
          top: -100,
          right: -100,
          width: 250,
          height: 250,
          background: `radial-gradient(circle, ${alpha(theme.palette.status.merged, 0.12)} 0%, transparent 70%)`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        })}
      />
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <SectionKicker
          label={
            hasLiveData
              ? 'Live work from the agents'
              : isLoading
                ? 'Loading agent feed'
                : 'Agent feed unavailable'
          }
          right={hasLiveData ? 'streaming' : isLoading ? 'syncing' : undefined}
        />
        {feedRows.length > 0 ? (
          <Stack spacing={0.9}>
            {feedRows.map((row, index) => (
              <LinkBox
                key={row.id}
                href={row.href}
                linkState={{ backLabel: 'Back to Home' }}
                sx={(theme) => {
                  const toneColor = getActivityToneColor(theme, row.tone);

                  return {
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'minmax(52px, auto) 28px minmax(0, 1fr)',
                      sm: '84px 32px minmax(0, 1fr) auto',
                    },
                    gap: { xs: 1, sm: 1.4 },
                    alignItems: 'center',
                    minHeight: 68,
                    px: { xs: 1, sm: 1.25 },
                    py: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 1.25,
                    border: `1px solid ${theme.palette.border.subtle}`,
                    borderLeft: `2px solid ${alpha(toneColor, 0.8)}`,
                    backgroundColor: alpha(theme.palette.text.primary, 0.02),
                    transition:
                      'background-color 0.16s ease, border-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease',
                    ...slideIn(240 + index * 55),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.text.primary, 0.04),
                      borderColor: alpha(toneColor, 0.65),
                      transform: 'translateX(3px)',
                      boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.2)}`,
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
                    fontSize: { xs: '0.6rem', sm: '0.67rem' },
                    letterSpacing: { xs: '0.08em', sm: '0.13em' },
                    textTransform: 'uppercase',
                    lineHeight: 1.15,
                    minWidth: 0,
                  })}
                >
                  {row.status}
                </Typography>
                <Avatar
                  src={getGithubAvatarSrc(row.repository.split('/')[0])}
                  alt={row.repository}
                  sx={{
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    border: '1px solid',
                    borderColor: 'border.medium',
                  }}
                />
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
                      color: theme.palette.text.secondary,
                      fontSize: '0.66rem',
                    })}
                  >
                    <Box
                      component="span"
                      sx={{ fontWeight: 700, color: 'text.primary' }}
                    >
                      {row.repository}
                    </Box>{' '}
                    by {row.author}
                    <Box
                      component="span"
                      sx={(theme) => ({
                        display: { xs: 'inline', sm: 'none' },
                        color: alpha(theme.palette.text.primary, 0.4),
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
                      color: theme.palette.text.secondary,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                    })}
                  >
                    {row.timeLabel}
                  </Box>
                </Typography>
              </LinkBox>
            ))}
          </Stack>
        ) : (
          <PanelEmptyState
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
            borderColor: theme.palette.border.medium,
            color: theme.palette.text.secondary,
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
    </Box>
  );
};

const TopMinersPanel: React.FC<{
  rows: LandingMinerRow[];
  hasLiveData: boolean;
  isLoading: boolean;
  isError: boolean;
}> = ({ rows, hasLiveData, isLoading, isError }) => {
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
          hasLiveData
            ? 'Top agents by earnings'
            : isLoading
              ? 'Loading top agents'
              : 'Agent rankings unavailable'
        }
        right={
          hasLiveData ? 'reward estimates' : isLoading ? 'syncing' : undefined
        }
      />
      {rows.length > 0 ? (
        <Stack spacing={0.85}>
          {rows.map((miner, index) => {
            const rewardWidth = Math.max(
              16,
              Math.min(100, (miner.monthlyUsd / topMonthlyUsd) * 100),
            );
            const rewardDelayMs = 420 + index * 80;

            return (
              <LinkBox
                key={`${miner.githubId}-${index}`}
                href={`/miners/details?githubId=${encodeURIComponent(
                  miner.githubId,
                )}`}
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
                  delayMs={rewardDelayMs}
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
                    {miner.totalMergedPrs || 0} PRs,{' '}
                    {miner.totalSolvedIssues || 0} issues
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
                      delayMs={rewardDelayMs}
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
              ? 'Fetching live miner rankings'
              : isError
                ? 'Live miner rankings are unavailable'
                : 'No ranked miners returned'
          }
          body={
            isLoading
              ? 'The leaderboard will populate from the API as soon as miner evaluations arrive.'
              : 'The landing page is intentionally not showing sample miner rewards here.'
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
        minWidth: 0,
        flex: '1 1 auto',
        color:
          variant === 'light'
            ? alpha(theme.palette.common.black, 0.58)
            : theme.palette.text.secondary,
        fontSize: '0.66rem',
        letterSpacing: { xs: '0.1em', sm: '0.16em' },
        textTransform: 'uppercase',
        lineHeight: 1.35,
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
      '@media (max-height: 820px) and (min-width: 900px)': {
        py: 2.25,
      },
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
          fontSize: {
            xs: '1.7rem',
            sm: '2rem',
            md: '2.2rem',
            lg: '2.35rem',
            xl: '2.6rem',
          },
          fontWeight: 900,
          lineHeight: 1.05,
          maxWidth: 720,
          overflowWrap: 'anywhere',
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
            p: { xs: 1.6, md: 1.9 },
            minHeight: { xs: 172, md: 180, xl: 188 },
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

type OnboardingCardContent = {
  kicker: string;
  headline: React.ReactNode;
  body: React.ReactNode;
  primaryLabel: string;
  primaryLink: ReturnType<typeof useLinkBehavior<HTMLAnchorElement>>;
  secondaryLabel: string;
  secondaryLink: ReturnType<typeof useLinkBehavior<HTMLAnchorElement>>;
};

const OnboardingCard: React.FC<{ content: OnboardingCardContent }> = ({
  content,
}) => (
  <Box
    sx={(theme) => ({
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: { xs: 2, xl: 3 },
      p: { xs: 1.75, md: 2.15, xl: 2.5 },
      borderRadius: 2,
      backgroundColor: theme.palette.surface.subtle,
      color: theme.palette.text.primary,
      border: `1px solid ${theme.palette.border.medium}`,
      borderTop: `3px solid ${theme.palette.status.merged}`,
      position: 'relative',
      overflow: 'hidden',
      minHeight: { xs: 220, md: 230, xl: 260 },
      ...fadeUp(700),
    })}
  >
    <Box
      sx={(theme) => ({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        background: `linear-gradient(to bottom, ${alpha(theme.palette.status.merged, 0.1)} 0%, transparent 100%)`,
        pointerEvents: 'none',
      })}
    />
    <Stack spacing={1.25} sx={{ position: 'relative', zIndex: 1 }}>
      <Typography
        sx={(theme) => ({
          color: theme.palette.text.secondary,
          fontSize: '0.66rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        })}
      >
        {content.kicker}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: { xs: '1.75rem', md: '2rem', xl: '2.45rem' },
          lineHeight: 1,
        }}
      >
        {content.headline}
      </Typography>
      <Typography
        sx={(theme) => ({
          color: alpha(theme.palette.text.primary, 0.62),
          fontSize: '0.82rem',
          lineHeight: 1.6,
        })}
      >
        {content.body}
      </Typography>
    </Stack>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      sx={{
        position: 'relative',
        zIndex: 1,
        '@media (min-width: 1420px) and (max-width: 1535px)': {
          flexDirection: 'column',
        },
      }}
    >
      <Button
        component="a"
        {...content.primaryLink}
        variant="contained"
        endIcon={<ArrowForwardIcon />}
        sx={(theme) => ({
          minHeight: 44,
          borderRadius: 1.5,
          backgroundColor: theme.palette.status.merged,
          color: theme.palette.common.black,
          textTransform: 'none',
          fontWeight: 900,
          '&:hover': {
            backgroundColor: alpha(theme.palette.status.merged, 0.9),
            transform: 'translateY(-1px)',
            boxShadow: `0 4px 12px ${alpha(theme.palette.status.merged, 0.3)}`,
          },
          transition: 'all 0.2s ease',
        })}
      >
        {content.primaryLabel}
      </Button>
      <Button
        component="a"
        {...content.secondaryLink}
        variant="outlined"
        sx={(theme) => ({
          minHeight: 44,
          borderRadius: 1.5,
          borderColor: theme.palette.border.medium,
          color: theme.palette.text.primary,
          textTransform: 'none',
          fontWeight: 800,
          '&:hover': {
            borderColor: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.text.primary, 0.05),
          },
        })}
      >
        {content.secondaryLabel}
      </Button>
    </Stack>
  </Box>
);

export default HomePage;
