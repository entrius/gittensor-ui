import React, { useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Avatar,
  TextField,
  InputAdornment,
  alpha,
  useTheme,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import {
  useMinerPRs,
  useReposAndWeights,
  useTierConfigurations,
} from '../../api';
import { useNavigate } from 'react-router-dom';
import { TIER_COLORS } from '../../theme';
import ExplorerFilterButton from './ExplorerFilterButton';
import SortableHeaderCell from './SortableHeaderCell';
import RankBadge from './RankBadge';
import EmptyStateMessage from './EmptyStateMessage';
import TablePagination from './TablePagination';
import {
  getHeaderCellStyle,
  getBodyCellStyle,
  searchFieldSx,
  tableContainerSx,
} from './MinerRepositoriesTable.styles';
import {
  type MinerTierFilter,
  type QualificationFilter,
  type RepoSortField,
  type SortOrder,
  type RepoStats,
  buildRepoWeightsMap,
  buildRepoTiersMap,
  buildTierThresholdsMap,
  aggregatePRsByRepository,
  filterMinerRepoStats,
  filterByQualification,
  filterBySearch,
  sortMinerRepoStats,
  computeTierCounts,
  computeQualificationCounts,
  hasActiveFilters,
  getDisplayCount,
  tierColorFor,
} from '../../utils/ExplorerUtils';

interface MinerRepositoriesTableProps {
  githubId: string;
  /** When set externally (e.g. from TierDetailsPage), overrides internal tier filter. */
  tierFilter?: string;
}

const PAGE_SIZE = 20;

const MinerRepositoriesTable: React.FC<MinerRepositoriesTableProps> = ({
  githubId,
  tierFilter: externalTierFilter,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const { data: tierConfig } = useTierConfigurations();
  const [sortField, setSortField] = useState<RepoSortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [internalTierFilter, setTierFilter] = useState<MinerTierFilter>('all');
  const tierFilter: MinerTierFilter =
    (externalTierFilter?.toLowerCase() as MinerTierFilter) ||
    internalTierFilter;
  const [qualificationFilter, setQualificationFilter] =
    useState<QualificationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  const headerCellStyle = useMemo(() => getHeaderCellStyle(theme), [theme]);
  const bodyCellStyle = useMemo(() => getBodyCellStyle(theme), [theme]);

  // Build lookup maps from API data
  const repoWeights = useMemo(() => buildRepoWeightsMap(repos), [repos]);
  const repoTiers = useMemo(() => buildRepoTiersMap(repos), [repos]);
  const tierThresholds = useMemo(
    () => buildTierThresholdsMap(tierConfig),
    [tierConfig],
  );

  // Aggregate PRs by repository
  const repoStats = useMemo(
    () => aggregatePRsByRepository(prs || [], repoWeights, repoTiers),
    [prs, repoWeights, repoTiers],
  );

  // Filter and sort repository stats
  const filteredRepoStats = useMemo(() => {
    let filtered = filterMinerRepoStats(repoStats, tierFilter);
    filtered = filterByQualification(
      filtered,
      qualificationFilter,
      tierThresholds,
    );
    filtered = filterBySearch(filtered, searchQuery);
    return filtered;
  }, [repoStats, tierFilter, qualificationFilter, tierThresholds, searchQuery]);

  const sortedRepoStats = useMemo(
    () => sortMinerRepoStats(filteredRepoStats, sortField, sortOrder),
    [filteredRepoStats, sortField, sortOrder],
  );

  const pagedRepoStats = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedRepoStats.slice(start, start + PAGE_SIZE);
  }, [sortedRepoStats, page]);

  const totalPages = Math.ceil(sortedRepoStats.length / PAGE_SIZE);

  const tierCounts = useMemo(() => computeTierCounts(repoStats), [repoStats]);

  const qualificationCounts = useMemo(
    () => computeQualificationCounts(repoStats, tierThresholds),
    [repoStats, tierThresholds],
  );

  const handleSort = (field: RepoSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const resetPage = () => setPage(0);

  const isFiltered = hasActiveFilters(
    tierFilter,
    qualificationFilter,
    searchQuery,
  );
  const displayCount = getDisplayCount(
    sortedRepoStats.length,
    repoStats.length,
    isFiltered,
  );

  const isLoading = isLoadingPRs || isLoadingRepos;

  if (isLoading) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          backgroundColor: 'transparent',
          p: 4,
          textAlign: 'center',
        }}
        elevation={0}
      >
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'border.light',
        backgroundColor: 'transparent',
        p: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      elevation={0}
    >
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid',
          borderColor: 'border.light',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
            <Typography
              variant="h6"
              sx={{
                color: 'text.primary',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: { xs: '0.95rem', sm: '1.1rem' },
                fontWeight: 500,
              }}
            >
              Repositories
            </Typography>
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.5),
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
              }}
            >
              ({displayCount})
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 1 },
              flexWrap: 'wrap',
              alignItems: { xs: 'flex-start', sm: 'center' },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {/* Qualification Filter Buttons */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <ExplorerFilterButton
                label="All"
                count={qualificationCounts.all}
                color={theme.palette.status.neutral}
                selected={qualificationFilter === 'all'}
                onClick={() => {
                  setQualificationFilter('all');
                  resetPage();
                }}
              />
              <ExplorerFilterButton
                label="Qualified"
                count={qualificationCounts.qualified}
                color={theme.palette.status.merged}
                selected={qualificationFilter === 'qualified'}
                onClick={() => {
                  setQualificationFilter('qualified');
                  resetPage();
                }}
              />
              <ExplorerFilterButton
                label="Unqualified"
                count={qualificationCounts.unqualified}
                color={theme.palette.status.closed}
                selected={qualificationFilter === 'unqualified'}
                onClick={() => {
                  setQualificationFilter('unqualified');
                  resetPage();
                }}
              />
            </Box>

            {/* Tier Filter Buttons */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <ExplorerFilterButton
                label="All Tiers"
                count={tierCounts.all}
                color={theme.palette.status.neutral}
                selected={tierFilter === 'all'}
                onClick={() => {
                  setTierFilter('all');
                  resetPage();
                }}
              />
              <ExplorerFilterButton
                label="Gold"
                count={tierCounts.gold}
                color={TIER_COLORS.gold}
                selected={tierFilter === 'gold'}
                onClick={() => {
                  setTierFilter('gold');
                  resetPage();
                }}
              />
              <ExplorerFilterButton
                label="Silver"
                count={tierCounts.silver}
                color={TIER_COLORS.silver}
                selected={tierFilter === 'silver'}
                onClick={() => {
                  setTierFilter('silver');
                  resetPage();
                }}
              />
              <ExplorerFilterButton
                label="Bronze"
                count={tierCounts.bronze}
                color={TIER_COLORS.bronze}
                selected={tierFilter === 'bronze'}
                onClick={() => {
                  setTierFilter('bronze');
                  resetPage();
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            resetPage();
          }}
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
          }}
          sx={searchFieldSx}
        />
      </Box>

      {!prs || prs.length === 0 ? (
        <EmptyStateMessage message="No repository contributions found" />
      ) : sortedRepoStats.length === 0 ? (
        <EmptyStateMessage message="No repositories found for the selected filters" />
      ) : (
        <>
          <TableContainer sx={tableContainerSx}>
            <Table
              stickyHeader
              sx={{ tableLayout: 'fixed', minWidth: '700px' }}
            >
              <TableHead>
                <TableRow>
                  <SortableHeaderCell
                    field="rank"
                    label="Rank"
                    defaultDirection="desc"
                    activeField={sortField}
                    activeOrder={sortOrder}
                    onSort={handleSort}
                    cellStyle={headerCellStyle}
                  />
                  <SortableHeaderCell
                    field="repository"
                    label="Repository"
                    defaultDirection="asc"
                    activeField={sortField}
                    activeOrder={sortOrder}
                    onSort={handleSort}
                    cellStyle={headerCellStyle}
                  />
                  <SortableHeaderCell
                    field="prs"
                    label="PRs"
                    align="right"
                    defaultDirection="desc"
                    activeField={sortField}
                    activeOrder={sortOrder}
                    onSort={handleSort}
                    cellStyle={headerCellStyle}
                  />
                  <SortableHeaderCell
                    field="score"
                    label="Score"
                    align="right"
                    defaultDirection="desc"
                    activeField={sortField}
                    activeOrder={sortOrder}
                    onSort={handleSort}
                    cellStyle={headerCellStyle}
                  />
                  <SortableHeaderCell
                    field="tokenScore"
                    label="Token Score"
                    align="right"
                    defaultDirection="desc"
                    activeField={sortField}
                    activeOrder={sortOrder}
                    onSort={handleSort}
                    cellStyle={headerCellStyle}
                  />
                  <TableCell align="right" sx={headerCellStyle}>
                    Avg/PR
                  </TableCell>
                  <SortableHeaderCell
                    field="weight"
                    label="Weight"
                    align="right"
                    defaultDirection="desc"
                    activeField={sortField}
                    activeOrder={sortOrder}
                    onSort={handleSort}
                    cellStyle={headerCellStyle}
                  />
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedRepoStats.map((repo, index) => {
                  const rank = page * PAGE_SIZE + index;
                  return (
                    <RepoTableRow
                      key={repo.repository}
                      repo={repo}
                      rank={rank}
                      bodyCellStyle={bodyCellStyle}
                      prs={prs}
                      githubId={githubId}
                      navigate={navigate}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Row sub-component
// ---------------------------------------------------------------------------

interface RepoTableRowProps {
  repo: RepoStats;
  rank: number;
  bodyCellStyle: Record<string, unknown>;
  prs: { author?: string }[] | undefined;
  githubId: string;
  navigate: ReturnType<typeof useNavigate>;
}

const RepoTableRow: React.FC<RepoTableRowProps> = ({
  repo,
  rank,
  bodyCellStyle,
  prs,
  githubId,
  navigate,
}) => {
  const owner = repo.repository.split('/')[0];
  const avatarBgColor = getAvatarBgColor(owner);
  const avgPerPr = repo.prs > 0 ? (repo.score / repo.prs).toFixed(4) : '\u2014';

  return (
    <TableRow
      sx={{
        '&:hover': {
          backgroundColor: 'surface.light',
        },
        transition: 'background-color 0.2s',
      }}
    >
      <TableCell sx={bodyCellStyle}>
        <RankBadge rank={rank} displayNumber={rank + 1} />
      </TableCell>
      <TableCell sx={bodyCellStyle}>
        <Box
          onClick={() =>
            navigate(
              `/miners/repository?name=${encodeURIComponent(repo.repository)}`,
              {
                state: {
                  backLabel: `Back to ${prs?.[0]?.author || githubId}`,
                },
              },
            )
          }
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            '&:hover': {
              color: 'primary.main',
              '& .MuiTypography-root': {
                textDecoration: 'underline',
              },
            },
            transition: 'color 0.2s',
          }}
        >
          <Avatar
            src={`https://avatars.githubusercontent.com/${owner}`}
            alt={owner}
            sx={{
              width: 24,
              height: 24,
              border: '1px solid',
              borderColor: 'border.medium',
              backgroundColor: avatarBgColor,
            }}
          />
          {repo.tier && (
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: tierColorFor(repo.tier, TIER_COLORS),
                flexShrink: 0,
              }}
              title={`${repo.tier} tier`}
            />
          )}
          <Typography
            component="span"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.85rem',
              transition: 'color 0.2s',
            }}
          >
            {repo.repository}
          </Typography>
        </Box>
      </TableCell>
      <TableCell align="right" sx={bodyCellStyle}>
        {repo.prs}
      </TableCell>
      <TableCell align="right" sx={bodyCellStyle}>
        {repo.score.toFixed(4)}
      </TableCell>
      <TableCell align="right" sx={bodyCellStyle}>
        {repo.tokenScore.toFixed(2)}
      </TableCell>
      <TableCell
        align="right"
        sx={{
          ...bodyCellStyle,
          color: (t) => alpha(t.palette.text.primary, 0.5),
        }}
      >
        {avgPerPr}
      </TableCell>
      <TableCell align="right" sx={bodyCellStyle}>
        {repo.weight.toFixed(4)}
      </TableCell>
    </TableRow>
  );
};

// ---------------------------------------------------------------------------
// Avatar background color helper
// ---------------------------------------------------------------------------

const getAvatarBgColor = (owner: string): string => {
  switch (owner) {
    case 'opentensor':
      return 'text.primary';
    case 'bitcoin':
      return 'status.warning';
    default:
      return 'transparent';
  }
};

export default MinerRepositoriesTable;
