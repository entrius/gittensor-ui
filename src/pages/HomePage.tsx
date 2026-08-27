import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { LinkBox } from '../components/common/linkBehavior';
import {
  useAllMiners,
  useAllPrs,
  useMaintainerMergedPrs,
  useReposAndWeights,
} from '../api';
import { type Repository } from '../api/models/Dashboard';
import { formatUsdEstimate, minerRepositoryPath, parseNumber } from '../utils';
import repoWebsitesSnapshot from '../generated/repoWebsites.json';
import repoDescriptionsSnapshot from '../generated/repoDescriptions.json';

// One-line repo descriptions from each project's GitHub metadata. The
// build-time snapshot (scripts/fetch-repo-websites.mjs) paints instantly;
// the current description is then fetched from GitHub once per session and
// reconciled over it, so an owner editing their description shows up on the
// next page view, not the next site deploy.
const REPO_DESCRIPTIONS: Record<string, string> = repoDescriptionsSnapshot;
const DESCRIPTION_CACHE_KEY = 'gt-repo-descriptions';
const DESCRIPTION_REFRESH_DELAY_MS = 3500;

// Hand-written one-liners (sourced from each repo's README) for repos whose
// owners haven't set a GitHub description yet. Lowest-priority fallback: the
// moment an owner adds a real description, the live/snapshot value wins and
// this entry goes unused.
const FALLBACK_DESCRIPTIONS: Record<string, string> = {
  'entrius/gittensor':
    'The Gittensor subnet itself: incentivizing open source contributions on Bittensor SN74.',
  'DPBG/Engram.AI': 'A self-aware, continuously-learning neuromorphic AI.',
  'touchpilot/touchpilot':
    'Local-first Android AI agent runtime for safe, observable phone control.',
  'gittensor-agent-forge/gt-imagent':
    'An open research project for image-generation agents that plan, critique, and improve, beyond one-shot prompting.',
  'James-CUDA/Gittensor-TinyRouter':
    'An incentivized open benchmark for LLM routing intelligence: train a tiny routing head, beat the king, earn TAO.',
};

const readDescriptionCache = (): Record<string, string> => {
  try {
    return JSON.parse(
      sessionStorage.getItem(DESCRIPTION_CACHE_KEY) ?? '{}',
    ) as Record<string, string>;
  } catch {
    return {};
  }
};

