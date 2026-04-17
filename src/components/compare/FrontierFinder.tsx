import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useReposAndWeights } from '../../api';
import { type RepoTerritory } from '../../hooks/useWatchlistIntel';
import { STATUS_COLORS } from '../../theme';

interface FrontierFinderProps {
  territoryMap: Map<string, RepoTerritory>;
  isLoading: boolean;
}

export const FrontierFinder: React.FC<FrontierFinderProps> = ({
  territoryMap,
  isLoading: isIntelLoading,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data: repos, isLoading: isReposLoading } = useReposAndWeights();

  const isLoading = isIntelLoading || isReposLoading;

  // Find repos that no pinned miner has touched
  const frontierRepos = useMemo(() => {
    if (!repos) return [];

    return repos
      .filter((r) => {
        const weight = parseFloat(String(r.weight ?? '0'));
        if (weight <= 0.3) return false; // Skip low-weight repos
        const territory = territoryMap.get(r.fullName);
        // Frontier = no pinned miner has PRs here
        return !territory || territory.presence.length === 0;
      })
      .map((r) => ({
        fullName: r.fullName,
        weight: parseFloat(String(r.weight ?? '0')),
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 30); // Top 30
  }, [repos, territoryMap]);

  // Contested repos — repos where 2+ pinned miners have PRs
  const contestedRepos = useMemo(() => {
    return Array.from(territoryMap.values())
      .filter((t) => t.isContested)
      .sort((a, b) => b.weight - a.weight);
  }, [territoryMap]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  const headerSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.68rem',
    fontWeight: 600,
    color: theme.palette.text.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    borderBottom: `1px solid ${theme.palette.border.light}`,
    py: 1,
  };

  const cellSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.78rem',
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.border.light}`,
    py: 1,
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Frontier section */}
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
          Uncontested Repos ({frontierRepos.length})
        </Typography>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.72rem',
            color: 'text.secondary',
            mb: 2,
          }}
        >
          High-weight repos where none of your pinned miners have PRs —
          potential opportunities.
        </Typography>

        {frontierRepos.length === 0 ? (
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              color: 'text.secondary',
              py: 3,
              textAlign: 'center',
            }}
          >
            All tracked repos have miner presence. Expand your watchlist to
            discover gaps.
          </Typography>
        ) : (
          <TableContainer
            sx={{
              border: `1px solid ${theme.palette.border.light}`,
              borderRadius: 2,
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerSx}>Repository</TableCell>
                  <TableCell align="right" sx={headerSx}>
                    Weight
                  </TableCell>
                  <TableCell align="center" sx={headerSx}>
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {frontierRepos.map((repo) => (
                  <TableRow
                    key={repo.fullName}
                    hover
                    onClick={() =>
                      navigate(
                        `/miners/repository?name=${encodeURIComponent(repo.fullName)}`,
                      )
                    }
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'surface.subtle',
                      },
                    }}
                  >
                    <TableCell sx={cellSx}>
                      <Typography
                        sx={{
                          fontSize: 'inherit',
                          fontFamily: 'inherit',
                          color: STATUS_COLORS.info,
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {repo.fullName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={cellSx}>
                      {repo.weight.toFixed(2)}
                    </TableCell>
                    <TableCell align="center" sx={cellSx}>
                      <Chip
                        size="small"
                        label="Open"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          height: 20,
                          backgroundColor: alpha(STATUS_COLORS.success, 0.12),
                          color: STATUS_COLORS.success,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Contested section */}
      {contestedRepos.length > 0 && (
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
            Contested Repos ({contestedRepos.length})
          </Typography>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              color: 'text.secondary',
              mb: 2,
            }}
          >
            Repos where 2+ pinned miners compete.
          </Typography>

          <TableContainer
            sx={{
              border: `1px solid ${theme.palette.border.light}`,
              borderRadius: 2,
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerSx}>Repository</TableCell>
                  <TableCell align="right" sx={headerSx}>
                    Weight
                  </TableCell>
                  <TableCell sx={headerSx}>Miners</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contestedRepos.map((territory) => (
                  <TableRow
                    key={territory.fullName}
                    hover
                    onClick={() =>
                      navigate(
                        `/miners/repository?name=${encodeURIComponent(territory.fullName)}`,
                      )
                    }
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'surface.subtle',
                      },
                    }}
                  >
                    <TableCell sx={cellSx}>
                      <Typography
                        sx={{
                          fontSize: 'inherit',
                          fontFamily: 'inherit',
                          color: STATUS_COLORS.warning,
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {territory.fullName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={cellSx}>
                      {territory.weight.toFixed(2)}
                    </TableCell>
                    <TableCell sx={cellSx}>
                      {territory.presence
                        .map(
                          (p) =>
                            `${p.author} (${p.prCount})`,
                        )
                        .join(', ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};
