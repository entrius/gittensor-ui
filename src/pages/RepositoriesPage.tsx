import React, { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Avatar,
  Box,
  Card,
  Tooltip,
  Typography,
} from '@mui/material';

import { useNavigate, useSearchParams } from 'react-router-dom';
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
  label: React.ReactNode;
  right: React.ReactNode;
}> = ({ onClick, avatar, label, right }) => (
  <Box
    onClick={onClick}
    sx={{
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
      '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden', mr: 2, flex: 1 }}>
      <Avatar
        src={avatar}
        sx={{ width: 24, height: 24, flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}
      />
      {label}
    </Box>
    {right}
  </Box>
);

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    sx={{
      fontFamily: FONTS.mono,
      fontSize: '0.75rem',
      fontWeight: 600,
      color: 'rgba(255,255,255,0.5)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      mb: 1.5,
      pb: 1,
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}
  >
    {children}
  </Typography>
);

const cardSx = {
  p: 2,
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.08)',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  display: 'flex',
  flexDirection: 'column' as const,
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
};

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
      .filter(([name, s]) => repoMap.has(name) && s.recentScore > 0 && s.priorScore > 0)
      .map(([name, s]) => ({
        name,
        tier: repoMap.get(name)?.tier || '',
        recentScore: s.recentScore,
        priorScore: s.priorScore,
        pctIncrease: (s.recentScore / s.priorScore) * 100,
        prs: s.recentPRs,
      }))
      .sort((a, b) => b.pctIncrease - a.pctIncrease)
      .slice(0, 5);
  }, [allPRs, reposWithWeights]);

  // ── Recently Added: repos that appeared most recently on the network ───
  const recentlyAddedRepos = useMemo(() => {
    if (!allPRs || !reposWithWeights) return [];

    // Find the earliest PR date per repo (= when the repo first appeared)
    const earliestPR = new Map<string, Date>();

    allPRs.forEach((pr: CommitLog) => {
      const prDate = pr.prCreatedAt || pr.mergedAt;
      if (!pr?.repository || !prDate) return;
      const created = new Date(prDate);

      const existing = earliestPR.get(pr.repository);
      if (!existing || created < existing) {
        earliestPR.set(pr.repository, created);
      }
    });

    const repoMap = new Map(reposWithWeights.map((r) => [r.fullName, r]));

    return Array.from(earliestPR.entries())
      .filter(([name]) => repoMap.has(name))
      .map(([name, firstDate]) => ({
        name,
        tier: repoMap.get(name)?.tier || '',
        addedAt: firstDate,
      }))
      .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
      .slice(0, 5);
  }, [allPRs, reposWithWeights]);

  // ── Recent PRs: most recently created PRs ──────────────────────────────
  const recentPrs = useMemo(() => {
    if (!allPRs || !reposWithWeights) return [];

    const repoMap = new Map(reposWithWeights.map((r) => [r.fullName, r]));

    return allPRs
      .filter(
        (pr) =>
          pr.repository &&
          (pr.prCreatedAt || pr.mergedAt) &&
          repoMap.has(pr.repository)
      )
      .sort(
        (a, b) =>
          new Date(b.prCreatedAt || b.mergedAt || 0).getTime() - new Date(a.prCreatedAt || a.mergedAt || 0).getTime()
      )
      .slice(0, 5)
      .map((pr) => ({
        name: pr.repository,
        tier: repoMap.get(pr.repository)?.tier || '',
        title: pr.pullRequestTitle,
        createdAt: new Date(pr.prCreatedAt || pr.mergedAt || new Date()),
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
            {(isLoading || trendingRepos.length > 0) ? (
              <>
                <SectionHeader>Trending This Week</SectionHeader>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {trendingRepos.length === 0 && !isLoading ? (
                    <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontStyle: 'italic', p: 1 }}>No data available</Typography>
                  ) : (
                    trendingRepos.map((repo) => (
                      <HighlightRow
                        key={repo.name}
                        onClick={() => handleSelectRepository(repo.name)}
                        avatar={`https://avatars.githubusercontent.com/${repo.name.split('/')[0]}`}
                        label={
                          <Tooltip title={repo.name} arrow placement="top">
                            <Typography
                              sx={{
                                fontFamily: FONTS.mono,
                                fontSize: '0.82rem',
                                color: 'rgba(255,255,255,0.9)',
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
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#51cf66',
                              flexShrink: 0,
                              backgroundColor: 'rgba(81, 207, 102, 0.1)',
                              px: 0.75,
                              py: 0.25,
                              borderRadius: '4px',
                            }}
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

          {/* Recently Added */}
          <Card sx={cardSx}>
            {(isLoading || recentlyAddedRepos.length > 0) ? (
              <>
                <SectionHeader>Recently Added</SectionHeader>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {recentlyAddedRepos.length === 0 && !isLoading ? (
                    <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontStyle: 'italic', p: 1 }}>No data available</Typography>
                  ) : (
                    recentlyAddedRepos.map((repo) => (
                      <HighlightRow
                        key={repo.name}
                        onClick={() => handleSelectRepository(repo.name)}
                        avatar={`https://avatars.githubusercontent.com/${repo.name.split('/')[0]}`}
                        label={
                          <Tooltip title={repo.name} arrow placement="top">
                            <Typography
                              sx={{
                                fontFamily: FONTS.mono,
                                fontSize: '0.82rem',
                                color: 'rgba(255,255,255,0.9)',
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
                              color: 'rgba(255,255,255,0.4)',
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatDistanceToNow(repo.addedAt, { addSuffix: true })
                              .replace('about ', '')}
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
            {(isLoading || recentPrs.length > 0) ? (
              <>
                <SectionHeader>Recent PRs</SectionHeader>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {recentPrs.length === 0 && !isLoading ? (
                    <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontStyle: 'italic', p: 1 }}>No data available</Typography>
                  ) : (
                    recentPrs.map((pr) => (
                      <HighlightRow
                        key={`${pr.name}-${pr.number}`}
                        onClick={() => navigate(`/miners/pr?repo=${encodeURIComponent(pr.name)}&number=${pr.number}`)}
                        avatar={`https://avatars.githubusercontent.com/${pr.name.split('/')[0]}`}
                        label={
                          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Tooltip title={pr.name} arrow placement="top">
                              <Typography
                                sx={{
                                  fontFamily: FONTS.mono,
                                  fontSize: '0.68rem',
                                  color: 'rgba(255,255,255,0.45)',
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
                                  color: 'rgba(255,255,255,0.9)',
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
                            sx={{
                              fontFamily: FONTS.mono,
                              fontSize: '0.68rem',
                              color: 'rgba(255,255,255,0.35)',
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                              ml: 1,
                            }}
                          >
                            {formatDistanceToNow(pr.createdAt, { addSuffix: true })
                              .replace('about ', '')
                              .replace('less than a minute ago', 'just now')}
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
