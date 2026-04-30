import React, { useCallback, useMemo } from 'react';
import { Avatar, Box, CircularProgress, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { RANK_COLORS } from '../../../theme';
import { getGithubAvatarSrc } from '../../../utils';
import { credibilityColor } from '../../../utils/format';
import { type DashboardFeaturedContributor } from '../dashboardData';

interface Props {
  discoverers: DashboardFeaturedContributor[];
  isLoading?: boolean;
  viewAllHref?: string;
}

const FONTS = { mono: '"JetBrains Mono", ui-monospace, monospace' } as const;
const ACCENT = [RANK_COLORS.first, RANK_COLORS.second, RANK_COLORS.third];
const mono = { fontFamily: FONTS.mono } as const;
const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
const formatEarn = (usd: number) => `$${Math.round(usd)}/d`;

const CredRing: React.FC<{ value: number }> = ({ value }) => {
  const theme = useTheme();
  const pct = clamp(value);
  const color = pct > 0 ? credibilityColor(pct) : theme.palette.border.light;
  const size = 48;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - pct);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={alpha(theme.palette.common.white, 0.07)}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.45s ease' }}
          />
        </svg>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.2,
          }}
        >
          <Typography
            sx={{
              ...mono,
              fontSize: '0.82rem',
              fontWeight: 800,
              color,
              lineHeight: 1,
            }}
          >
            {Math.round(pct * 100)}%
          </Typography>
        </Box>
      </Box>
      <Typography
        sx={{
          ...mono,
          fontSize: '0.58rem',
          fontWeight: 700,
          color: alpha(theme.palette.text.primary, 0.35),
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Cred
      </Typography>
    </Box>
  );
};

