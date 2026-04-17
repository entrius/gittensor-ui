import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Tooltip,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { type RepoTerritory } from '../../hooks/useWatchlistIntel';
import { STATUS_COLORS } from '../../theme';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';

interface TerritoryGridProps {
  territoryMap: Map<string, RepoTerritory>;
  pinnedIds: string[];
  /** Map from githubId → display name */
  nameMap?: Map<string, string>;
  isLoading: boolean;
}

const MINER_COLORS = [
  STATUS_COLORS.merged,
  STATUS_COLORS.info,
  STATUS_COLORS.warning,
  STATUS_COLORS.error,
];

export const TerritoryGrid: React.FC<TerritoryGridProps> = ({
  territoryMap,
  pinnedIds,
  nameMap,
  isLoading,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const sortedTerritories = useMemo(
    () =>
      Array.from(territoryMap.values())
        .filter((t) => t.presence.length > 0)
        .sort((a, b) => {
          // Sort by weight first, then by total PR count
          if (b.weight !== a.weight) return b.weight - a.weight;
          const totalA = a.presence.reduce((s, p) => s + p.prCount, 0);
          const totalB = b.presence.reduce((s, p) => s + p.prCount, 0);
          return totalB - totalA;
        }),
    [territoryMap],
  );

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    pinnedIds.forEach((id, i) => {
      map.set(id, MINER_COLORS[i % MINER_COLORS.length]);
    });
    return map;
  }, [pinnedIds]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (sortedTerritories.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
            color: 'text.secondary',
          }}
        >
          No repository data available yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          Territory Map ({sortedTerritories.length} repos)
        </Typography>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.72rem',
            color: 'text.secondary',
          }}
        >
          Repos sized by weight. Colors show who dominates. Striped = contested.
        </Typography>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {pinnedIds.map((id, i) => (
          <Box
            key={id}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: MINER_COLORS[i % MINER_COLORS.length],
              }}
            />
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.68rem',
                color: 'text.secondary',
              }}
            >
              {nameMap?.get(id) ?? id}
            </Typography>
          </Box>
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: `2px dashed ${theme.palette.text.secondary}`,
            }}
          />
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.68rem',
              color: 'text.secondary',
            }}
          >
            Contested
          </Typography>
        </Box>
      </Box>

      {/* Territory tiles */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 1.5,
        }}
      >
        {sortedTerritories.map((territory) => {
          const dominant = territory.presence.sort(
            (a, b) => b.totalScore - a.totalScore,
          )[0];
          const dominantColor = dominant
            ? (colorMap.get(dominant.githubId) ?? theme.palette.text.secondary)
            : theme.palette.text.secondary;

          const totalPrs = territory.presence.reduce(
            (sum, p) => sum + p.prCount,
            0,
          );

          return (
            <Tooltip
              key={territory.fullName}
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography
                    sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 0.5 }}
                  >
                    {territory.fullName}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', mb: 0.5 }}>
                    Weight: {territory.weight.toFixed(2)} · {totalPrs} PRs
                  </Typography>
                  {territory.presence.map((p) => (
                    <Typography key={p.githubId} sx={{ fontSize: '0.68rem' }}>
                      {p.author}: {p.prCount} PRs · {p.totalScore.toFixed(2)}{' '}
                      pts
                    </Typography>
                  ))}
                </Box>
              }
              arrow
              placement="top"
            >
              <Box
                onClick={() =>
                  navigate(
                    `/miners/repository?name=${encodeURIComponent(territory.fullName)}`,
                  )
                }
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: territory.isContested
                    ? STATUS_COLORS.warning
                    : alpha(dominantColor, 0.3),
                  backgroundColor: alpha(dominantColor, 0.06),
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    backgroundColor: alpha(dominantColor, 0.12),
                    borderColor: alpha(dominantColor, 0.5),
                  },
                  // Contested stripe overlay
                  ...(territory.isContested && {
                    backgroundImage: `repeating-linear-gradient(
                      45deg,
                      transparent,
                      transparent 6px,
                      ${alpha(STATUS_COLORS.warning, 0.08)} 6px,
                      ${alpha(STATUS_COLORS.warning, 0.08)} 12px
                    )`,
                  }),
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 0.5,
                  }}
                >
                  {territory.fullName.split('/')[1] ?? territory.fullName}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                    }}
                  >
                    {territory.weight > 0
                      ? `w:${territory.weight.toFixed(2)}`
                      : `${totalPrs} PRs`}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    {territory.presence.slice(0, 3).map((p) => (
                      <Avatar
                        key={p.githubId}
                        src={getGithubAvatarSrc(p.author)}
                        sx={{
                          width: 16,
                          height: 16,
                          border: `1px solid ${colorMap.get(p.githubId) ?? 'transparent'}`,
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};
