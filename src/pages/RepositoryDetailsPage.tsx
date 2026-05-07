import React, {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/format';
import { getRepositoryOwnerAvatarSrc } from '../utils/avatar';
import {
  Alert,
  Box,
  Tab,
  Tabs,
  Typography,
  Button,
  Container,
  CircularProgress,
  Grid,
  Chip,
  Avatar,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import CodeIcon from '@mui/icons-material/Code';
import BugReportIcon from '@mui/icons-material/BugReport';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import ArticleIcon from '@mui/icons-material/Article';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { RANK_COLORS, STATUS_COLORS } from '../theme';
import { Page } from '../components/layout';
import { useReposAndWeights, useRepoBountySummary } from '../api';
import {
  RepositoryContributorsTable,
  RepositoryPRsTable,
  RepositoryIssuesTable,
  BackButton,
  SEO,
  RepositoryCodeBrowser,
  ReadmeViewer,
  RepositoryStats,
  ContributingViewer,
  RepositoryMaintainers,
  RepositoryCheckTab,
  WatchlistButton,
} from '../components';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const mobileRepoTitleFontSx = {
  fontWeight: 700,
  fontSize: 'clamp(1.45rem, 5.5vw, 1.9rem)',
  lineHeight: 1.25,
  color: 'text.primary',
  m: 0,
};

const repoDetailTabsSx = {
  '& .MuiTab-root': {
    color: STATUS_COLORS.open,
    fontFamily: (theme: Theme) => theme.typography.fontFamily,
    textTransform: 'none',
    fontWeight: 500,
    minHeight: '48px',
    fontSize: '14px',
    '&.Mui-selected': {
      color: 'text.primary',
      fontWeight: 600,
    },
  },
  '& .MuiTabs-indicator': {
    backgroundColor: 'primary.main',
    height: '3px',
    borderRadius: '3px 3px 0 0',
  },
} as const;

/** Full path when it fits; otherwise …/repo-name only (never …rius/gittensor). */
const MobileRepoHeading = memo(function MobileRepoHeading({
  repo,
}: {
  repo: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureFullRef = useRef<HTMLSpanElement>(null);
  const [preferSuffixOnly, setPreferSuffixOnly] = useState(false);

  const slash = repo.indexOf('/');
  const suffixOnlyLabel = slash >= 0 ? `\u2026${repo.slice(slash)}` : repo;

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    if (slash < 0) {
      setPreferSuffixOnly(false);
      return;
    }

    const measure = measureFullRef.current;
    if (!measure) return;

    const update = () => {
      const fullWidth = measure.scrollWidth;
      const available = wrap.clientWidth;
      const next = fullWidth > available;
      setPreferSuffixOnly((prev) => (prev === next ? prev : next));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [repo, slash]);

  const displayText =
    slash < 0 ? repo : preferSuffixOnly ? suffixOnlyLabel : repo;

  return (
    <Box sx={{ width: '100%', minWidth: 0, position: 'relative' }}>
      {slash >= 0 ? (
        <Typography
          ref={measureFullRef}
          variant="h4"
          component="span"
          aria-hidden
          sx={{
            ...mobileRepoTitleFontSx,
            fontFamily: (theme) => theme.typography.fontFamily,
            position: 'absolute',
            visibility: 'hidden',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            left: 0,
            top: 0,
          }}
        >
          {repo}
        </Typography>
      ) : null}

      <Box ref={wrapRef} aria-label={repo} title={repo} sx={{ minWidth: 0 }}>
        <Typography
          variant="h4"
          component="div"
          role="heading"
          aria-level={1}
          sx={{
            ...mobileRepoTitleFontSx,
            fontFamily: (theme) => theme.typography.fontFamily,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayText}
        </Typography>
      </Box>
    </Box>
  );
});

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`repo-tabpanel-${index}`}
      aria-labelledby={`repo-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 1 }}>{children}</Box>}
    </div>
  );
}

/** Synced to the `tab` query param so back navigation from PR details restores the active tab. */
const REPO_TAB_KEYS = [
  'readme',
  'code',
  'issues',
  'pull-requests',
  'contributing',
  'repo-check',
] as const;

function tabIndexFromSearchParam(tab: string | null): number {
  if (!tab) return 0;
  const idx = REPO_TAB_KEYS.indexOf(tab as (typeof REPO_TAB_KEYS)[number]);
  return idx >= 0 ? idx : 0;
}

const RepositoryDetailsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const repo = searchParams.get('name');
  const tabValue = tabIndexFromSearchParam(searchParams.get('tab'));
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const { data: bountySummary } = useRepoBountySummary(repo || '');
  const trackedRepo = repos?.find(
    (r) => r.fullName.toLowerCase() === (repo ?? '').toLowerCase(),
  );
  const isTrackedRepository = Boolean(trackedRepo);

  const theme = useTheme();
  const isBelowMd = useMediaQuery(theme.breakpoints.down('md'));

  const owner = repo ? repo.split('/')[0] : '';

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!repo) return next;
          next.set('name', repo);
          if (newValue === 0) {
            next.delete('tab');
          } else {
            next.set('tab', REPO_TAB_KEYS[newValue]);
          }
          return next;
        },
        { replace: true },
      );
    },
    [repo, setSearchParams],
  );

  const statusChips = useMemo(() => {
    const inactiveAt = trackedRepo?.inactiveAt;
    const inactiveLabel = inactiveAt
      ? `Inactive since ${formatDate(inactiveAt)}`
      : null;

    return (
      <>
        <Chip variant="info" label="Public" />
        <Chip
          label="Tracked"
          sx={{
            backgroundColor: alpha(STATUS_COLORS.success, 0.15),
            color: 'status.success',
            border: `1px solid ${alpha(STATUS_COLORS.success, 0.35)}`,
            fontSize: '0.75rem',
            height: '24px',
            fontWeight: 600,
          }}
        />
        {inactiveLabel ? (
          <Chip
            label={inactiveLabel}
            sx={{
              backgroundColor: alpha(STATUS_COLORS.error, 0.1),
              color: 'status.error',
              border: `1px solid ${alpha(STATUS_COLORS.error, 0.3)}`,
              fontSize: '0.75rem',
              height: '24px',
              fontWeight: 600,
            }}
          />
        ) : null}
      </>
    );
  }, [trackedRepo?.inactiveAt]);

  const issuesTabLabel = useMemo(() => {
    const openBounties =
      bountySummary &&
      bountySummary.totalBounties - bountySummary.completedBounties > 0
        ? bountySummary.totalBounties - bountySummary.completedBounties
        : 0;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Issues
        {openBounties > 0 ? (
          <Box
            component="span"
            sx={{
              backgroundColor: alpha(RANK_COLORS.first, 0.15),
              color: RANK_COLORS.first,
              border: `1px solid ${alpha(RANK_COLORS.first, 0.3)}`,
              fontSize: '0.65rem',
              fontWeight: 700,
              px: 0.8,
              py: 0.1,
              borderRadius: '10px',
              fontFamily: '"JetBrains Mono", monospace',
              lineHeight: 1.4,
            }}
          >
            {openBounties} {openBounties === 1 ? 'bounty' : 'bounties'}
          </Box>
        ) : null}
      </Box>
    );
  }, [bountySummary]);

  // If no repo is provided, redirect to repository list (registered route)
  if (!repo) {
    navigate('/repositories', { replace: true });
    return null;
  }

  if (isLoadingRepos) {
    return (
      <Page title={`Repository - ${repo} `}>
        <Container maxWidth="xl" sx={{ py: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={36} />
          </Box>
        </Container>
      </Page>
    );
  }

  if (!isTrackedRepository) {
    return (
      <Page title={`Repository - ${repo} `}>
        <SEO
          title={`Repository - ${repo} `}
          description={`View code, issues, PRs, and contributors for ${repo} on Gittensor.`}
        />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <BackButton to="/repositories" label="Back to Repositories" />
          <Alert
            severity="warning"
            sx={(theme) => ({
              mt: 2,
              backgroundColor: alpha(STATUS_COLORS.warningOrange, 0.08),
              border: '1px solid',
              borderColor: alpha(STATUS_COLORS.warningOrange, 0.3),
              color: alpha(theme.palette.text.primary, 0.8),
              '& .MuiAlert-icon': { color: theme.palette.status.warningOrange },
            })}
          >
            <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
              This repository is not tracked by Gittensor.
            </Typography>
            <Typography sx={{ fontSize: '0.9rem' }}>
              The repository details view is only available for tracked
              repositories listed on the Repositories page.
            </Typography>
          </Alert>
        </Container>
      </Page>
    );
  }

  return (
    <Page title={`Repository - ${repo} `}>
      <SEO
        title={`Repository - ${repo} `}
        description={`View code, issues, PRs, and contributors for ${repo} on Gittensor.`}
      />

      {/* Header Section */}
      <Box
        sx={(theme) => ({
          borderBottom: '1px solid',
          borderColor: theme.palette.border.light,
          backgroundColor: theme.palette.surface.subtle,
        })}
      >
        <Container maxWidth="xl">
          <Box sx={{ pt: { xs: 1.5, md: 3 }, pb: 0 }}>
            <Box sx={{ mb: { xs: 0, md: 2 } }}>
              <BackButton
                to="/repositories"
                label="Back to Repositories"
                mb={0}
              />
            </Box>

            <Grid
              container
              spacing={{ xs: 2, md: 4 }}
              sx={{ mt: { xs: 0.5, md: 1 }, mb: { xs: 2, md: 3 } }}
              alignItems="center"
            >
              <Grid item xs={12} md={8}>
                {/* Mobile only — desktop layout unchanged below */}
                <Box sx={{ display: { xs: 'block', md: 'none' }, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'stretch',
                      gap: 2,
                      minWidth: 0,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Avatar
                        src={getRepositoryOwnerAvatarSrc(owner)}
                        alt=""
                        variant="rounded"
                        imgProps={{ loading: 'lazy', decoding: 'async' }}
                        sx={(theme) => ({
                          width: 40,
                          height: 40,
                          borderRadius: '4px',
                          border: 'none',
                          outline: 'none',
                          boxShadow: 'none',
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          '& img': {
                            objectFit: 'cover',
                            filter: 'none',
                            boxShadow: 'none',
                          },
                          backgroundColor:
                            owner === 'opentensor'
                              ? theme.palette.text.primary
                              : owner === 'bitcoin'
                                ? theme.palette.status.warningOrange
                                : 'surface.subtle',
                          color:
                            owner === 'opentensor' || owner === 'bitcoin'
                              ? theme.palette.background.default
                              : 'text.secondary',
                        })}
                      >
                        {(owner.slice(0, 2) || '?').toUpperCase()}
                      </Avatar>
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          minWidth: 0,
                          flex: '1 1 auto',
                        }}
                      >
                        <MobileRepoHeading repo={repo} />
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <WatchlistButton category="repos" itemKey={repo} />
                        {statusChips}
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Desktop (md+) — original single-row header */}
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={getRepositoryOwnerAvatarSrc(owner)}
                      variant="rounded"
                      sx={(theme) => ({
                        width: 32,
                        height: 32,
                        borderRadius: '4px',
                        backgroundColor:
                          owner === 'opentensor'
                            ? theme.palette.text.primary
                            : owner === 'bitcoin'
                              ? theme.palette.status.warningOrange
                              : theme.palette.surface.transparent,
                      })}
                    />
                    <Typography
                      variant="h4"
                      sx={(theme) => ({
                        fontFamily: theme.typography.fontFamily,
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                      })}
                    >
                      {repo}
                    </Typography>
                    <WatchlistButton category="repos" itemKey={repo} />
                    {statusChips}
                  </Box>
                </Box>
              </Grid>
              <Grid
                item
                xs={12}
                md={4}
                sx={{
                  display: 'flex',
                  justifyContent: { xs: 'stretch', md: 'flex-end' },
                }}
              >
                <Button
                  variant="outlined"
                  startIcon={<GitHubIcon />}
                  href={`https://github.com/${repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={(theme) => ({
                    borderColor: theme.palette.border.medium,
                    color: theme.palette.text.primary,
                    width: { xs: '100%', md: 'auto' },
                    '&:hover': { borderColor: theme.palette.primary.main },
                  })}
                >
                  View on GitHub
                </Button>
              </Grid>
            </Grid>

            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="repository tabs"
              variant={isBelowMd ? 'scrollable' : 'standard'}
              scrollButtons={isBelowMd ? 'auto' : false}
              allowScrollButtonsMobile={isBelowMd}
              sx={repoDetailTabsSx}
            >
              <Tab
                icon={<ArticleIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />}
                iconPosition="start"
                label="Readme"
                disableRipple
              />
              <Tab
                icon={<CodeIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />}
                iconPosition="start"
                label="Code"
                disableRipple
              />
              <Tab
                icon={<BugReportIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />}
                iconPosition="start"
                label={issuesTabLabel}
                disableRipple
              />
              <Tab
                icon={<MergeTypeIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />}
                iconPosition="start"
                label="Pull Requests"
                disableRipple
              />
              <Tab
                icon={
                  <VolunteerActivismIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />
                }
                iconPosition="start"
                label="Contributing"
                disableRipple
              />
              <Tab
                icon={<FactCheckIcon sx={{ fontSize: 16, mb: 0, mr: 1 }} />}
                iconPosition="start"
                label="Repo Check"
                disableRipple
              />
            </Tabs>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ pb: 8, pt: 1 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={9}>
            {/* Readme Tab */}
            <CustomTabPanel value={tabValue} index={0}>
              <ReadmeViewer repositoryFullName={repo} />
            </CustomTabPanel>

            {/* Code Tab */}
            <CustomTabPanel value={tabValue} index={1}>
              <RepositoryCodeBrowser repositoryFullName={repo} />
            </CustomTabPanel>

            {/* Issues Tab */}
            <CustomTabPanel value={tabValue} index={2}>
              <RepositoryIssuesTable repositoryFullName={repo} />
            </CustomTabPanel>

            {/* Pull Requests Tab */}
            <CustomTabPanel value={tabValue} index={3}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={12}>
                  <RepositoryPRsTable repositoryFullName={repo} state="all" />
                </Grid>
              </Grid>
            </CustomTabPanel>

            {/* Contributing Tab */}
            <CustomTabPanel value={tabValue} index={4}>
              <ContributingViewer repositoryFullName={repo} />
            </CustomTabPanel>

            {/* Repo Check Tab */}
            <CustomTabPanel value={tabValue} index={5}>
              <RepositoryCheckTab repositoryFullName={repo} />
            </CustomTabPanel>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={3}>
            <Box sx={{ position: 'sticky', top: 24 }}>
              <Box sx={{ pt: 0 }}>
                {/* Repository Stats */}
                <RepositoryStats repositoryFullName={repo} />

                {/* Maintainers */}
                <RepositoryMaintainers repositoryFullName={repo} />

                {/* Contributors Table - it already has its own title "Top Miner Contributors" */}
                <RepositoryContributorsTable repositoryFullName={repo} />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Page>
  );
};

export default RepositoryDetailsPage;
