import React, { useMemo, useState } from 'react';
import {
  alpha,
  Avatar,
  Box,
  Card,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
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
  computeRepoUnlock,
  countValidMergedPrsByRepo,
  getEligibilityThresholds,
  type EligibilityThresholds,
  type RepoUnlock,
  type ViewMode,
} from '../../utils/minerProgress';
import { DataTable, type DataTableColumn } from '../common';
import { ClearSearchAdornment } from '../common/ClearSearchAdornment';
import { DebouncedSearchInput } from '../common/DebouncedSearchInput';
import EmptyStateMessage from './EmptyStateMessage';
import MinerRepositoryCard, { repoMinersHref } from './MinerRepositoryCard';

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
}

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

  // Default to the dense table — compact for scanning many repos; the card
  // grid (with full dual-gate progress bars) is one toggle away.
  const [view, setView] = useState<StandingsView>('table');
  const [sortField, setSortField] = useState<SortKey>('progress');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [search, setSearch] = useState('');

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
    const filtered = q
      ? rows.filter((r) => r.repo.repositoryFullName.toLowerCase().includes(q))
      : rows.slice();

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
  }, [rows, search, sortField, sortOrder]);

  const eligibleCount = rows.filter((r) => r.unlock.unlocked).length;

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
      width: '30%',
      sortKey: 'repository',
      renderCell: (r) => (
        <RepositoryCell repository={r.repo.repositoryFullName} />
      ),
    },
    {
      key: 'status',
      header: 'Unlock',
      width: '18%',
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
      width: '12%',
      align: 'right',
      sortKey: 'pays',
      renderCell: (r) => <PaysCell pays={r.pays} />,
    },
    {
      key: 'credibility',
      header: 'Credibility',
      width: '13%',
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
      width: '12%',
      align: 'right',
      sortKey: 'count',
      renderCell: (r) => r.count.toLocaleString(),
    },
    {
      key: 'score',
      header: isIssue ? 'Discovery score' : 'Repo score',
      width: '15%',
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
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box>
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
            <Typography
              sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.3 }}
            >
              {isIssue ? 'Issue-discovery eligible' : 'Earning'} in{' '}
              <Box
                component="span"
                sx={{
                  color:
                    eligibleCount > 0
                      ? STATUS_COLORS.success
                      : STATUS_COLORS.neutral,
                  fontWeight: 600,
                }}
              >
                {eligibleCount}/{rows.length}
              </Box>{' '}
              {rows.length === 1 ? 'repository' : 'repositories'}
            </Typography>
          )}
        </Box>

        {rows.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
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
              onChange={(_e, v) => v && setView(v)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  color: 'text.secondary',
                  borderColor: 'border.light',
                  px: 1,
                  py: 0.5,
                  '&.Mui-selected': {
                    color: 'primary.main',
                    backgroundColor: (t) => alpha(t.palette.primary.main, 0.12),
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
        <EmptyStateMessage message={`No repositories match “${search}”.`} />
      ) : view === 'cards' ? (
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
          {filteredSorted.map((r) => (
            <MinerRepositoryCard
              key={r.repo.repositoryFullName}
              repo={r.repo}
              unlock={r.unlock}
              viewMode={viewMode}
              pays={r.pays}
            />
          ))}
        </Box>
      ) : (
        <DataTable<RepoRow, SortKey>
          columns={columns}
          rows={filteredSorted}
          getRowKey={(r) => r.repo.repositoryFullName}
          getRowHref={(r) => repoMinersHref(r.repo.repositoryFullName)}
          minWidth="680px"
          sort={{
            field: sortField,
            order: sortOrder,
            onChange: handleSortChange,
          }}
        />
      )}
    </Card>
  );
};

export default MinerRepositoryPanel;
