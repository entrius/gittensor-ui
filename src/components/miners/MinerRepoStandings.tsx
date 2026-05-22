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
import type { Theme } from '@mui/material/styles';
import {
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  GridView as GridViewIcon,
  TableRows as TableRowsIcon,
} from '@mui/icons-material';
import { useMinerStats } from '../../api';
import type { MinerRepositoryEvaluation } from '../../api/models/Dashboard';
import { STATUS_COLORS, tooltipSlotProps } from '../../theme';
import { credibilityColor } from '../../utils/format';
import { type SortOrder } from '../../utils/ExplorerUtils';
import { getRepositoryOwnerAvatarSrc } from '../../utils/avatar';
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
type EligibilityFilter = 'all' | 'eligible' | 'ineligible';

const ELIGIBILITY_FILTER_OPTIONS: Array<{
  value: EligibilityFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'eligible', label: 'Eligible' },
  { value: 'ineligible', label: 'Ineligible' },
];

const repoTrackEligible = (
  repo: MinerRepositoryEvaluation,
  isIssueMode: boolean,
): boolean => (isIssueMode ? repo.isIssueEligible : repo.isEligible);

const filterReposByEligibility = (
  repos: MinerRepositoryEvaluation[],
  filter: EligibilityFilter,
  isIssueMode: boolean,
): MinerRepositoryEvaluation[] => {
  if (filter === 'all') return repos;
  if (filter === 'eligible') {
    return repos.filter((r) => repoTrackEligible(r, isIssueMode));
  }
  return repos.filter((r) => !repoTrackEligible(r, isIssueMode));
};

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
  const [view, setView] = useState<StandingsView>('cards');
  const [eligibilityFilter, setEligibilityFilter] =
    useState<EligibilityFilter>('all');
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

  const allRows = useMemo(() => {
    // Pre-migration placeholder rows carry an empty repo name — drop them.
    const repos = (minerStats?.repositories ?? []).filter(
      (r) => r.repositoryFullName.trim().length > 0,
    );
    return repos.slice();
  }, [minerStats]);

  const filteredRows = useMemo(
    () => filterReposByEligibility(allRows, eligibilityFilter, isIssueMode),
    [allRows, eligibilityFilter, isIssueMode],
  );

  const rows = useMemo(() => {
    const sorted = filteredRows.slice().sort((a, b) => {
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
  }, [filteredRows, sortField, sortOrder]);

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

  const eligibleCount = allRows.filter((r) =>
    repoTrackEligible(r, isIssueMode),
  ).length;

  const prColumns: DataTableColumn<
    MinerRepositoryEvaluation,
    StandingsSortKey
  >[] = [
    {
      key: 'repository',
      header: 'Repository',
      width: '40%',
      sortKey: 'repository',
      renderCell: (r) => <RepositoryCell repository={r.repositoryFullName} />,
    },
    {
      key: 'eligible',
      header: 'PR eligibility',
      width: '18%',
      sortKey: 'eligible',
      renderCell: (r) => (
        <EligibilityChip eligible={r.isEligible} reason={r.failedReason} />
      ),
    },
    {
      key: 'credibility',
      header: 'Credibility',
      width: '14%',
      align: 'right',
      sortKey: 'credibility',
      renderCell: (r) => <CredibilityValue value={r.credibility} />,
    },
    {
      key: 'merged',
      header: 'Merged PRs',
      width: '14%',
      align: 'right',
      sortKey: 'merged',
      renderCell: (r) => r.totalMergedPrs,
    },
    {
      key: 'score',
      header: 'Repo score',
      width: '14%',
      align: 'right',
      sortKey: 'score',
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
      width: '34%',
      sortKey: 'repository',
      renderCell: (r) => <RepositoryCell repository={r.repositoryFullName} />,
    },
    {
      key: 'issueEligible',
      header: 'Issue eligibility',
      width: '18%',
      sortKey: 'issueEligible',
      renderCell: (r) => (
        <EligibilityChip eligible={r.isIssueEligible} reason={r.failedReason} />
      ),
    },
    {
      key: 'issueCredibility',
      header: 'Issue credibility',
      width: '16%',
      align: 'right',
      sortKey: 'issueCredibility',
      renderCell: (r) => <CredibilityValue value={r.issueCredibility} />,
    },
    {
      key: 'solved',
      header: 'Solved',
      width: '10%',
      align: 'right',
      sortKey: 'solved',
      renderCell: (r) => r.totalSolvedIssues,
    },
    {
      key: 'valid',
      header: 'Valid',
      width: '10%',
      align: 'right',
      sortKey: 'valid',
      renderCell: (r) => r.totalValidSolvedIssues,
    },
    {
      key: 'discoveryScore',
      header: 'Discovery score',
      width: '12%',
      align: 'right',
      sortKey: 'discoveryScore',
      renderCell: (r) => r.issueDiscoveryScore.toFixed(2),
    },
  ];

  const handleViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    next: StandingsView | null,
  ) => {
    if (next) setView(next);
  };

  const handleEligibilityFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    next: EligibilityFilter | null,
  ) => {
    if (next) setEligibilityFilter(next);
  };

  const toggleGroupSx = {
    '& .MuiToggleButton-root': {
      color: 'text.secondary',
      borderColor: 'border.light',
      height: 32,
      minHeight: 32,
      px: 1.25,
      py: 0,
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      textTransform: 'none',
      '&.Mui-selected': {
        color: 'primary.main',
        backgroundColor: (theme: Theme) =>
          alpha(theme.palette.primary.main, 0.12),
        '&:hover': {
          backgroundColor: (theme: Theme) =>
            alpha(theme.palette.primary.main, 0.18),
        },
      },
    },
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
              ({rows.length}
              {eligibilityFilter !== 'all' && allRows.length !== rows.length
                ? ` of ${allRows.length}`
                : ''}
              )
            </Typography>
          </Box>
          {allRows.length > 0 && (
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
                {eligibleCount}/{allRows.length}
              </Box>{' '}
              {allRows.length === 1 ? 'repository' : 'repositories'}
            </Typography>
          )}
        </Box>

        {allRows.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <ToggleButtonGroup
              value={eligibilityFilter}
              exclusive
              onChange={handleEligibilityFilterChange}
              size="small"
              aria-label="Repository eligibility"
              sx={toggleGroupSx}
            >
              {ELIGIBILITY_FILTER_OPTIONS.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
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
              sx={toggleGroupSx}
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
      ) : allRows.length === 0 ? (
        <EmptyStateMessage message="No per-repository evaluations for this miner yet." />
      ) : rows.length === 0 ? (
        <EmptyStateMessage
          message={`No ${eligibilityFilter === 'eligible' ? 'eligible' : 'ineligible'} repositories for this miner.`}
        />
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
            />
          ))}
        </Box>
      ) : (
        <DataTable<MinerRepositoryEvaluation, StandingsSortKey>
          columns={isIssueMode ? issueColumns : prColumns}
          rows={rows}
          getRowKey={(r) => r.repositoryFullName}
          getRowHref={(r) => repoMinersHref(r.repositoryFullName)}
          minWidth="640px"
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

export default MinerRepoStandings;
