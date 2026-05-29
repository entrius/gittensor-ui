import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import {
  LeaderboardInsights,
  MinersLeaderTable,
} from '../components/leaderboard';
import {
  parseCohortParam,
  type CohortKey,
} from '../components/leaderboard/eligibilityCohort';
import { useAllMiners } from '../api';

const REPO_PARAM = 'repo';
const COHORT_PARAM = 'cohort';

const LeaderboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading } = useAllMiners();

  const selectedRepo = searchParams.get(REPO_PARAM);
  const selectedCohort = parseCohortParam(searchParams.get(COHORT_PARAM));

  const handleSelectRepo = useCallback(
    (repo: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (repo === null) next.delete(REPO_PARAM);
          else next.set(REPO_PARAM, repo);
          // Reset pagination when filters change.
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleToggleRepo = useCallback(
    (repo: string) => {
      handleSelectRepo(selectedRepo === repo ? null : repo);
    },
    [handleSelectRepo, selectedRepo],
  );

  const handleSelectCohort = useCallback(
    (cohort: CohortKey | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (cohort === null) next.delete(COHORT_PARAM);
          else next.set(COHORT_PARAM, cohort);
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleToggleCohort = useCallback(
    (cohort: CohortKey) => {
      handleSelectCohort(selectedCohort === cohort ? null : cohort);
    },
    [handleSelectCohort, selectedCohort],
  );

  return (
    <Page title="Leaderboard">
      <SEO
        title="Miner Leaderboard"
        description="Network-wide miner rankings — daily earnings, eligibility, and credibility for every active miner."
        type="website"
      />
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          justifyContent: 'center',
          py: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            width: '100%',
            maxWidth: 1320,
            px: { xs: 2, md: 0 },
          }}
        >
          <LeaderboardInsights
            miners={data}
            isLoading={isLoading}
            selectedRepo={selectedRepo}
            onSelectRepo={handleToggleRepo}
            selectedCohort={selectedCohort}
            onSelectCohort={handleToggleCohort}
          />
          <MinersLeaderTable
            miners={data ?? []}
            isLoading={isLoading}
            selectedRepo={selectedRepo}
            onSelectRepo={handleSelectRepo}
            selectedCohort={selectedCohort}
            onClearCohort={() => handleSelectCohort(null)}
          />
        </Box>
      </Box>
    </Page>
  );
};

export default LeaderboardPage;
