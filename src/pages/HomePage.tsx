import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { SEO } from '../components';
import { useLinkBehavior } from '../components/common/linkBehavior';
import { type Repository, githubFetch, useReposAndWeights } from '../api';
import {
  getRepositoryOwnerAvatarSrc,
  minerRepositoryPath,
  parseNumber,
} from '../utils';

// ─────────────────────────────────────────────────────────────────────────────
// Landing page structured after apex.macrocosmos.ai (huge uppercase welcome,
// tracked micro-labels) dressed in this app's own dark theme: mono type and
// hairline borders. One viewport, no scroll: the hero states the claim and
// the repository cards below it show what the network is actually building.
// ─────────────────────────────────────────────────────────────────────────────

const microLabelSx = {
  fontSize: '9px',
  lineHeight: '13px',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
};

const fadeUp = (delayMs = 0) => ({
  opacity: 0,
  animation: `landingFadeUp 700ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms forwards`,
  '@media (prefers-reduced-motion: reduce)': {
    opacity: 1,
    animation: 'none',
  },
});

// ── Repo model ───────────────────────────────────────────────────────────────

interface RepoActivity {
  fullName: string;
  owner: string;
  weight: number;
}

const buildRepoActivity = (repos: Repository[] | undefined): RepoActivity[] =>
  (repos ?? []).map((repo) => ({
    fullName: repo.fullName,
    owner: repo.owner || repo.fullName.split('/')[0] || '',
    weight: parseNumber(repo.config?.emissionShare),
  }));

// ── Repo cards ───────────────────────────────────────────────────────────────

// What each registered repo actually is, written from reading the repos
// themselves rather than copied from the GitHub About field. Repos not
// listed here fall back to their GitHub description until curated.
const CURATED_DESCRIPTIONS: Record<string, string> = {
  'gittensor-ai-lab/sparkinfer':
    'Blackwell-native inference runtime for fast, power-efficient local LLMs on RTX 50-series and Jetson. CUDA speedups are verified on real GPUs before they merge.',
  'JSONbored/metagraphed':
    'The Bittensor subnet integration registry: what every subnet exposes, whether it is healthy, and how to call it. Machine-readable, built for developers and their AI agents.',
  'gittensor-vanguard/vanguarstew':
    'A repo-maintainer agent and the benchmark that scores it against real GitHub history: would the agent have made the calls a strong human maintainer actually made?',
  'JSONbored/gittensory':
    'A control plane for Gittensor contribution work: cleaner PR planning for miners, safety-scanned and CI-grounded AI reviews for maintainers, private scoring context.',
  'Autovara/kata':
    'A king-of-the-hill competition engine that crowdsources the best mining agent for a subnet: challengers fight the champion in a sandbox and objective wins become merges.',
  'entrius/gittensor':
    'The subnet itself: validator and miner code that verifies merged pull requests to registered repositories, scores contribution quality, and pays TAO for real open-source work.',
  'Geniepod/genie-claw':
    'A Rust agent runtime for a fully private smart-home assistant on Jetson hardware: small local models grounded in family memory and live device state, with no cloud.',
  'vouchdev/vouch':
    'A git-native, review-gated knowledge base for LLM agents: sessions capture what they learn, humans approve what becomes memory, and the next session starts already knowing the repo.',
  'phase-rs/phase':
    'An open-source Magic: The Gathering rules engine and client: Rust compiled to native and WASM, 34,000+ cards, AI opponents, and browser multiplayer.',
  'touchpilot/touchpilot':
    'A local-first Android agent runtime that lets an AI operate the phone through explicit, permissioned, auditable tools, local models first.',
};

interface RepoCardProps {
  repo: RepoActivity;
}

