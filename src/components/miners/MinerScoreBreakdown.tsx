import React, {
  memo,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
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
  useTheme,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  Select,
  useMediaQuery,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  GitHub as GitHubIcon,
  OpenInNew as OpenInNewIcon,
  Search as SearchIcon,
  West as WestIcon,
  East as EastIcon,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { linkResetSx, useLinkBehavior } from '../common/linkBehavior';
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
import { filterPrs, getPrStatusCounts, type PrStatusFilter } from '../../utils';
import FilterButton from '../FilterButton';

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
}

const PrScoreRow: React.FC<PrScoreRowProps> = memo(({ pr }) => {
  const [expanded, setExpanded] = useState(false);
  const prLinkProps = useLinkBehavior<HTMLAnchorElement>(
    `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
  );

  const isMerged = !!pr.mergedAt;

  // Fetch multiplier breakdown only after expand — avoids N concurrent /details calls per page.
  const { data: prDetails } = usePullRequestDetails(
    pr.repository,
    pr.pullRequestNumber,
    expanded && isMerged,
  );

  const score = parseFloat(pr.score || '0');
  const baseScore = parseFloat(pr.baseScore || '0');
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
              pr.structuralCount != null &&
                parseNumber(pr.structuralCount) > 0 &&
                `${pr.structuralCount} structural (${parseNumber(pr.structuralScore).toFixed(2)})`,
              pr.leafCount != null &&
                parseNumber(pr.leafCount) > 0 &&
                `${pr.leafCount} leaf (${parseNumber(pr.leafScore).toFixed(2)})`,
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
              component="a"
              {...prLinkProps}
              onClick={(e) => {
                e.stopPropagation();
                prLinkProps.onClick(e);
              }}
              sx={{
                ...linkResetSx,
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
});

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

type ScoreRowsOption = 5 | 10 | 20 | 50 | 'all';

const DEFAULT_SCORE_ROWS: ScoreRowsOption = 10;

const SCORE_BREAKDOWN_ROWS_SELECT_SX = {
  color: 'text.primary',
  backgroundColor: 'background.default',
  fontSize: '0.8rem',
  height: '36px',
  borderRadius: 2,
  minWidth: '80px',
  '& fieldset': { borderColor: 'border.light' },
  '&:hover fieldset': {
    borderColor: 'border.medium',
  },
  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  '& .MuiSelect-select': { py: 0.75 },
} as const;

const SCORE_BREAKDOWN_SEARCH_FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    color: 'text.primary',
    backgroundColor: 'background.default',
    fontSize: '0.8rem',
    height: '36px',
    borderRadius: 2,
    '& fieldset': { borderColor: 'border.light' },
    '&:hover fieldset': {
      borderColor: 'border.medium',
    },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  },
} as const;

function parseScoreRowsParam(raw: string | null): ScoreRowsOption {
  if (raw === 'all') return 'all';
  if (raw == null || raw === '') return DEFAULT_SCORE_ROWS;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return DEFAULT_SCORE_ROWS;
  if (n === 5 || n === 10 || n === 20 || n === 50) return n;
  return DEFAULT_SCORE_ROWS;
}

function scoreStatusFromSearchParam(raw: string | null): PrStatusFilter {
  if (raw === 'open' || raw === 'merged' || raw === 'closed') return raw;
  return 'all';
}

function buildPaginationItems(
  currentPageOneBased: number,
  totalPages: number,
  delta = 2,
): Array<number | 'ellipsis'> {
  if (totalPages <= 1) return [];
  if (totalPages <= delta * 2 + 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (
    let i = Math.max(1, currentPageOneBased - delta);
    i <= Math.min(totalPages, currentPageOneBased + delta);
    i++
  ) {
    pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | 'ellipsis'> = [];
  let prev: number | undefined;
  for (const p of sorted) {
    if (prev !== undefined && p - prev > 1) {
      result.push('ellipsis');
    }
    result.push(p);
    prev = p;
  }
  return result;
}

interface ScoreBreakdownPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const ScoreBreakdownPagination = memo(function ScoreBreakdownPagination({
  page,
  totalPages,
  onPageChange,
}: ScoreBreakdownPaginationProps) {
  const theme = useTheme();
  const isMobilePager = useMediaQuery(theme.breakpoints.down('sm'));
  const primary = theme.palette.primary.main;
  const activeFg =
    theme.palette.primary.contrastText ?? theme.palette.common.white;
  const items = useMemo(
    () => buildPaginationItems(page + 1, totalPages),
    [page, totalPages],
  );

  const navSx = (enabled: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.25,
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: enabled ? primary : alpha(theme.palette.text.primary, 0.22),
    cursor: enabled ? 'pointer' : 'default',
    userSelect: 'none' as const,
    '&:hover': enabled ? { opacity: 0.88 } : {},
  });

  const outerBarSx = {
    py: 1.5,
    px: 1,
    borderTop: '1px solid',
    borderColor: 'border.subtle',
  } as const;

  if (isMobilePager) {
    const canPrev = page > 0;
    const canNext = page < totalPages - 1;
    return (
      <Box sx={outerBarSx}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 1,
          }}
        >
          <Box
            component="button"
            type="button"
            aria-label="Previous page"
            onClick={() => canPrev && onPageChange(page - 1)}
            sx={{
              ...navSx(canPrev),
              border: 'none',
              background: 'none',
              fontFamily: 'inherit',
              p: 0,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.35,
              }}
            >
              <WestIcon
                sx={{ fontSize: '1.05rem', color: 'inherit', flexShrink: 0 }}
              />
              Prev
            </Box>
          </Box>

          <Typography
            component="span"
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: 'text.primary',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {page + 1} / {totalPages}
          </Typography>

          <Box
            component="button"
            type="button"
            aria-label="Next page"
            onClick={() => canNext && onPageChange(page + 1)}
            sx={{
              ...navSx(canNext),
              border: 'none',
              background: 'none',
              fontFamily: 'inherit',
              p: 0,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.35,
              }}
            >
              Next
              <EastIcon
                sx={{ fontSize: '1.05rem', color: 'inherit', flexShrink: 0 }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...outerBarSx,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: { xs: 0.75, sm: 1 },
      }}
    >
      <Box
        component="button"
        type="button"
        aria-label="Previous page"
        onClick={() => page > 0 && onPageChange(page - 1)}
        sx={{
          ...navSx(page > 0),
          border: 'none',
          background: 'none',
          fontFamily: 'inherit',
          p: 0,
        }}
      >
        <WestIcon sx={{ fontSize: '1.1rem', color: 'inherit' }} />
        Prev
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.35, sm: 0.5 },
          mx: { xs: 0.5, sm: 1 },
        }}
      >
        {items.map((item, idx) =>
          item === 'ellipsis' ? (
            <Typography
              key={`ellipsis-${idx}`}
              component="span"
              sx={{
                fontSize: '0.8125rem',
                color: alpha(theme.palette.text.primary, 0.45),
                px: 0.25,
                userSelect: 'none',
              }}
            >
              ...
            </Typography>
          ) : (
            <Box
              key={item}
              component="button"
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === page + 1 ? 'page' : undefined}
              onClick={() => onPageChange(item - 1)}
              sx={{
                minWidth: 36,
                height: 32,
                px: 1,
                borderRadius: 1,
                border: 'none',
                backgroundColor: item === page + 1 ? primary : 'transparent',
                color: item === page + 1 ? activeFg : 'text.primary',
                fontSize: '0.8125rem',
                fontWeight: item === page + 1 ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                lineHeight: 1,
                '&:hover': {
                  backgroundColor:
                    item === page + 1
                      ? primary
                      : alpha(theme.palette.text.primary, 0.06),
                },
              }}
            >
              {item}
            </Box>
          ),
        )}
      </Box>

      <Box
        component="button"
        type="button"
        aria-label="Next page"
        onClick={() => page < totalPages - 1 && onPageChange(page + 1)}
        sx={{
          ...navSx(page < totalPages - 1),
          border: 'none',
          background: 'none',
          fontFamily: 'inherit',
          p: 0,
        }}
      >
        Next
        <EastIcon sx={{ fontSize: '1.1rem', color: 'inherit' }} />
      </Box>
    </Box>
  );
});

// ---------------------------------------------------------------------------
// PR-mode breakdown
// ---------------------------------------------------------------------------

const PrBreakdownView: React.FC<{ githubId: string }> = ({ githubId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: prs, isLoading } = useMinerPRs(githubId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const statusFilter = scoreStatusFromSearchParam(
    searchParams.get('scoreStatus'),
  );

  const scoreRowsParam = searchParams.get('scoreRows');
  const pageSize = useMemo(
    () => parseScoreRowsParam(scoreRowsParam),
    [scoreRowsParam],
  );

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

  const setRowsPerPage = useCallback(
    (next: ScoreRowsOption) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === DEFAULT_SCORE_ROWS) p.delete('scoreRows');
          else p.set('scoreRows', String(next));
          p.delete('scorePage');
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleFilterChange = useCallback(
    (next: PrStatusFilter) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'all') p.delete('scoreStatus');
          else p.set('scoreStatus', next);
          p.delete('scorePage');
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const prevSearchRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevSearchRef.current === null) {
      prevSearchRef.current = searchQuery;
      return;
    }
    if (prevSearchRef.current === searchQuery) return;
    prevSearchRef.current = searchQuery;
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('scorePage');
        return p;
      },
      { replace: true },
    );
  }, [searchQuery, setSearchParams]);

  useEffect(() => {
    if (!isMobile) setIsMobileSearchOpen(false);
  }, [isMobile]);

  const statusCounts = useMemo(() => getPrStatusCounts(prs ?? []), [prs]);

  const statusFilterTotal = useMemo(() => {
    switch (statusFilter) {
      case 'all':
        return statusCounts.all;
      case 'open':
        return statusCounts.open;
      case 'merged':
        return statusCounts.merged;
      case 'closed':
        return statusCounts.closed;
      default:
        return statusCounts.all;
    }
  }, [statusFilter, statusCounts]);

  const filteredPrs = useMemo(() => {
    if (!prs) return [];
    let list = [...filterPrs(prs, { statusFilter })].sort(
      (a, b) => parseFloat(b.score || '0') - parseFloat(a.score || '0'),
    );
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((pr) => {
        const title = (pr.pullRequestTitle || '').toLowerCase();
        const repo = (pr.repository || '').toLowerCase();
        const num = String(pr.pullRequestNumber);
        return (
          title.includes(q) ||
          repo.includes(q) ||
          num.includes(q) ||
          `#${num}`.includes(q)
        );
      });
    }
    return list;
  }, [prs, statusFilter, searchQuery]);

  const paging = useMemo(() => {
    const isAllRows = pageSize === 'all';
    const chunk = isAllRows ? filteredPrs.length || 1 : pageSize;
    const totalPages = isAllRows
      ? 1
      : Math.max(1, Math.ceil(filteredPrs.length / pageSize));
    const safePage = Math.min(page, totalPages - 1);
    const displayPrs = isAllRows
      ? filteredPrs
      : filteredPrs.slice(safePage * chunk, safePage * chunk + chunk);
    const showPagination = !isAllRows && totalPages > 1;
    return {
      totalPages,
      safePage,
      displayPrs,
      showPagination,
    };
  }, [filteredPrs, pageSize, page]);

  const { totalPages, safePage, displayPrs, showPagination } = paging;

  const trimmedSearch = searchQuery.trim();

  const isMobileSearchVisible =
    isMobile && (isMobileSearchOpen || !!trimmedSearch);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const t = searchQuery.trim();
      if (e.key === 'Escape' && !t) {
        setIsMobileSearchOpen(false);
      }
    },
    [searchQuery],
  );

  const searchInput = (
    <TextField
      size="small"
      placeholder="Search or enter title, repo, or #…"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onKeyDown={handleSearchKeyDown}
      onBlur={() => {
        const t = searchQuery.trim();
        if (isMobile && !t) setIsMobileSearchOpen(false);
      }}
      autoFocus={isMobileSearchOpen}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon
              sx={{
                color: 'text.tertiary',
                fontSize: '1rem',
              }}
            />
          </InputAdornment>
        ),
      }}
      sx={{
        width: '100%',
        minWidth: 0,
        ...SCORE_BREAKDOWN_SEARCH_FIELD_SX,
      }}
    />
  );

  if (isLoading || !prs || prs.length === 0) return null;

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }} elevation={0}>
      <Box
        sx={{
          p: 2.5,
          borderBottom: '1px solid',
          borderColor: 'border.subtle',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              columnGap: 0.75,
              rowGap: 0.25,
            }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'text.primary',
              }}
            >
              Score Breakdown
            </Typography>
            {trimmedSearch ? (
              <Typography
                component="span"
                sx={{
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {`( ${filteredPrs.length} / ${statusFilterTotal} )`}
              </Typography>
            ) : null}
          </Box>
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
        <Box
          sx={{
            width: { xs: '100%', sm: 'auto' },
            minWidth: 0,
            overflowX: { xs: 'auto', sm: 'visible' },
            WebkitOverflowScrolling: 'touch',
            pb: { xs: 0.25, sm: 0 },
            '&::-webkit-scrollbar': { height: 5 },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 2,
              backgroundColor: (t) => alpha(t.palette.text.primary, 0.15),
            },
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: { xs: 'nowrap', sm: 'wrap' },
              width: { xs: 'max-content', sm: 'auto' },
              py: 0.25,
            }}
          >
            <FilterButton
              label="All"
              isActive={statusFilter === 'all'}
              onClick={() => handleFilterChange('all')}
              count={statusCounts.all}
              color={theme.palette.status.neutral}
            />
            <FilterButton
              label="Open"
              isActive={statusFilter === 'open'}
              onClick={() => handleFilterChange('open')}
              count={statusCounts.open}
              color={theme.palette.status.open}
            />
            <FilterButton
              label="Merged"
              isActive={statusFilter === 'merged'}
              onClick={() => handleFilterChange('merged')}
              count={statusCounts.merged}
              color={theme.palette.status.merged}
            />
            <FilterButton
              label="Closed"
              isActive={statusFilter === 'closed'}
              onClick={() => handleFilterChange('closed')}
              count={statusCounts.closed}
              color={theme.palette.status.closed}
            />
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          px: 2,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          width: '100%',
          borderBottom: '1px solid',
          borderColor: 'border.subtle',
        }}
      >
        <FormControl size="small" sx={{ flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: '0.8rem',
              }}
            >
              Rows:
            </Typography>
            <Select
              aria-label="Rows per page"
              value={pageSize === 'all' ? 'all' : pageSize}
              onChange={(e) => {
                const v = e.target.value;
                setRowsPerPage(
                  v === 'all' ? 'all' : (Number(v) as ScoreRowsOption),
                );
              }}
              sx={SCORE_BREAKDOWN_ROWS_SELECT_SX}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value="all">All</MenuItem>
            </Select>
          </Box>
        </FormControl>

        {!isMobile && (
          <Box sx={{ flex: 1, minWidth: { xs: 0, sm: '200px' } }}>
            {searchInput}
          </Box>
        )}

        {isMobile && !isMobileSearchVisible && (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }} aria-hidden />
            <IconButton
              size="small"
              onClick={() => setIsMobileSearchOpen(true)}
              aria-label="Search pull requests"
              sx={{
                color: 'text.tertiary',
                border: '1px solid',
                borderColor: 'border.light',
                borderRadius: 2,
                width: 36,
                height: 36,
                flexShrink: 0,
                '&:hover': {
                  backgroundColor: 'surface.light',
                  borderColor: 'border.medium',
                },
              }}
            >
              <SearchIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </>
        )}

        {isMobile && isMobileSearchVisible && (
          <Box sx={{ flex: '1 1 100%', minWidth: 0 }}>{searchInput}</Box>
        )}
      </Box>

      <Box>
        {displayPrs.length === 0 ? (
          <Typography
            sx={{
              fontSize: '0.8rem',
              color: (t) => alpha(t.palette.text.primary, 0.5),
              textAlign: 'center',
              py: 4,
            }}
          >
            {searchQuery.trim()
              ? 'No PRs match your search.'
              : `No ${statusFilter === 'all' ? '' : statusFilter} PRs to show.`}
          </Typography>
        ) : (
          displayPrs.map((pr) => (
            <PrScoreRow
              key={`${pr.repository}-${pr.pullRequestNumber}`}
              pr={pr}
            />
          ))
        )}
      </Box>

      {showPagination && (
        <ScoreBreakdownPagination
          page={safePage}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
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
