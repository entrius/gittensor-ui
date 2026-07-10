import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Box, Stack, Typography } from '@mui/material';
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
  // The site you are on right now — mirror its live dashboard. A page cannot
  // iframe its own URL (recursion protection), so point at /dashboard.
  'entrius/gittensor': `${window.location.origin}/dashboard`,
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

// An https page cannot embed http content (browsers block it as mixed
// content), so embeds always upgrade to https. A site that cannot serve
// https simply fails the live embed and falls back to a screenshot.
const toEmbedUrl = (url: string) => url.replace(/^http:\/\//i, 'https://');

// Backstop for a live embed that fires neither load nor error.
const EMBED_VERIFY_TIMEOUT_MS = 10000;

// Cross-origin live embeds are Chromium-only. Chromium's <object> gives an
// honest verdict (refused/unreachable documents fire error, rendered pages
// fire load — verified empirically). WebKit fires load with a null
// contentDocument for allowed and blocked frames alike, so there is no
// client-side way to tell a live window from a blank refused one; Safari
// gets the screenshot instead. Same-origin embeds are verifiable in every
// browser (the document URL is readable), so the self-mirror stays live.
const IS_CHROMIUM =
  typeof (window as unknown as { chrome?: unknown }).chrome !== 'undefined';

type EmbedState = 'checking' | 'ok' | 'failed';

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

const SiteOverlay: React.FC<{ host: string; live: boolean }> = ({
  host,
  live,
}) => (
  <>
    {live && (
      <Box
        title="Live site"
        sx={(theme) => ({
          position: 'absolute',
          top: 10,
          right: 10,
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: theme.palette.status.merged,
          zIndex: 1,
        })}
      />
    )}
    <Typography
      sx={(theme) => ({
        position: 'absolute',
        bottom: 6,
        right: 8,
        maxWidth: 'calc(100% - 16px)',
        px: 0.75,
        py: 0.25,
        borderRadius: 0.75,
        backgroundColor: alpha(theme.palette.common.black, 0.55),
        color: alpha(theme.palette.common.white, 0.78),
        fontFamily: 'var(--font-accent)',
        fontSize: '0.58rem',
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        zIndex: 1,
        pointerEvents: 'none',
      })}
    >
      {host}
    </Typography>
  </>
);

const RepoCard: React.FC<{ repo: Repository; index: number }> = ({
  repo,
  index,
}) => {
  const website = REPO_WEBSITES[repo.fullName];
  const embedUrl = website ? toEmbedUrl(website) : '';
  const websiteHost = website ? getSiteHost(embedUrl) : '';
  const sameOrigin = Boolean(website) && websiteHost === window.location.host;
  // Chromium-only across the board: WebKit can't verify embeds (see
  // IS_CHROMIUM) and crash-reloads under the self-mirror's nested app.
  const canAttemptEmbed = Boolean(website) && IS_CHROMIUM;

  const [attempt, setAttempt] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [shotTick, setShotTick] = useState(0);
  const [siteShotFailed, setSiteShotFailed] = useState(false);
  const [embedState, setEmbedState] = useState<EmbedState>(
    canAttemptEmbed ? 'checking' : 'failed',
  );
  const [inView, setInView] = useState(false);
  const retryTimerRef = useRef<number | undefined>(undefined);
  const shotTimerRef = useRef<number | undefined>(undefined);
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const embedRef = useRef<HTMLObjectElement | null>(null);

  const embedLive = Boolean(website) && embedState === 'ok';
  const showSiteShot = Boolean(website) && !siteShotFailed;

  // A load event proves rendering on Chromium. For the same-origin mirror
  // the initial about:blank document also fires load, so require the real
  // URL before going live there.
  const handleEmbedLoad = () => {
    if (!sameOrigin) {
      setEmbedState('ok');
      return;
    }
    try {
      const doc = embedRef.current?.contentDocument;
      if (doc && doc.URL !== 'about:blank') setEmbedState('ok');
    } catch {
      /* cross-origin surprise: leave it to the deadline */
    }
  };

  useEffect(
    () => () => {
      window.clearTimeout(retryTimerRef.current);
      window.clearTimeout(shotTimerRef.current);
    },
    [],
  );

  // Only mount the live embed once the card is near the viewport, so
  // verification timers don't start (and fail) for off-screen cards.
  useEffect(() => {
    if (!canAttemptEmbed || inView) return;
    const node = mediaRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canAttemptEmbed, inView]);

  // The live window is an <object>, not an <iframe>, because the browser
  // gives <object> an honest verdict: a document refused by the site
  // (X-Frame-Options / CSP frame-ancestors), blocked as mixed content, or
  // unreachable fires the error event, while a rendered page fires load.
  // An <iframe> deliberately reports all of those identically. Until the
  // load verdict arrives the embed stays hidden behind the screenshot, so
  // a failure can never show a blank card. The timeout is a backstop for
  // an embed that never reports either way.
  useEffect(() => {
    if (!canAttemptEmbed || !inView || embedState !== 'checking') return;
    const deadline = window.setTimeout(() => {
      setEmbedState((current) => (current === 'checking' ? 'failed' : current));
    }, EMBED_VERIFY_TIMEOUT_MS);
    return () => window.clearTimeout(deadline);
  }, [canAttemptEmbed, inView, embedState]);

  // mshots serves a "generating" placeholder on the first request for a
  // site; re-render the image a couple of times so the real screenshot
  // replaces it without a manual reload. Stops once the live embed covers it.
  useEffect(() => {
    if (!showSiteShot || embedLive || shotTick >= 2) return;
    shotTimerRef.current = window.setTimeout(
      () => setShotTick(shotTick + 1),
      5000 * (shotTick + 1) + index * 200,
    );
    return () => window.clearTimeout(shotTimerRef.current);
  }, [showSiteShot, embedLive, shotTick, index]);

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

  const showBackdropShot = showSiteShot && !embedLive;
  const showBackdropOg = !embedLive && !showSiteShot;

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
        ref={mediaRef}
        sx={(theme) => ({
          position: 'relative',
          width: '100%',
          aspectRatio: '2 / 1',
          backgroundColor: alpha(theme.palette.text.primary, 0.03),
          borderBottom: `1px solid ${theme.palette.border.subtle}`,
          overflow: 'hidden',
        })}
      >
        {website && <SiteOverlay host={websiteHost} live={embedLive} />}

        {/* Backdrop: website screenshot → GitHub OG card → repo name. The
            verified live window covers it, so the card never renders blank. */}
        {showBackdropShot ? (
          <Box
            key={shotTick}
            component="img"
            className="repo-card-preview"
            src={getSiteScreenshotSrc(embedUrl)}
            alt={`${websiteHost} screenshot`}
            loading="lazy"
            onError={() => setSiteShotFailed(true)}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
              filter: 'grayscale(1)',
              opacity: 0.88,
              transition: 'filter 0.25s ease, opacity 0.25s ease',
            }}
          />
        ) : showBackdropOg ? (
          imageFailed ? (
            <Box
              sx={(theme) => ({
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                color: alpha(theme.palette.text.primary, 0.3),
                fontFamily: 'var(--font-accent)',
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
          )
        ) : null}

        {/* Live window: mounted once near the viewport, revealed only after
            the browser confirms the site actually rendered in the frame. */}
        {canAttemptEmbed && inView && embedState !== 'failed' && (
          <Box
            className={embedLive ? 'repo-card-preview' : undefined}
            sx={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              filter: 'grayscale(1)',
              opacity: embedLive ? 0.88 : 0,
              transition: 'filter 0.25s ease, opacity 0.4s ease',
              backgroundColor: embedLive ? '#fff' : 'transparent',
              pointerEvents: 'none',
            }}
          >
            <Box
              component="object"
              ref={embedRef}
              type="text/html"
              data={embedUrl}
              aria-label={`${repo.fullName} website`}
              tabIndex={-1}
              onLoad={handleEmbedLoad}
              onError={() => setEmbedState('failed')}
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
              fontFamily: 'var(--font-accent)',
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
              fontFamily: 'var(--font-accent)',
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

const DashboardTimeline = React.lazy(() => import('./dashboard/DashboardPage'));

type Timeline = 'repositories' | 'dashboard';
const TIMELINES: readonly Timeline[] = ['repositories', 'dashboard'];

const HomePage: React.FC = () => {
  const reposQuery = useReposAndWeights();
  const [timeline, setTimeline] = useState<Timeline>('repositories');

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
          maxWidth: timeline === 'dashboard' ? 1680 : 1180,
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
            fontFamily: 'var(--font-accent)',
            fontWeight: 900,
            fontSize: { xs: '2.1rem', sm: '2.7rem' },
            textAlign: 'center',
            lineHeight: 1.1,
            ...fadeUp(40),
          }}
        >
          Gittensor
        </Typography>

        <Stack
          direction="row"
          spacing={0}
          sx={(theme) => ({
            mt: { xs: 2.5, md: 3.5 },
            mx: 'auto',
            width: 'fit-content',
            borderRadius: 1,
            overflow: 'hidden',
            border: `1px solid ${theme.palette.border.light}`,
            ...fadeUp(100),
          })}
        >
          {TIMELINES.map((tab) => (
            <Box
              key={tab}
              onClick={() => setTimeline(tab)}
              sx={(theme) => ({
                px: 2.25,
                py: 0.7,
                cursor: 'pointer',
                fontFamily: 'var(--font-accent)',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                transition: 'all 0.25s ease',
                backgroundColor:
                  timeline === tab
                    ? alpha(theme.palette.status.merged, 0.15)
                    : 'transparent',
                color:
                  timeline === tab
                    ? theme.palette.status.merged
                    : alpha(theme.palette.text.primary, 0.4),
                '&:hover': {
                  backgroundColor:
                    timeline === tab
                      ? alpha(theme.palette.status.merged, 0.15)
                      : alpha(theme.palette.text.primary, 0.06),
                },
              })}
            >
              {tab}
            </Box>
          ))}
        </Stack>

        {timeline === 'repositories' ? (
          <>
            <Typography
              sx={(theme) => ({
                mt: { xs: 3, md: 4.5 },
                mx: 'auto',
                maxWidth: 640,
                color: alpha(theme.palette.text.primary, 0.55),
                fontFamily: 'var(--font-accent)',
                fontSize: '0.72rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textAlign: 'center',
                lineHeight: 1.9,
                ...fadeUp(120),
              })}
            >
              These are the open source projects built by Gittensor.
            </Typography>

            <Box
              sx={{
                mt: { xs: 4, md: 6 },
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
                  fontFamily: 'var(--font-accent)',
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
          </>
        ) : (
          <Box sx={{ mt: { xs: 2, md: 3 } }}>
            <Typography
              sx={(theme) => ({
                mt: { xs: 1, md: 1.5 },
                mx: 'auto',
                maxWidth: 640,
                color: alpha(theme.palette.text.primary, 0.55),
                fontFamily: 'var(--font-accent)',
                fontSize: '0.72rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textAlign: 'center',
                lineHeight: 1.9,
                ...fadeUp(120),
              })}
            >
              This is the work done by Gittensor miners.
            </Typography>
            <React.Suspense
              fallback={
                <Typography
                  sx={(theme) => ({
                    mt: 6,
                    color: theme.palette.text.secondary,
                    fontFamily: 'var(--font-accent)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                  })}
                >
                  Loading dashboard…
                </Typography>
              }
            >
              <DashboardTimeline />
            </React.Suspense>
          </Box>
        )}
      </Box>
    </Page>
  );
};

export default HomePage;
