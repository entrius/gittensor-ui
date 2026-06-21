import React, { useEffect, useMemo, useState } from 'react';
import {
  alpha,
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  GridView as GridViewIcon,
  TableRows as TableRowsIcon,
} from '@mui/icons-material';
import { useMinerStats, useReposAndWeights } from '../../api';
import type { MinerRepositoryEvaluation } from '../../api/models/Dashboard';
import { STATUS_COLORS, tooltipSlotProps } from '../../theme';
import { credibilityColor } from '../../utils/format';
import { type SortOrder } from '../../utils/ExplorerUtils';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
import {
  buildRepoLookbackDaysMap,
  DEFAULT_PR_LOOKBACK_DAYS,
} from '../../utils/repoConfig';
import { DataTable, type DataTableColumn } from '../common';
import EmptyStateMessage from './EmptyStateMessage';
import MinerRepoStandingCard, { repoMinersHref } from './MinerRepoStandingCard';

type ViewMode = 'prs' | 'issues';
type StandingsView = 'cards' | 'table';
type StandingsSortKey =
  | 'repository'
  | 'eligible'
  | 'credibility'
  | 'merged'
  | 'score'
  | 'issueEligible'
  | 'issueCredibility'
  | 'solved'
  | 'valid'
  | 'discoveryScore';

interface MinerRepoStandingsProps {
  githubId: string;
  viewMode?: ViewMode;
}

/* ── Table-view cell helpers (folded in from MinerRepoEligibilityTable) ── */

const EligibilityChip: React.FC<{
  eligible: boolean;
  reason?: string | null;
}> = ({ eligible, reason }) => {
  const color = eligible ? STATUS_COLORS.success : STATUS_COLORS.neutral;
  const chip = (
    <Chip
      label={eligible ? 'Eligible' : 'Ineligible'}
      size="small"
      sx={{
        height: 20,
        fontSize: '0.68rem',
        fontWeight: 600,
        color,
        bgcolor: alpha(color, 0.12),
        border: `1px solid ${alpha(color, 0.35)}`,
      }}
    />
  );
  if (!eligible && reason) {
    return (
      <Tooltip
        title={reason}
        arrow
        placement="top"
        slotProps={tooltipSlotProps}
      >
        <Box component="span" sx={{ display: 'inline-flex' }}>
          {chip}
        </Box>
      </Tooltip>
    );
  }
  return chip;
};

const CredibilityValue: React.FC<{ value: number }> = ({ value }) => (
  <Typography
    component="span"
    sx={{
      fontSize: '0.85rem',
      fontWeight: 600,
      color: credibilityColor(value),
    }}
  >
    {`${(value * 100).toFixed(1)}%`}
  </Typography>
);

const rightSortHeaderSx = {
  '& .MuiTableSortLabel-root': {
    width: '100%',
    justifyContent: 'flex-end',
  },
  '& .MuiTableSortLabel-icon': {
    width: 0,
    marginLeft: '2px',
    marginRight: 0,
    overflow: 'visible',
  },
} as const;

