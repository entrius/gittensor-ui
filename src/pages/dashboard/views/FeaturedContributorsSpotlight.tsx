import React, { useCallback, useMemo } from 'react';
import {
  Avatar,
  Box,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { RANK_COLORS } from '../../../theme';
import { getGithubAvatarSrc } from '../../../utils';
import { type DashboardFeaturedContributor } from '../dashboardData';

const FONTS = { mono: '"JetBrains Mono", ui-monospace, monospace' } as const;
const ACCENT = [RANK_COLORS.first, RANK_COLORS.second, RANK_COLORS.third];
const mono = { fontFamily: FONTS.mono } as const;

const KpiBox: React.FC<{
  title: string;
  value: string;
  sub: string;
  tooltip: string;
  accentColor?: string;
  isLast?: boolean;
}> = ({ title, value, sub, tooltip, accentColor, isLast }) => {
  const theme = useTheme();
  return (
    <Tooltip title={tooltip} placement="top" arrow>
      <Box
        sx={{
          flex: 1,
          minWidth: 'max-content',
          px: { xs: 1, sm: 1.5 },
          py: 0.85,
          borderRight: isLast
            ? 'none'
            : `1px solid ${alpha(theme.palette.common.white, 0.07)}`,
          cursor: 'default',
        }}
      >
        <Typography
          sx={{
            ...mono,
            fontSize: '0.5rem',
            fontWeight: 600,
            color: alpha(theme.palette.text.primary, 0.7),
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
              : alpha(theme.palette.text.primary, 0.65),
            whiteSpace: 'nowrap',
          }}
        >
          {sub}
        </Typography>
      </Box>
    </Tooltip>
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
}> = ({ c, rank, onClick }) => {
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

  const repoAvatars = useMemo(() => {
    const show = c.repos.slice(0, 3);
    const extra = c.repos.length > 3 ? c.repos.length - 2 : 0;
    return show.map((repo, idx) => {
      const owner = repo.split('/')[0];
      if (idx === 2 && extra > 0) {
        return (
          <Tooltip
            key={repo}
            title={`+${extra} more repos`}
            placement="top"
            arrow
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: alpha(theme.palette.common.white, 0.1),
                border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Typography
                sx={{
                  ...mono,
                  fontSize: '0.44rem',
                  fontWeight: 700,
                  color: alpha(theme.palette.text.primary, 0.8),
                }}
              >
                +{extra}
              </Typography>
            </Box>
          </Tooltip>
        );
      }
      return (
        <Tooltip key={repo} title={repo} placement="top" arrow>
          <Avatar
            src={`https://github.com/${owner}.png`}
            alt={repo}
            sx={{
              width: 28,
              height: 28,
              border: `1px solid ${alpha(theme.palette.common.white, 0.14)}`,
              flexShrink: 0,
            }}
          />
        </Tooltip>
      );
    });
  }, [c.repos, theme]);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr auto auto', sm: '1fr auto 1fr' },
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, sm: 1.5 },
          minWidth: 0,
        }}
      >
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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.45,
              minWidth: 0,
            }}
          >
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
                color: alpha(theme.palette.text.primary, 0.75),
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
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.55,
          minWidth: { xs: 130, sm: 190, md: 210 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: { xs: 1.5, sm: 2 },
            alignItems: 'flex-end',
          }}
        >
          <Tooltip
            title="Composite score based on merged PR quality, token coverage, repo weight, and credibility multipliers."
            placement="top"
            arrow
          >
            <Box
              sx={{
                px: 0.7,
                py: 0.28,
                borderRadius: 1,
                border: `1px solid ${alpha(accent, 0.22)}`,
                backgroundColor: alpha(accent, 0.07),
                cursor: 'default',
              }}
            >
              <Typography
                sx={{
                  ...mono,
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: accent,
                  lineHeight: 1,
                }}
              >
                {(c.score ?? 0).toLocaleString()}
              </Typography>
              <Typography
                sx={{
                  ...mono,
                  fontSize: '0.48rem',
                  color: alpha(theme.palette.text.primary, 0.7),
                  mt: 0.15,
                }}
              >
                contributor score
              </Typography>
            </Box>
          </Tooltip>
          <Box>
            <Typography
              sx={{
                ...mono,
                fontSize: '1.05rem',
                fontWeight: 800,
                color: theme.palette.text.primary,
                lineHeight: 1,
              }}
            >
              {c.mergedPrs ?? 0}
            </Typography>
            <Typography
              sx={{
                ...mono,
                fontSize: '0.48rem',
                color: alpha(theme.palette.text.primary, 0.7),
                mt: 0.15,
              }}
            >
              merged PRs
            </Typography>
          </Box>
        </Box>
        {cred > 0 && (
          <Tooltip
            title="Credibility score: reflects consistency of high-quality contributions over time. Higher means the miner has a proven track record."
            placement="top"
            arrow
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'default',
              }}
            >
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
                sx={{
                  ...mono,
                  fontSize: '0.52rem',
                  color: alpha(theme.palette.text.primary, 0.72),
                  whiteSpace: 'nowrap',
                }}
              >
                {Math.round(cred * 100)}% cred
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* Right: owner avatars + arrow */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 0.4,
        }}
      >
        {repoAvatars.length > 0 && (
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: 0.5,
              alignItems: 'center',
            }}
          >
            {repoAvatars}
          </Box>
        )}
        <Typography
          sx={{
            ...mono,
            fontSize: '0.72rem',
            color: alpha(theme.palette.text.primary, 0.55),
            flexShrink: 0,
          }}
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
    const totalMerged = contributors.reduce(
      (s, c) => s + (c.mergedPrs ?? 0),
      0,
    );
    const totalClosed = contributors.reduce(
      (s, c) => s + (c.closedPrs ?? 0),
      0,
    );
    const uniqueRepos = new Set(contributors.flatMap((c) => c.repos)).size;
    const totalEarnings = contributors.reduce(
      (s, c) => s + (c.earnings?.usdPerDay ?? 0),
      0,
    );
    return { topScore, totalMerged, totalClosed, uniqueRepos, totalEarnings };
  }, [contributors]);

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
          mb: 1.25,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
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
          <Tooltip
            title="Showing top OSS contributors from the last 35 days based on merged PR score, token coverage, and repository impact."
            placement="top"
            arrow
          >
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
                cursor: 'default',
              }}
            >
              OSS 35d
            </Box>
          </Tooltip>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <Typography
            sx={{
              ...mono,
              fontSize: '0.55rem',
              color: alpha(theme.palette.text.primary, 0.6),
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

      {/* KPI strip */}
      {!isLoading && kpis && (
        <Box
          sx={{
            display: 'flex',
            mb: 1.25,
            borderRadius: 1.5,
            border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
            backgroundColor: alpha(theme.palette.common.white, 0.02),
            overflowX: 'auto',
            overflowY: 'hidden',
          }}
        >
          <KpiBox
            title="Highlighted score"
            value={kpis.topScore.toLocaleString()}
            sub={`${contributors.length} miners`}
            tooltip="Highest contributor score among the highlighted miners in this 35-day window."
            accentColor={theme.palette.status.success}
          />
          <KpiBox
            title="Merged PRs"
            value={kpis.totalMerged.toLocaleString()}
            sub="all time"
            tooltip="Total merged pull requests across all highlighted contributors, all time."
          />
          <KpiBox
            title="Closed PRs"
            value={kpis.totalClosed.toLocaleString()}
            sub="reviewed work"
            tooltip="Total closed (not merged) pull requests — includes reviewed, declined, or superseded PRs."
          />
          <KpiBox
            title="Repos touched"
            value={String(kpis.uniqueRepos)}
            sub="35d context"
            tooltip="Number of unique repositories these contributors have merged PRs into during the 35-day window."
          />
          <KpiBox
            title="Daily earnings"
            value={`$${Math.round(kpis.totalEarnings)}/d`}
            sub="highlighted total"
            tooltip="Estimated combined daily USD earnings across all highlighted contributors based on recent scoring."
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
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FeaturedContributorsSpotlight;
