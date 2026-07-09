import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { LinkBox } from '../components/common/linkBehavior';
import { useReposAndWeights } from '../api';
import { type Repository } from '../api/models/Dashboard';
import { getRepositoryOwnerAvatarSrc } from '../utils/avatar';
import { minerRepositoryPath, parseNumber } from '../utils';

const fadeUp = (delayMs = 0) => ({
  opacity: 0,
  animation: `landingFadeUp 680ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms forwards`,
  '@media (prefers-reduced-motion: reduce)': {
    opacity: 1,
    animation: 'none',
  },
});

const getRepoPreviewSrc = (fullName: string, attempt: number) =>
  `https://opengraph.githubassets.com/1/${fullName}${
    attempt > 0 ? `?retry=${attempt}` : ''
  }`;

// Experiment: show each project's own website in the card instead of the
// GitHub OpenGraph card. Homepages come from the repos' GitHub metadata
// (snapshotted 2026-07-09); repos without a website fall back to the OG image.
const REPO_WEBSITES: Record<string, string> = {
  'gittensor-ai-lab/sparkinfer':
    'https://gittensor-ai-lab.github.io/sparkinfer/dashboard/',
  'JSONbored/metagraphed': 'https://metagraph.sh',
  'gittensor-vanguard/vanguarstew':
    'https://gittensor-vanguard.github.io/vanguarstew/',
  'JSONbored/gittensory': 'https://gittensory.aethereal.dev/',
  'Autovara/kata': 'https://dashboardking.ngrok.app/',
  'Geniepod/genie-claw': 'https://genieclaw.org',
  'vouchdev/vouch': 'https://vouchai.dev',
  'phase-rs/phase': 'http://preview.phase-rs.dev/',
  'imagent-ai/imagent': 'https://tryimagent.com/',
  'mini-router/minirouter': 'https://mini-router.github.io/minirouter/',
  'zeokin/Cuda-Compute-OSS': 'https://zeokin.github.io/Cuda-Compute-Dashboard/',
  'JSONbored/awesome-claude': 'https://heyclau.de',
  'we-promise/sure': 'https://sure.am',
};

// These sites send X-Frame-Options / frame-ancestors and refuse to render in
// an iframe, so they get a website screenshot (WordPress mshots) instead of a
// live window.
const FRAME_BLOCKED_HOSTS = new Set([
  'metagraph.sh',
  'gittensory.aethereal.dev',
  'vouchai.dev',
  'heyclau.de',
  'sure.am',
]);

const getSiteHost = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

const getSiteScreenshotSrc = (url: string) =>
  `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=1280&h=640`;

// GitHub throttles bursts of OpenGraph requests (HTTP 429) when the whole
// grid loads at once, so failed images retry with a staggered backoff.
const MAX_PREVIEW_ATTEMPTS = 4;

const sortByEmissionShare = (repos: Repository[]) =>
  [...repos].sort(
    (a, b) =>
      parseNumber(b.config?.emissionShare ?? 0) -
      parseNumber(a.config?.emissionShare ?? 0),
  );

const CHROME_BAR_HEIGHT = 26;

const SiteChromeBar: React.FC<{ host: string; live: boolean }> = ({
  host,
  live,
}) => (
  <Box
    sx={(theme) => ({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: CHROME_BAR_HEIGHT,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      px: 1.25,
      borderBottom: `1px solid ${theme.palette.border.subtle}`,
      backgroundColor: alpha(theme.palette.text.primary, 0.05),
      zIndex: 1,
    })}
  >
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {[0, 1, 2].map((dot) => (
        <Box
          key={dot}
          sx={(theme) => ({
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.text.primary, 0.16),
          })}
        />
      ))}
    </Box>
    <Typography
      sx={(theme) => ({
        color: theme.palette.text.secondary,
        fontFamily: 'var(--font-mono)',
        fontSize: '0.58rem',
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
        flex: 1,
      })}
    >
      {host}
    </Typography>
    {live && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
        <Box
          sx={(theme) => ({
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: theme.palette.status.merged,
          })}
        />
        <Typography
          sx={(theme) => ({
            color: theme.palette.status.merged,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.55rem',
            letterSpacing: '0.14em',
          })}
        >
          LIVE
        </Typography>
      </Box>
    )}
  </Box>
);

