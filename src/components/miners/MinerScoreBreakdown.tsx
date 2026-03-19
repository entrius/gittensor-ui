import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Tooltip,
  Stack,
  alpha,
  Collapse,
  IconButton,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  GitHub as GitHubIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  useMinerPRs,
  useReposAndWeights,
  usePullRequestDetails,
  type CommitLog,
} from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';

interface MinerScoreBreakdownProps {
  githubId: string;
}

const tooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: 'surface.tooltip',
      color: 'text.primary',
      fontSize: '0.72rem',
      fontFamily: '"JetBrains Mono", monospace',
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid',
      borderColor: 'border.light',
      maxWidth: 280,
    },
  },
  arrow: { sx: { color: 'surface.tooltip' } },
};

const tierColor = (tier: string | null | undefined): string => {
  switch (tier) {
    case 'Gold':
      return TIER_COLORS.gold;
    case 'Silver':
      return TIER_COLORS.silver;
    case 'Bronze':
      return TIER_COLORS.bronze;
    default:
      return STATUS_COLORS.neutral;
  }
};

interface MultiplierPillProps {
  label: string;
  value: number;
  tooltip: React.ReactNode;
  format?: 'multiplier' | 'value' | 'percent';
  pillColor?: string;
}

const MultiplierPill: React.FC<MultiplierPillProps> = ({
  label,
  value,
  tooltip,
  format = 'multiplier',
  pillColor,
}) => {
  const color =
    pillColor ??
    (format === 'multiplier'
      ? value === 1
        ? STATUS_COLORS.neutral
        : value > 1
          ? STATUS_COLORS.success
          : STATUS_COLORS.warningOrange
      : STATUS_COLORS.neutral);

  const display =
    format === 'percent'
      ? `${(value * 100).toFixed(1)}%`
      : format === 'value'
        ? Number(value).toFixed(2)
        : `×${Number(value).toFixed(2)}`;

  return (
    <Tooltip title={tooltip} arrow placement="top" slotProps={tooltipSlotProps}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.25,
          borderRadius: 1,
          border: `1px solid ${alpha(color, 0.25)}`,
          backgroundColor: alpha(color, 0.06),
          cursor: 'pointer',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.62rem',
            color: STATUS_COLORS.neutral,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.72rem',
            fontWeight: 600,
            color,
          }}
        >
          {display}
        </Typography>
      </Box>
    </Tooltip>
  );
};

interface PrScoreRowProps {
  pr: CommitLog;
  repoTier: string;
  onNavigateToPr: (repo: string, prNumber: number) => void;
}