const Stat: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color,
}) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.4,
      }}
    >
      <Typography
        sx={{
          ...mono,
          fontSize: '1.2rem',
          fontWeight: 800,
          color: color ?? theme.palette.text.primary,
          lineHeight: 1,
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          ...mono,
          fontSize: '0.6rem',
          fontWeight: 700,
          color: alpha(theme.palette.text.primary, 0.35),
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

const Divider: React.FC<{ accent: string }> = ({ accent }) => (
  <Box
    sx={{
      width: '1px',
      alignSelf: 'stretch',
      backgroundColor: alpha(accent, 0.18),
      mx: 0.5,
    }}
  />
);

const DiscovererCard: React.FC<{
  d: DashboardFeaturedContributor;
  rank: number;
  onClick: () => void;
}> = ({ d, rank, onClick }) => {
  const theme = useTheme();
  const accent = ACCENT[rank] ?? alpha(theme.palette.status.award, 0.5);
  const avatarUsername = d.githubUsername ?? d.githubId;
  const cred = d.credibility ?? 0;
  const earn = d.earnings?.usdPerDay ?? 0;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  const repoPills = useMemo(
    () =>
      d.repos.map((repo) => (
        <Box
          key={`${d.githubId}-${repo}`}
          sx={{
            ...mono,
            fontSize: '0.68rem',
            fontWeight: 600,
            color: alpha(accent, 0.85),
            backgroundColor: alpha(accent, 0.08),
            border: `1px solid ${alpha(accent, 0.2)}`,
            borderRadius: 99,
            px: 1.1,
            py: 0.4,
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}
        >
          {repo.split('/').pop() || repo}
        </Box>
      )),
    [d.repos, d.githubId, accent],
  );

  const hasStats = (d.solvedIssues ?? 0) > 0 || earn > 0 || cred > 0;

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${alpha(accent, 0.3)}`,
        backgroundColor: theme.palette.common.black,
        cursor: 'pointer',
        transition:
          'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: alpha(accent, 0.6),
          boxShadow: `0 12px 40px ${alpha(accent, 0.18)}, 0 2px 8px ${alpha(accent, 0.1)}`,
        },
        '&:focus-visible': {
          outline: `2px solid ${alpha(accent, 0.7)}`,
          outlineOffset: 3,
        },
      }}
    >
      {/* ── Top section: gradient bg + avatar ─────────────────── */}
      <Box
        sx={{
          position: 'relative',
          pt: 2,
          pb: 1.5,
          px: 1.75,
          background: `linear-gradient(175deg, ${alpha(accent, 0.24)} 0%, ${alpha(accent, 0.06)} 60%, transparent 100%)`,
          borderBottom: `1px solid ${alpha(accent, 0.12)}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.75,
        }}
      >
        {/* Rank badge */}
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            left: 12,
            width: 26,
            height: 26,
            borderRadius: '50%',
            backgroundColor: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 14px ${alpha(accent, 0.55)}, 0 0 28px ${alpha(accent, 0.2)}`,
            zIndex: 1,
          }}
        >
          <Typography
            sx={{
              ...mono,
              fontSize: '0.65rem',
              fontWeight: 900,
              color: '#000',
              lineHeight: 1,
            }}
          >
            {rank + 1}
          </Typography>
        </Box>

        {/* Avatar */}
        <Avatar
          src={getGithubAvatarSrc(avatarUsername)}
          alt={avatarUsername}
          sx={{
            width: 52,
            height: 52,
            border: `2px solid ${accent}`,
            boxShadow: `0 0 0 3px ${alpha(accent, 0.15)}, 0 0 16px ${alpha(accent, 0.28)}`,
          }}
        />

        {/* Name */}
        <Typography
          sx={{
            ...mono,
            fontSize: '0.92rem',
            fontWeight: 700,
            color: theme.palette.text.primary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {d.name}
        </Typography>

        {/* Label pill */}
        <Box
          sx={{
            ...mono,
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: alpha(accent, 0.95),
            backgroundColor: alpha(accent, 0.13),
            border: `1px solid ${alpha(accent, 0.28)}`,
            borderRadius: 99,
            px: 1,
            py: 0.3,
            whiteSpace: 'nowrap',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {d.featuredLabel}
        </Box>
      </Box>

      {/* ── Score hero ────────────────────────────────────────── */}
      <Box
        sx={{
          px: 1.75,
          pt: 1.5,
          pb: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <Typography
          sx={{
            ...mono,
            fontSize: '0.6rem',
            fontWeight: 700,
            color: alpha(theme.palette.text.primary, 0.35),
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          Score
        </Typography>
        <Typography
          sx={{
            ...mono,
            fontSize: { xs: '2.6rem', sm: '3rem' },
            fontWeight: 900,
            color: accent,
            lineHeight: 1,
            textShadow: `0 0 32px ${alpha(accent, 0.45)}, 0 0 64px ${alpha(accent, 0.18)}`,
            letterSpacing: '-0.02em',
          }}
        >
          {d.score?.toLocaleString() ?? '0'}
        </Typography>
      </Box>

      {/* ── Stats row ─────────────────────────────────────────── */}
      {hasStats && (
        <Box
          sx={{
            mx: 1.5,
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            borderRadius: 2,
            border: `1px solid ${alpha(accent, 0.12)}`,
            backgroundColor: alpha(accent, 0.04),
            py: 1,
            px: 1,
            gap: 0.5,
          }}
        >
          {(d.solvedIssues ?? 0) > 0 && (
            <>
              <Stat label="Solved" value={`${d.solvedIssues}`} />
              {(earn > 0 || cred > 0) && <Divider accent={accent} />}
            </>
          )}
          {earn > 0 && (
            <>
              <Stat
                label="Earn"
                value={formatEarn(earn)}
                color={theme.palette.status.success}
              />
              {cred > 0 && <Divider accent={accent} />}
            </>
          )}
          {cred > 0 && <CredRing value={cred} />}
        </Box>
      )}

      {/* ── Repo pills ────────────────────────────────────────── */}
      {repoPills.length > 0 && (
        <Box
          sx={{
            px: 1.5,
            pb: 1.5,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
          }}
        >
          {repoPills}
        </Box>
      )}
    </Box>
  );
};

const FeaturedDiscoverersSpotlight: React.FC<Props> = ({
  discoverers,
  isLoading = false,
  viewAllHref,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const open = useCallback(
    (githubId: string) =>
      navigate(
        `/miners/details?githubId=${encodeURIComponent(githubId)}&mode=issues`,
        { state: { backTo: '/dashboard' } },
      ),
    [navigate],
  );

  return (
    <Box
      sx={{
        width: '100%',
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 3,
        border: `1px solid ${theme.palette.border.light}`,
      }}
    >
      <Box
        sx={{
          mb: 1.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          sx={{
            ...mono,
            fontSize: { xs: '1.02rem', sm: '1.1rem' },
            fontWeight: 700,
            color: theme.palette.text.primary,
          }}
        >
          Featured Discoverers
        </Typography>
        {viewAllHref && (
          <Typography
            onClick={() => navigate(viewAllHref)}
            sx={{
              ...theme.typography.tooltipLabel,
              color: alpha(theme.palette.text.primary, 0.45),
              cursor: 'pointer',
              '&:hover': { color: theme.palette.text.primary },
            }}
          >
            view all →
          </Typography>
        )}
      </Box>

      {isLoading ? (
        <Box
          sx={{
            minHeight: 260,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={28} />
        </Box>
      ) : discoverers.length === 0 ? (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
          No discoverer highlights available.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: `repeat(${Math.min(discoverers.length, 2)}, 1fr)`,
              md: `repeat(${Math.min(discoverers.length, 3)}, 1fr)`,
            },
            gap: 1.5,
            alignItems: 'stretch',
          }}
        >
          {discoverers.map((d, i) => (
            <DiscovererCard
              key={`${d.featuredLabel}-${d.githubId}`}
              d={d}
              rank={i}
              onClick={() => open(d.githubId)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FeaturedDiscoverersSpotlight;