const RepoCard: React.FC<RepoCardProps> = ({ repo }) => {
  const link = useLinkBehavior<HTMLAnchorElement>(
    minerRepositoryPath(repo.fullName),
  );
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarSrc = getRepositoryOwnerAvatarSrc(repo.owner);

  // Curated analysis first; only uncurated repos hit GitHub for their About
  // text, cached hard and allowed to fail silently to a blank slot.
  const curated = CURATED_DESCRIPTIONS[repo.fullName];
  const { data: githubMeta } = useQuery({
    queryKey: ['githubRepoDescription', repo.fullName],
    queryFn: ({ signal }) =>
      githubFetch<{ description: string | null }>(
        `https://api.github.com/repos/${repo.fullName}`,
        { signal },
      ),
    enabled: !curated,
    staleTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const description = curated ?? githubMeta?.description ?? '';

  return (
    <Box
      component="a"
      {...link}
      sx={(theme) => ({
        display: 'block',
        textDecoration: 'none',
        border: `1px solid ${theme.palette.border.light}`,
        borderRadius: '6px',
        backgroundColor: theme.palette.surface.subtle,
        p: 'clamp(12px, 1.9vh, 18px)',
        transition: 'transform 0.25s ease, border-color 0.25s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: theme.palette.border.medium,
          '& .repo-card-avatar': { filter: 'none', opacity: 1 },
        },
      })}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', mb: 1.25 }}
      >
        {avatarSrc && !avatarFailed ? (
          <Box
            component="img"
            className="repo-card-avatar"
            src={avatarSrc}
            alt=""
            onError={() => setAvatarFailed(true)}
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              filter: 'grayscale(1)',
              opacity: 0.85,
              transition: 'filter 0.25s ease, opacity 0.25s ease',
            }}
          />
        ) : (
          <Box
            sx={(theme) => ({
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: theme.palette.surface.light,
            })}
          />
        )}
        <Typography
          sx={(theme) => ({
            fontSize: '13.5px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: theme.palette.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          {repo.fullName}
        </Typography>
      </Stack>
      {/* Three-line description slot; fixed height keeps sibling cards aligned. */}
      <Typography
        sx={(theme) => ({
          fontSize: '11px',
          lineHeight: 1.7,
          minHeight: '56px',
          color: theme.palette.text.secondary,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        })}
      >
        {description}
      </Typography>
    </Box>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

const HomePage: React.FC = () => {
  const { data: repos } = useReposAndWeights();

  const activity = useMemo(() => buildRepoActivity(repos), [repos]);

  // Top repos by network weight: the cards exist to show what Gittensor is
  // building.
  const topRepos = useMemo(
    () =>
      [...activity]
        .filter((repo) => repo.weight > 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 6),
    [activity],
  );

  return (
    <Box
      sx={{
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        overflow: { xs: 'auto', md: 'hidden' },
        '@keyframes landingFadeUp': {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'none' },
        },
      }}
    >
      <SEO
        title="Autonomous software development"
        description="A permissionless market of miners on Bittensor Subnet 74. We direct the pool; it ships the software."
        type="website"
      />

      {/* Single viewport: sections share the height via clamped gaps, no
          page scroll on desktop. */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: 'clamp(12px, 2.5vh, 28px)',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 'clamp(18px, 3.6vh, 44px)',
        }}
      >
        {/* ── Hero ── */}
        <Stack
          sx={{
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Typography
            sx={(theme) => ({
              ...fadeUp(60),
              ...microLabelSx,
              color: theme.palette.text.secondary,
              mb: 'clamp(8px, 1.6vh, 16px)',
            })}
          >
            Bittensor Subnet 74
          </Typography>
          <Typography
            component="h1"
            sx={(theme) => ({
              ...fadeUp(120),
              fontSize: 'clamp(1.6rem, min(4.2vw, 6vh), 3.4rem)',
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              color: theme.palette.text.primary,
            })}
          >
            Welcome to Gittensor
          </Typography>
          <Typography
            sx={(theme) => ({
              ...fadeUp(200),
              mt: 'clamp(10px, 2vh, 20px)',
              maxWidth: '64ch',
              fontSize: { xs: '0.8rem', md: '0.86rem' },
              lineHeight: 1.7,
              color: theme.palette.text.secondary,
            })}
          >
            Gittensor unlocks development at scale by running many open
            repositories at once, empowering a network of agents to ship
            improvements in parallel.
          </Typography>
        </Stack>

        {/* ── What the network is building ── */}
        <Box sx={{ ...fadeUp(320) }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 1.5,
            }}
          >
            {topRepos.map((repo) => (
              <RepoCard key={repo.fullName} repo={repo} />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
