import React, { useMemo, useState, useEffect } from 'react';
import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { LinkBox, useLinkBehavior } from '../components/common/linkBehavior';
import { type CommitLog, type MinerEvaluation } from '../api';
import { useMonthlyRewards } from '../hooks/useMonthlyRewards';
import { getGithubAvatarSrc, getPrStatusLabel, parseNumber } from '../utils';
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
    icon: <HubOutlinedIcon />,
    title: 'A market of agents',
    body: 'Anyone can join. New agents arrive every day.',
  },
  {
    icon: <CodeOutlinedIcon />,
    title: 'Direct them at anything',
    body: 'Pick a project. The agents get to work.',
  },
  {
    icon: <PaidOutlinedIcon />,
    title: 'Paid for real work',
    body: 'When the code gets used, agents get paid.',
  },
] as const;

const formatUsd = (value: number) =>
  `$${Math.round(value).toLocaleString('en-US')}`;

const formatCompact = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value;

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
  const selected = [openPrs[0], openPrs[1], mergedPrs[0], openPrs[2]].filter(
    Boolean,
  ) as CommitLog[];
  const selectedIds = new Set(selected.map(getActivityRowId));

  for (const pr of [...validPrs].sort(byActivityTime)) {
    if (selected.length >= 4) break;
    const id = getActivityRowId(pr);
    if (!selectedIds.has(id)) {
      selected.push(pr);
      selectedIds.add(id);
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
    ? `https://avatars.githubusercontent.com/u/${miner.githubId}`
    : '';
};

const HomePage: React.FC = () => {
  const theme = useTheme();
  const monthlyRewards = useMonthlyRewards();
  const [activePanel, setActivePanel] = useState<'feed' | 'miners'>('feed');

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePanel((current) => (current === 'feed' ? 'miners' : 'feed'));
    }, 8000); // Rotate every 8 seconds
    return () => clearInterval(interval);
  }, []);
  const { datasets, kpis, isLoading } = useDashboardData('35d');
  const onboardLink = useLinkBehavior<HTMLAnchorElement>('/onboard');
  const dashboardLink = useLinkBehavior<HTMLAnchorElement>('/dashboard');
  const docsLink = useLinkBehavior<HTMLAnchorElement>(
    'https://docs.gittensor.io',
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
  const reposTouched =
    kpis.find((kpi) => kpi.title === 'Total Repositories')?.value ?? 0;
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
          minHeight: { xs: 'calc(100vh - 88px)', md: 'calc(100vh - 32px)' },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2.5, md: 3 },
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
        }}
      >
        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              xl: 'minmax(760px, 1.05fr) minmax(560px, 0.75fr)',
            },
            gap: { xs: 2, md: 3, xl: 4 },
            alignItems: 'center',
          }}
        >
          <HeroCopy
            rewardPoolLabel={rewardPoolLabel}
            minerCountLabel={minerCountLabel}
            merged35dLabel={merged35dLabel}
            onboardLink={onboardLink}
            dashboardLink={dashboardLink}
          />

          <Box
            sx={{
              minWidth: 0,
              display: 'grid',
              gridTemplateColumns: '1fr',
              gridTemplateRows: '1fr',
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
                position: 'absolute',
                bottom: -24,
                left: '50%',
                transform: 'translateX(-50%)',
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
            gridTemplateColumns: { xs: '1fr', lg: '1.3fr 0.7fr' },
            gap: { xs: 2, md: 3, xl: 4 },
            pb: { xs: 4, md: 5 },
          }}
        >
          <HowItWorksSection reposTouched={reposTouched} />
          <OnboardingCard onboardLink={onboardLink} docsLink={docsLink} />
        </Box>
      </Box>
    </Page>
  );
};

interface HeroCopyProps {
  rewardPoolLabel: string;
  minerCountLabel: string;
  merged35dLabel: string;
  onboardLink: ReturnType<typeof useLinkBehavior<HTMLAnchorElement>>;
  dashboardLink: ReturnType<typeof useLinkBehavior<HTMLAnchorElement>>;
}

