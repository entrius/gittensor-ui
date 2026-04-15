import React, { useMemo } from 'react';

import { Avatar, Box, Card, Tooltip, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';

import { useNavigate } from 'react-router-dom';
import { Page } from '../components/layout';
import { TopRepositoriesTable, SEO } from '../components';
import { useAllPrs, useReposAndWeights } from '../api';
import { type CommitLog } from '../api/models/Dashboard';

const FONTS = { mono: '"JetBrains Mono", monospace' } as const;

// ── Shared row style ────────────────────────────────────────────────────────
const ROW_HEIGHT = 40; // px – keeps every row exactly the same across cards

const HighlightRow: React.FC<{
  onClick: () => void;
  avatar: string;
  avatarBg?: (theme: Theme) => string;
  label: React.ReactNode;
  right: React.ReactNode;
}> = ({ onClick, avatar, avatarBg, label, right }) => (
  <Box
    onClick={onClick}
    sx={(theme) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: ROW_HEIGHT,
      py: 0,
      px: 1,
      borderRadius: 1,
      cursor: 'pointer',
      transition: 'background 0.15s',
      mx: -1,
      '&:hover': { backgroundColor: theme.palette.surface.light },
    })}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        overflow: 'hidden',
        mr: 2,
        flex: 1,
      }}
    >
      <Avatar
        src={avatar}
        sx={(theme) => ({
          width: 24,
          height: 24,
          flexShrink: 0,
          border: '1px solid',
          borderColor: theme.palette.border.light,
          backgroundColor: avatarBg
            ? avatarBg(theme)
            : theme.palette.surface.transparent,
        })}
      />
      {label}
    </Box>
    {right}
  </Box>
);

const getAvatarBg = (name: string) => {
  const owner = name.split('/')[0];
  if (owner === 'opentensor')
    return (theme: Theme) => theme.palette.text.primary;
  if (owner === 'bitcoin')
    return (theme: Theme) => theme.palette.status.warningOrange;
  return (theme: Theme) => theme.palette.surface.transparent;
};

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Typography
    sx={(theme) => ({
      fontFamily: FONTS.mono,
      fontSize: '0.75rem',
      fontWeight: 600,
      color: theme.palette.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      mb: 1.5,
      pb: 1,
      borderBottom: '1px solid',
      borderColor: theme.palette.border.subtle,
    })}
  >
    {children}
  </Typography>
);

const cardSx = (theme: Theme) => ({
  p: 2,
  borderRadius: 2,
  border: '1px solid',
  borderColor: theme.palette.border.light,
  backgroundColor: theme.palette.surface.transparent,
  display: 'flex',
  flexDirection: 'column' as const,
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: theme.palette.surface.light,
    borderColor: theme.palette.border.medium,
  },
});

