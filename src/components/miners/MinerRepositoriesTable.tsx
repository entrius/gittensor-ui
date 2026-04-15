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
import { useMinerPRs, useReposAndWeights } from '../../api';
import { LinkBox } from '../common/linkBehavior';
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
  type RepoSortField,
  type SortOrder,
  type RepoStats,
  buildRepoWeightsMap,
  aggregatePRsByRepository,
  filterBySearch,
  sortMinerRepoStats,
  hasActiveFilters,
  getDisplayCount,
} from '../../utils/ExplorerUtils';

interface MinerRepositoriesTableProps {
  githubId: string;
}

const PAGE_SIZE = 20;

const MinerRepositoriesTable: React.FC<MinerRepositoriesTableProps> = ({
  githubId,
}) => {
  const theme = useTheme();
  const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const [sortField, setSortField] = useState<RepoSortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  const headerCellStyle = useMemo(() => getHeaderCellStyle(theme), [theme]);
  const bodyCellStyle = useMemo(() => getBodyCellStyle(theme), [theme]);

  // Build lookup maps from API data
  const repoWeights = useMemo(() => buildRepoWeightsMap(repos), [repos]);

  // Aggregate PRs by repository
  const repoStats = useMemo(
    () => aggregatePRsByRepository(prs || [], repoWeights),
    [prs, repoWeights],
  );

  // Filter and sort repository stats
  const filteredRepoStats = useMemo(() => {
    return filterBySearch(repoStats, searchQuery);
  }, [repoStats, searchQuery]);

  const sortedRepoStats = useMemo(
    () => sortMinerRepoStats(filteredRepoStats, sortField, sortOrder),
    [filteredRepoStats, sortField, sortOrder],
  );

  const pagedRepoStats = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedRepoStats.slice(start, start + PAGE_SIZE);
  }, [sortedRepoStats, page]);

  const totalPages = Math.ceil(sortedRepoStats.length / PAGE_SIZE);

  const handleSort = (field: RepoSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const resetPage = () => setPage(0);

  const isFiltered = hasActiveFilters(searchQuery);
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
                    width="8%"
                    defaultDirection="desc"
                    activeField={sortField}
                    activeOrder={sortOrder}
                    onSort={handleSort}
                    cellStyle={headerCellStyle}
                  />
                  <SortableHeaderCell
                    field="repository"
                    label="Repository"
                    width="36%"
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
                    width="8%"
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
                    width="12%"
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
                    width="12%"
                    defaultDirection="desc"
                    activeField={sortField}
                    activeOrder={sortOrder}
                    onSort={handleSort}
                    cellStyle={headerCellStyle}
                  />
                  <TableCell
                    align="right"
                    sx={{ ...headerCellStyle, width: '12%' }}
                  >
                    Avg/PR
                  </TableCell>
                  <SortableHeaderCell
                    field="weight"
                    label="Weight"
                    align="right"
                    width="12%"
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
}

const RepoTableRow: React.FC<RepoTableRowProps> = ({
  repo,
  rank,
  bodyCellStyle,
  prs,
  githubId,
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
        <LinkBox
          href={`/miners/repository?name=${encodeURIComponent(repo.repository)}`}
          linkState={{ backLabel: `Back to ${prs?.[0]?.author || githubId}` }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            minWidth: 0,
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
          <Typography
            component="span"
            title={repo.repository}
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.85rem',
              minWidth: 0,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s',
            }}
          >
            {repo.repository}
          </Typography>
        </LinkBox>
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