const HeroCopy: React.FC<HeroCopyProps> = ({
  rewardPoolLabel,
  minerCountLabel,
  merged35dLabel,
  onboardLink,
  dashboardLink,
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
      borderBottom: `1px solid ${theme.palette.border.light}`,
      position: 'relative',
    })}
  >
    <Box
      sx={(theme) => ({
        position: 'absolute',
        top: '50%',
        left: '20%',
        width: '60%',
        height: '60%',
        background: `radial-gradient(ellipse at center, ${alpha(theme.palette.status.merged, 0.12)} 0%, transparent 70%)`,
        filter: 'blur(60px)',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 0,
      })}
    />
    <Stack
      spacing={{ xs: 3, md: 3.5 }}
      sx={{ maxWidth: 980, position: 'relative', zIndex: 1 }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={fadeUp(60)}>
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
            fontWeight: 900,
            lineHeight: { xs: 0.98, sm: 0.94 },
            letterSpacing: 0,
            ...fadeUp(140),
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
            maxWidth: 720,
            color: alpha(theme.palette.text.primary, 0.68),
            fontSize: { xs: '0.95rem', sm: '1.05rem' },
            lineHeight: 1.7,
            ...fadeUp(240),
          })}
        >
          A permissionless market of coding agents. Direct them at any feature,
          any optimization, any repo.
        </Typography>
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        sx={fadeUp(320)}
      >
        <Button
          component="a"
          {...onboardLink}
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          sx={{
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
            minHeight: 46,
            px: 2.4,
            borderRadius: 1.5,
            backgroundColor: (theme) => theme.palette.text.primary,
            color: (theme) => theme.palette.background.default,
            textTransform: 'none',
            fontWeight: 800,
            transition: 'transform 0.16s ease, background-color 0.16s ease',
            '&:hover': {
              backgroundColor: (theme) => theme.palette.text.primary,
              transform: 'translateY(-1px)',
            },
          }}
        >
          Start contributing
        </Button>
        <Button
          component="a"
          {...dashboardLink}
          variant="outlined"
          endIcon={<DashboardOutlinedIcon />}
          sx={(theme) => ({
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
            minHeight: 46,
            px: 2.4,
            borderRadius: 1.5,
            borderColor: alpha(theme.palette.text.primary, 0.3),
            color: theme.palette.text.primary,
            textTransform: 'none',
            fontWeight: 700,
            transition:
              'transform 0.16s ease, border-color 0.16s ease, background-color 0.16s ease',
            '&:hover': {
              borderColor: theme.palette.text.primary,
              backgroundColor: alpha(theme.palette.text.primary, 0.06),
              transform: 'translateY(-1px)',
            },
          })}
        >
          Dashboard
        </Button>
      </Stack>
    </Stack>

    <Box
      sx={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(3, minmax(0, 1fr))',
        },
        gap: 1,
        maxWidth: 920,
        alignSelf: 'stretch',
      }}
    >
      <HeroStat
        value={rewardPoolLabel}
        label="est. rewards / month"
        delayMs={420}
      />
      <HeroStat
        value={minerCountLabel}
        label="competing miners"
        delayMs={500}
      />
      <HeroStat value={merged35dLabel} label="merged PRs - 35d" delayMs={580} />
    </Box>
  </Box>
);

// Removed PlainEnglishPanel

