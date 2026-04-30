import React, { useCallback, useMemo } from 'react';
import { Avatar, Box, CircularProgress, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { RANK_COLORS } from '../../../theme';
import { getGithubAvatarSrc } from '../../../utils';
import { credibilityColor } from '../../../utils/format';
import { type DashboardFeaturedContributor } from '../dashboardData';

const FONTS = { mono: '"JetBrains Mono", ui-monospace, monospace' } as const;
const ACCENT = [RANK_COLORS.first, RANK_COLORS.second, RANK_COLORS.third];
const mono = { fontFamily: FONTS.mono } as const;

const KpiBox: React.FC<{
  title: string;
  value: string;
  sub: string;
  accentColor?: string;
  isLast?: boolean;
}> = ({ title, value, sub, accentColor, isLast }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        px: { xs: 1, sm: 1.5 },
        py: 0.85,
        borderRight: isLast
          ? 'none'
          : `1px solid ${alpha(theme.palette.common.white, 0.07)}`,
      }}
    >
      <Typography
        sx={{
          ...mono,
          fontSize: '0.5rem',
          fontWeight: 600,
          color: alpha(theme.palette.text.primary, 0.35),
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          mb: 0.25,
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          ...mono,
          fontSize: { xs: '0.88rem', sm: '0.96rem' },
          fontWeight: 800,
          color: accentColor ?? theme.palette.text.primary,
          lineHeight: 1,
          mb: 0.2,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          ...mono,
          fontSize: '0.5rem',
          color: accentColor
            ? alpha(accentColor, 0.7)
            : alpha(theme.palette.text.primary, 0.3),
          whiteSpace: 'nowrap',
        }}
      >
        {sub}
      </Typography>
    </Box>
  );
};

interface Props {
  contributors: DashboardFeaturedContributor[];
  isLoading?: boolean;
  viewAllHref?: string;
}

