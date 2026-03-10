import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Tooltip,
  alpha,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useMinerPRs, useReposAndWeights, type CommitLog } from '../../api';
import { TIER_COLORS, STATUS_COLORS } from '../../theme';

interface MinerScoreBreakdownProps {
  githubId: string;
}

const tooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: 'rgba(30, 30, 30, 0.95)',
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
  arrow: { sx: { color: 'rgba(30, 30, 30, 0.95)' } },
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
  tooltip: string;
}

const MultiplierPill: React.FC<MultiplierPillProps> = ({
  label,
  value,
  tooltip,
}) => {
  const isNeutral = value === 1;
  const isGood = value > 1;
  const color = isNeutral
    ? STATUS_COLORS.neutral
    : isGood
      ? STATUS_COLORS.success
      : STATUS_COLORS.warningOrange;

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
          ×{Number(value).toFixed(2)}
        </Typography>
      </Box>
    </Tooltip>
  );
};

interface PrScoreRowProps {
  pr: CommitLog;
  repoTier: string;
}

const PrScoreRow: React.FC<PrScoreRowProps> = ({ pr, repoTier }) => {
  const [expanded, setExpanded] = useState(false);

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
            pt: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* Formula line */}
          {isMerged && baseScore > 0 && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                alignItems: 'center',
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.68rem',
                  color: (t) => alpha(t.palette.text.primary, 0.45),
                }}
              >
                base {baseScore.toFixed(2)}
              </Typography>
              {pr.rawCredibility != null && (
                <MultiplierPill
                  label="cred"
                  value={pr.credibilityScalar ?? 1}
                  tooltip={`Raw credibility: ${(Number(pr.rawCredibility ?? 0) * 100).toFixed(1)}%. Scaled by tier scalar to ${Number(pr.credibilityScalar ?? 1).toFixed(2)}×.`}
                />
              )}
              {pr.tokenScore != null && (
                <Tooltip
                  title={`${pr.structuralCount ?? 0} structural (${Number(pr.structuralScore ?? 0).toFixed(2)}) + ${pr.leafCount ?? 0} leaf (${Number(pr.leafScore ?? 0).toFixed(2)})`}
                  arrow
                  placement="top"
                  slotProps={tooltipSlotProps}
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'border.light',
                      backgroundColor: 'surface.subtle',
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
                      tokens
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'text.primary',
                      }}
                    >
                      {Number(pr.tokenScore).toFixed(2)}
                    </Typography>
                  </Box>
                </Tooltip>
              )}
            </Box>
          )}

          {/* Stats row */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.65rem',
                color: (t) => alpha(t.palette.text.primary, 0.4),
              }}
            >
              +{pr.additions} / -{pr.deletions}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.65rem',
                color: (t) => alpha(t.palette.text.primary, 0.4),
              }}
            >
              {pr.commitCount} commit{pr.commitCount !== 1 ? 's' : ''}
            </Typography>
            {pr.totalNodesScored != null && Number(pr.totalNodesScored) > 0 && (
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.65rem',
                  color: (t) => alpha(t.palette.text.primary, 0.4),
                }}
              >
                {pr.totalNodesScored} nodes scored
              </Typography>
            )}
            {isOpen && collateral > 0 && (
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.65rem',
                  color: STATUS_COLORS.warningOrange,
                }}
              >
                collateral: -{collateral.toFixed(4)}
              </Typography>
            )}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

const MinerScoreBreakdown: React.FC<MinerScoreBreakdownProps> = ({
  githubId,
}) => {
  const { data: prs, isLoading } = useMinerPRs(githubId);
  const { data: repos } = useReposAndWeights();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

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
              color: page === 0 ? (t) => alpha(t.palette.text.primary, 0.2) : 'primary.main',
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
