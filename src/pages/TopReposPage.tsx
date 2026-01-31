import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Page } from '../components/layout';
import RepoGrid from '../components/repositories/RepoGrid';
import { SEO } from '../components';
import { useAllPrs, useReposAndWeights } from '../api';
import { type CommitLog } from '../api/models/Dashboard';

const TopReposPage: React.FC = () => {
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

  const handleSelectRepository = (repositoryFullName: string) => {
    navigate(
      `/miners/repository?name=${encodeURIComponent(repositoryFullName)}`,
    );
  };

  // Process repo stats for RepoGrid - show ALL repos
  const repoStats = useMemo(() => {
    if (!reposWithWeights) return [];

    // Create a map to store PR stats for each repo
    const prStatsMap = new Map<
      string,
      {
        totalScore: number;
        totalPRs: number;
        uniqueMiners: Set<string>;
        contributorCounts: Map<string, number>;
      }
    >();

    // Process PRs to calculate stats
    if (allPRs) {
      allPRs.forEach((pr: CommitLog) => {
        if (!pr || !pr.repository) return;

        const current = prStatsMap.get(pr.repository) || {
          totalScore: 0,
          totalPRs: 0,
          uniqueMiners: new Set<string>(),
          contributorCounts: new Map<string, number>(),
        };

        current.totalScore += parseFloat(pr.score || '0');
        current.totalPRs += 1;
        if (pr.author) {
          current.uniqueMiners.add(pr.author);
          current.contributorCounts.set(
            pr.author,
            (current.contributorCounts.get(pr.author) || 0) + 1,
          );
        }

        prStatsMap.set(pr.repository, current);
      });
    }

    // Build the final list from ALL repos
    return reposWithWeights
      .map((repo) => {
        const prStats = prStatsMap.get(repo.fullName);

        // Calculate top contributors
        let topContributors: string[] = [];
        if (prStats?.contributorCounts) {
          topContributors = Array.from(prStats.contributorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5) // Top 5
            .map(entry => entry[0]);
        }

        return {
          repository: repo.fullName,
          totalScore: prStats?.totalScore || 0,
          totalPRs: prStats?.totalPRs || 0,
          uniqueMiners: prStats?.uniqueMiners || new Set<string>(),
          weight: repo.weight ? parseFloat(String(repo.weight)) : 0,
          tier: repo.tier || '',
          topContributors,
          contributorCount: prStats?.contributorCounts.size || 0,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [allPRs, reposWithWeights]);

  return (
    <Page title="Top Repositories">
      <SEO
        title="Top Repositories"
        description="Top Repositories by contribution score on Gittensor."
      />
      <Box
        sx={{
          minHeight: 'calc(100vh - 80px)',
          width: '100%',
          py: 4,
          px: { xs: 2, md: 4 },
        }}
      >
        <Box sx={{ maxWidth: 1600, mx: 'auto', width: '100%' }}>
          <RepoGrid
            repositories={repoStats}
            isLoading={isLoadingPRs || isLoadingRepos}
            onSelectRepository={handleSelectRepository}
            initialTierFilter={initialTierFilter || undefined}
          />
        </Box>
      </Box>
    </Page>
  );
};

export default TopReposPage;