const ContributorCard: React.FC<{
  c: DashboardFeaturedContributor;
  rank: number;
  onClick: () => void;
  maxScore: number;
  maxMerged: number;
}> = ({ c, rank, onClick, maxScore, maxMerged }) => {
  const theme = useTheme();
  const accent = ACCENT[rank] ?? theme.palette.text.primary;
  const avatarUsername = c.githubUsername ?? c.githubId;
  const cred = c.credibility ?? 0;
  const earn = c.earnings?.usdPerDay ?? 0;

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
      c.repos.slice(0, 3).map((repo, idx) => (
        <Box
          key={`${c.githubId}-${repo}`}
          sx={{
            ...mono,
            fontSize: '0.58rem',
            fontWeight: 600,
            color: alpha(theme.palette.text.primary, 0.45),
            backgroundColor: alpha(theme.palette.common.white, 0.04),
            border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
            borderRadius: 99,
            px: 0.85,
            py: 0.2,
            whiteSpace: 'nowrap',
          }}
        >
          {idx === 2 && c.repos.length > 3
            ? `+${c.repos.length - 2}`
            : repo.split('/').pop() || repo}
        </Box>
      )),
    [c.repos, c.githubId, theme],
  );

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        columnGap: { xs: 1, sm: 1.5 },
        px: 1.25,
        py: 0.9,
        borderRadius: 1.5,
        border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
        borderLeft: `3px solid ${accent}`,
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
        '&:hover': {
          backgroundColor: alpha(theme.palette.common.white, 0.03),
          borderColor: alpha(theme.palette.common.white, 0.14),
          borderLeftColor: accent,
        },
        '&:focus-visible': {
          outline: `2px solid ${alpha(accent, 0.5)}`,
          outlineOffset: 2,
        },
      }}
    >
      {/* Left: rank + avatar + identity */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minWidth: 0 }}>
        <Typography
          sx={{
            ...mono,
            fontSize: '0.7rem',
            fontWeight: 700,
            color: accent,
            width: 22,
            flexShrink: 0,
          }}
        >
          #{rank + 1}
        </Typography>
        <Avatar
          src={getGithubAvatarSrc(avatarUsername)}
          alt={avatarUsername}
          sx={{
            width: 36,
            height: 36,
            border: `1.5px solid ${alpha(theme.palette.common.white, 0.14)}`,
            flexShrink: 0,
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              ...mono,
              fontSize: '0.82rem',
              fontWeight: 700,
              color: theme.palette.text.primary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              mb: 0.2,
            }}
          >
            {c.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.45, minWidth: 0 }}>
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                backgroundColor: accent,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                ...mono,
                fontSize: '0.58rem',
                fontWeight: 500,
                color: alpha(theme.palette.text.primary, 0.4),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {c.featuredLabel}
              {earn > 0 && (
                <Box
                  component="span"
                  sx={{ color: theme.palette.status.success, ml: 0.5 }}
                >
                  ${Math.round(earn)}/d
                </Box>
              )}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Center: stats + cred */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.55, minWidth: { xs: 130, sm: 190, md: 210 } }}>
        <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, alignItems: 'flex-end' }}>
          <Box
            sx={{
              px: 0.7,
              py: 0.28,
              borderRadius: 1,
              border: `1px solid ${alpha(accent, 0.22)}`,
              backgroundColor: alpha(accent, 0.07),
            }}
          >
            <Typography
              sx={{ ...mono, fontSize: '1.05rem', fontWeight: 800, color: accent, lineHeight: 1 }}
            >
              {(c.score ?? 0).toLocaleString()}
            </Typography>
            <Typography
              sx={{ ...mono, fontSize: '0.48rem', color: alpha(theme.palette.text.primary, 0.35), mt: 0.15 }}
            >
              contributor score
            </Typography>
          </Box>
          <Box>
            <Typography
              sx={{ ...mono, fontSize: '1.05rem', fontWeight: 800, color: theme.palette.text.primary, lineHeight: 1 }}
            >
              {c.mergedPrs ?? 0}
            </Typography>
            <Typography
              sx={{ ...mono, fontSize: '0.48rem', color: alpha(theme.palette.text.primary, 0.35), mt: 0.15 }}
            >
              merged PRs
            </Typography>
          </Box>
        </Box>
        {cred > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                flex: 1,
                height: 3,
                borderRadius: 99,
                backgroundColor: alpha(theme.palette.common.white, 0.07),
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${Math.round(cred * 100)}%`,
                  height: '100%',
                  borderRadius: 99,
                  backgroundColor: accent,
                  transition: 'width 0.5s ease',
                }}
              />
            </Box>
            <Typography
              sx={{ ...mono, fontSize: '0.52rem', color: alpha(theme.palette.text.primary, 0.38), whiteSpace: 'nowrap' }}
            >
              {Math.round(cred * 100)}% cred
            </Typography>
          </Box>
        )}
      </Box>

      {/* Right: repo pills + arrow */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.4 }}>
        {repoPills.length > 0 && (
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.4 }}>
            {repoPills}
          </Box>
        )}
        <Typography
          sx={{ ...mono, fontSize: '0.72rem', color: alpha(theme.palette.text.primary, 0.2), flexShrink: 0 }}
        >
          →
        </Typography>
      </Box>
    </Box>
  );
};

const FeaturedContributorsSpotlight: React.FC<Props> = ({
  contributors,
  isLoading = false,
  viewAllHref,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const open = useCallback(
    (githubId: string) =>
      navigate(`/miners/details?githubId=${encodeURIComponent(githubId)}`, {
        state: { backTo: '/dashboard' },
      }),
    [navigate],
  );

  const kpis = useMemo(() => {
    if (contributors.length === 0) return null;
    const topScore = Math.max(...contributors.map((c) => c.score ?? 0));
    const totalMerged = contributors.reduce((s, c) => s + (c.mergedPrs ?? 0), 0);
    const totalClosed = contributors.reduce((s, c) => s + (c.closedPrs ?? 0), 0);
    const uniqueRepos = new Set(contributors.flatMap((c) => c.repos)).size;
    const totalEarnings = contributors.reduce(
      (s, c) => s + (c.earnings?.usdPerDay ?? 0),
      0,
    );
    return { topScore, totalMerged, totalClosed, uniqueRepos, totalEarnings };
  }, [contributors]);

  const maxScore = useMemo(
    () => Math.max(...contributors.map((c) => c.score ?? 0), 1),
    [contributors],
  );
  const maxMerged = useMemo(
    () => Math.max(...contributors.map((c) => c.mergedPrs ?? 0), 1),
    [contributors],
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
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 0.5,
          mb: 0.4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            sx={{
              ...mono,
              fontSize: { xs: '1rem', sm: '1.06rem' },
              fontWeight: 700,
              color: theme.palette.text.primary,
            }}
          >
            Featured Contributors
          </Typography>
          <Box
            sx={{
              ...mono,
              fontSize: '0.52rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: theme.palette.status.success,
              backgroundColor: alpha(theme.palette.status.success, 0.1),
              border: `1px solid ${alpha(theme.palette.status.success, 0.22)}`,
              borderRadius: 99,
              px: 0.8,
              py: 0.22,
              whiteSpace: 'nowrap',
            }}
          >
            OSS 35d
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              ...mono,
              fontSize: '0.55rem',
              color: alpha(theme.palette.text.primary, 0.28),
            }}
          >
            Updated with dashboard data
          </Typography>
          {viewAllHref && (
            <Typography
              onClick={() => navigate(viewAllHref)}
              sx={{
                ...theme.typography.tooltipLabel,
                color: alpha(theme.palette.text.primary, 0.5),
                cursor: 'pointer',
                fontWeight: 700,
                '&:hover': { color: theme.palette.text.primary },
              }}
            >
              View all →
            </Typography>
          )}
        </Box>
      </Box>

      {/* Subtitle */}
      <Typography
        sx={{
          ...mono,
          fontSize: '0.58rem',
          color: alpha(theme.palette.text.primary, 0.3),
          mb: 1.25,
        }}
      >
        OSS contribution leaders by score, merged PR output, and repository impact.
      </Typography>

      {/* KPI strip */}
      {!isLoading && kpis && (
        <Box
          sx={{
            display: 'flex',
            mb: 1.25,
            borderRadius: 1.5,
            border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
            backgroundColor: alpha(theme.palette.common.white, 0.02),
            overflow: 'hidden',
          }}
        >
          <KpiBox
            title="Highlighted score"
            value={kpis.topScore.toLocaleString()}
            sub={`${contributors.length} miners`}
            accentColor={theme.palette.status.success}
          />
          <KpiBox
            title="Merged PRs"
            value={kpis.totalMerged.toLocaleString()}
            sub="all time"
          />
          <KpiBox
            title="Closed PRs"
            value={kpis.totalClosed.toLocaleString()}
            sub="reviewed work"
          />
          <KpiBox
            title="Repos touched"
            value={String(kpis.uniqueRepos)}
            sub="35d context"
          />
          <KpiBox
            title="Daily earnings"
            value={`$${Math.round(kpis.totalEarnings)}/d`}
            sub="highlighted total"
            accentColor={theme.palette.status.success}
            isLast
          />
        </Box>
      )}

      {isLoading ? (
        <Box
          sx={{
            minHeight: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={28} />
        </Box>
      ) : contributors.length === 0 ? (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
          No contributor highlights available.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
          {contributors.map((c, i) => (
            <ContributorCard
              key={`${c.featuredLabel}-${c.githubId}`}
              c={c}
              rank={i}
              onClick={() => open(c.githubId)}
              maxScore={maxScore}
              maxMerged={maxMerged}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FeaturedContributorsSpotlight;
