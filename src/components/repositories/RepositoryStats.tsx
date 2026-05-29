import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Skeleton,
  Divider,
  Chip,
  useTheme,
} from '@mui/material';
import {
  useReposAndWeights,
  useAllPrs,
  useRepositoryIssues,
  useRepoBountySummary,
  useRepositoryConfig,
  useRepositoryMaintainers,
  usePullRequestCommentsBatch,
} from '../../api';
import { RANK_COLORS, STATUS_COLORS } from '../../theme';
import { formatTokenAmount, formatWeight } from '../../utils/format';
import { isMergedPr } from '../../utils/prStatus';

interface RepositoryStatsProps {
  repositoryFullName: string;
}

// Cap how many recent non-maintainer PRs we fetch comments for. Each PR is a
// separate /prs/comments request, so this bounds the request fan-out per repo
// while keeping the median representative of recent maintainer responsiveness.
const REVIEW_SAMPLE_LIMIT = 30;

// GitHub author_association values that indicate the commenter has write/triage
// access — i.e. acts as a maintainer — even if they aren't a listed assignee.
const MAINTAINER_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);

// Human-readable duration for the median time-to-review stat. Picks the
// coarsest unit that keeps the number readable (min < hr < day).
const formatDuration = (ms: number): string => {
  const minutes = ms / 60_000;
  if (minutes < 60) {
    const m = Math.max(1, Math.round(minutes));
    return `${m} min`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    const h = Math.round(hours);
    return `${h} hr${h === 1 ? '' : 's'}`;
  }
  const days = hours / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)} days`;
};

const RepositoryStats: React.FC<RepositoryStatsProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const { data: allPRs, isLoading: isLoadingPRs } = useAllPrs();
  const { data: issues, isLoading: isLoadingIssues } =
    useRepositoryIssues(repositoryFullName);
  const { data: bountySummary } = useRepoBountySummary(repositoryFullName);
  const { data: repoConfig } = useRepositoryConfig(repositoryFullName);
  const { data: maintainers } = useRepositoryMaintainers(repositoryFullName);

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
        isMergedPr(pr),
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

  const maintainerLogins = useMemo(
    () => new Set((maintainers ?? []).map((m) => m.login.toLowerCase())),
    [maintainers],
  );

  // The most recent non-maintainer PRs in this repo, capped at
  // REVIEW_SAMPLE_LIMIT. These are the PRs whose comments we'll fetch to find
  // the first maintainer response. Keep PR number + open time together so we
  // can measure each one without re-deriving it from the comment results.
  const reviewSample = useMemo(() => {
    if (!allPRs) return [] as { number: number; createdAt: string }[];

    return allPRs
      .filter(
        (pr) =>
          pr.repository.toLowerCase() === repositoryFullName.toLowerCase() &&
          !!pr.prCreatedAt &&
          !maintainerLogins.has((pr.author ?? '').toLowerCase()),
      )
      .sort(
        (a, b) =>
          new Date(b.prCreatedAt).getTime() - new Date(a.prCreatedAt).getTime(),
      )
      .slice(0, REVIEW_SAMPLE_LIMIT)
      .map((pr) => ({
        number: pr.pullRequestNumber,
        createdAt: pr.prCreatedAt,
      }));
  }, [allPRs, maintainerLogins, repositoryFullName]);

  const reviewSampleNumbers = useMemo(
    () => reviewSample.map((pr) => pr.number),
    [reviewSample],
  );

  const commentResults = usePullRequestCommentsBatch(
    repositoryFullName,
    reviewSampleNumbers,
    reviewSampleNumbers.length > 0,
  );

  // Median time from PR open to the first maintainer comment, over the recent
  // non-maintainer PRs sampled above — a proxy for how quickly maintainers
  // engage with outside contributions (regardless of whether they merge).
  const review = useMemo<{ loading: boolean; medianMs: number | null }>(() => {
    if (reviewSample.length === 0) return { loading: false, medianMs: null };

    const loading = commentResults.some((r) => r.isPending);

    const durations: number[] = [];
    reviewSample.forEach((pr, i) => {
      const comments = commentResults[i]?.data;
      if (!comments || comments.length === 0) return;

      const openedMs = new Date(pr.createdAt).getTime();
      const firstMaintainerMs = comments
        .filter((c) => {
          const login = (c.user?.login ?? '').toLowerCase();
          const association = (c.authorAssociation ?? '').toUpperCase();
          const isMaintainer =
            maintainerLogins.has(login) ||
            MAINTAINER_ASSOCIATIONS.has(association);
          return isMaintainer && !!c.createdAt;
        })
        .map((c) => new Date(c.createdAt).getTime())
        .filter((ms) => Number.isFinite(ms) && ms >= openedMs)
        .sort((a, b) => a - b)[0];

      if (firstMaintainerMs != null)
        durations.push(firstMaintainerMs - openedMs);
    });

    durations.sort((a, b) => a - b);
    if (durations.length === 0) return { loading, medianMs: null };

    const mid = Math.floor(durations.length / 2);
    const medianMs =
      durations.length % 2 === 0
        ? (durations[mid - 1] + durations[mid]) / 2
        : durations[mid];
    return { loading, medianMs };
  }, [commentResults, reviewSample, maintainerLogins]);

  // Fallback when no maintainer-review data is available: median time from PR
  // open to merge, over merged non-maintainer PRs. Comment data is sparse for
  // many repos, but merge timestamps are dense, so this keeps the stat useful.
  const mergeMedianMs = useMemo(() => {
    if (!allPRs) return null;

    const durations = allPRs
      .filter(
        (pr) =>
          pr.repository.toLowerCase() === repositoryFullName.toLowerCase() &&
          isMergedPr(pr) &&
          !!pr.mergedAt &&
          !!pr.prCreatedAt &&
          !maintainerLogins.has((pr.author ?? '').toLowerCase()),
      )
      .map(
        (pr) =>
          new Date(pr.mergedAt as string).getTime() -
          new Date(pr.prCreatedAt).getTime(),
      )
      .filter((ms) => Number.isFinite(ms) && ms > 0)
      .sort((a, b) => a - b);

    if (durations.length === 0) return null;

    const mid = Math.floor(durations.length / 2);
    return durations.length % 2 === 0
      ? (durations[mid - 1] + durations[mid]) / 2
      : durations[mid];
  }, [allPRs, maintainerLogins, repositoryFullName]);

  // Hybrid display value: prefer the true first-maintainer-review time; fall
  // back to time-to-merge where review data is unavailable.
  const timeToReviewMs = review.medianMs ?? mergeMedianMs;

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
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            mb: 2,
            fontSize: '14px',
          }}
        >
          Repository Stats
        </Typography>
        <Skeleton
          variant="rectangular"
          height={160}
          sx={{ bgcolor: 'surface.light', borderRadius: 2 }}
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
        sx={{ color: 'text.primary', fontWeight: 600, mb: 2, fontSize: '14px' }}
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
              color: 'text.primary',
              fontSize: '13px',
            }}
          >
            {formatWeight(repository.config?.emissionShare)}
          </Typography>
        </Box>

        <Divider sx={{ borderColor: 'border.light', my: 0.5 }} />

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
              color: 'text.primary',
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
              color: 'text.primary',
              fontSize: '13px',
            }}
          >
            {stats.mergedPRs}
          </Typography>
        </Box>

        {/* Median Time to Merge (non-maintainer PRs) */}
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
            Median Time to Review
          </Typography>
          {review.loading ? (
            <Skeleton variant="text" width={44} sx={{ fontSize: '13px' }} />
          ) : (
            <Typography
              variant="body2"
              sx={{
                color: 'text.primary',
                fontSize: '13px',
              }}
            >
              {timeToReviewMs != null ? formatDuration(timeToReviewMs) : '—'}
            </Typography>
          )}
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
              color: 'text.primary',
              fontSize: '13px',
            }}
          >
            {issueStats.closedIssues}
          </Typography>
        </Box>

        {/* Bounties */}
        {bountySummary && bountySummary.totalBounties > 0 && (
          <>
            <Divider sx={{ borderColor: 'border.light', my: 0.5 }} />

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
                    color: 'text.primary',
                    fontSize: '13px',
                  }}
                >
                  {formatTokenAmount(bountySummary.totalAvailable, 2)} α
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
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {formatTokenAmount(bountySummary.totalPaidOut, 2)} α
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* Additional Acceptable Branches */}
        {repoConfig?.config?.additionalAcceptableBranches &&
          repoConfig.config.additionalAcceptableBranches.length > 0 && (
            <>
              <Divider sx={{ borderColor: 'border.light', my: 0.5 }} />
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
                {repoConfig.config.additionalAcceptableBranches.map(
                  (branch: string) => (
                    <Chip
                      key={branch}
                      label={branch}
                      size="small"
                      sx={{
                        fontSize: '12px',
                        height: '24px',
                        bgcolor: 'surface.light',
                        color: 'text.primary',
                        border: `1px solid ${theme.palette.border.light}`,
                      }}
                    />
                  ),
                )}
              </Box>
            </>
          )}
      </Box>
    </Box>
  );
};

export default RepositoryStats;
