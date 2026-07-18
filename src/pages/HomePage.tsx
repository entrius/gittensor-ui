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
import repoWebsitesSnapshot from '../generated/repoWebsites.json';

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

// Show each project's own website in the card instead of the GitHub
// OpenGraph card. Homepages come from the repos' GitHub metadata, snapshotted
// into repoWebsites.json by scripts/fetch-repo-websites.mjs on every build
// (the `prebuild` hook), so a project adding or changing its GitHub website
// is picked up on the next deploy. Repos without one fall back to the OG
// image.
const REPO_WEBSITES: Record<string, string> = {
  ...repoWebsitesSnapshot,
  // The site you are on right now — mirror its live dashboard. A page cannot
  // iframe its own URL (recursion protection), so point at /dashboard. This
  // stays in code (not the snapshot): the mirror must be same-origin on every
  // deploy target, and it must win even if the repo sets a GitHub homepage.
  'entrius/gittensor': `${window.location.origin}/dashboard`,
};

// An https page cannot embed http content (browsers block it as mixed
// content), so on https embed URLs upgrade to https; a site that cannot
// serve https then fails the live embed and falls back to a screenshot. On
// an http origin (local dev) the original scheme is kept — http-in-http is
// allowed, and upgrading would break the same-origin dashboard mirror.
const toEmbedUrl = (url: string) =>
  window.location.protocol === 'https:'
    ? url.replace(/^http:\/\//i, 'https://')
    : url;

// Backstop for an embed that fires neither load nor error (both are wired
// natively below); generous so slow hosts still get to go live.
const EMBED_VERIFY_TIMEOUT_MS = 30000;

// Live embeds are Blink-only. Blink's <object> gives an honest verdict
// (refused/unreachable documents fire error, rendered pages fire load —
// verified empirically). WebKit fires load with a null contentDocument for
// allowed and blocked frames alike, so a live window is indistinguishable
// from a blank refused one; it also crash-reloaded under a page of embeds.
// Gecko is unverified, so it is excluded too; both get screenshots.
// navigator.userAgentData only exists in Blink browsers — notably it is
// absent in iOS Chrome, which is WebKit and would false-positive a
// window.chrome sniff.
const IS_CHROMIUM = Boolean(
  (
    navigator as Navigator & {
      userAgentData?: { brands?: Array<{ brand: string }> };
    }
  ).userAgentData?.brands?.some((entry) => entry.brand === 'Chromium'),
);

// Once verified, the visible/interactive window is a sandboxed <iframe>
// (no allow-top-navigation), so a listed site can never navigate the whole
// app away; <object> cannot carry a sandbox, so it is used only as the
// hidden verifier.
const EMBED_IFRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups';

// The embed renders a desktop-ish viewport scaled down into the card.
const EMBED_ZOOM = 0.25;
const EMBED_SIZE = `${100 / EMBED_ZOOM}%`;

// The visible iframe reloads the site from scratch after verification, so
// revealing it immediately shows a blank window booting up (worst on slow
// hosts with entrance animations, e.g. kata via ngrok). Instead it loads
// hidden behind the backdrop and fades in only after its load event plus a
// grace period that lets intro animations finish off-screen.
const LIVE_REVEAL_GRACE_MS = 1800;

// mshots returns a "generating…" placeholder on the first request for a
// URL; remount the image a couple of times so the real shot swaps in.
const SHOT_REFRESH_MAX = 2;
const SHOT_REFRESH_BASE_MS = 5000;
const SHOT_REFRESH_STAGGER_MS = 200;

type EmbedState = 'checking' | 'ok' | 'failed';

// Preview images (OG cards, screenshots) pop in raw whenever their request
// happens to finish, which makes the loading phase feel chaotic. This wraps
// them so each one fades in on load instead; PREVIEW_MEDIA_SX already
// carries the opacity transition.
const PreviewImg: React.FC<{
  className?: string;
  src: string;
  alt: string;
  onError?: () => void;
  sx: object;
}> = ({ sx, onError, ...imgProps }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <Box
      component="img"
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={onError}
      {...imgProps}
      sx={{ ...sx, opacity: loaded ? 1 : 0 }}
    />
  );
};

