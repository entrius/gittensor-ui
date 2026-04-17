import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Card,
  Grid,
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useMinerStats,
  useMinerPRs,
  usePullRequestDetails,
  type CommitLog,
} from '../../api';
import { STATUS_COLORS, tooltipSlotProps } from '../../theme';
import {
  parseNumber,
  calculateOpenIssueThreshold,
  isOutsideScoringWindow,
} from '../../utils/ExplorerUtils';
import { credibilityColor } from '../../utils/format';
import { buildMergedPillDefs } from '../../utils/multiplierDefs';

type ViewMode = 'prs' | 'issues';

interface MinerScoreBreakdownProps {
  githubId: string;
  viewMode?: ViewMode;
}

const tipProps = {
  ...tooltipSlotProps,
  tooltip: { sx: { ...tooltipSlotProps.tooltip.sx, maxWidth: 280 } },
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
        ? parseNumber(value).toFixed(2)
        : `×${parseNumber(value).toFixed(2)}`;

  return (
    <Tooltip title={tooltip} arrow placement="top" slotProps={tipProps}>
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
            fontSize: '0.62rem',
            color: STATUS_COLORS.neutral,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
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
  onNavigateToPr: (repo: string, prNumber: number) => void;
}

const PrScoreRow: React.FC<PrScoreRowProps> = ({ pr, onNavigateToPr }) => {
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
  const isStale = isMerged && isOutsideScoringWindow(pr.mergedAt);

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
                fontSize: '0.62rem',
                color: (t) => alpha(t.palette.text.primary, 0.5),
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
            fontSize: '0.9rem',
            fontWeight: 600,
            color: isClosed
              ? (t) => alpha(t.palette.text.primary, 0.3)
              : isOpen
                ? STATUS_COLORS.warningOrange
                : 'text.primary',
            opacity: isStale ? 0.4 : 1,
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
          {isMerged && prDetails && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                alignItems: 'center',
              }}
            >
              {buildMergedPillDefs(prDetails).map((def) => (
                <MultiplierPill
                  key={def.key}
                  label={def.label}
                  value={def.value}
                  format={def.format}
                  tooltip={
                    <Stack direction="column">
                      <Typography variant="tooltipLabel">
                        {def.tooltipTitle}
                      </Typography>
                      <Typography variant="tooltipDesc">
                        {def.tooltipDesc}
                      </Typography>
                    </Stack>
                  }
                />
              ))}
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
                `tokens ${parseNumber(pr.tokenScore).toFixed(2)}`,
              pr.totalNodesScored != null &&
                parseNumber(pr.totalNodesScored) > 0 &&
                `${pr.totalNodesScored} nodes`,
            ]
              .filter(Boolean)
              .map((stat, i, arr) => (
                <React.Fragment key={i}>
                  <Typography
                    component="span"
                    sx={{
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

// ---------------------------------------------------------------------------
// Issue-mode breakdown sub-components
// ---------------------------------------------------------------------------

const MetricRow: React.FC<{
  label: string;
  value: string;
  color?: string;
  sub?: string;
}> = ({ label, value, color, sub }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      py: 1.2,
      borderBottom: '1px solid',
      borderColor: (t) => alpha(t.palette.text.primary, 0.06),
    }}
  >
    <Box>
      <Typography
        sx={{
          fontSize: '0.82rem',
          color: 'text.primary',
        }}
      >
        {label}
      </Typography>
      {sub && (
        <Typography
          sx={{
            fontSize: '0.7rem',
            color: (t) => alpha(t.palette.text.primary, 0.4),
            mt: 0.25,
          }}
        >
          {sub}
        </Typography>
      )}
    </Box>
    <Typography
      sx={{
        fontSize: '0.95rem',
        fontWeight: 600,
        color: color || 'text.primary',
      }}
    >
      {value}
    </Typography>
  </Box>
);

const IssueBreakdownView: React.FC<{ githubId: string }> = ({ githubId }) => {
  const { data: minerStats } = useMinerStats(githubId);

  if (!minerStats) return null;

  const discoveryScore = parseNumber(minerStats.issueDiscoveryScore);
  const issueCred = parseNumber(minerStats.issueCredibility);
  const issueTokenScore = parseNumber(minerStats.issueTokenScore);
  const solved = parseNumber(minerStats.totalSolvedIssues);
  const validSolved = parseNumber(minerStats.totalValidSolvedIssues);
  const closedIssues = parseNumber(minerStats.totalClosedIssues);
  const openIssues = parseNumber(minerStats.totalOpenIssues);
  const isEligible = minerStats.isIssueEligible ?? false;
  const openThreshold = calculateOpenIssueThreshold(minerStats);

  const hasAnyData = solved > 0 || openIssues > 0 || closedIssues > 0;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        p: 3,
      }}
      elevation={0}
    >
      <Typography
        sx={{
          color: 'text.primary',
          fontSize: '1.1rem',
          fontWeight: 600,
          mb: 0.8,
        }}
      >
        Issue Discovery Breakdown
      </Typography>
      <Typography
        sx={{
          color: (t) => alpha(t.palette.text.primary, 0.55),
          fontSize: '0.85rem',
          mb: 2,
        }}
      >
        Aggregate issue discovery stats from existing evaluations.
      </Typography>

      {!hasAnyData ? (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            borderRadius: 2,
            backgroundColor: (t) => alpha(t.palette.text.primary, 0.03),
          }}
        >
          <Typography
            sx={{
              fontSize: '0.85rem',
              color: (t) => alpha(t.palette.text.primary, 0.4),
            }}
          >
            No issue discovery data yet
          </Typography>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: (t) => alpha(t.palette.text.primary, 0.3),
              mt: 0.5,
            }}
          >
            Start discovering issues to see your breakdown here
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <MetricRow
              label="Discovery Score"
              value={discoveryScore.toFixed(2)}
            />
            <MetricRow
              label="Issue Token Score"
              value={issueTokenScore.toFixed(0)}
              sub="Sum of solving PR token scores"
            />
            <MetricRow
              label="Issue Credibility"
              value={`${(issueCred * 100).toFixed(1)}%`}
              color={credibilityColor(issueCred)}
              sub="Solved / (solved + max(0, closed − 1))"
            />
            <MetricRow
              label="Eligibility"
              value={isEligible ? 'Eligible' : 'Ineligible'}
              color={isEligible ? STATUS_COLORS.success : STATUS_COLORS.neutral}
              sub="Requires 7 valid solved issues"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <MetricRow
              label="Total Solved"
              value={String(solved)}
              sub={`${validSolved} valid (token score \u2265 5)`}
            />
            <MetricRow
              label="Closed Issues"
              value={String(closedIssues)}
              sub="Discovered issues closed without solve"
            />
            <MetricRow
              label="Open Issues"
              value={String(openIssues)}
              color={
                openIssues >= openThreshold ? STATUS_COLORS.error : undefined
              }
              sub={`Threshold: ${openThreshold}`}
            />
          </Grid>
        </Grid>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// PR-mode breakdown
