import React, { useMemo } from 'react';
import { Box, Card, Chip, Typography, alpha, type Theme } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import { LinkBox } from '../components/common/linkBehavior';
import { useReposAndWeights, useLanguagesAndWeights } from '../api';
import { getRepositoryOwnerAvatarSrc } from '../utils/avatar';

const FONTS = { mono: '"JetBrains Mono", monospace' } as const;
const DEFAULT_ELIGIBILITY_GATE = 80;

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Typography
    sx={(theme) => ({
      fontFamily: FONTS.mono,
      fontSize: '0.85rem',
      fontWeight: 600,
      color: theme.palette.text.primary,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      mb: { xs: 1.5, sm: 2 },
      pb: { xs: 1, sm: 1.25 },
      borderBottom: '1px solid',
      borderColor: theme.palette.border.light,
    })}
  >
    {children}
  </Typography>
);

const cardSx = (theme: Theme) => ({
  p: { xs: 2, sm: 3 },
  borderRadius: 2,
  border: '1px solid',
  borderColor: theme.palette.border.light,
  backgroundColor: theme.palette.surface.transparent,
  display: 'flex',
  flexDirection: 'column' as const,
});

const EcosystemPage: React.FC = () => {
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const { data: languages, isLoading: isLoadingLanguages } =
    useLanguagesAndWeights();

  const isLoading = isLoadingRepos || isLoadingLanguages;

  // ── Repository Emission Map ────────────────────────────────────────────────
  const repoEmissionData = useMemo(() => {
    if (!repos) return [];

    const totalEmission = repos.reduce(
      (sum, repo) =>
        sum + (parseFloat(String(repo.config?.emissionShare ?? 0)) || 0),
      0,
    );

    return repos
      .map((repo) => ({
        fullName: repo.fullName,
        owner: repo.owner,
        emissionShare: parseFloat(String(repo.config?.emissionShare ?? 0)) || 0,
        eligibilityGate:
          repo.config?.eligibility?.min_credibility ?? DEFAULT_ELIGIBILITY_GATE,
        percentageOfTotal:
          totalEmission > 0
            ? ((parseFloat(String(repo.config?.emissionShare ?? 0)) || 0) /
                totalEmission) *
              100
            : 0,
      }))
      .sort((a, b) => b.emissionShare - a.emissionShare);
  }, [repos]);

  // ── Language Weight Chart ───────────────────────────────────────────────────
  const languageWeightData = useMemo(() => {
    if (!languages) return [];

    // Group by language field (null → use extension as key)
    const grouped = new Map<
      string,
      { extensions: Set<string>; weight: number }
    >();

    languages.forEach((lang) => {
      const key = lang.language || lang.extension;
      const current = grouped.get(key) || {
        extensions: new Set<string>(),
        weight: 0,
      };
      current.extensions.add(lang.extension);
      current.weight = Math.max(
        current.weight,
        parseFloat(String(lang.weight)) || 0,
      );
      grouped.set(key, current);
    });

    // Convert to array and sort by weight descending
    const result = Array.from(grouped.entries()).map(([name, data]) => ({
      name,
      extensions: Array.from(data.extensions),
      weight: data.weight,
    }));

    const maxWeight = Math.max(...result.map((l) => l.weight), 1);

    return result
      .map((item) => ({
        ...item,
        weightPercentage: (item.weight / maxWeight) * 100,
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [languages]);

  const getRepoHref = (name: string) =>
    `/miners/repository?name=${encodeURIComponent(name)}`;

  return (
    <Page title="Ecosystem">
      <SEO
        title="Ecosystem Map"
        description="View the network's earning potential by repository and programming language."
      />
      <Box
        sx={{
          width: '100%',
          maxWidth: 1440,
          mx: 'auto',
          py: { xs: 1.5, sm: 3 },
          px: { xs: 1.25, sm: 3 },
        }}
      >
        {/* ── Repository Emission Map ─────────────────────────────────────── */}
        <Card sx={cardSx} elevation={0}>
          <SectionHeader>Repository Emission Map</SectionHeader>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {isLoading ? (
              <Typography
                sx={(theme) => ({
                  color: alpha(theme.palette.text.primary, 0.3),
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  py: 4,
                  textAlign: 'center',
                })}
              >
                Loading repository data...
              </Typography>
            ) : repoEmissionData.length === 0 ? (
              <Typography
                sx={(theme) => ({
                  color: alpha(theme.palette.text.primary, 0.3),
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  py: 4,
                  textAlign: 'center',
                })}
              >
                No repository data available
              </Typography>
            ) : (
              repoEmissionData.map((repo, index) => (
                <LinkBox
                  key={repo.fullName}
                  href={getRepoHref(repo.fullName)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: 1, sm: 2 },
                    py: 1.5,
                    px: { xs: 1, sm: 1.5 },
                    borderRadius: 1,
                    transition: 'background 0.15s',
                    mx: -1,
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                  }}
                >
                  {/* Rank */}
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                      minWidth: { xs: 24, sm: 32 },
                      textAlign: 'center',
                    }}
                  >
                    #{index + 1}
                  </Typography>

                  {/* Repository name with avatar */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Box
                      component="img"
                      src={getRepositoryOwnerAvatarSrc(repo.owner)}
                      alt={repo.owner}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        flexShrink: 0,
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    />
                    <Typography
                      sx={(theme) => ({
                        fontFamily: FONTS.mono,
                        fontSize: '0.85rem',
                        color: theme.palette.text.primary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                      })}
                    >
                      {repo.fullName}
                    </Typography>
                  </Box>

                  {/* Eligibility gate */}
                  <Typography
                    sx={(theme) => ({
                      fontFamily: FONTS.mono,
                      fontSize: '0.75rem',
                      color: alpha(theme.palette.text.primary, 0.6),
                      minWidth: { xs: 60, sm: 80 },
                      textAlign: 'right',
                    })}
                  >
                    {repo.eligibilityGate}%
                  </Typography>

                  {/* Emission bar */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      minWidth: { xs: 120, sm: 180 },
                    }}
                  >
                    <Box
                      sx={(theme) => ({
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: alpha(theme.palette.status.info, 0.15),
                        overflow: 'hidden',
                      })}
                    >
                      <Box
                        sx={(theme) => ({
                          width: `${repo.percentageOfTotal}%`,
                          height: '100%',
                          backgroundColor: theme.palette.status.info,
                          borderRadius: 3,
                        })}
                      />
                    </Box>
                    <Typography
                      sx={(theme) => ({
                        fontFamily: FONTS.mono,
                        fontSize: '0.75rem',
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        minWidth: { xs: 70, sm: 90 },
                        textAlign: 'right',
                      })}
                    >
                      {repo.emissionShare.toFixed(4)} (
                      {repo.percentageOfTotal.toFixed(1)}%)
                    </Typography>
                  </Box>
                </LinkBox>
              ))
            )}
          </Box>
        </Card>

        {/* ── Language Weight Chart ─────────────────────────────────────────── */}
        <Card sx={{ ...cardSx, mt: 3 }} elevation={0}>
          <SectionHeader>Language Weight Chart</SectionHeader>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {isLoading ? (
              <Typography
                sx={(theme) => ({
                  color: alpha(theme.palette.text.primary, 0.3),
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  py: 4,
                  textAlign: 'center',
                })}
              >
                Loading language data...
              </Typography>
            ) : languageWeightData.length === 0 ? (
              <Typography
                sx={(theme) => ({
                  color: alpha(theme.palette.text.primary, 0.3),
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  py: 4,
                  textAlign: 'center',
                })}
              >
                No language data available
              </Typography>
            ) : (
              languageWeightData.map((lang, index) => (
                <Box
                  key={lang.name}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: 1, sm: 2 },
                    py: 1.5,
                    px: { xs: 1, sm: 1.5 },
                    borderRadius: 1,
                  }}
                >
                  {/* Rank */}
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                      minWidth: { xs: 24, sm: 32 },
                      textAlign: 'center',
                    }}
                  >
                    #{index + 1}
                  </Typography>

                  {/* Language name */}
                  <Typography
                    sx={(theme) => ({
                      fontFamily: FONTS.mono,
                      fontSize: '0.85rem',
                      color: theme.palette.text.primary,
                      fontWeight: 500,
                      minWidth: { xs: 80, sm: 120 },
                    })}
                  >
                    {lang.name}
                  </Typography>

                  {/* Extension chips */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {lang.extensions.map((ext) => (
                      <Chip
                        key={ext}
                        label={ext}
                        size="small"
                        variant="info"
                        sx={{
                          fontFamily: FONTS.mono,
                          fontSize: '0.7rem',
                          height: 22,
                        }}
                      />
                    ))}
                  </Box>

                  {/* Weight bar */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      minWidth: { xs: 140, sm: 200 },
                    }}
                  >
                    <Box
                      sx={(theme) => ({
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: alpha(
                          theme.palette.status.success,
                          0.15,
                        ),
                        overflow: 'hidden',
                      })}
                    >
                      <Box
                        sx={(theme) => ({
                          width: `${lang.weightPercentage}%`,
                          height: '100%',
                          backgroundColor: theme.palette.status.success,
                          borderRadius: 3,
                        })}
                      />
                    </Box>
                    <Typography
                      sx={(theme) => ({
                        fontFamily: FONTS.mono,
                        fontSize: '0.75rem',
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        minWidth: { xs: 60, sm: 80 },
                        textAlign: 'right',
                      })}
                    >
                      {lang.weight.toFixed(4)}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Card>
      </Box>
    </Page>
  );
};

export default EcosystemPage;
