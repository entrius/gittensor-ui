import React, { useEffect, useMemo, useState } from 'react';
import {
  alpha,
  Avatar,
  Box,
  Card,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowDownward as ArrowDownIcon,
  ArrowUpward as ArrowUpIcon,
  GridView as GridIcon,
  Search as SearchIcon,
  TableRows as TableIcon,
} from '@mui/icons-material';
import {
  useMinerPRs,
  useMinerStats,
  useReposAndWeights,
  type MinerRepositoryEvaluation,
  type RepositoryConfig,
} from '../../api';
import { STATUS_COLORS, tooltipSlotProps } from '../../theme';
import { credibilityColor } from '../../utils/format';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import { buildRepoWeightsMap } from '../../utils/ExplorerUtils';
import {
  computeOpenPrAllowance,
  computeRepoUnlock,
  countValidMergedPrsByRepo,
  getEligibilityThresholds,
  type EligibilityThresholds,
  type RepoUnlock,
  type ViewMode,
} from '../../utils/minerProgress';
import { DataTable, type DataTableColumn } from '../common';
import SegmentedToggle from '../common/SegmentedToggle';
import { ClearSearchAdornment } from '../common/ClearSearchAdornment';
import { DebouncedSearchInput } from '../common/DebouncedSearchInput';
import TablePagination, {
  getMinerExplorerPaging,
  MINER_EXPLORER_ROWS_SELECT_SX,
} from '../common/TablePagination';
import EmptyStateMessage from './EmptyStateMessage';
import MinerRepositoryCard, { repoMinersHref } from './MinerRepositoryCard';

// Page-size options per view. Card sizes are multiples of the 1/2/3-column grid
// so the final row is never partial — mirrors the leaderboard's card sizing.
const TABLE_ROWS = [5, 10, 20, 50] as const;
const CARD_ROWS = [12, 24, 48] as const;
const DEFAULT_TABLE_ROWS = 20;
const DEFAULT_CARD_ROWS = 12;

const clampRowsForView = (rows: number, view: StandingsView): number => {
  const opts = view === 'cards' ? CARD_ROWS : TABLE_ROWS;
  if ((opts as readonly number[]).includes(rows)) return rows;
  return view === 'cards' ? DEFAULT_CARD_ROWS : DEFAULT_TABLE_ROWS;
};

type StandingsView = 'cards' | 'table';
type SortKey =
  | 'progress'
  | 'status'
  | 'pays'
  | 'score'
  | 'credibility'
  | 'count'
  | 'repository';
type SortOrder = 'asc' | 'desc';
type EligibilityFilter = 'all' | 'eligible' | 'ineligible';

interface MinerRepositoryPanelProps {
  githubId: string;
  viewMode?: ViewMode;
}

interface RepoRow {
  repo: MinerRepositoryEvaluation;
  unlock: RepoUnlock;
  score: number;
  credibility: number;
  count: number;
  /** Repo's emission share (payout weight) of the OSS reward pool, 0–1. */
  pays: number;
  /** Open-PR allowance before the excessive-open-PR gate zeroes repo score. */
  openAllowance: number;
}

type OpenRiskLevel = 'over' | 'at' | 'near' | 'ok';

const OPEN_RISK_COLOR: Record<OpenRiskLevel, string> = {
  over: STATUS_COLORS.error,
  at: STATUS_COLORS.warningOrange,
  near: STATUS_COLORS.warning,
  ok: STATUS_COLORS.success,
};

const openRiskLevel = (open: number, allowance: number): OpenRiskLevel => {
  if (open > allowance) return 'over';
  if (open === allowance) return 'at';
  if (allowance - open <= 1) return 'near';
  return 'ok';
};

/**
 * Open PRs against the repo's open-PR allowance. Open PRs withhold collateral
 * and, once they exceed the allowance, zero the repo's contribution score — so
 * this doubles as the risk signal that used to live in its own section: green
 * healthy → amber approaching → red over limit. Renders "—" with no open PRs.
 */