const PrScoreRow: React.FC<PrScoreRowProps> = ({
  pr,
  repoTier,
  onNavigateToPr,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Fetch full PR details (with all multipliers) — cached by React Query
  const { data: prDetails } = usePullRequestDetails(
    pr.repository,
    pr.pullRequestNumber,
  );

  const score = parseFloat(pr.score || '0');
  const baseScore = parseFloat(pr.baseScore || '0');
  const isMerged = !!pr.mergedAt;
  const isClosed = pr.prState === 'CLOSED' && !pr.mergedAt;
  const isOpen = !pr.mergedAt && pr.prState !== 'CLOSED';
  const collateral = parseFloat(pr.collateralScore || '0');

  const statusColor = isMerged
    ? STATUS_COLORS.merged
    : isClosed
      ? STATUS_COLORS.closed
      : STATUS_COLORS.open;
  const statusLabel = isMerged ? 'Merged' : isClosed ? 'Closed' : 'Open';

  const repoName = pr.repository.split('/').pop() || pr.repository;

  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderColor: 'border.subtle',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 1.2,
          px: 1.5,
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'surface.subtle' },
          transition: 'background-color 0.15s',
        }}
      >
        {/* PR number + title */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'text.primary',
                flexShrink: 0,
              }}
            >
              #{pr.pullRequestNumber}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.72rem',
                color: (t) => alpha(t.palette.text.primary, 0.6),
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {pr.pullRequestTitle}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.62rem',
                color: tierColor(repoTier),
              }}
            >
              {repoName}
            </Typography>
            <Box
              sx={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: statusColor,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.62rem',
                color: statusColor,
              }}
            >
              {statusLabel}
            </Typography>
          </Box>
        </Box>

        {/* Score */}
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: isClosed
              ? (t) => alpha(t.palette.text.primary, 0.3)
              : isOpen
                ? STATUS_COLORS.warningOrange
                : 'text.primary',
            flexShrink: 0,
          }}
        >
          {isClosed
            ? '—'
            : isOpen && collateral > 0
              ? `-${collateral.toFixed(4)}`
              : score.toFixed(4)}
        </Typography>

        <IconButton
          size="small"
          sx={{ color: (t) => alpha(t.palette.text.primary, 0.3), p: 0.5 }}
        >
          {expanded ? (
            <ExpandLessIcon sx={{ fontSize: '1rem' }} />
          ) : (
            <ExpandMoreIcon sx={{ fontSize: '1rem' }} />
          )}
        </IconButton>
      </Box>

      {/* Expanded multiplier breakdown */}
      <Collapse in={expanded}>
        <Box
          sx={{
            px: 1.5,
            pb: 1.5,
            pt: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* Score multiplier chips — sourced from PR details API */}
          {isMerged && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                alignItems: 'center',
              }}
            >
              {prDetails?.credibilityMultiplier != null && (
                <MultiplierPill
                  label="cred"
                  value={parseFloat(prDetails.credibilityMultiplier)}
                  tooltip={
                    <Stack direction="column">
                      <Typography variant="tooltipLabel">
                        Credibility{' '}
                        {Number(prDetails.credibilityMultiplier).toFixed(4)}×
                      </Typography>
                      <Typography variant="tooltipDesc">
                        Raw credibility:{' '}
                        {(
                          Number(
                            prDetails.rawCredibility ?? pr.rawCredibility ?? 0,
                          ) * 100
                        ).toFixed(1)}
                        %
                      </Typography>
                    </Stack>
                  }
                />
              )}
              {prDetails?.repoWeightMultiplier != null && (
                <MultiplierPill
                  label="repo wt"
                  value={parseFloat(prDetails.repoWeightMultiplier)}
                  tooltip={
                    <Stack direction="column">
                      <Typography variant="tooltipLabel">
                        Repo Weight{' '}
                        {Number(prDetails.repoWeightMultiplier).toFixed(4)}×
                      </Typography>
                      <Typography variant="tooltipDesc">
                        Based on repository tier and activity.
                      </Typography>
                    </Stack>
                  }
                />
              )}
              {prDetails?.issueMultiplier != null && (
                <MultiplierPill
                  label="issue"
                  value={parseFloat(prDetails.issueMultiplier)}
                  tooltip={
                    <Stack direction="column">
                      <Typography variant="tooltipLabel">
                        Issue {Number(prDetails.issueMultiplier).toFixed(4)}×
                      </Typography>
                      <Typography variant="tooltipDesc">
                        Bonus for PRs linked to issues.
                      </Typography>
                    </Stack>
                  }
                />
              )}
              {prDetails?.repositoryUniquenessMultiplier != null && (
                <MultiplierPill
                  label="unique"
                  value={parseFloat(prDetails.repositoryUniquenessMultiplier)}
                  tooltip={
                    <Stack direction="column">
                      <Typography variant="tooltipLabel">
                        Uniqueness{' '}
                        {Number(
                          prDetails.repositoryUniquenessMultiplier,
                        ).toFixed(4)}
                        ×
                      </Typography>
                      <Typography variant="tooltipDesc">
                        Rewards contributing to diverse repos.
                      </Typography>
                    </Stack>
                  }
                />
              )}
              {prDetails?.timeDecayMultiplier != null && (
                <MultiplierPill
                  label="decay"
                  value={parseFloat(prDetails.timeDecayMultiplier)}
                  tooltip={
                    <Stack direction="column">
                      <Typography variant="tooltipLabel">
                        Time Decay{' '}
                        {Number(prDetails.timeDecayMultiplier).toFixed(4)}×
                      </Typography>
                      <Typography variant="tooltipDesc">
                        Recent PRs score higher.
                      </Typography>
                    </Stack>
                  }
                />
              )}
              {prDetails?.openPrSpamMultiplier != null && (
                <MultiplierPill
                  label="spam"
                  value={parseFloat(prDetails.openPrSpamMultiplier)}
                  tooltip={
                    <Stack direction="column">
                      <Typography variant="tooltipLabel">
                        Open PR Spam{' '}
                        {Number(prDetails.openPrSpamMultiplier).toFixed(4)}×
                      </Typography>
                      <Typography variant="tooltipDesc">
                        Penalty for excessive open PRs.
                      </Typography>
                    </Stack>
                  }
                />
              )}
              {prDetails?.reviewQualityMultiplier != null && (
                <MultiplierPill
                  label="review"
                  value={parseFloat(prDetails.reviewQualityMultiplier)}
                  tooltip={
                    <Stack direction="column">
                      <Typography variant="tooltipLabel">
                        Review Quality{' '}
                        {Number(prDetails.reviewQualityMultiplier).toFixed(4)}×
                      </Typography>
                      <Typography variant="tooltipDesc">
                        Multiplier based on the amount of requested changes the
                        PR required.
                      </Typography>
                    </Stack>
                  }
                />
              )}
            </Box>
          )}

          {/* Stats row with delimiter */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {[
              baseScore > 0 && `base ${baseScore.toFixed(2)}`,
              `+${pr.additions} / -${pr.deletions}`,
              `${pr.commitCount} commit${pr.commitCount !== 1 ? 's' : ''}`,
              pr.tokenScore != null &&
                `tokens ${Number(pr.tokenScore).toFixed(2)}`,
              pr.totalNodesScored != null &&
                Number(pr.totalNodesScored) > 0 &&
                `${pr.totalNodesScored} nodes`,
            ]
              .filter(Boolean)
              .map((stat, i, arr) => (
                <React.Fragment key={i}>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.65rem',
                      color: (t) => alpha(t.palette.text.primary, 0.4),
                    }}
                  >
                    {stat}
                  </Typography>
                  {i < arr.length - 1 && (
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.65rem',
                        color: (t) => alpha(t.palette.text.primary, 0.2),
                        mx: 0.25,
                      }}
                    >
                      ·
                    </Typography>
                  )}
                </React.Fragment>
              ))}
            {isOpen && collateral > 0 && (
              <>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.65rem',
                    color: (t) => alpha(t.palette.text.primary, 0.2),
                    mx: 0.25,
                  }}
                >
                  ·
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.65rem',
                    color: STATUS_COLORS.warningOrange,
                  }}
                >
                  collateral: -{collateral.toFixed(4)}
                </Typography>
              </>
            )}
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Button
              size="small"
              startIcon={<OpenInNewIcon sx={{ fontSize: '0.85rem' }} />}
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToPr(pr.repository, pr.pullRequestNumber);
              }}
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.65rem',
                textTransform: 'none',
                color: 'primary.main',
                px: 1,
                py: 0.25,
                minWidth: 'auto',
                '&:hover': { backgroundColor: 'surface.subtle' },
              }}
            >
              PR Details
            </Button>
            <Button
              size="small"
              startIcon={<GitHubIcon sx={{ fontSize: '0.85rem' }} />}
              component="a"
              href={`https://github.com/${pr.repository}/pull/${pr.pullRequestNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.65rem',
                textTransform: 'none',
                color: (t) => alpha(t.palette.text.primary, 0.5),
                px: 1,
                py: 0.25,
                minWidth: 'auto',
                '&:hover': {
                  backgroundColor: 'surface.subtle',
                  color: 'text.primary',
                },
              }}
            >
              GitHub
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

const MinerScoreBreakdown: React.FC<MinerScoreBreakdownProps> = ({
  githubId,
}) => {
  const navigate = useNavigate();
  const { data: prs, isLoading } = useMinerPRs(githubId);
  const { data: repos } = useReposAndWeights();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const handleNavigateToPr = (repo: string, prNumber: number) => {
    navigate(`/miners/pr?repo=${encodeURIComponent(repo)}&number=${prNumber}`);
  };

  const repoTierMap = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(repos)) {
      repos.forEach((r) => {
        if (r?.fullName) map.set(r.fullName, r.tier || '');
      });
    }
    return map;
  }, [repos]);

  const sortedPrs = useMemo(() => {
    if (!prs) return [];
    return [...prs].sort(
      (a, b) => parseFloat(b.score || '0') - parseFloat(a.score || '0'),
    );
  }, [prs]);

  const tierDistribution = useMemo(() => {
    if (!prs) return { bronze: 0, silver: 0, gold: 0, total: 0 };
    let bronze = 0;
    let silver = 0;
    let gold = 0;
    let total = 0;
    prs.forEach((pr) => {
      if (!pr.mergedAt) return;
      const score = parseFloat(pr.score || '0');
      total += score;
      const tier = (
        pr.tier ||
        repoTierMap.get(pr.repository) ||
        ''
      ).toLowerCase();
      if (tier === 'gold') gold += score;
      else if (tier === 'silver') silver += score;
      else bronze += score;
    });
    return { bronze, silver, gold, total };
  }, [prs, repoTierMap]);

  if (isLoading || !prs || prs.length === 0) return null;

  const totalPages = Math.ceil(sortedPrs.length / PAGE_SIZE);
  const displayPrs = sortedPrs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }} elevation={0}>
      <Box
        sx={{
          p: 2.5,
          borderBottom: '1px solid',
          borderColor: 'border.subtle',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '1rem',
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            Score Breakdown
          </Typography>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              color: (t) => alpha(t.palette.text.primary, 0.45),
              mt: 0.25,
            }}
          >
            Click any PR to see multiplier details
          </Typography>
        </Box>
      </Box>

      {/* Tier score distribution bar */}
      {tierDistribution.total > 0 && (
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'border.subtle',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, mb: 0.75 }}>
            {tierDistribution.gold > 0 && (
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.65rem',
                  color: TIER_COLORS.gold,
                }}
              >
                Gold: {tierDistribution.gold.toFixed(2)}
              </Typography>
            )}
            {tierDistribution.silver > 0 && (
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.65rem',
                  color: TIER_COLORS.silver,
                }}
              >
                Silver: {tierDistribution.silver.toFixed(2)}
              </Typography>
            )}
            {tierDistribution.bronze > 0 && (
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.65rem',
                  color: TIER_COLORS.bronze,
                }}
              >
                Bronze: {tierDistribution.bronze.toFixed(2)}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              display: 'flex',
              height: 6,
              borderRadius: 3,
              overflow: 'hidden',
              backgroundColor: 'border.subtle',
            }}
          >
            {tierDistribution.gold > 0 && (
              <Box
                sx={{
                  width: `${(tierDistribution.gold / tierDistribution.total) * 100}%`,
                  backgroundColor: TIER_COLORS.gold,
                }}
              />
            )}
            {tierDistribution.silver > 0 && (
              <Box
                sx={{
                  width: `${(tierDistribution.silver / tierDistribution.total) * 100}%`,
                  backgroundColor: TIER_COLORS.silver,
                }}
              />
            )}
            {tierDistribution.bronze > 0 && (
              <Box
                sx={{
                  width: `${(tierDistribution.bronze / tierDistribution.total) * 100}%`,
                  backgroundColor: TIER_COLORS.bronze,
                }}
              />
            )}
          </Box>
        </Box>
      )}

      {/* PR list */}
      <Box>
        {displayPrs.map((pr, i) => (
          <PrScoreRow
            key={`${pr.repository}-${pr.pullRequestNumber}-${i}`}
            pr={pr}
            repoTier={pr.tier || repoTierMap.get(pr.repository) || ''}
            onNavigateToPr={handleNavigateToPr}
          />
        ))}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            py: 1.2,
            borderTop: '1px solid',
            borderColor: 'border.subtle',
          }}
        >
          <Typography
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              color:
                page === 0
                  ? (t) => alpha(t.palette.text.primary, 0.2)
                  : 'primary.main',
              cursor: page === 0 ? 'default' : 'pointer',
              userSelect: 'none',
              '&:hover': page > 0 ? { textDecoration: 'underline' } : {},
            }}
          >
            ← Prev
          </Typography>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              color: (t) => alpha(t.palette.text.primary, 0.5),
            }}
          >
            {page + 1} / {totalPages}
          </Typography>
          <Typography
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              color:
                page >= totalPages - 1
                  ? (t) => alpha(t.palette.text.primary, 0.2)
                  : 'primary.main',
              cursor: page >= totalPages - 1 ? 'default' : 'pointer',
              userSelect: 'none',
              '&:hover':
                page < totalPages - 1 ? { textDecoration: 'underline' } : {},
            }}
          >
            Next →
          </Typography>
        </Box>
      )}
    </Card>
  );
};

export default MinerScoreBreakdown;
