import React, { useMemo } from 'react';

import { Avatar, Box, Card, Tooltip, Typography } from '@mui/material';

import { LinkBox } from '../components/common/linkBehavior';
import { Page } from '../components/layout';
import { TopRepositoriesTable, SEO } from '../components';
import { useAllPrs, useReposAndWeights } from '../api';
import { type CommitLog } from '../api/models/Dashboard';

const FONTS = { mono: '"JetBrains Mono", monospace' } as const;

// ── Shared row style ────────────────────────────────────────────────────────
const ROW_HEIGHT = 40; // px – keeps every row exactly the same across cards

const HighlightRow: React.FC<{
  href: string;
  linkState?: Record<string, unknown>;
  avatar: string;
  avatarBg?: string;
  label: React.ReactNode;
  right: React.ReactNode;
}> = ({ href, linkState, avatar, avatarBg = 'transparent', label, right }) => {
  return (
    <LinkBox
      href={href}
      linkState={linkState}
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
          sx={{
            width: 24,
            height: 24,
            flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: avatarBg,
          }}
        />
        {label}
      </Box>
      {right}
    </LinkBox>
  );
};

const getAvatarBg = (name: string) => {
  const owner = name.split('/')[0];
  if (owner === 'opentensor') return '#ffffff';
  if (owner === 'bitcoin') return '#F7931A';
  return 'transparent';
};

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
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
  border: '1px solid rgba(255, 255, 255, 0.1)',
  backgroundColor: 'transparent',
  display: 'flex',
  flexDirection: 'column' as const,
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
};

// ── Page ────────────────────────────────────────────────────────────────────
const REPO_LINK_STATE = { backLabel: 'Back to Repositories' } as const;
const getRepoHref = (name: string) =>
  `/miners/repository?name=${encodeURIComponent(name)}`;
const getPrHref = (name: string, number: number) =>
  `/miners/pr?repo=${encodeURIComponent(name)}&number=${number}`;

const RepositoriesPage: React.FC = () => {
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
      const repoKey = pr.repository.toLowerCase();

      const cur = repoScores.get(repoKey) || {
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
      repoScores.set(repoKey, cur);
    });

    const repoMap = new Map(
      reposWithWeights.map((r) => [r.fullName.toLowerCase(), r]),
    );

    return Array.from(repoScores.entries())
      .filter(
        ([key, s]) => repoMap.has(key) && s.recentScore > 0 && s.priorScore > 0,
      )
      .map(([key, s]) => ({
        name: repoMap.get(key)!.fullName,
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

    const repoMap = new Map(
      reposWithWeights.map((r) => [r.fullName.toLowerCase(), r]),
    );

    // Sum collateral from open PRs per repo
    const repoCollateral = new Map<
      string,
      { totalCollateral: number; openPRs: number }
    >();

    allPRs.forEach((pr: CommitLog) => {
      if (!pr?.repository || pr.prState !== 'OPEN') return;
      const repoKey = pr.repository.toLowerCase();
      if (!repoMap.has(repoKey)) return;
      const collateral = parseFloat(pr.collateralScore || '0');
      if (collateral <= 0) return;

      const cur = repoCollateral.get(repoKey) || {
        totalCollateral: 0,
        openPRs: 0,
      };
      cur.totalCollateral += collateral;
      cur.openPRs += 1;
      repoCollateral.set(repoKey, cur);
    });

    return Array.from(repoCollateral.entries())
      .map(([key, data]) => ({
        name: repoMap.get(key)!.fullName,
        collateral: data.totalCollateral,
        openPRs: data.openPRs,
      }))
      .sort((a, b) => b.collateral - a.collateral)
      .slice(0, 5);
  }, [allPRs, reposWithWeights]);

  // ── Recent PRs: highest-scoring merged PRs of the day ───────────────────
  const recentPrs = useMemo(() => {
    if (!allPRs || !reposWithWeights) return [];

    const repoMap = new Map(
      reposWithWeights.map((r) => [r.fullName.toLowerCase(), r]),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allPRs
      .filter(
        (pr) =>
          pr.repository &&
          pr.mergedAt &&
          repoMap.has(pr.repository.toLowerCase()) &&
          new Date(pr.mergedAt) >= today,
      )
      .sort((a, b) => {
        const scoreA = parseFloat(a.score || '0');
        const scoreB = parseFloat(b.score || '0');
        if (scoreB !== scoreA) return scoreB - scoreA;
        // Tiebreak by repo weight
        const weightA = parseFloat(
          String(repoMap.get(a.repository?.toLowerCase() ?? '')?.weight || '0'),
        );
        const weightB = parseFloat(
          String(repoMap.get(b.repository?.toLowerCase() ?? '')?.weight || '0'),
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
                      sx={{
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: '0.8rem',
                        fontStyle: 'italic',
                        p: 1,
                      }}
                    >
                      No data available
                    </Typography>
                  ) : (
                    trendingRepos.map((repo) => (
                      <HighlightRow
                        key={repo.name}
                        href={getRepoHref(repo.name)}
                        linkState={REPO_LINK_STATE}
                        avatar={`https://avatars.githubusercontent.com/${repo.name.split('/')[0]}`}
                        avatarBg={getAvatarBg(repo.name)}
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

          {/* Most Collateral Staked */}
          <Card sx={cardSx}>
            {isLoading || topCollateralRepos.length > 0 ? (
              <>
                <SectionHeader>Most Collateral Staked</SectionHeader>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {topCollateralRepos.length === 0 && !isLoading ? (
                    <Typography
                      sx={{
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: '0.8rem',
                        fontStyle: 'italic',
                        p: 1,
                      }}
                    >
                      No collateral data available
                    </Typography>
                  ) : (
                    topCollateralRepos.map((repo) => (
                      <HighlightRow
                        key={repo.name}
                        href={getRepoHref(repo.name)}
                        linkState={REPO_LINK_STATE}
                        avatar={`https://avatars.githubusercontent.com/${repo.name.split('/')[0]}`}
                        avatarBg={getAvatarBg(repo.name)}
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
                              color: 'rgba(255,255,255,0.7)',
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
                      sx={{
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: '0.8rem',
                        fontStyle: 'italic',
                        p: 1,
                      }}
                    >
                      No data available
                    </Typography>
                  ) : (
                    recentPrs.map((pr) => (
                      <HighlightRow
                        key={`${pr.name}-${pr.number}`}
                        href={getPrHref(pr.name, pr.number)}
                        linkState={REPO_LINK_STATE}
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
            getRepositoryHref={getRepoHref}
            linkState={REPO_LINK_STATE}
          />
        </Card>
      </Box>
    </Page>
  );
};

export default RepositoriesPage;