const OpenRiskCell: React.FC<{ open: number; allowance: number }> = ({
  open,
  allowance,
}) => {
  if (open <= 0) {
    return (
      <Typography
        component="span"
        sx={{ fontSize: '0.83rem', color: 'text.tertiary' }}
      >
        —
      </Typography>
    );
  }
  const level = openRiskLevel(open, allowance);
  const color = OPEN_RISK_COLOR[level];
  const title =
    level === 'over'
      ? `${open} open PRs exceed the allowance of ${allowance} — this repository’s contribution score is currently zeroed. Merge or close PRs to recover.`
      : level === 'at'
        ? `At the open-PR limit (${open}/${allowance}). One more open PR zeroes this repository’s contribution score.`
        : level === 'near'
          ? `${open}/${allowance} open-PR slots used — one slot left before the score is zeroed.`
          : `${open}/${allowance} open-PR slots used. Healthy headroom (allowance grows with token score).`;
  return (
    <Tooltip title={title} arrow placement="top" slotProps={tooltipSlotProps}>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'baseline',
          justifyContent: 'flex-end',
          gap: 0.25,
          cursor: 'help',
        }}
      >
        <Typography
          component="span"
          sx={{ fontSize: '0.83rem', fontWeight: 700, color }}
        >
          {open}
        </Typography>
        <Typography
          component="span"
          sx={{ fontSize: '0.72rem', color: 'text.tertiary' }}
        >
          / {allowance}
        </Typography>
      </Box>
    </Tooltip>
  );
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'progress', label: 'Closest to unlock' },
  { value: 'pays', label: 'Pays most' },
  { value: 'status', label: 'Status' },
  { value: 'score', label: 'Score' },
  { value: 'credibility', label: 'Credibility' },
  { value: 'count', label: 'Activity' },
  { value: 'repository', label: 'Repository' },
];

/** Payout weight as a percentage of the OSS reward pool. */
const PaysCell: React.FC<{ pays: number }> = ({ pays }) =>
  pays > 0 ? (
    <Typography
      component="span"
      sx={{ fontSize: '0.83rem', fontWeight: 600, color: 'text.primary' }}
    >
      {(pays * 100).toFixed(pays >= 0.1 ? 1 : 2)}%
    </Typography>
  ) : (
    <Typography
      component="span"
      sx={{ fontSize: '0.83rem', color: 'text.tertiary' }}
    >
      —
    </Typography>
  );

/** Compact activity count with a muted hierarchy (merged → open → closed). */
const COUNT_TONE: Record<'merged' | 'open' | 'closed', string> = {
  merged: 'text.primary',
  open: 'text.secondary',
  closed: 'text.tertiary',
};

const CountCell: React.FC<{
  value: number;
  tone: 'merged' | 'open' | 'closed';
}> = ({ value, tone }) => (
  <Typography
    component="span"
    sx={{
      fontSize: '0.83rem',
      fontWeight: 600,
      color: value > 0 ? COUNT_TONE[tone] : 'text.tertiary',
    }}
  >
    {value > 0 ? value.toLocaleString() : '—'}
  </Typography>
);

const RepositoryCell: React.FC<{ repository: string }> = ({ repository }) => {
  const owner = repository.split('/')[0];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Avatar
        src={getRepositoryOwnerAvatarSrc(owner)}
        alt={owner}
        sx={{
          width: 22,
          height: 22,
          border: '1px solid',
          borderColor: 'border.medium',
        }}
      />
      <Typography
        component="span"
        title={repository}
        sx={{
          fontSize: '0.83rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {repository}
      </Typography>
    </Box>
  );
};

const StatusCell: React.FC<{ unlock: RepoUnlock }> = ({ unlock }) => {
  const color = unlock.unlocked ? STATUS_COLORS.success : STATUS_COLORS.info;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Box
        sx={{
          width: 56,
          height: 4,
          borderRadius: 999,
          backgroundColor: 'border.light',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: `${unlock.overallPct * 100}%`,
            height: '100%',
            backgroundColor: unlock.unlocked
              ? STATUS_COLORS.success
              : STATUS_COLORS.info,
          }}
        />
      </Box>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color }}>
        {unlock.unlocked
          ? 'Earning'
          : `${Math.round(unlock.overallPct * 100)}%`}
      </Typography>
    </Box>
  );
};