const RepoCard: React.FC<{ repo: Repository; index: number }> = ({
  repo,
  index,
}) => {
  const [attempt, setAttempt] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [shotTick, setShotTick] = useState(0);
  const [siteShotFailed, setSiteShotFailed] = useState(false);
  const retryTimerRef = useRef<number | undefined>(undefined);
  const shotTimerRef = useRef<number | undefined>(undefined);

  const website = REPO_WEBSITES[repo.fullName];
  const websiteHost = website ? getSiteHost(website) : '';
  const canEmbed = Boolean(website) && !FRAME_BLOCKED_HOSTS.has(websiteHost);
  const useSiteShot = Boolean(website) && !canEmbed && !siteShotFailed;

  useEffect(
    () => () => {
      window.clearTimeout(retryTimerRef.current);
      window.clearTimeout(shotTimerRef.current);
    },
    [],
  );

  // mshots serves a "generating" placeholder on the first request for a
  // site; re-render the image a couple of times so the real screenshot
  // replaces it without a manual reload.
  useEffect(() => {
    if (!useSiteShot || shotTick >= 2) return;
    shotTimerRef.current = window.setTimeout(
      () => setShotTick(shotTick + 1),
      5000 * (shotTick + 1) + index * 200,
    );
    return () => window.clearTimeout(shotTimerRef.current);
  }, [useSiteShot, shotTick, index]);

  const handleImageError = () => {
    if (attempt + 1 >= MAX_PREVIEW_ATTEMPTS) {
      setImageFailed(true);
      return;
    }
    retryTimerRef.current = window.setTimeout(
      () => setAttempt(attempt + 1),
      1200 * (attempt + 1) + index * 150,
    );
  };

  return (
    <LinkBox
      href={minerRepositoryPath(repo.fullName)}
      linkState={{ backLabel: 'Back to Home' }}
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: 1.5,
        overflow: 'hidden',
        backgroundColor: theme.palette.surface.subtle,
        transition:
          'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
        ...fadeUp(120 + Math.min(index, 11) * 45),
        '&:hover': {
          borderColor: alpha(theme.palette.text.primary, 0.32),
          transform: 'translateY(-3px)',
          boxShadow: `0 14px 40px ${alpha(theme.palette.common.black, 0.35)}`,
        },
        '&:hover .repo-card-preview': {
          filter: 'grayscale(0)',
          opacity: 1,
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.status.merged}`,
          outlineOffset: 2,
        },
      })}
    >
      <Box
        sx={(theme) => ({
          position: 'relative',
          width: '100%',
          aspectRatio: '2 / 1',
          backgroundColor: alpha(theme.palette.text.primary, 0.03),
          borderBottom: `1px solid ${theme.palette.border.subtle}`,
          overflow: 'hidden',
        })}
      >
        {(canEmbed || useSiteShot) && (
          <SiteChromeBar host={websiteHost} live={canEmbed} />
        )}
        {canEmbed ? (
          <Box
            className="repo-card-preview"
            sx={{
              position: 'absolute',
              top: CHROME_BAR_HEIGHT,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'hidden',
              filter: 'grayscale(1)',
              opacity: 0.88,
              transition: 'filter 0.25s ease, opacity 0.25s ease',
              backgroundColor: '#fff',
            }}
          >
            <Box
              component="iframe"
              src={website}
              title={`${repo.fullName} website`}
              loading="lazy"
              tabIndex={-1}
              sx={{
                width: '400%',
                height: '400%',
                border: 0,
                transform: 'scale(0.25)',
                transformOrigin: 'top left',
                pointerEvents: 'none',
                backgroundColor: '#fff',
              }}
            />
          </Box>
        ) : useSiteShot ? (
          <Box
            key={shotTick}
            component="img"
            className="repo-card-preview"
            src={getSiteScreenshotSrc(website)}
            alt={`${websiteHost} screenshot`}
            loading="lazy"
            onError={() => setSiteShotFailed(true)}
            sx={{
              position: 'absolute',
              top: CHROME_BAR_HEIGHT,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: `calc(100% - ${CHROME_BAR_HEIGHT}px)`,
              objectFit: 'cover',
              objectPosition: 'top',
              filter: 'grayscale(1)',
              opacity: 0.88,
              transition: 'filter 0.25s ease, opacity 0.25s ease',
            }}
          />
        ) : imageFailed ? (
          <Box
            sx={(theme) => ({
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              color: alpha(theme.palette.text.primary, 0.3),
              fontFamily: 'var(--font-heading)',
              fontSize: '1.4rem',
              fontWeight: 900,
            })}
          >
            {repo.name}
          </Box>
        ) : (
          <Box
            key={attempt}
            component="img"
            className="repo-card-preview"
            src={getRepoPreviewSrc(repo.fullName, attempt)}
            alt={`${repo.fullName} preview`}
            loading="lazy"
            onError={handleImageError}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'grayscale(1)',
              opacity: 0.88,
              transition: 'filter 0.25s ease, opacity 0.25s ease',
            }}
          />
        )}
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 1.75,
          py: 1.5,
          minWidth: 0,
        }}
      >
        <Avatar
          src={getRepositoryOwnerAvatarSrc(repo.owner)}
          alt={repo.owner}
          sx={(theme) => ({
            width: 26,
            height: 26,
            border: `1px solid ${theme.palette.border.medium}`,
            flexShrink: 0,
          })}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: '1.02rem',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {repo.name}
          </Typography>
          <Typography
            sx={(theme) => ({
              color: theme.palette.text.secondary,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.64rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            })}
          >
            {repo.owner}
          </Typography>
        </Box>
      </Box>
    </LinkBox>
  );
};

const RepoCardSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <Box
    sx={(theme) => ({
      border: `1px solid ${theme.palette.border.subtle}`,
      borderRadius: 1.5,
      overflow: 'hidden',
      backgroundColor: theme.palette.surface.subtle,
      ...fadeUp(120 + index * 45),
    })}
  >
    <Box
      sx={(theme) => ({
        width: '100%',
        aspectRatio: '2 / 1',
        backgroundColor: alpha(theme.palette.text.primary, 0.045),
      })}
    />
    <Box sx={{ px: 1.75, py: 1.5, display: 'flex', gap: 1.25 }}>
      <Box
        sx={(theme) => ({
          width: 26,
          height: 26,
          borderRadius: '50%',
          backgroundColor: alpha(theme.palette.text.primary, 0.07),
        })}
      />
      <Box>
        <Box
          sx={(theme) => ({
            width: 120,
            height: 12,
            borderRadius: 0.5,
            backgroundColor: alpha(theme.palette.text.primary, 0.07),
          })}
        />
        <Box
          sx={(theme) => ({
            mt: 0.75,
            width: 72,
            height: 8,
            borderRadius: 0.5,
            backgroundColor: alpha(theme.palette.text.primary, 0.05),
          })}
        />
      </Box>
    </Box>
  </Box>
);

const HomePage: React.FC = () => {
  const reposQuery = useReposAndWeights();

  const repos = useMemo(
    () => sortByEmissionShare(reposQuery.data ?? []),
    [reposQuery.data],
  );

  return (
    <Page title="Home">
      <SEO
        title="Autonomous software development"
        description="A permissionless market of miners on Bittensor Subnet 74. Explore every project the network is building."
        type="website"
      />
      <Box
        sx={{
          width: '100%',
          maxWidth: 1180,
          mx: 'auto',
          px: { xs: 1.5, sm: 3 },
          py: { xs: 4, md: 7 },
          '@keyframes landingFadeUp': {
            '0%': { opacity: 0, transform: 'translateY(18px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: { xs: '1.9rem', sm: '2.4rem' },
            textAlign: 'center',
            lineHeight: 1.1,
            ...fadeUp(40),
          }}
        >
          Gittensor Repositories
        </Typography>
        <Typography
          sx={(theme) => ({
            mt: { xs: 3, md: 4.5 },
            mx: 'auto',
            maxWidth: 640,
            color: alpha(theme.palette.text.primary, 0.55),
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 1.9,
            ...fadeUp(120),
          })}
        >
          These are the open source projects tracked by Gittensor. Miners,
          increasingly AI agents, continuously improve them; validators score
          the merged work and emissions follow.
        </Typography>

        <Box
          sx={{
            mt: { xs: 5, md: 8 },
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
            },
            gap: { xs: 2, md: 2.5 },
          }}
        >
          {reposQuery.isLoading
            ? Array.from({ length: 9 }, (_, index) => (
                <RepoCardSkeleton key={index} index={index} />
              ))
            : repos.map((repo, index) => (
                <RepoCard key={repo.fullName} repo={repo} index={index} />
              ))}
        </Box>

        {!reposQuery.isLoading && repos.length === 0 && (
          <Typography
            sx={(theme) => ({
              mt: 6,
              color: theme.palette.text.secondary,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textAlign: 'center',
            })}
          >
            {reposQuery.isError
              ? 'Repository list is unavailable right now.'
              : 'No tracked repositories returned.'}
          </Typography>
        )}
      </Box>
    </Page>
  );
};

export default HomePage;