const RepositoryCell: React.FC<{ repository: string }> = ({ repository }) => {
  const owner = repository.split('/')[0];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Avatar
        src={getRepositoryOwnerAvatarSrc(owner)}
        alt={owner}
        sx={{
          width: 24,
          height: 24,
          border: '1px solid',
          borderColor: 'border.medium',
        }}
      />
      <Typography
        component="span"
        title={repository}
        sx={{
          fontSize: '0.85rem',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {repository}
      </Typography>
    </Box>
  );
};

/**
 * Per-repository standings — the miner details page centerpiece.
 *
 * Sourced from the authoritative per-repo `miner_evaluations` rows
 * (`MinerEvaluation.repositories`). Rows are sorted by per-repo score
 * descending; ineligible repos are muted. Two views: a card grid (default)
 * and a dense table.
 */
const MinerRepoStandings: React.FC<MinerRepoStandingsProps> = ({
  githubId,
  viewMode = 'prs',
}) => {
  const { data: minerStats, isLoading } = useMinerStats(githubId);
  const { data: repos } = useReposAndWeights();
  const repoLookbackDays = useMemo(
    () => buildRepoLookbackDaysMap(repos ?? []),
    [repos],
  );
  const [view, setView] = useState<StandingsView>('cards');
  const isIssueMode = viewMode === 'issues';
  const [sortField, setSortField] = useState<StandingsSortKey>(
    isIssueMode ? 'discoveryScore' : 'score',
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  useEffect(() => {
    setSortField(isIssueMode ? 'discoveryScore' : 'score');
    setSortOrder('desc');
  }, [isIssueMode]);

  const baseRows = useMemo(() => {
    // Pre-migration placeholder rows carry an empty repo name — drop them.
    const repos = (minerStats?.repositories ?? []).filter(
      (r) => r.repositoryFullName.trim().length > 0,
    );
    return repos.slice();
  }, [minerStats]);

  const rows = useMemo(() => {
    const sorted = baseRows.slice().sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'repository':
          comparison = a.repositoryFullName.localeCompare(b.repositoryFullName);
          break;
        case 'eligible':
          comparison = Number(a.isEligible) - Number(b.isEligible);
          break;
        case 'credibility':
          comparison = a.credibility - b.credibility;
          break;
        case 'merged':
          comparison = a.totalMergedPrs - b.totalMergedPrs;
          break;
        case 'score':
          comparison = a.totalScore - b.totalScore;
          break;
        case 'issueEligible':
          comparison = Number(a.isIssueEligible) - Number(b.isIssueEligible);
          break;
        case 'issueCredibility':
          comparison = a.issueCredibility - b.issueCredibility;
          break;
        case 'solved':
          comparison = a.totalSolvedIssues - b.totalSolvedIssues;
          break;
        case 'valid':
          comparison = a.totalValidSolvedIssues - b.totalValidSolvedIssues;
          break;
        case 'discoveryScore':
          comparison = a.issueDiscoveryScore - b.issueDiscoveryScore;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [baseRows, sortField, sortOrder]);

  const handleSortChange = (nextField: StandingsSortKey) => {
    if (nextField === sortField) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(nextField);
    setSortOrder('desc');
  };
  const toggleSortOrder = () =>
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));

  const cardSortOptions = isIssueMode
    ? [
        { value: 'discoveryScore' as const, label: 'Discovery score' },
        { value: 'issueCredibility' as const, label: 'Credibility' },
        { value: 'solved' as const, label: 'Solved' },
        { value: 'valid' as const, label: 'Valid' },
        { value: 'issueEligible' as const, label: 'Eligibility' },
        { value: 'repository' as const, label: 'Repository' },
      ]
    : [
        { value: 'score' as const, label: 'Repo score' },
        { value: 'credibility' as const, label: 'Credibility' },
        { value: 'merged' as const, label: 'Merged PRs' },
        { value: 'eligible' as const, label: 'Eligibility' },
        { value: 'repository' as const, label: 'Repository' },
      ];

  const eligibleCount = rows.filter((r) =>
    isIssueMode ? r.isIssueEligible : r.isEligible,
  ).length;

  const prColumns: DataTableColumn<
    MinerRepositoryEvaluation,
    StandingsSortKey
  >[] = [
    {
      key: 'repository',
      header: 'Repository',
      width: 220,
      sortKey: 'repository',
      renderCell: (r) => <RepositoryCell repository={r.repositoryFullName} />,
    },
    {
      key: 'eligible',
      header: 'PR eligibility',
      width: 132,
      sortKey: 'eligible',
      renderCell: (r) => (
        <EligibilityChip eligible={r.isEligible} reason={r.failedReason} />
      ),
    },
    {
      key: 'credibility',
      header: 'Credibility',
      width: 112,
      align: 'right',
      sortKey: 'credibility',
      headerSx: rightSortHeaderSx,
      renderCell: (r) => <CredibilityValue value={r.credibility} />,
    },
    {
      key: 'merged',
      header: 'Merged PRs',
      width: 112,
      align: 'right',
      sortKey: 'merged',
      headerSx: rightSortHeaderSx,
      renderCell: (r) => r.totalMergedPrs,
    },
    {
      key: 'score',
      header: 'Repo score',
      width: 112,
      align: 'right',
      sortKey: 'score',
      headerSx: rightSortHeaderSx,
      renderCell: (r) => r.totalScore.toFixed(2),
    },
  ];

  const issueColumns: DataTableColumn<
    MinerRepositoryEvaluation,
    StandingsSortKey
  >[] = [
    {
      key: 'repository',
      header: 'Repository',
      width: 200,
      sortKey: 'repository',
      renderCell: (r) => <RepositoryCell repository={r.repositoryFullName} />,
    },
    {
      key: 'issueEligible',
      header: 'Issue eligibility',
      width: 140,
      sortKey: 'issueEligible',
      renderCell: (r) => (
        <EligibilityChip eligible={r.isIssueEligible} reason={r.failedReason} />
      ),
    },
    {
      key: 'issueCredibility',
      header: 'Issue credibility',
      width: 132,
      align: 'right',
      sortKey: 'issueCredibility',
      headerSx: rightSortHeaderSx,
      renderCell: (r) => <CredibilityValue value={r.issueCredibility} />,
    },
    {
      key: 'solved',
      header: 'Solved',
      width: 80,
      align: 'right',
      sortKey: 'solved',
      headerSx: rightSortHeaderSx,
      renderCell: (r) => r.totalSolvedIssues,
    },
    {
      key: 'valid',
      header: 'Valid',
      width: 72,
      align: 'right',
      sortKey: 'valid',
      headerSx: rightSortHeaderSx,
      renderCell: (r) => r.totalValidSolvedIssues,
    },
    {
      key: 'discoveryScore',
      header: 'Discovery score',
      width: 128,
      align: 'right',
      sortKey: 'discoveryScore',
      headerSx: rightSortHeaderSx,
      renderCell: (r) => r.issueDiscoveryScore.toFixed(2),
    },
  ];

  const handleViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    next: StandingsView | null,
  ) => {
    if (next) setView(next);
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        p: 0,
        overflow: 'hidden',
        minWidth: 0,
        maxWidth: '100%',
      }}
      elevation={0}
    >
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid',
          borderColor: 'border.light',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25 }}>
            <Typography variant="sectionTitle">
              Per-repository standings
            </Typography>
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.5),
                fontSize: '0.75rem',
              }}
            >
              ({rows.length})
            </Typography>
          </Box>
          {rows.length > 0 && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {isIssueMode ? 'Issue-discovery eligible' : 'PR eligible'} in{' '}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {view === 'cards' && (
              <>
                <Typography
                  sx={{ fontSize: '0.92rem', color: 'text.secondary' }}
                >
                  Sort:
                </Typography>
                <Select
                  size="small"
                  value={sortField}
                  onOpen={() => setIsSortMenuOpen(true)}
                  onClose={() => setIsSortMenuOpen(false)}
                  onChange={(e) =>
                    handleSortChange(e.target.value as StandingsSortKey)
                  }
                  MenuProps={{
                    PaperProps: {
                      sx: (theme) => ({
                        mt: 0.75,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.border.light}`,
                        backgroundColor: theme.palette.background.default,
                        backgroundImage: 'none',
                        boxShadow: `0 12px 28px ${alpha(theme.palette.common.black, 0.45)}`,
                        '& .MuiMenuItem-root': {
                          fontSize: '0.8rem',
                          minHeight: 36,
                          color: theme.palette.text.secondary,
                          '&.Mui-selected': {
                            color: theme.palette.text.primary,
                            backgroundColor: alpha(
                              theme.palette.text.primary,
                              0.1,
                            ),
                            '&:hover': {
                              backgroundColor: alpha(
                                theme.palette.text.primary,
                                0.14,
                              ),
                            },
                          },
                          '&:hover': {
                            backgroundColor: theme.palette.surface.light,
                            color: theme.palette.text.primary,
                          },
                        },
                      }),
                    },
                  }}
                  sx={{
                    color: 'text.primary',
                    backgroundColor: isSortMenuOpen
                      ? (t) => alpha(t.palette.text.primary, 0.06)
                      : 'background.default',
                    fontSize: '0.8rem',
                    height: 32,
                    minWidth: 156,
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isSortMenuOpen
                        ? 'border.medium'
                        : 'border.light',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'border.medium',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'border.medium',
                    },
                    '& .MuiSelect-icon': { color: 'text.secondary' },
                    '& .MuiSelect-select': {
                      py: 0.5,
                      fontWeight: 600,
                    },
                  }}
                >
                  {cardSortOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
                <IconButton
                  onClick={toggleSortOrder}
                  size="small"
                  aria-label={
                    sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'
                  }
                  sx={{
                    color: 'text.primary',
                    border: '1px solid',
                    borderColor: 'border.light',
                    borderRadius: 2,
                    width: 32,
                    height: 32,
                    '&:hover': {
                      backgroundColor: 'surface.light',
                      borderColor: 'border.medium',
                    },
                  }}
                >
                  {sortOrder === 'asc' ? (
                    <ArrowUpwardIcon sx={{ fontSize: '1rem' }} />
                  ) : (
                    <ArrowDownwardIcon sx={{ fontSize: '1rem' }} />
                  )}
                </IconButton>
              </>
            )}
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={handleViewChange}
              size="small"
              aria-label="Standings view"
              sx={{
                '& .MuiToggleButton-root': {
                  color: 'text.secondary',
                  borderColor: 'border.light',
                  px: 1.25,
                  py: 0.5,
                  '&.Mui-selected': {
                    color: 'primary.main',
                    backgroundColor: (t) => alpha(t.palette.primary.main, 0.12),
                    '&:hover': {
                      backgroundColor: (t) =>
                        alpha(t.palette.primary.main, 0.18),
                    },
                  },
                },
              }}
            >
              <ToggleButton value="cards" aria-label="Card grid">
                <GridViewIcon sx={{ fontSize: '1.05rem' }} />
              </ToggleButton>
              <ToggleButton value="table" aria-label="Table">
                <TableRowsIcon sx={{ fontSize: '1.05rem' }} />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} sx={{ color: 'primary.main' }} />
        </Box>
      ) : rows.length === 0 ? (
        <EmptyStateMessage message="No per-repository evaluations for this miner yet." />
      ) : view === 'cards' ? (
        <Box
          sx={{
            p: 3,
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
          }}
        >
          {rows.map((repo) => (
            <MinerRepoStandingCard
              key={repo.repositoryFullName}
              repo={repo}
              viewMode={viewMode}
              prLookbackDays={
                repoLookbackDays.get(repo.repositoryFullName.toLowerCase()) ??
                DEFAULT_PR_LOOKBACK_DAYS
              }
            />
          ))}
        </Box>
      ) : (
        <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
          <DataTable<MinerRepositoryEvaluation, StandingsSortKey>
            columns={isIssueMode ? issueColumns : prColumns}
            rows={rows}
            getRowKey={(r) => r.repositoryFullName}
            getRowHref={(r) => repoMinersHref(r.repositoryFullName)}
            minWidth={isIssueMode ? 752 : 688}
            sort={{
              field: sortField,
              order: sortOrder,
              onChange: handleSortChange,
            }}
          />
        </Box>
      )}
    </Card>
  );
};

export default MinerRepoStandings;