/**
 * The consolidated per-repository section — each repo's standing AND unlock
 * progress in one place (replacing the separate standings table + progress
 * views to remove the redundancy issue #95 flags). Searchable, sortable
 * (default: closest-to-unlock first), with a card grid or dense table.
 */
const MinerRepositoryPanel: React.FC<MinerRepositoryPanelProps> = ({
  githubId,
  viewMode = 'prs',
}) => {
  const isIssue = viewMode === 'issues';
  const { data: minerStats, isLoading } = useMinerStats(githubId);
  const { data: prs } = useMinerPRs(githubId);
  const { data: repos } = useReposAndWeights();

  // Default to the dense table on wider screens (compact for scanning many
  // repos); on mobile start in the card grid so there's no horizontal scroll.
  // The card grid is one toggle away either way.
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [view, setView] = useState<StandingsView>(isMobile ? 'cards' : 'table');
  const [sortField, setSortField] = useState<SortKey>('progress');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [eligibility, setEligibility] = useState<EligibilityFilter>('eligible');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(
    isMobile ? DEFAULT_CARD_ROWS : DEFAULT_TABLE_ROWS,
  );
  const rowsOptions = view === 'cards' ? CARD_ROWS : TABLE_ROWS;

  // Per-repo eligibility config (token threshold for "valid" PRs + gate values).
  const thresholdsByRepo = useMemo(() => {
    const map = new Map<string, EligibilityThresholds>();
    (repos ?? []).forEach((r) =>
      map.set(
        r.fullName.toLowerCase(),
        getEligibilityThresholds(r.config as RepositoryConfig),
      ),
    );
    return map;
  }, [repos]);

  // Per-repo payout weight (emission share) — what fraction of the OSS reward
  // pool the repo distributes; lets a miner see which repos are worth the effort.
  const weightsByRepo = useMemo(
    () => (repos ? buildRepoWeightsMap(repos) : new Map<string, number>()),
    [repos],
  );

  const validMergedByRepo = useMemo(
    () =>
      countValidMergedPrsByRepo(
        prs,
        (name) =>
          thresholdsByRepo.get(name.toLowerCase())?.minTokenScoreForBaseScore ??
          5,
      ),
    [prs, thresholdsByRepo],
  );

  const rows = useMemo<RepoRow[]>(() => {
    const evals = (minerStats?.repositories ?? []).filter(
      (r) => r.repositoryFullName.trim().length > 0,
    );
    return evals.map((repo) => {
      const thresholds =
        thresholdsByRepo.get(repo.repositoryFullName.toLowerCase()) ??
        getEligibilityThresholds(undefined);
      const validCount =
        validMergedByRepo.get(repo.repositoryFullName.toLowerCase()) ?? 0;
      const unlock = computeRepoUnlock(repo, validCount, thresholds, viewMode);
      return {
        repo,
        unlock,
        score: isIssue ? repo.issueDiscoveryScore : repo.totalScore,
        credibility: isIssue ? repo.issueCredibility : repo.credibility,
        count: isIssue ? repo.totalSolvedIssues : repo.totalMergedPrs,
        pays: weightsByRepo.get(repo.repositoryFullName.toLowerCase()) ?? 0,
        openAllowance: computeOpenPrAllowance(
          Number(repo.totalTokenScore) || 0,
          thresholds,
        ),
      };
    });
  }, [
    minerStats,
    thresholdsByRepo,
    validMergedByRepo,
    weightsByRepo,
    viewMode,
    isIssue,
  ]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (q && !r.repo.repositoryFullName.toLowerCase().includes(q)) {
        return false;
      }
      if (eligibility === 'eligible') return r.unlock.unlocked;
      if (eligibility === 'ineligible') return !r.unlock.unlocked;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortField === 'progress') {
        // Actionable-first: locked repos (by progress desc), then earning ones.
        if (a.unlock.unlocked !== b.unlock.unlocked) {
          return a.unlock.unlocked ? 1 : -1;
        }
        if (!a.unlock.unlocked)
          return b.unlock.overallPct - a.unlock.overallPct;
        return b.score - a.score;
      }
      let c = 0;
      switch (sortField) {
        case 'status':
          c = Number(a.unlock.unlocked) - Number(b.unlock.unlocked);
          break;
        case 'pays':
          c = a.pays - b.pays;
          break;
        case 'score':
          c = a.score - b.score;
          break;
        case 'credibility':
          c = a.credibility - b.credibility;
          break;
        case 'count':
          c = a.count - b.count;
          break;
        case 'repository':
          c = a.repo.repositoryFullName.localeCompare(
            b.repo.repositoryFullName,
          );
          break;
      }
      return sortOrder === 'asc' ? c : -c;
    });
    return filtered;
  }, [rows, search, eligibility, sortField, sortOrder]);

  // Reset to the first page whenever the result set or its ordering changes so
  // the viewer never lands on a now-empty page.
  useEffect(() => {
    setPage(0);
  }, [
    githubId,
    search,
    eligibility,
    sortField,
    sortOrder,
    viewMode,
    rowsPerPage,
  ]);

  const {
    slice: pagedRows,
    totalPages,
    safePage,
    showPageNav,
  } = useMemo(
    () => getMinerExplorerPaging(filteredSorted, page, rowsPerPage),
    [filteredSorted, page, rowsPerPage],
  );

  const eligibleCount = rows.filter((r) => r.unlock.unlocked).length;
  const ineligibleCount = rows.length - eligibleCount;

  const handleSortChange = (next: SortKey) => {
    if (next === sortField) {
      setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(next);
    setSortOrder(next === 'repository' ? 'asc' : 'desc');
  };

  const columns: DataTableColumn<RepoRow, SortKey>[] = [
    {
      key: 'repository',
      header: 'Repository',
      width: '22%',
      sortKey: 'repository',
      renderCell: (r) => (
        <RepositoryCell repository={r.repo.repositoryFullName} />
      ),
    },
    {
      key: 'status',
      header: 'Unlock',
      width: '14%',
      sortKey: 'status',
      renderCell: (r) => <StatusCell unlock={r.unlock} />,
    },
    {
      key: 'pays',
      header: (
        <Tooltip
          title="Payout weight — the share of the OSS reward pool this repository distributes. Higher means more emissions to compete for."
          arrow
          placement="top"
          slotProps={tooltipSlotProps}
        >
          <Box component="span" sx={{ cursor: 'help' }}>
            Pays
          </Box>
        </Tooltip>
      ),
      width: '9%',
      align: 'right',
      sortKey: 'pays',
      renderCell: (r) => <PaysCell pays={r.pays} />,
    },
    {
      key: 'credibility',
      header: 'Credibility',
      width: '11%',
      align: 'right',
      sortKey: 'credibility',
      renderCell: (r) => (
        <Typography
          component="span"
          sx={{
            fontSize: '0.83rem',
            fontWeight: 600,
            color: credibilityColor(r.credibility),
          }}
        >
          {(r.credibility * 100).toFixed(1)}%
        </Typography>
      ),
    },
    {
      key: 'count',
      header: isIssue ? 'Solved' : 'Merged',
      width: '9%',
      align: 'right',
      sortKey: 'count',
      renderCell: (r) => <CountCell value={r.count} tone="merged" />,
    },
    {
      key: 'valid',
      header: (
        <Tooltip
          title={
            isIssue
              ? 'Valid solved issues — solves that cleared the validity gate and count toward eligibility.'
              : 'Valid merged PRs — merges that cleared the token-score gate and count toward eligibility.'
          }
          arrow
          placement="top"
          slotProps={tooltipSlotProps}
        >
          <Box component="span" sx={{ cursor: 'help' }}>
            Valid
          </Box>
        </Tooltip>
      ),
      width: '8%',
      align: 'right',
      renderCell: (r) => (
        <CountCell value={r.unlock.count.have} tone="merged" />
      ),
    },
    {
      key: 'open',
      header: isIssue ? (
        'Open'
      ) : (
        <Tooltip
          title="Open PRs against this repository’s open-PR allowance. Open PRs withhold collateral, and exceeding the limit zeroes the repo’s contribution score until you merge or close them. The allowance grows with token score."
          arrow
          placement="top"
          slotProps={tooltipSlotProps}
        >
          <Box component="span" sx={{ cursor: 'help' }}>
            Open / limit
          </Box>
        </Tooltip>
      ),
      width: isIssue ? '8%' : '10%',
      align: 'right',
      renderCell: (r) =>
        isIssue ? (
          <CountCell value={r.repo.totalOpenIssues} tone="open" />
        ) : (
          <OpenRiskCell
            open={r.repo.totalOpenPrs}
            allowance={r.openAllowance}
          />
        ),
    },
    {
      key: 'closed',
      header: 'Closed',
      width: '8%',
      align: 'right',
      renderCell: (r) => (
        <CountCell
          value={isIssue ? r.repo.totalClosedIssues : r.repo.totalClosedPrs}
          tone="closed"
        />
      ),
    },
    {
      key: 'score',
      header: isIssue ? 'Discovery score' : 'Repo score',
      width: '11%',
      align: 'right',
      sortKey: 'score',
      renderCell: (r) => r.score.toFixed(2),
    },
  ];

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }} elevation={0}>
      {/* Header */}
      <Box
        sx={{
          p: { xs: 2, md: 2.5 },
          borderBottom: '1px solid',
          borderColor: 'border.light',
        }}
      >
        {/* Row 1 — title + eligibility filter */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="sectionTitle">Repositories</Typography>
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: (t) => alpha(t.palette.text.primary, 0.5),
              }}
            >
              ({rows.length})
            </Typography>
          </Box>

          {rows.length > 0 && (
            <SegmentedToggle
              ariaLabel="Filter by eligibility"
              value={eligibility}
              onChange={setEligibility}
              options={[
                { value: 'all', label: 'All', count: rows.length },
                { value: 'eligible', label: 'Eligible', count: eligibleCount },
                {
                  value: 'ineligible',
                  label: 'Ineligible',
                  count: ineligibleCount,
                },
              ]}
            />
          )}
        </Box>

        {/* Row 2 — sort · order · view · rows · search */}
        {rows.length > 0 && (
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Select
              size="small"
              value={sortField}
              onChange={(e) => handleSortChange(e.target.value as SortKey)}
              sx={{
                height: 34,
                minWidth: 150,
                fontSize: '0.8rem',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'border.light',
                },
                '& .MuiSelect-icon': { color: 'text.secondary' },
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <MenuItem
                  key={o.value}
                  value={o.value}
                  sx={{ fontSize: '0.8rem' }}
                >
                  {o.label}
                </MenuItem>
              ))}
            </Select>

            {sortField !== 'progress' && (
              <IconButton
                onClick={() =>
                  setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
                }
                size="small"
                aria-label="Toggle sort direction"
                sx={{
                  border: '1px solid',
                  borderColor: 'border.light',
                  borderRadius: 1.5,
                  width: 34,
                  height: 34,
                }}
              >
                {sortOrder === 'asc' ? (
                  <ArrowUpIcon sx={{ fontSize: '1rem' }} />
                ) : (
                  <ArrowDownIcon sx={{ fontSize: '1rem' }} />
                )}
              </IconButton>
            )}

            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(_e, v) => {
                if (!v) return;
                setView(v);
                setRowsPerPage((r) => clampRowsForView(r, v));
                setPage(0);
              }}
              size="small"
              sx={{
                border: '1px solid',
                borderColor: 'border.light',
                borderRadius: 2,
                p: 0.5,
                gap: 0.5,
                // Undo MUI's grouped border-merging so each icon reads as its
                // own pill, matching the OSS/Discovery + range switches.
                '& .MuiToggleButtonGroup-grouped': {
                  m: 0,
                  border: '1px solid transparent',
                  borderRadius: '6px !important',
                },
                '& .MuiToggleButton-root': {
                  color: 'text.secondary',
                  px: 1,
                  py: 0.4,
                  transition: 'all 0.2s',
                  '&:hover': {
                    color: 'text.primary',
                    backgroundColor: 'surface.light',
                  },
                  '&.Mui-selected': {
                    color: 'text.primary',
                    backgroundColor: 'surface.elevated',
                    borderColor: 'border.medium',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.45)',
                    '&:hover': { backgroundColor: 'surface.elevated' },
                  },
                },
              }}
            >
              <ToggleButton value="cards" aria-label="Card grid">
                <GridIcon sx={{ fontSize: '1.05rem' }} />
              </ToggleButton>
              <ToggleButton value="table" aria-label="Table">
                <TableIcon sx={{ fontSize: '1.05rem' }} />
              </ToggleButton>
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
                >
                  Rows:
                </Typography>
                <Select
                  id="miner-repos-rows"
                  aria-label="Rows per page"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(0);
                  }}
                  sx={MINER_EXPLORER_ROWS_SELECT_SX}
                >
                  {rowsOptions.map((n) => (
                    <MenuItem key={n} value={n} sx={{ fontSize: '0.8rem' }}>
                      {n}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </FormControl>

            {/* Search sits at the right end of the controls row. */}
            <DebouncedSearchInput
              initialDraft={search}
              onDebouncedChange={setSearch}
            >
              {({ draftValue, setDraftValue }) => (
                <TextField
                  size="small"
                  placeholder="Search repos…"
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{
                            color: (t) => alpha(t.palette.text.primary, 0.3),
                            fontSize: '1rem',
                          }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <ClearSearchAdornment
                        visible={Boolean(draftValue)}
                        onClear={() => setDraftValue('')}
                      />
                    ),
                  }}
                  sx={{
                    width: { xs: '100%', md: 180 },
                    ml: { md: 'auto' },
                    '& .MuiOutlinedInput-root': {
                      height: 34,
                      fontSize: '0.8rem',
                      '& fieldset': { borderColor: 'border.light' },
                      '&:hover fieldset': { borderColor: 'border.medium' },
                    },
                  }}
                />
              )}
            </DebouncedSearchInput>
          </Box>
        )}
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: 'primary.main' }} />
        </Box>
      ) : rows.length === 0 ? (
        <EmptyStateMessage message="No per-repository evaluations for this miner yet." />
      ) : filteredSorted.length === 0 ? (
        <EmptyStateMessage
          message={
            search
              ? `No repositories match “${search}”.`
              : eligibility === 'eligible'
                ? `No ${isIssue ? 'issue-discovery ' : ''}eligible repositories yet.`
                : 'No ineligible repositories — all are earning.'
          }
        />
      ) : view === 'cards' ? (
        <>
          <Box
            sx={{
              p: { xs: 2, md: 2.5 },
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
            }}
          >
            {pagedRows.map((r) => (
              <MinerRepositoryCard
                key={r.repo.repositoryFullName}
                repo={r.repo}
                unlock={r.unlock}
                viewMode={viewMode}
                pays={r.pays}
              />
            ))}
          </Box>
          {showPageNav && (
            <TablePagination
              page={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      ) : (
        <DataTable<RepoRow, SortKey>
          columns={columns}
          rows={pagedRows}
          getRowKey={(r) => r.repo.repositoryFullName}
          getRowHref={(r) => repoMinersHref(r.repo.repositoryFullName)}
          minWidth="960px"
          sort={{
            field: sortField,
            order: sortOrder,
            onChange: handleSortChange,
          }}
          pagination={
            showPageNav ? (
              <TablePagination
                page={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            ) : null
          }
        />
      )}
    </Card>
  );
};

export default MinerRepositoryPanel;
