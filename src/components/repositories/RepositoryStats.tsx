import React, { useMemo } from 'react';
import { Box, Typography, Skeleton, Divider, Chip } from '@mui/material';
import {
  useReposAndWeights,
  useAllPrs,
  useRepositoryIssues,
  useRepoBountySummary,
  useRepositoryConfig,
} from '../../api';
import { RANK_COLORS, STATUS_COLORS } from '../../theme';

interface RepositoryStatsProps {
  repositoryFullName: string;
}

const RepositoryStats: React.FC<RepositoryStatsProps> = ({
  repositoryFullName,
}) => {
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const { data: allPRs, isLoading: isLoadingPRs } = useAllPrs();
  const { data: issues, isLoading: isLoadingIssues } =
    useRepositoryIssues(repositoryFullName);
  const { data: bountySummary } = useRepoBountySummary(repositoryFullName);
  const { data: repoConfig } = useRepositoryConfig(repositoryFullName);

  const repository = useMemo(
    () =>
      repos?.find(
        (r) => r.fullName.toLowerCase() === repositoryFullName.toLowerCase(),
      ),
    [repos, repositoryFullName],
  );

  const stats = useMemo(() => {
    if (!allPRs) return { mergedPRs: 0, totalScore: 0 };

    const repoPRs = allPRs.filter(
      (pr) =>
        pr.repository.toLowerCase() === repositoryFullName.toLowerCase() &&
        pr.prState === 'MERGED',
    );
    const totalScore = repoPRs.reduce(
      (acc, pr) => acc + parseFloat(pr.score || '0'),
      0,
    );

    return {
      mergedPRs: repoPRs.length,
      totalScore,
    };
  }, [allPRs, repositoryFullName]);

  const issueStats = useMemo(() => {
    if (!issues) return { totalIssues: 0, closedIssues: 0 };

    return {
      totalIssues: issues.length,
      closedIssues: issues.filter((issue) => issue.closedAt).length,
    };
  }, [issues]);

  if (isLoadingRepos || isLoadingPRs || isLoadingIssues) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: '14px' }}
        >
          Repository Stats
        </Typography>
        <Skeleton
          variant="rectangular"
          height={160}
          sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
        />
      </Box>
    );
  }

  if (!repository) {
    return null;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="subtitle2"
        sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: '14px' }}
      >
        Repository Stats
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Weight */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: '13px', color: STATUS_COLORS.open }}
          >
            Weight
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#fff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '13px',
            }}
          >
            {repository.weight}
          </Typography>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />

        {/* Total Score */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: '13px', color: STATUS_COLORS.open }}
          >
            Total Score
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#fff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '13px',
            }}
          >
            {stats.totalScore.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </Typography>
        </Box>

        {/* Merged PRs */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: '13px', color: STATUS_COLORS.open }}
          >
            Merged PRs
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#fff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '13px',
            }}
          >
            {stats.mergedPRs}
          </Typography>
        </Box>

        {/* Closed Issues */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: '13px', color: STATUS_COLORS.open }}
          >
            Closed Issues
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#fff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '13px',
            }}
          >
            {issueStats.closedIssues}
          </Typography>
        </Box>

        {/* Bounties */}
        {bountySummary && bountySummary.totalBounties > 0 && (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />

            {/* Total Bounties */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontSize: '13px', color: RANK_COLORS.first }}
              >
                Bounties
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: RANK_COLORS.first,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {bountySummary.totalBounties}
              </Typography>
            </Box>

            {/* Available Rewards */}
            {bountySummary.activeBounties > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontSize: '13px', color: STATUS_COLORS.open }}
                >
                  Available Rewards
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#fff',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '13px',
                  }}
                >
                  {(
                    parseFloat(bountySummary.totalAvailable) || 0
                  ).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{' '}
                  α
                </Typography>
              </Box>
            )}

            {/* Total Paid Out */}
            {bountySummary.completedBounties > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontSize: '13px', color: STATUS_COLORS.open }}
                >
                  Total Paid Out
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: STATUS_COLORS.merged,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {(parseFloat(bountySummary.totalPaidOut) || 0).toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 2,
                    },
                  )}{' '}
                  α
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* Additional Acceptable Branches */}
        {repoConfig?.additionalAcceptableBranches &&
          repoConfig.additionalAcceptableBranches.length > 0 && (
            <>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />
              <Typography
                variant="body2"
                sx={{ fontSize: '13px', color: STATUS_COLORS.open }}
              >
                Scorable Branches
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.75,
                }}
              >
                {repoConfig.additionalAcceptableBranches.map((branch) => (
                  <Chip
                    key={branch}
                    label={branch}
                    size="small"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '12px',
                      height: '24px',
                      bgcolor: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </Box>
            </>
          )}
      </Box>
    </Box>
  );
};

export default RepositoryStats;
