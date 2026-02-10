import React, { useMemo } from 'react';
import {
  Avatar,
  Box,
  Card,
  Typography,
} from '@mui/material';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { Page } from '../components/layout';
import { TopRepositoriesTable, SEO } from '../components';
import { useAllPrs, useReposAndWeights } from '../api';
import { type CommitLog } from '../api/models/Dashboard';

const FONTS = { mono: '"JetBrains Mono", monospace' } as const;

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'Gold':
      return '#FFD700';
    case 'Silver':
      return '#C0C0C0';
    case 'Bronze':
      return '#CD7F32';
    default:
      return '#8b949e';
  }
};

// ── Highlight Card ──────────────────────────────────────────────────────────



// ── Page ────────────────────────────────────────────────────────────────────
const RepositoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTierFilter = searchParams.get('tier') as
    | 'Gold'
    | 'Silver'
    | 'Bronze'
    | null;

  const { data: allPRs, isLoading: isLoadingPRs } = useAllPrs();
  const { data: reposWithWeights, isLoading: isLoadingRepos } =
    useReposAndWeights();

  const isLoading = isLoadingPRs || isLoadingRepos;

  const handleSelectRepository = (repositoryFullName: string) => {
    navigate(
      `/miners/repository?name=${encodeURIComponent(repositoryFullName)}`,
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
        const cur = prStatsMap.get(pr.repository) || {
          totalScore: 0,
          totalPRs: 0,
          uniqueMiners: new Set<string>(),
        };
        cur.totalScore += parseFloat(pr.score || '0');
        cur.totalPRs += 1;
        if (pr.author) cur.uniqueMiners.add(pr.author);
        prStatsMap.set(pr.repository, cur);
      });
    }

    return reposWithWeights
      .map((repo) => {
        const s = prStatsMap.get(repo.fullName);
        return {
          repository: repo.fullName,
          totalScore: s?.totalScore || 0,
          totalPRs: s?.totalPRs || 0,
          uniqueMiners: s?.uniqueMiners || new Set<string>(),
          weight: repo.weight ? parseFloat(String(repo.weight)) : 0,
          tier: repo.tier || '',
          inactiveAt: repo.inactiveAt,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [allPRs, reposWithWeights]);

  // ── Trending: repos with biggest % score increase in the last 7 days ──
  const trendingRepos = useMemo(() => {
    if (!allPRs || !reposWithWeights) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    // Bucket each repo's score into "recent" (last 7d) and "prior" (older)
    const repoScores = new Map<
      string,
      { recentScore: number; priorScore: number; recentPRs: number }
    >();

    allPRs.forEach((pr: CommitLog) => {
      const prDate = pr.prCreatedAt || pr.mergedAt;
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
      .filter(([name, s]) => repoMap.has(name) && s.recentScore > 0)
      .map(([name, s]) => {
        const pctIncrease =
          s.priorScore > 0
            ? (s.recentScore / s.priorScore) * 100
            : Infinity; // brand new score = infinite % increase
        return {
          name,
          tier: repoMap.get(name)?.tier || '',
          recentScore: s.recentScore,
          priorScore: s.priorScore,
          pctIncrease,
          prs: s.recentPRs,
        };
      })
      .sort((a, b) => b.pctIncrease - a.pctIncrease)
      .slice(0, 5);
  }, [allPRs, reposWithWeights]);

  // ── First Contributions: repos sorted by most recent first PR ─────────
  const firstContributionRepos = useMemo(() => {
    if (!allPRs || !reposWithWeights) return [];

    // Find the earliest PR date + total PRs per repo
    const earliestPR = new Map<string, Date>();
    const repoPRCount = new Map<string, number>();

    allPRs.forEach((pr: CommitLog) => {
      const prDate = pr.prCreatedAt || pr.mergedAt;
      if (!pr?.repository || !prDate) return;
      const created = new Date(prDate);

      const existing = earliestPR.get(pr.repository);
      if (!existing || created < existing) {
        earliestPR.set(pr.repository, created);
      }

      repoPRCount.set(pr.repository, (repoPRCount.get(pr.repository) || 0) + 1);
    });

    const repoMap = new Map(reposWithWeights.map((r) => [r.fullName, r]));

    return Array.from(earliestPR.entries())
      .filter(([name]) => repoMap.has(name))
      .map(([name, firstDate]) => ({
        name,
        tier: repoMap.get(name)?.tier || '',
        firstPR: firstDate,
        prs: repoPRCount.get(name) || 0,
      }))
      .sort((a, b) => b.firstPR.getTime() - a.firstPR.getTime())
      .slice(0, 5);
  }, [allPRs, reposWithWeights]);

  // ── Highest Paying: repos with best avg score per PR ──────────────────
  const highestPayingRepos = useMemo(() => {
    if (!allPRs || !reposWithWeights) return [];

    const repoStats = new Map<string, { totalScore: number; prCount: number }>();

    allPRs.forEach((pr: CommitLog) => {
      if (!pr?.repository) return;
      const score = parseFloat(pr.score || '0');
      const cur = repoStats.get(pr.repository) || { totalScore: 0, prCount: 0 };
      cur.totalScore += score;
      cur.prCount += 1;
      repoStats.set(pr.repository, cur);
    });

    const repoMap = new Map(reposWithWeights.map((r) => [r.fullName, r]));

    return Array.from(repoStats.entries())
      .filter(([name, s]) => repoMap.has(name) && s.prCount >= 2) // need at least 2 PRs for meaningful avg
      .map(([name, s]) => ({
        name,
        tier: repoMap.get(name)?.tier || '',
        avgScore: s.totalScore / s.prCount,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);
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
        {/* ── Highlight Sections (side by side) ────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            mb: 3,
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {/* Trending This Week */}
          {(isLoading || trendingRepos.length > 0) && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  mb: 1,
                }}
              >
                Trending This Week
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {trendingRepos.map((repo) => (
                  <Box
                    key={repo.name}
                    onClick={() => handleSelectRepository(repo.name)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 0.75,
                      px: 1.5,
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', mr: 2 }}>
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${repo.name.split('/')[0]}`}
                        sx={{ width: 20, height: 20, flexShrink: 0 }}
                      />
                      <Typography
                        sx={{
                          fontFamily: FONTS.mono,
                          fontSize: '0.82rem',
                          color: 'rgba(255,255,255,0.85)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {repo.name}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#51cf66',
                        flexShrink: 0,
                      }}
                    >
                      {repo.pctIncrease === Infinity
                        ? 'New'
                        : `+${repo.pctIncrease.toFixed(0)}%`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* First Contributions */}
          {(isLoading || firstContributionRepos.length > 0) && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  mb: 1,
                }}
              >
                First Contributions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {firstContributionRepos.map((repo) => (
                  <Box
                    key={repo.name}
                    onClick={() => handleSelectRepository(repo.name)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 0.75,
                      px: 1.5,
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', mr: 2 }}>
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${repo.name.split('/')[0]}`}
                        sx={{ width: 20, height: 20, flexShrink: 0 }}
                      />
                      <Typography
                        sx={{
                          fontFamily: FONTS.mono,
                          fontSize: '0.82rem',
                          color: 'rgba(255,255,255,0.85)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {repo.name}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.82rem',
                        color: 'rgba(255,255,255,0.45)',
                        flexShrink: 0,
                      }}
                    >
                      {repo.firstPR.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Highest Paying */}
          {(isLoading || highestPayingRepos.length > 0) && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  mb: 1,
                }}
              >
                Highest Paying
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {highestPayingRepos.map((repo) => (
                  <Box
                    key={repo.name}
                    onClick={() => handleSelectRepository(repo.name)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 0.75,
                      px: 1.5,
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', mr: 2 }}>
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${repo.name.split('/')[0]}`}
                        sx={{ width: 20, height: 20, flexShrink: 0 }}
                      />
                      <Typography
                        sx={{
                          fontFamily: FONTS.mono,
                          fontSize: '0.82rem',
                          color: 'rgba(255,255,255,0.85)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {repo.name}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#ffd43b',
                        flexShrink: 0,
                      }}
                    >
                      {repo.avgScore.toFixed(1)} avg
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* ── Main Table ────────────────────────────────────────────── */}
        <Card
          sx={{
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'transparent',
            overflow: 'hidden',
          }}
          elevation={0}
        >
          <TopRepositoriesTable
            repositories={repoStats}
            isLoading={isLoading}
            onSelectRepository={handleSelectRepository}
            initialTierFilter={initialTierFilter || undefined}
          />
        </Card>
      </Box>
    </Page>
  );
};

export default RepositoriesPage;