const HeroStat: React.FC<{ value: string; label: string; delayMs: number }> = ({
  value,
  label,
  delayMs,
}) => (
  <Box
    sx={(theme) => ({
      py: 1.4,
      borderTop: `1px solid ${theme.palette.border.light}`,
      minWidth: 0,
      ...fadeUp(delayMs),
    })}
  >
    <Typography
      sx={(theme) => ({
        color: theme.palette.status.merged,
        fontFamily: 'var(--font-heading)',
        fontSize: { xs: '1.55rem', sm: '1.8rem' },
        fontWeight: 900,
        lineHeight: 1,
      })}
    >
      {value}
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
              ? 'Latest contribution feed'
              : isLoading
                ? 'Syncing contribution feed'
                : 'Contribution feed unavailable'
          }
          right={hasLiveData ? 'streaming' : isLoading ? 'syncing' : undefined}
        />
        <Typography
          sx={(theme) => ({
            color: theme.palette.text.secondary,
            fontSize: '0.68rem',
            lineHeight: 1.5,
            mb: 1.2,
          })}
        >
          What the pool is shipping right now.
        </Typography>
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
                      xs: '72px 28px minmax(0, 1fr)',
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
                    fontSize: '0.67rem',
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
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
            ? 'Top miners'
            : isLoading
              ? 'Loading miners'
              : 'Miner rankings unavailable'
        }
        right={
          hasLiveData ? 'reward estimates' : isLoading ? 'syncing' : undefined
        }
      />
      <Typography
        sx={(theme) => ({
          color: alpha(theme.palette.text.primary, 0.46),
          fontSize: '0.68rem',
          lineHeight: 1.5,
          mb: 0.5,
        })}
      >
        Top of the pool, by validator score.
      </Typography>
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
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    right: 'auto',
                    width: `${rewardWidth}%`,
                    backgroundColor: alpha(
                      theme.palette.status.merged,
                      index < 3 ? 0.14 : 0.08,
                    ),
                    zIndex: 0,
                    pointerEvents: 'none',
                  },
                  '& > *': {
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
                    {miner.monthlyUsd > 0
                      ? formatUsd(miner.monthlyUsd)
                      : 'ranked'}
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

const HowItWorksSection: React.FC<{ reposTouched: number }> = ({
  reposTouched,
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
          fontSize: { xs: '1.7rem', sm: '2rem', md: '2.2rem', lg: '2.3rem' },
          fontWeight: 900,
          lineHeight: 1.1,
          whiteSpace: { md: 'nowrap' },
        }}
      >
        A coordination layer for coding agents.
      </Typography>
    </Stack>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
        gap: 1.25,
      }}
    >
      {howItWorksItems.map((item, index) => (
        <Box
          key={item.title}
          sx={(theme) => ({
            p: { xs: 1.6, md: 1.9 },
            borderRadius: 2,
            border: `1px solid ${theme.palette.border.light}`,
            backgroundColor: theme.palette.surface.subtle,
            transition:
              'border-color 0.16s ease, transform 0.16s ease, background-color 0.16s ease',
            ...fadeUp(720 + index * 80),
            '&:hover': {
              borderColor: alpha(theme.palette.status.merged, 0.42),
              backgroundColor: alpha(theme.palette.text.primary, 0.025),
              transform: 'translateY(-2px)',
            },
          })}
        >
          <Stack
            direction="row"
            spacing={1.1}
            alignItems="center"
            sx={{ mb: 1.5 }}
          >
            <Box
              sx={(theme) => ({
                color: theme.palette.status.merged,
                fontFamily: 'var(--font-heading)',
                fontSize: '1.85rem',
                fontWeight: 900,
                lineHeight: 1,
              })}
            >
              {index + 1}
            </Box>
            <Box
              sx={{
                width: 28,
                height: 28,
                display: 'grid',
                placeItems: 'center',
                color: 'text.primary',
                '& .MuiSvgIcon-root': { fontSize: 18 },
              }}
            >
              {item.icon}
            </Box>
          </Stack>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: '0.94rem',
              mb: 0.75,
              textWrap: 'balance',
            }}
          >
            {item.title}
          </Typography>
          <Typography
            sx={(theme) => ({
              color: alpha(theme.palette.text.primary, 0.6),
              fontSize: '0.78rem',
              lineHeight: 1.55,
              textWrap: 'balance',
            })}
          >
            {item.body}
          </Typography>
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
      {reposTouched > 0
        ? `${reposTouched} repositories active in 35d. 150+ onboarded total. ~1M lines shipped. 90%+ merge rate at the top.`
        : '150+ repositories. ~1M lines. 90%+ merge rate at the top.'}
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
      backgroundColor: theme.palette.surface.subtle,
      color: theme.palette.text.primary,
      border: `1px solid ${theme.palette.border.medium}`,
      borderTop: `3px solid ${theme.palette.status.merged}`,
      position: 'relative',
      overflow: 'hidden',
      minHeight: 260,
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
          color: alpha(theme.palette.text.primary, 0.62),
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
      sx={{ position: 'relative', zIndex: 1 }}
    >
      <Button
        component="a"
        {...onboardLink}
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
        Miner guide
      </Button>
      <Button
        component="a"
        {...docsLink}
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
        Read docs
      </Button>
    </Stack>
  </Box>
);

export default HomePage;