// ── Page ────────────────────────────────────────────────────────────────────
const RepositoriesPage: React.FC = () => {
  const navigate = useNavigate();

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    if (date > now) return 'just now';
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
    if (days < 30) return `${days}d ${hrs % 24}h ago`;
    return `${days}d ago`;
  };

  const { data: allPRs, isLoading: isLoadingPRs } = useAllPrs();
  const { data: reposWithWeights, isLoading: isLoadingRepos } =
    useReposAndWeights();

  const isLoading = isLoadingPRs || isLoadingRepos;

  const handleSelectRepository = (repositoryFullName: string) => {
    navigate(
      `/miners/repository?name=${encodeURIComponent(repositoryFullName)}`,
      { state: { backLabel: 'Back to Repositories' } },
    );
  };

  // ── Main table stats ────────────────────────────────────────────────────
  const repoStats = useMemo(() => {
    if (!reposWithWeights) return [];

    const prStatsMap = new Map<
      string,
      { totalScore: number; totalPRs: number; uniqueMiners: Set<string> }
    >();

    if (allPRs) {
      allPRs.forEach((pr: CommitLog) => {
        if (!pr?.repository) return;
        // Only count merged PRs for the main table stats
        if (!pr.mergedAt) return;

        const repoKey = pr.repository.toLowerCase();
        const cur = prStatsMap.get(repoKey) || {
          totalScore: 0,
          totalPRs: 0,
          uniqueMiners: new Set<string>(),
        };
        cur.totalScore += parseFloat(pr.score || '0');
        cur.totalPRs += 1;
        if (pr.author) cur.uniqueMiners.add(pr.author);
        prStatsMap.set(repoKey, cur);
      });
    }

    return reposWithWeights
      .map((repo) => {
        const s = prStatsMap.get(repo.fullName.toLowerCase());
        return {
          repository: repo.fullName,
          totalScore: s?.totalScore || 0,
          totalPRs: s?.totalPRs || 0,
          uniqueMiners: s?.uniqueMiners || new Set<string>(),
          weight: repo.weight ? parseFloat(String(repo.weight)) : 0,
          inactiveAt: repo.inactiveAt,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [allPRs, reposWithWeights]);

  // ── Trending: repos with biggest % score increase in the last 7 days ──
  // Excludes brand-new repos (no prior score) so only genuine growth shows
  const trendingRepos = useMemo(() => {
    if (!allPRs || !reposWithWeights) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const repoScores = new Map<
      string,
      { recentScore: number; priorScore: number; recentPRs: number }
    >();

    allPRs.forEach((pr: CommitLog) => {
      const prDate = pr.mergedAt;
      if (!pr?.repository || !prDate) return;
      const score = parseFloat(pr.score || '0');

      const cur = repoScores.get(pr.repository) || {
        recentScore: 0,
        priorScore: 0,
        recentPRs: 0,
      };

      if (new Date(prDate) >= cutoff) {
        cur.recentScore += score;
        cur.recentPRs += 1;
      } else {
        cur.priorScore += score;
      }
      repoScores.set(pr.repository, cur);
    });

    const repoMap = new Map(reposWithWeights.map((r) => [r.fullName, r]));

    return Array.from(repoScores.entries())
      .filter(
        ([name, s]) =>
          repoMap.has(name) && s.recentScore > 0 && s.priorScore > 0,
      )
      .map(([name, s]) => ({
        name,
        recentScore: s.recentScore,
        priorScore: s.priorScore,
        pctIncrease: (s.recentScore / s.priorScore) * 100,
        prs: s.recentPRs,
      }))
      .sort((a, b) => b.pctIncrease - a.pctIncrease)
      .slice(0, 5);
  }, [allPRs, reposWithWeights]);

  // ── Most Collateral Staked: repos with highest total collateral on open PRs ──
  const topCollateralRepos = useMemo(() => {
    if (!allPRs || !reposWithWeights) return [];

    const repoMap = new Map(reposWithWeights.map((r) => [r.fullName, r]));

    // Sum collateral from open PRs per repo
    const repoCollateral = new Map<
      string,
      { totalCollateral: number; openPRs: number }
    >();

    allPRs.forEach((pr: CommitLog) => {
      if (!pr?.repository || pr.prState !== 'OPEN') return;
      if (!repoMap.has(pr.repository)) return;
      const collateral = parseFloat(pr.collateralScore || '0');
      if (collateral <= 0) return;

      const cur = repoCollateral.get(pr.repository) || {
        totalCollateral: 0,
        openPRs: 0,
      };
      cur.totalCollateral += collateral;
      cur.openPRs += 1;
      repoCollateral.set(pr.repository, cur);
    });

    return Array.from(repoCollateral.entries())
      .map(([name, data]) => ({
        name,
        collateral: data.totalCollateral,
        openPRs: data.openPRs,
      }))
      .sort((a, b) => b.collateral - a.collateral)
      .slice(0, 5);
  }, [allPRs, reposWithWeights]);

  // ── Recent PRs: highest-scoring merged PRs of the day ───────────────────
  const recentPrs = useMemo(() => {
    if (!allPRs || !reposWithWeights) return [];

    const repoMap = new Map(reposWithWeights.map((r) => [r.fullName, r]));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allPRs
      .filter(
        (pr) =>
          pr.repository &&
          pr.mergedAt &&
          repoMap.has(pr.repository) &&
          new Date(pr.mergedAt) >= today,
      )
      .sort((a, b) => {
        const scoreA = parseFloat(a.score || '0');
        const scoreB = parseFloat(b.score || '0');
        if (scoreB !== scoreA) return scoreB - scoreA;
        // Tiebreak by repo weight
        const weightA = parseFloat(
          String(repoMap.get(a.repository)?.weight || '0'),
        );
        const weightB = parseFloat(
          String(repoMap.get(b.repository)?.weight || '0'),
        );
        return weightB - weightA;
      })
      .slice(0, 5)
      .map((pr) => ({
        name: pr.repository,
        title: pr.pullRequestTitle,
        createdAt: new Date(pr.mergedAt || new Date()),
        number: pr.pullRequestNumber,
      }));
  }, [allPRs, reposWithWeights]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Page title="Repositories">
      <SEO
        title="Repositories"
        description="Browse supported repositories on Gittensor."
      />
      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          py: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
        }}
      >
        {/* ── Highlight Sections ─────────────────────────────────────── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 1fr' },
            gap: 2,
            mb: 3,
            alignItems: 'stretch',
          }}
        >
          {/* Trending This Week */}
          <Card sx={cardSx}>
            {isLoading || trendingRepos.length > 0 ? (
              <>
                <SectionHeader>Trending This Week</SectionHeader>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {trendingRepos.length === 0 && !isLoading ? (
                    <Typography
                      sx={(theme) => ({
                        color: alpha(theme.palette.text.primary, 0.3),
                        fontSize: '0.8rem',
                        fontStyle: 'italic',
                        p: 1,
                      })}
                    >
                      No data available
                    </Typography>
                  ) : (
                    trendingRepos.map((repo) => (
                      <HighlightRow
                        key={repo.name}
                        onClick={() => handleSelectRepository(repo.name)}
                        avatar={`https://avatars.githubusercontent.com/${repo.name.split('/')[0]}`}
                        avatarBg={getAvatarBg(repo.name)}
                        label={
                          <Tooltip title={repo.name} arrow placement="top">
                            <Typography
                              sx={{
                                fontFamily: FONTS.mono,
                                fontSize: '0.82rem',
                                color: 'text.primary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {repo.name}
                            </Typography>
                          </Tooltip>
                        }
                        right={
                          <Typography
                            sx={(theme) => ({
                              fontFamily: FONTS.mono,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: theme.palette.status.success,
                              flexShrink: 0,
                              backgroundColor: alpha(
                                theme.palette.status.success,
                                0.1,
                              ),
                              px: 0.75,
                              py: 0.25,
                              borderRadius: '4px',
                            })}
                          >
                            +{repo.pctIncrease.toFixed(0)}%
                          </Typography>
                        }
                      />
                    ))
                  )}
                </Box>
              </>
            ) : null}
          </Card>

          {/* Most Collateral Staked */}
          <Card sx={cardSx}>
            {isLoading || topCollateralRepos.length > 0 ? (
              <>
                <SectionHeader>Most Collateral Staked</SectionHeader>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {topCollateralRepos.length === 0 && !isLoading ? (
                    <Typography
                      sx={(theme) => ({
                        color: alpha(theme.palette.text.primary, 0.3),
                        fontSize: '0.8rem',
                        fontStyle: 'italic',
                        p: 1,
                      })}
                    >
                      No collateral data available
                    </Typography>
                  ) : (
                    topCollateralRepos.map((repo) => (
                      <HighlightRow
                        key={repo.name}
                        onClick={() => handleSelectRepository(repo.name)}
                        avatar={`https://avatars.githubusercontent.com/${repo.name.split('/')[0]}`}
                        avatarBg={getAvatarBg(repo.name)}
                        label={
                          <Tooltip title={repo.name} arrow placement="top">
                            <Typography
                              sx={{
                                fontFamily: FONTS.mono,
                                fontSize: '0.82rem',
                                color: 'text.primary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {repo.name}
                            </Typography>
                          </Tooltip>
                        }
                        right={
                          <Typography
                            sx={{
                              fontFamily: FONTS.mono,
                              fontSize: '0.72rem',
                              color: 'text.secondary',
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {repo.collateral.toFixed(1)} ({repo.openPRs} PR
                            {repo.openPRs !== 1 ? 's' : ''})
                          </Typography>
                        }
                      />
                    ))
                  )}
                </Box>
              </>
            ) : null}
          </Card>

          {/* Recent PRs */}
          <Card sx={cardSx}>
            {isLoading || recentPrs.length > 0 ? (
              <>
                <SectionHeader>Recent Pull Requests</SectionHeader>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {recentPrs.length === 0 && !isLoading ? (
                    <Typography
                      sx={(theme) => ({
                        color: alpha(theme.palette.text.primary, 0.3),
                        fontSize: '0.8rem',
                        fontStyle: 'italic',
                        p: 1,
                      })}
                    >
                      No data available
                    </Typography>
                  ) : (
                    recentPrs.map((pr) => (
                      <HighlightRow
                        key={`${pr.name}-${pr.number}`}
                        onClick={() =>
                          navigate(
                            `/miners/pr?repo=${encodeURIComponent(pr.name)}&number=${pr.number}`,
                            { state: { backLabel: 'Back to Repositories' } },
                          )
                        }
                        avatar={`https://avatars.githubusercontent.com/${pr.name.split('/')[0]}`}
                        avatarBg={getAvatarBg(pr.name)}
                        label={
                          <Box
                            sx={{
                              minWidth: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                            }}
                          >
                            <Tooltip title={pr.name} arrow placement="top">
                              <Typography
                                sx={{
                                  fontFamily: FONTS.mono,
                                  fontSize: '0.68rem',
                                  color: 'text.tertiary',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  lineHeight: 1.2,
                                }}
                              >
                                {pr.name}
                              </Typography>
                            </Tooltip>
                            <Tooltip title={pr.title} arrow placement="top">
                              <Typography
                                sx={{
                                  fontFamily: FONTS.mono,
                                  fontSize: '0.78rem',
                                  color: 'text.primary',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  lineHeight: 1.3,
                                }}
                              >
                                {pr.title}
                              </Typography>
                            </Tooltip>
                          </Box>
                        }
                        right={
                          <Typography
                            sx={(theme) => ({
                              fontFamily: FONTS.mono,
                              fontSize: '0.68rem',
                              color: alpha(theme.palette.text.primary, 0.35),
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                              ml: 1,
                            })}
                          >
                            {formatRelativeTime(pr.createdAt)}
                          </Typography>
                        }
                      />
                    ))
                  )}
                </Box>
              </>
            ) : null}
          </Card>
        </Box>

        {/* ── Main Table ────────────────────────────────────────────── */}
        <Card
          sx={(theme) => ({
            borderRadius: 3,
            border: '1px solid',
            borderColor: theme.palette.border.light,
            backgroundColor: theme.palette.surface.transparent,
            overflow: 'hidden',
          })}
          elevation={0}
        >
          <TopRepositoriesTable
            repositories={repoStats}
            isLoading={isLoading}
            onSelectRepository={handleSelectRepository}
          />
        </Card>
      </Box>
    </Page>
  );
};

export default RepositoriesPage;