// Per-repo activity digest derived from the network-wide PR dataset the
// dashboard already loads — no extra per-repo requests. mergedDaily is
// oldest-first, one bucket per day over the sparkline window.
type RepoActivity = {
  mergedThisWeek: number;
  activeMiners: number;
  mergedDaily: number[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const ACTIVE_MINER_WINDOW_MS = 30 * DAY_MS;
const SPARK_DAYS = 28;

// Merges-per-day sparkline as instrument telemetry: one 1px monochrome
// hairline tick per day over a faint baseline — no fills, no rounding, no
// color, so it registers as texture rather than pulling the eye. Square-
// root scaling keeps quiet days visible next to a spike day (these
// distributions are heavily peaked). Ticks are drawn as lines with
// non-scaling strokes so they stay hairline-crisp while the x-axis
// stretches to the card width. No axes labels, no tooltip — the activity
// line right below states the headline number as text.
const SPARK_H = 14;
const SPARK_PITCH = 4;

const MergeSparkline: React.FC<{ counts: number[] }> = ({ counts }) => {
  const max = Math.max(...counts, 1);
  const viewW = (counts.length - 1) * SPARK_PITCH;
  return (
    <Box
      component="svg"
      viewBox={`0 0 ${viewW} ${SPARK_H}`}
      preserveAspectRatio="none"
      aria-hidden
      sx={{ display: 'block', width: '100%', height: SPARK_H, mt: 1.25 }}
    >
      <Box
        component="line"
        x1={0}
        y1={SPARK_H - 0.5}
        x2={viewW}
        y2={SPARK_H - 0.5}
        vectorEffect="non-scaling-stroke"
        sx={(theme) => ({
          stroke: alpha(theme.palette.text.primary, 0.08),
          strokeWidth: 1,
        })}
      />
      {counts.map((count, i) => {
        const tickH =
          count === 0 ? 1 : Math.max(2, Math.sqrt(count / max) * SPARK_H);
        return (
          <Box
            component="line"
            key={i}
            x1={i * SPARK_PITCH}
            y1={SPARK_H}
            x2={i * SPARK_PITCH}
            y2={SPARK_H - tickH}
            vectorEffect="non-scaling-stroke"
            sx={(theme) => ({
              stroke: alpha(
                theme.palette.text.primary,
                count === 0 ? 0.12 : 0.32,
              ),
              strokeWidth: 1,
            })}
          />
        );
      })}
    </Box>
  );
};

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

// mshots returns a small "generating…" placeholder on the first request for
// a URL; remount the image a couple of times so the real shot swaps in.
// Real screenshots come back at the requested 1280px width, so anything
// narrower is the placeholder — once a real shot is on screen, refreshing
// stops (a remount would blank the card back to its name plate mid-fade).
const SHOT_REAL_MIN_WIDTH = 1024;
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
  onLoad?: (img: HTMLImageElement) => void;
  sx: object;
}> = ({ sx, onError, onLoad, ...imgProps }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <Box
      component="img"
      loading="lazy"
      onLoad={(event: React.SyntheticEvent<HTMLImageElement>) => {
        setLoaded(true);
        onLoad?.(event.currentTarget);
      }}
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

const RepoCard: React.FC<{
  repo: Repository;
  index: number;
  description?: string;
  activity?: RepoActivity;
  usdPerDay?: number | null;
}> = ({ repo, index, description, activity, usdPerDay }) => {
  const website = REPO_WEBSITES[repo.fullName];
  const embedUrl = website ? toEmbedUrl(website) : '';
  const websiteHost = website ? getSiteHost(embedUrl) : '';
  const sameOrigin = Boolean(website) && websiteHost === window.location.host;
  const canAttemptEmbed = Boolean(website) && IS_CHROMIUM;

  const [attempt, setAttempt] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [shotTick, setShotTick] = useState(0);
  const [shotIsReal, setShotIsReal] = useState(false);
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
  // The screenshot shows immediately as the card's backdrop — including
  // while a live embed is still verifying/loading — so a website card is
  // never a bare name plate; the live window fades in over it. It always
  // targets the site's declared URL (mshots fetches server-side, so the
  // mixed-content upgrade is irrelevant to it).
  const showSiteShot = Boolean(website) && !siteShotFailed;

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
    if (!showSiteShot || shotIsReal || shotTick >= SHOT_REFRESH_MAX) return;
    shotTimerRef.current = window.setTimeout(
      () => setShotTick(shotTick + 1),
      SHOT_REFRESH_BASE_MS * (shotTick + 1) + index * SHOT_REFRESH_STAGGER_MS,
    );
    return () => window.clearTimeout(shotTimerRef.current);
  }, [showSiteShot, shotIsReal, shotTick, index]);

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
        transition: 'transform 0.2s ease',
        ...fadeUp(120 + Math.min(index, 11) * 45),
        '&:hover': {
          transform: 'translateY(-3px)',
        },
        '&:hover .repo-card-frame': {
          borderColor: alpha(theme.palette.text.primary, 0.32),
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
        '&:hover .repo-card-label': {
          color: theme.palette.text.primary,
        },
        // The payout figure is monochrome at rest like everything else on
        // the card; hover restores the accent green along with the color.
        '&:hover .repo-card-payout': {
          color: theme.palette.status.merged,
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
      {/* Identity header above the frame: name left, payout right,
          description beneath. The framed preview hangs under it like the
          piece under a gallery caption. */}
      <Box sx={{ minWidth: 0, px: 0.25, mb: 1.25 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 0,
            }}
          >
            <Typography
              className="repo-card-label"
              sx={(theme) => ({
                color: alpha(theme.palette.text.primary, 0.75),
                fontFamily: 'var(--font-accent)',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
                transition: 'color 0.2s ease',
              })}
            >
              {repo.name}
            </Typography>
          </Box>
          {/* Always reserved at exactly two lines — clamped when longer,
              padded when shorter — so every frame in a row starts at the
              same height regardless of description length. */}
          <Typography
            sx={(theme) => ({
              mt: 0.25,
              color: alpha(theme.palette.text.primary, 0.42),
              fontFamily: 'var(--font-accent)',
              fontSize: '0.7rem',
              lineHeight: 1.55,
              height: 'calc(0.7rem * 1.55 * 2)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            })}
          >
            {description}
          </Typography>
        </Box>
      </Box>
      <Box
        ref={mediaRef}
        className="repo-card-frame"
        sx={(theme) => ({
          position: 'relative',
          width: '100%',
          aspectRatio: '2 / 1',
          border: `1px solid ${theme.palette.border.light}`,
          borderRadius: 1.5,
          backgroundColor: theme.palette.surface.subtle,
          overflow: 'hidden',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
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
            name plate. It stays mounted even once the live window is shown:
            the embed is opaque and covers it, and unmounting mid-cross-fade
            would let the name plate peek through. */}
        {showSiteShot ? (
          <PreviewImg
            key={shotTick}
            className="repo-card-preview"
            src={getSiteScreenshotSrc(website)}
            alt={`${websiteHost} screenshot`}
            onLoad={(img) => {
              if (img.naturalWidth >= SHOT_REAL_MIN_WIDTH) setShotIsReal(true);
            }}
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
        ) : null}

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
      {/* Below the frame: just the telemetry strip and activity line — the
          PR data stays under the preview while identity lives above it. */}
      <Box sx={{ mt: 0.5, px: 0.25, minWidth: 0 }}>
        {activity && <MergeSparkline counts={activity.mergedDaily} />}
        {activity && (
          <Typography
            sx={(theme) => ({
              mt: 0.75,
              color: alpha(theme.palette.text.primary, 0.32),
              fontFamily: 'var(--font-accent)',
              fontSize: '0.56rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            })}
          >
            {activity.mergedThisWeek}
            {activity.mergedThisWeek === 1 ? ' pr' : ' prs'} merged this week
            {' · '}
            {activity.activeMiners}
            {activity.activeMiners === 1 ? ' active miner' : ' active miners'}
            {usdPerDay != null && usdPerDay > 0 && (
              <Box
                component="span"
                className="repo-card-payout"
                sx={{ transition: 'color 0.25s ease' }}
              >
                {' · '}
                {formatUsdEstimate(usdPerDay, { includeApproxPrefix: true })}
                {'/day'}
              </Box>
            )}
          </Typography>
        )}
      </Box>
    </LinkBox>
  );
};

const RepoCardSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <Box sx={{ ...fadeUp(120 + index * 45) }}>
    <Box sx={{ mb: 1.25 }}>
      <Box
        sx={(theme) => ({
          width: 90,
          height: 8,
          borderRadius: 0.5,
          backgroundColor: alpha(theme.palette.text.primary, 0.07),
        })}
      />
      <Box
        sx={(theme) => ({
          mt: 1,
          width: '85%',
          height: 7,
          borderRadius: 0.5,
          backgroundColor: alpha(theme.palette.text.primary, 0.05),
        })}
      />
    </Box>
    <Box
      sx={(theme) => ({
        width: '100%',
        aspectRatio: '2 / 1',
        border: `1px solid ${theme.palette.border.subtle}`,
        borderRadius: 1.5,
        backgroundColor: alpha(theme.palette.text.primary, 0.045),
      })}
    />
  </Box>
);

const DashboardTimeline = React.lazy(() => import('./dashboard/DashboardPage'));
const ComputeTimeline = React.lazy(() => import('./ComputePage'));

// The dial's positions, left to right. Turning right moves one step toward
// the end of this list, turning left one step toward the start.
const TIMELINES = ['repositories', 'dashboard', 'compute'] as const;
type Timeline = (typeof TIMELINES)[number];

const dialTarget = (
  active: Timeline,
  dir: 'left' | 'right',
): Timeline | null => {
  const index = TIMELINES.indexOf(active) + (dir === 'right' ? 1 : -1);
  return TIMELINES[index] ?? null;
};

const TIMELINE_TAGLINE: Record<Timeline, string> = {
  repositories: 'These are the open source projects built by Gittensor.',
  dashboard: 'This is the work done by Gittensor miners.',
  compute: 'This is the GPU fleet serving Gittensor models.',
};

// A left/right dial button; grayed out when the dial can't turn that way
// (the word that direction is already showing).
const DialArrow: React.FC<{
  dir: 'left' | 'right';
  active: Timeline;
  onTurn: (dir: 'left' | 'right') => void;
}> = ({ dir, active, onTurn }) => {
  const target = dialTarget(active, dir);
  const enabled = target !== null;
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
const CURTAIN_MAX_MS = 4000;
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
    const target = dialTarget(timeline, dir);
    if (target === null) return;
    setLeaving({ word: timeline, dir });
    setTimeline(target);
  };

  const repos = useMemo(
    () => sortByEmissionShare(reposQuery.data ?? []),
    [reposQuery.data],
  );

  // Activity digest per repo (lowercased fullName -> counts), folded from
  // the network-wide PR list in one pass. PR records may carry a lowercased
  // repository name, so matching is case-insensitive.
  const prsQuery = useAllPrs();
  const minersQuery = useAllMiners();
  // Maintainer-authored merged PRs are excluded from /prs by the scoring
  // pipeline (maintainers are paid via maintainer_cut, not per-PR scores),
  // so they're recovered separately and folded into the digest below.
  const maintainerPrsByRepo = useMaintainerMergedPrs(
    reposQuery.data,
    minersQuery.data,
  );
  const activityByRepo = useMemo(() => {
    if (!prsQuery.data) return undefined;
    const now = Date.now();
    const map = new Map<
      string,
      { mergedThisWeek: number; miners: Set<string>; mergedDaily: number[] }
    >();
    const getEntry = (key: string) => {
      let entry = map.get(key);
      if (!entry) {
        entry = {
          mergedThisWeek: 0,
          miners: new Set(),
          mergedDaily: Array.from({ length: SPARK_DAYS }, () => 0),
        };
        map.set(key, entry);
      }
      return entry;
    };
    const countMerge = (
      entry: { mergedThisWeek: number; mergedDaily: number[] },
      mergedAtMs: number,
    ) => {
      if (now - mergedAtMs < WEEK_MS) entry.mergedThisWeek += 1;
      const daysAgo = Math.floor((now - mergedAtMs) / DAY_MS);
      if (daysAgo >= 0 && daysAgo < SPARK_DAYS) {
        entry.mergedDaily[SPARK_DAYS - 1 - daysAgo] += 1;
      }
    };
    const seen = new Set<string>();
    for (const pr of prsQuery.data) {
      const key = pr.repository?.toLowerCase();
      if (!key) continue;
      seen.add(`${key}#${pr.pullRequestNumber}`);
      const entry = getEntry(key);
      const mergedAtMs = pr.mergedAt ? new Date(pr.mergedAt).getTime() : null;
      if (mergedAtMs !== null) countMerge(entry, mergedAtMs);
      const activeAtMs = new Date(pr.mergedAt ?? pr.prCreatedAt).getTime();
      if (pr.author && now - activeAtMs < ACTIVE_MINER_WINDOW_MS) {
        entry.miners.add(pr.author);
      }
    }
    // Registered maintainers of cut-bearing repos are paid UIDs too — count
    // their merges. Dedup by PR number in case the feed ever includes one.
    if (maintainerPrsByRepo) {
      for (const [key, maintainerPrs] of maintainerPrsByRepo) {
        const entry = getEntry(key);
        for (const pr of maintainerPrs) {
          if (seen.has(`${key}#${pr.pullRequestNumber}`)) continue;
          const mergedAtMs = new Date(pr.mergedAt).getTime();
          countMerge(entry, mergedAtMs);
          if (now - mergedAtMs < ACTIVE_MINER_WINDOW_MS) {
            entry.miners.add(pr.author);
          }
        }
      }
    }
    return map;
  }, [prsQuery.data, maintainerPrsByRepo]);

  // Live description refresh: one GitHub metadata request per repo, at most
  // once per session (cached in sessionStorage), fired a few seconds after
  // mount so it never competes with the first paint. Failures (rate limit,
  // renamed repo) silently keep the build-time snapshot.
  const [liveDescriptions, setLiveDescriptions] =
    useState<Record<string, string>>(readDescriptionCache);
  const descriptionFetchAttemptedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const attempted = descriptionFetchAttemptedRef.current;
    const missing = repos
      .map((repo) => repo.fullName)
      .filter(
        (name) => liveDescriptions[name] === undefined && !attempted.has(name),
      );
    if (missing.length === 0) return;
    missing.forEach((name) => attempted.add(name));
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        missing.map(async (fullName) => {
          try {
            const response = await fetch(
              `https://api.github.com/repos/${fullName}`,
            );
            if (!response.ok) return;
            const meta = (await response.json()) as { description?: string };
            updates[fullName] = (meta.description ?? '').trim();
          } catch {
            /* offline or blocked: the snapshot stays */
          }
        }),
      );
      if (cancelled || Object.keys(updates).length === 0) return;
      setLiveDescriptions((previous) => {
        const next = { ...previous, ...updates };
        try {
          sessionStorage.setItem(DESCRIPTION_CACHE_KEY, JSON.stringify(next));
        } catch {
          /* cache is best-effort */
        }
        return next;
      });
    }, DESCRIPTION_REFRESH_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [repos, liveDescriptions]);

  // A repo's estimated payout: its emission share of the total daily USD
  // currently flowing to miners across the network.
  const networkUsdPerDay = useMemo(
    () =>
      minersQuery.data?.reduce(
        (acc, miner) => acc + parseNumber(miner.usdPerDay ?? 0),
        0,
      ) ?? null,
    [minersQuery.data],
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

  // Preload the first screen of preview images (the same URLs the cards
  // render, so the browser cache makes them paint instantly) once the repo
  // list is in; the curtain holds until they have settled so it lifts into
  // formed cards, not a wall of name plates with images trickling in.
  const [previewsReady, setPreviewsReady] = useState(false);
  useEffect(() => {
    if (curtain !== 'shown' || previewsReady || repos.length === 0) return;
    let cancelled = false;
    const firstScreen = repos.slice(0, 9).map((repo) => {
      const website = REPO_WEBSITES[repo.fullName];
      return website
        ? getSiteScreenshotSrc(website)
        : getRepoPreviewSrc(repo.fullName, 0);
    });
    Promise.all(
      firstScreen.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          }),
      ),
    ).then(() => {
      if (!cancelled) setPreviewsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [curtain, previewsReady, repos]);

  // Lift once the repo list has settled and the first screen of previews
  // has loaded, but never before the minimum beat and never later than the
  // hard cap.
  const reposSettled = !reposQuery.isLoading;
  useEffect(() => {
    if (curtain !== 'shown' || !curtainMinPassed) return;
    const ready = reposSettled && (previewsReady || repos.length === 0);
    if (!ready && !curtainCapPassed) return;
    setCurtain('leaving');
  }, [
    curtain,
    curtainMinPassed,
    curtainCapPassed,
    reposSettled,
    previewsReady,
    repos.length,
  ]);

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
          maxWidth: timeline === 'repositories' ? 1320 : 1680,
          mx: 'auto',
          px: { xs: 1.5, sm: 3 },
          py: { xs: 3, md: 5 },
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

        <Typography
          sx={(theme) => ({
            mt: { xs: 0.75, md: 1 },
            mx: 'auto',
            maxWidth: 640,
            color: alpha(theme.palette.text.primary, 0.45),
            fontFamily: 'var(--font-accent)',
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 1.7,
            ...fadeUp(80),
          })}
        >
          {TIMELINE_TAGLINE[timeline]}
        </Typography>

        {/* Dial toggle: only the active timeline shows, flanked by arrows.
            Turning the dial slides the old word out and the new word in,
            both moving in the direction of travel. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: { xs: 4, md: 5 },
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
            <Box
              sx={{
                mt: { xs: 2.5, md: 3 },
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(3, minmax(0, 1fr))',
                },
                columnGap: { xs: 2, md: 2.5 },
                rowGap: { xs: 3, md: 3.5 },
              }}
            >
              {reposQuery.isLoading
                ? Array.from({ length: 9 }, (_, index) => (
                    <RepoCardSkeleton key={index} index={index} />
                  ))
                : repos.map((repo, index) => {
                    const digest = activityByRepo?.get(
                      repo.fullName.toLowerCase(),
                    );
                    const liveDescription = liveDescriptions[repo.fullName];
                    return (
                      <RepoCard
                        key={repo.fullName}
                        repo={repo}
                        index={index}
                        description={
                          liveDescription ||
                          REPO_DESCRIPTIONS[repo.fullName] ||
                          FALLBACK_DESCRIPTIONS[repo.fullName]
                        }
                        activity={
                          activityByRepo && {
                            mergedThisWeek: digest?.mergedThisWeek ?? 0,
                            activeMiners: digest?.miners.size ?? 0,
                            mergedDaily:
                              digest?.mergedDaily ??
                              Array.from({ length: SPARK_DAYS }, () => 0),
                          }
                        }
                        usdPerDay={
                          networkUsdPerDay !== null
                            ? networkUsdPerDay *
                              parseNumber(repo.config?.emissionShare ?? 0)
                            : null
                        }
                      />
                    );
                  })}
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
                  Loading {timeline}…
                </Typography>
              }
            >
              {timeline === 'dashboard' ? (
                <DashboardTimeline />
              ) : (
                <ComputeTimeline />
              )}
            </React.Suspense>
          </Box>
        )}
      </Box>
    </Page>
  );
};

export default HomePage;
