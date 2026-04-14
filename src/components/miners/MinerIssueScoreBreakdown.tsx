import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Stack,
  Tooltip,
  alpha,
  Collapse,
  IconButton,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import { useMinerStats, useIssues } from '../../api';
import { type IssueBounty } from '../../api/models/Issues';
import { STATUS_COLORS } from '../../theme';

interface MinerIssueScoreBreakdownProps {
  githubId: string;
}

const PAGE_SIZE = 10;

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

const MULTIPLIER_PILL_DEFS = [
  {
    key: 'discoveryCredibilityMultiplier' as const,
    label: 'cred',
    title: 'Credibility',
    desc: 'Based on your issue solve rate, scaled to reward consistency.',
  },
  {
    key: 'discoveryRepoWeightMultiplier' as const,
    label: 'repo wt',
    title: 'Repo Weight',
    desc: 'Based on repository weight and activity.',
  },
  {
    key: 'discoveryTimeDecayMultiplier' as const,
    label: 'decay',
    title: 'Time Decay',
    desc: 'Recent issues score higher. Sigmoid decay with 10-day midpoint.',
  },
  {
    key: 'discoveryReviewQualityMultiplier' as const,
    label: 'review',
    title: 'Review Quality',
    desc: 'Clean merge bonus (1.1×) or penalty per change-request round (-0.15×).',
  },
  {
    key: 'discoveryOpenIssueSpamMultiplier' as const,
    label: 'spam',
    title: 'Open Issue Spam',
    desc: 'Penalty for exceeding open issue threshold.',
  },
] as const;

const buildMultiplierPillData = (issue: IssueBounty) =>
  MULTIPLIER_PILL_DEFS.map((def) => ({
    ...def,
    raw: issue[def.key],
  }));

const buildStatLine = (issue: IssueBounty): string[] =>
  [
    issue.discoveryBaseScore &&
      parseFloat(issue.discoveryBaseScore) > 0 &&
      `base ${parseFloat(issue.discoveryBaseScore).toFixed(2)}`,
    issue.discoveryEarnedScore &&
      `earned ${parseFloat(issue.discoveryEarnedScore).toFixed(4)}`,
    `bounty ${parseFloat(issue.bountyAmount || '0').toFixed(2)}`,
    issue.winningPrNumber && `winning PR #${issue.winningPrNumber}`,
    issue.completedAt &&
      `completed ${new Date(issue.completedAt).toLocaleDateString()}`,
    !issue.completedAt &&
      `created ${new Date(issue.createdAt).toLocaleDateString()}`,
  ].filter((s): s is string => !!s);

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return STATUS_COLORS.merged;
    case 'active':
    case 'registered':
      return STATUS_COLORS.info;
    case 'cancelled':
      return STATUS_COLORS.closed;
    default:
      return STATUS_COLORS.neutral;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'registered':
      return 'Active';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

interface IssueScoreRowProps {
  issue: IssueBounty;
}

const IssueScoreRow: React.FC<IssueScoreRowProps> = ({ issue }) => {
  const [expanded, setExpanded] = useState(false);

  const isScored = issue.status === 'completed';
  const isCancelled = issue.status === 'cancelled';
  const isActive = issue.status === 'active' || issue.status === 'registered';
  const statusColor = getStatusColor(issue.status);
  const statusLabel = getStatusLabel(issue.status);
  const repoName =
    issue.repositoryFullName.split('/').pop() || issue.repositoryFullName;
  const score = parseFloat(issue.bountyAmount || '0');

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
        {/* Issue number + title */}
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
              #{issue.issueNumber}
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
              {issue.title || `Issue #${issue.issueNumber}`}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
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
            color: isCancelled
              ? (t) => alpha(t.palette.text.primary, 0.3)
              : isActive
                ? STATUS_COLORS.info
                : 'text.primary',
            flexShrink: 0,
          }}
        >
          {isCancelled ? '—' : isActive ? 'Pending' : score.toFixed(4)}
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
          {isScored && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                alignItems: 'center',
              }}
            >
              {buildMultiplierPillData(issue).map(
                (pill) =>
                  pill.raw != null && (
                    <MultiplierPill
                      key={pill.label}
                      label={pill.label}
                      value={parseFloat(pill.raw)}
                      tooltip={
                        <Stack direction="column">
                          <Typography variant="tooltipLabel">
                            {pill.title} {Number(pill.raw).toFixed(4)}×
                          </Typography>
                          <Typography variant="tooltipDesc">
                            {pill.desc}
                          </Typography>
                        </Stack>
                      }
                    />
                  ),
              )}
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {buildStatLine(issue).map((stat, i, arr) => (
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
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Button
              size="small"
              startIcon={<GitHubIcon sx={{ fontSize: '0.85rem' }} />}
              component="a"
              href={issue.githubUrl}
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

const MinerIssueScoreBreakdown: React.FC<MinerIssueScoreBreakdownProps> = ({
  githubId,
}) => {
  const { data: minerStats } = useMinerStats(githubId);
  const { data: allIssues, isLoading } = useIssues();
  const [page, setPage] = useState(0);

  const hotkey = minerStats?.hotkey || '';

  const minerIssues = useMemo(() => {
    if (!allIssues || !hotkey) return [];
    return allIssues
      .filter((issue) => issue.solverHotkey === hotkey)
      .sort((a, b) => {
        // Completed first, then by bounty amount desc
        if (a.status === 'completed' && b.status !== 'completed') return -1;
        if (a.status !== 'completed' && b.status === 'completed') return 1;
        return (
          parseFloat(b.bountyAmount || '0') - parseFloat(a.bountyAmount || '0')
        );
      });
  }, [allIssues, hotkey]);

  if (isLoading) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }} elevation={0}>
        <Typography
          sx={{
            color: (t) => alpha(t.palette.text.primary, 0.4),
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
          }}
        >
          Loading issue scores...
        </Typography>
      </Card>
    );
  }

  const totalPages = Math.ceil(minerIssues.length / PAGE_SIZE);
  const displayIssues = minerIssues.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

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
            Click any issue to see details
          </Typography>
        </Box>
      </Box>

      {/* Issue list */}
      {minerIssues.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.4),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.85rem',
            }}
          >
            No issue scores yet
          </Typography>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.25),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              mt: 0.5,
            }}
          >
            Issues will appear here when you solve bounty issues.
          </Typography>
        </Box>
      ) : (
        <Box>
          {displayIssues.map((issue, i) => (
            <IssueScoreRow
              key={`${issue.repositoryFullName}-${issue.issueNumber}-${i}`}
              issue={issue}
            />
          ))}
        </Box>
      )}

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

export default MinerIssueScoreBreakdown;