// Shared look for every card preview surface (screenshot, OG image, live
// window): grayscale until the card is hovered. Full opacity + a contrast
// lift, not a dim: the sites are mostly dark-on-dark, so dimming melts them
// into the page while contrast keeps each one's structure legible.
const PREVIEW_MEDIA_SX = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  filter: 'grayscale(1) contrast(1.14) brightness(1.08)',
  transition: 'filter 0.25s ease, opacity 0.25s ease',
} as const;

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

const SiteOverlay: React.FC<{ host: string }> = ({ host }) => (
  <Typography
    className="repo-card-host"
    sx={(theme) => ({
      position: 'absolute',
      bottom: 6,
      right: 8,
      opacity: 0,
      transition: 'opacity 0.2s ease',
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
);

const RepoCard: React.FC<{ repo: Repository; index: number }> = ({
  repo,
  index,
}) => {
  const website = REPO_WEBSITES[repo.fullName];
  const embedUrl = website ? toEmbedUrl(website) : '';
  const websiteHost = website ? getSiteHost(embedUrl) : '';
  const sameOrigin = Boolean(website) && websiteHost === window.location.host;
  const canAttemptEmbed = Boolean(website) && IS_CHROMIUM;

  const [attempt, setAttempt] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [shotTick, setShotTick] = useState(0);
  const [siteShotFailed, setSiteShotFailed] = useState(false);
  const [embedState, setEmbedState] = useState<EmbedState>(
    canAttemptEmbed ? 'checking' : 'failed',
  );
  const [inView, setInView] = useState(false);
  const [liveShown, setLiveShown] = useState(false);
  const retryTimerRef = useRef<number | undefined>(undefined);
  const shotTimerRef = useRef<number | undefined>(undefined);
  const revealTimerRef = useRef<number | undefined>(undefined);
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const embedRef = useRef<HTMLObjectElement | null>(null);

  const embedLive = embedState === 'ok';
  // The screenshot is fetched only when it will actually be seen: right
  // away in browsers that never attempt embeds, otherwise only after the
  // embed failed — verified-live cards fire no mshots requests, and the
  // screenshot always targets the site's declared URL (mshots fetches
  // server-side, so the mixed-content upgrade is irrelevant to it).
  const showSiteShot =
    Boolean(website) &&
    !siteShotFailed &&
    (!canAttemptEmbed || embedState === 'failed');

  useEffect(
    () => () => {
      window.clearTimeout(retryTimerRef.current);
      window.clearTimeout(shotTimerRef.current);
      window.clearTimeout(revealTimerRef.current);
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

  // Verdict listeners are attached natively: react-dom wires only the load
  // event for <object>/<iframe>/<embed>, and error does not bubble, so an
  // onError prop would silently never fire. A load event proves rendering
  // (see IS_CHROMIUM); the same-origin mirror also fires load for its
  // initial about:blank, so it must report a real document URL first. The
  // deadline reaps embeds that never report either way.
  useEffect(() => {
    if (!canAttemptEmbed || !inView || embedState !== 'checking') return;
    const node = embedRef.current;
    if (!node) return;

    const handleLoad = () => {
      if (!sameOrigin) {
        setEmbedState('ok');
        return;
      }
      try {
        const doc = node.contentDocument;
        if (doc && doc.URL !== 'about:blank') setEmbedState('ok');
      } catch {
        /* unexpectedly cross-origin: let the deadline decide */
      }
    };
    const handleError = () => setEmbedState('failed');

    node.addEventListener('load', handleLoad);
    node.addEventListener('error', handleError);
    const deadline = window.setTimeout(
      () => setEmbedState('failed'),
      EMBED_VERIFY_TIMEOUT_MS,
    );
    return () => {
      node.removeEventListener('load', handleLoad);
      node.removeEventListener('error', handleError);
      window.clearTimeout(deadline);
    };
  }, [canAttemptEmbed, inView, embedState, sameOrigin]);

  // Remount the screenshot a couple of times so the real shot replaces the
  // mshots "generating…" placeholder without a manual reload.
  useEffect(() => {
    if (!showSiteShot || shotTick >= SHOT_REFRESH_MAX) return;
    shotTimerRef.current = window.setTimeout(
      () => setShotTick(shotTick + 1),
      SHOT_REFRESH_BASE_MS * (shotTick + 1) + index * SHOT_REFRESH_STAGGER_MS,
    );
    return () => window.clearTimeout(shotTimerRef.current);
  }, [showSiteShot, shotTick, index]);

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

  const showBackdropOg = !embedLive && (!website || siteShotFailed);

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
        // The host pill only matters while the preview is being inspected;
        // at rest it would be one more repeated element muddying the grid.
        // Touch devices never hover, so they keep it visible.
        '&:hover .repo-card-host': {
          opacity: 1,
        },
        '@media (hover: none)': {
          '& .repo-card-host': {
            opacity: 1,
          },
        },
        // Hovering a live card hands the pointer to the embedded site so it
        // can be scrolled and browsed like a real window; the footer below
        // the preview stays the link to the repo page. Mouse-like pointers
        // only: on touch, sticky :hover would swallow the tap that should
        // follow the card link.
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover .repo-card-embed': {
            pointerEvents: 'auto',
          },
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
        {website && (liveShown || showSiteShot) && (
          <SiteOverlay host={websiteHost} />
        )}

        {/* Name plate: the instant base layer of every card. Previews fade
            in over it, so the media area never sits as an empty void while
            an embed verifies or an image loads — and it doubles as the
            terminal fallback when every preview source fails. */}
        <Box
          sx={(theme) => ({
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            px: 2,
            textAlign: 'center',
            color: alpha(theme.palette.text.primary, 0.3),
            fontFamily: 'var(--font-accent)',
            fontSize: '1.4rem',
            fontWeight: 900,
          })}
        >
          {repo.name}
        </Box>

        {/* Preview: website screenshot → GitHub OG card, fading in over the
            name plate; the verified live window covers everything. */}
        {!liveShown &&
          (showSiteShot ? (
            <PreviewImg
              key={shotTick}
              className="repo-card-preview"
              src={getSiteScreenshotSrc(website)}
              alt={`${websiteHost} screenshot`}
              onError={() => setSiteShotFailed(true)}
              sx={{ ...PREVIEW_MEDIA_SX, objectPosition: 'top' }}
            />
          ) : showBackdropOg && !imageFailed ? (
            <PreviewImg
              key={attempt}
              className="repo-card-preview"
              src={getRepoPreviewSrc(repo.fullName, attempt)}
              alt={`${repo.fullName} preview`}
              onError={handleImageError}
              sx={PREVIEW_MEDIA_SX}
            />
          ) : null)}

        {/* Hidden verifier: mounted once near the viewport, unmounted as
            soon as a verdict arrives (see the verification effect). */}
        {canAttemptEmbed && inView && embedState === 'checking' && (
          <Box
            component="object"
            ref={embedRef}
            type="text/html"
            data={embedUrl}
            aria-hidden
            tabIndex={-1}
            sx={{
              position: 'absolute',
              inset: 0,
              border: 0,
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Live window: mounted after verification as a sandboxed iframe so
            the embedded site can never navigate the app away (an <object>
            cannot carry a sandbox attribute). It loads hidden behind the
            backdrop and fades in LIVE_REVEAL_GRACE_MS after its load event,
            so slow hosts and entrance animations never show a blank window
            booting up. The hover classes attach only once it is shown —
            otherwise hovering would force the half-loaded window visible. */}
        {embedLive && (
          <Box
            className={
              liveShown ? 'repo-card-preview repo-card-embed' : undefined
            }
            sx={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              filter: 'grayscale(1) contrast(1.14) brightness(1.08)',
              opacity: liveShown ? 1 : 0,
              transition: 'filter 0.25s ease, opacity 0.35s ease',
              backgroundColor: '#fff',
              pointerEvents: 'none',
            }}
          >
            <Box
              component="iframe"
              src={embedUrl}
              title={`${repo.fullName} website`}
              sandbox={EMBED_IFRAME_SANDBOX}
              tabIndex={-1}
              onLoad={(event: React.SyntheticEvent<HTMLIFrameElement>) => {
                if (liveShown || revealTimerRef.current !== undefined) return;
                // The same-origin mirror fires load for its initial
                // about:blank too; wait for the real document (see the
                // verifier's load handler above).
                if (sameOrigin) {
                  try {
                    const doc = event.currentTarget.contentDocument;
                    if (!doc || doc.URL === 'about:blank') return;
                  } catch {
                    return;
                  }
                }
                revealTimerRef.current = window.setTimeout(
                  () => setLiveShown(true),
                  LIVE_REVEAL_GRACE_MS,
                );
              }}
              sx={{
                width: EMBED_SIZE,
                height: EMBED_SIZE,
                border: 0,
                transform: `scale(${EMBED_ZOOM})`,
                transformOrigin: 'top left',
                backgroundColor: '#fff',
              }}
            />
          </Box>
        )}
      </Box>
      {/* Caption, not header: the preview above is the card's subject, so
          this line stays quiet — one row, small type, dimmed org. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1.125,
          minWidth: 0,
        }}
      >
        <Avatar
          className="repo-card-preview"
          src={getRepositoryOwnerAvatarSrc(repo.owner)}
          alt={repo.owner}
          sx={{
            width: 18,
            height: 18,
            flexShrink: 0,
            filter: 'grayscale(1)',
            opacity: 0.7,
            transition: 'filter 0.25s ease, opacity 0.25s ease',
          }}
        />
        <Typography
          sx={(theme) => ({
            fontFamily: 'var(--font-accent)',
            fontSize: '0.82rem',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            color: theme.palette.text.secondary,
          })}
        >
          <Box component="span" sx={{ opacity: 0.6 }}>
            {repo.owner}
            {' / '}
          </Box>
          <Box
            component="span"
            sx={(theme) => ({
              fontWeight: 600,
              color: theme.palette.text.primary,
            })}
          >
            {repo.name}
          </Box>
        </Typography>
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
    <Box
      sx={{ px: 1.5, py: 1.125, display: 'flex', alignItems: 'center', gap: 1 }}
    >
      <Box
        sx={(theme) => ({
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: alpha(theme.palette.text.primary, 0.07),
        })}
      />
      <Box
        sx={(theme) => ({
          width: 140,
          height: 10,
          borderRadius: 0.5,
          backgroundColor: alpha(theme.palette.text.primary, 0.07),
        })}
      />
    </Box>
  </Box>
);

const DashboardTimeline = React.lazy(() => import('./dashboard/DashboardPage'));

type Timeline = 'repositories' | 'dashboard';

// A left/right dial button; grayed out when the dial can't turn that way
// (the word that direction is already showing).
const DialArrow: React.FC<{
  dir: 'left' | 'right';
  active: Timeline;
  onTurn: (dir: 'left' | 'right') => void;
}> = ({ dir, active, onTurn }) => {
  const target: Timeline = dir === 'right' ? 'dashboard' : 'repositories';
  const enabled = target !== active;
  return (
    <Box
      component="span"
      role="button"
      tabIndex={enabled ? 0 : -1}
      aria-disabled={!enabled}
      title={enabled ? `Switch to ${target}` : undefined}
      onClick={() => onTurn(dir)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTurn(dir);
        }
      }}
      sx={(theme) => ({
        fontSize: '0.8rem',
        lineHeight: 1,
        px: 0.5,
        cursor: enabled ? 'pointer' : 'default',
        color: alpha(theme.palette.text.primary, enabled ? 0.45 : 0.14),
        transition: 'color 0.2s ease',
        ...(enabled && {
          '&:hover': {
            color: alpha(theme.palette.text.primary, 0.85),
          },
        }),
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.status.merged}`,
          outlineOffset: 2,
          borderRadius: 0.75,
        },
      })}
    >
      {dir === 'left' ? '‹' : '›'}
    </Box>
  );
};

// Branded curtain shown once per tab session while the repo list loads: a
// short, honest beat (NN/g-style indeterminate wait, well under the ~10s
// bar) that lifts into the grid in one coordinated reveal instead of
// content trickling in. Hard-capped so a slow or failed request can never
// hold the page hostage.
const CURTAIN_SESSION_KEY = 'gt-landing-curtain-shown';
const CURTAIN_MIN_MS = 700;
const CURTAIN_MAX_MS = 2500;
const CURTAIN_FADE_MS = 400;

const Curtain: React.FC<{ leaving: boolean }> = ({ leaving }) => (
  <Box
    aria-hidden
    sx={(theme) => ({
      position: 'fixed',
      inset: 0,
      zIndex: theme.zIndex.modal + 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2.5,
      backgroundColor: '#000',
      opacity: leaving ? 0 : 1,
      transition: `opacity ${CURTAIN_FADE_MS}ms ease`,
      pointerEvents: leaving ? 'none' : 'auto',
      '@keyframes curtainDot': {
        '0%, 80%, 100%': { opacity: 0.15 },
        '40%': { opacity: 0.85 },
      },
    })}
  >
    <Typography
      sx={{
        fontFamily: 'var(--font-accent)',
        fontWeight: 900,
        fontSize: { xs: '2.1rem', sm: '2.7rem' },
        lineHeight: 1.1,
        color: '#fff',
      }}
    >
      Gittensor
    </Typography>
    <Box sx={{ display: 'flex', gap: 1 }}>
      {[0, 1, 2].map((dot) => (
        <Box
          key={dot}
          sx={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: '#fff',
            opacity: 0.15,
            animation: `curtainDot 1.2s ease-in-out ${dot * 0.2}s infinite`,
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              opacity: 0.5,
            },
          }}
        />
      ))}
    </Box>
  </Box>
);

const HomePage: React.FC = () => {
  const reposQuery = useReposAndWeights();
  const [timeline, setTimeline] = useState<Timeline>('repositories');
  // The word leaving the dial; rendered just long enough to slide out in
  // the direction of travel, then cleared by onAnimationEnd.
  const [leaving, setLeaving] = useState<{
    word: Timeline;
    dir: 'left' | 'right';
  } | null>(null);

  const turnDial = (dir: 'left' | 'right') => {
    const target: Timeline = dir === 'right' ? 'dashboard' : 'repositories';
    if (target === timeline) return;
    setLeaving({ word: timeline, dir });
    setTimeline(target);
  };

  const repos = useMemo(
    () => sortByEmissionShare(reposQuery.data ?? []),
    [reposQuery.data],
  );

  // Curtain state: 'shown' -> 'leaving' (fading) -> 'done' (unmounted).
  // Shown once per tab session; SPA navigations back here skip it.
  // sessionStorage throws when the browser blocks all site data; the
  // curtain is cosmetic, so it is simply skipped there.
  const [curtain, setCurtain] = useState<'shown' | 'leaving' | 'done'>(() => {
    try {
      return sessionStorage.getItem(CURTAIN_SESSION_KEY) ? 'done' : 'shown';
    } catch {
      return 'done';
    }
  });
  const [curtainMinPassed, setCurtainMinPassed] = useState(false);
  const [curtainCapPassed, setCurtainCapPassed] = useState(false);

  useEffect(() => {
    if (curtain !== 'shown') return;
    try {
      sessionStorage.setItem(CURTAIN_SESSION_KEY, '1');
    } catch {
      /* storage unavailable: the curtain just shows again next visit */
    }
    const minTimer = window.setTimeout(
      () => setCurtainMinPassed(true),
      CURTAIN_MIN_MS,
    );
    const capTimer = window.setTimeout(
      () => setCurtainCapPassed(true),
      CURTAIN_MAX_MS,
    );
    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(capTimer);
    };
  }, [curtain]);

  // Lift once the repo list has settled (loaded or errored), but never
  // before the minimum beat and never later than the hard cap.
  const reposSettled = !reposQuery.isLoading;
  useEffect(() => {
    if (curtain !== 'shown' || !curtainMinPassed) return;
    if (!reposSettled && !curtainCapPassed) return;
    setCurtain('leaving');
  }, [curtain, curtainMinPassed, curtainCapPassed, reposSettled]);

  useEffect(() => {
    if (curtain !== 'leaving') return;
    const fadeTimer = window.setTimeout(
      () => setCurtain('done'),
      CURTAIN_FADE_MS,
    );
    return () => window.clearTimeout(fadeTimer);
  }, [curtain]);

  return (
    <Page title="Home">
      <SEO
        title="Autonomous software development"
        description="A permissionless market of miners on Bittensor Subnet 74. Explore every project the network is building."
        type="website"
      />
      {curtain !== 'done' && <Curtain leaving={curtain === 'leaving'} />}
      <Box
        className={curtain === 'shown' ? 'landing-hold' : undefined}
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
          // While the curtain is up, entrance animations are held at frame
          // zero so the sweep plays for the viewer, not behind the curtain.
          '&.landing-hold *': {
            animationPlayState: 'paused',
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

        {/* Dial toggle: only the active timeline shows, flanked by arrows.
            Turning the dial slides the old word out and the new word in,
            both moving in the direction of travel. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: { xs: 2.5, md: 3 },
            mx: 'auto',
            py: 0.7,
            width: 'fit-content',
            userSelect: 'none',
            fontFamily: 'var(--font-accent)',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            ...fadeUp(100),
            '@keyframes timelineDialInRight': {
              '0%': { opacity: 0, transform: 'translateX(55%)' },
              '100%': { opacity: 1, transform: 'translateX(0)' },
            },
            '@keyframes timelineDialInLeft': {
              '0%': { opacity: 0, transform: 'translateX(-55%)' },
              '100%': { opacity: 1, transform: 'translateX(0)' },
            },
            '@keyframes timelineDialOutRight': {
              '0%': { opacity: 1, transform: 'translateX(0)' },
              '100%': { opacity: 0, transform: 'translateX(55%)' },
            },
            '@keyframes timelineDialOutLeft': {
              '0%': { opacity: 1, transform: 'translateX(0)' },
              '100%': { opacity: 0, transform: 'translateX(-55%)' },
            },
          }}
        >
          <DialArrow dir="left" active={timeline} onTurn={turnDial} />
          {/* The hidden word reserves the width of the longest label so
              the window doesn't resize as the dial turns. */}
          <Box sx={{ position: 'relative', overflow: 'hidden' }}>
            <Box component="span" aria-hidden sx={{ visibility: 'hidden' }}>
              repositories
            </Box>
            {leaving && (
              <Box
                component="span"
                aria-hidden
                onAnimationEnd={() => setLeaving(null)}
                sx={(theme) => ({
                  position: 'absolute',
                  inset: 0,
                  textAlign: 'center',
                  color: theme.palette.status.merged,
                  animation: `${
                    leaving.dir === 'right'
                      ? 'timelineDialOutLeft'
                      : 'timelineDialOutRight'
                  } 0.3s ease forwards`,
                })}
              >
                {leaving.word}
              </Box>
            )}
            <Box
              component="span"
              key={timeline}
              sx={(theme) => ({
                position: 'absolute',
                inset: 0,
                textAlign: 'center',
                color: theme.palette.status.merged,
                animation: leaving
                  ? `${
                      leaving.dir === 'right'
                        ? 'timelineDialInRight'
                        : 'timelineDialInLeft'
                    } 0.3s ease`
                  : undefined,
              })}
            >
              {timeline}
            </Box>
          </Box>
          <DialArrow dir="right" active={timeline} onTurn={turnDial} />
        </Box>

        {timeline === 'repositories' ? (
          <>
            <Typography
              sx={(theme) => ({
                mt: { xs: 1.25, md: 1.5 },
                mx: 'auto',
                maxWidth: 640,
                color: alpha(theme.palette.text.primary, 0.45),
                fontFamily: 'var(--font-accent)',
                fontSize: '0.66rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                textAlign: 'center',
                lineHeight: 1.7,
                ...fadeUp(120),
              })}
            >
              These are the open source projects built by Gittensor.
            </Typography>

            <Box
              sx={{
                mt: { xs: 5, md: 7 },
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
          <Box>
            <Typography
              sx={(theme) => ({
                mt: { xs: 1.25, md: 1.5 },
                mx: 'auto',
                maxWidth: 640,
                color: alpha(theme.palette.text.primary, 0.45),
                fontFamily: 'var(--font-accent)',
                fontSize: '0.66rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                textAlign: 'center',
                lineHeight: 1.7,
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