// ---------------------------------------------------------------------------

const PrBreakdownView: React.FC<{ githubId: string }> = ({ githubId }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: prs, isLoading } = useMinerPRs(githubId);
  const PAGE_SIZE = 10;

  const page = parseInt(searchParams.get('scorePage') || '0', 10);
  const setPage = useCallback(
    (updater: number | ((prev: number) => number)) => {
      const next = typeof updater === 'function' ? updater(page) : updater;
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 0) p.delete('scorePage');
          else p.set('scorePage', String(next));
          return p;
        },
        { replace: true },
      );
    },
    [page, setSearchParams],
  );

  const handleNavigateToPr = (repo: string, prNumber: number) => {
    navigate(`/miners/pr?repo=${encodeURIComponent(repo)}&number=${prNumber}`);
  };

  const sortedPrs = useMemo(() => {
    if (!prs) return [];
    return [...prs].sort(
      (a, b) => parseFloat(b.score || '0') - parseFloat(a.score || '0'),
    );
  }, [prs]);

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
              fontSize: '1rem',
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            Score Breakdown
          </Typography>
          <Typography
            sx={{
              fontSize: '0.72rem',
              color: (t) => alpha(t.palette.text.primary, 0.45),
              mt: 0.25,
            }}
          >
            Click any PR to see multiplier details
          </Typography>
        </Box>
      </Box>

      {/* PR list */}
      <Box>
        {displayPrs.map((pr, i) => (
          <PrScoreRow
            key={`${pr.repository}-${pr.pullRequestNumber}-${i}`}
            pr={pr}
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
              fontSize: '0.72rem',
              color: (t) => alpha(t.palette.text.primary, 0.5),
            }}
          >
            {page + 1} / {totalPages}
          </Typography>
          <Typography
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            sx={{
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

// ---------------------------------------------------------------------------
// Main component — dispatches to PR or Issue view
// ---------------------------------------------------------------------------

const MinerScoreBreakdown: React.FC<MinerScoreBreakdownProps> = ({
  githubId,
  viewMode = 'prs',
}) => {
  if (viewMode === 'issues') {
    return <IssueBreakdownView githubId={githubId} />;
  }
  return <PrBreakdownView githubId={githubId} />;
};

export default MinerScoreBreakdown;
