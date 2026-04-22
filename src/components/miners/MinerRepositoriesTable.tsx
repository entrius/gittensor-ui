import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { useMinerPRs, useReposAndWeights } from '../../api';
import { LinkBox } from '../common/linkBehavior';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/common/DataTable';
import RankBadge from './RankBadge';
import EmptyStateMessage from './EmptyStateMessage';
import TablePagination from './TablePagination';
import { searchFieldSx } from './MinerRepositoriesTable.styles';
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
  isOutsideScoringWindow,
} from '../../utils/ExplorerUtils';

interface MinerRepositoriesTableProps {
  githubId: string;
}

const PAGE_SIZE = 20;

const MinerRepositoriesTable: React.FC<MinerRepositoriesTableProps> = ({
  githubId,
}) => {
  const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const [sortField, setSortField] = useState<RepoSortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  const repoWeights = useMemo(() => buildRepoWeightsMap(repos), [repos]);

  const repoStats = useMemo(
    () => aggregatePRsByRepository(prs || [], repoWeights),
    [prs, repoWeights],
  );

  const filteredRepoStats = useMemo(
    () => filterBySearch(repoStats, searchQuery),
    [repoStats, searchQuery],
  );

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

  const isFiltered = hasActiveFilters(searchQuery);
  const displayCount = getDisplayCount(
    sortedRepoStats.length,
    repoStats.length,
    isFiltered,
  );
  const isLoading = isLoadingPRs || isLoadingRepos;

  const columns: DataTableColumn<RepoStats, RepoSortField>[] = [
    {
      key: 'rank',
      header: 'Rank',
      width: '8%',
      sortKey: 'rank',
      renderCell: (repo) => {
        const indexInPage = pagedRepoStats.indexOf(repo);
        const rank = page * PAGE_SIZE + indexInPage;
        return <RankBadge rank={rank} displayNumber={rank + 1} />;
      },
    },
    {
      key: 'repository',
      header: 'Repository',
      width: '36%',
      sortKey: 'repository',
      renderCell: (repo) => {
        const owner = repo.repository.split('/')[0];
        return (
          <LinkBox
            href={`/miners/repository?name=${encodeURIComponent(repo.repository)}`}
            linkState={{
              backLabel: `Back to ${prs?.[0]?.author || githubId}`,
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              minWidth: 0,
              '&:hover': {
                color: 'primary.main',
                '& .MuiTypography-root': { textDecoration: 'underline' },
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
                backgroundColor: getAvatarBgColor(owner),
              }}
            />
            <Typography
              component="span"
              title={repo.repository}
              sx={{
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
        );
      },
    },
    {
      key: 'prs',
      header: 'PRs',
      width: '8%',
      align: 'right',
      sortKey: 'prs',
      renderCell: (repo) => repo.prs,
    },
    {
      key: 'score',
      header: 'Score',
      width: '12%',
      align: 'right',
      sortKey: 'score',
      renderCell: (repo) => repo.score.toFixed(4),
    },
    {
      key: 'tokenScore',
      header: 'Token Score',
      width: '12%',
      align: 'right',
      sortKey: 'tokenScore',
      renderCell: (repo) => repo.tokenScore.toFixed(2),
    },
    {
      key: 'avgPerPr',
      header: 'Avg/PR',
      width: '12%',
      align: 'right',
      cellSx: {
        color: (theme) => alpha(theme.palette.text.primary, 0.5),
      },
      renderCell: (repo) =>
        repo.prs > 0 ? (repo.score / repo.prs).toFixed(4) : '\u2014',
    },
    {
      key: 'weight',
      header: 'Weight',
      width: '12%',
      align: 'right',
      sortKey: 'weight',
      renderCell: (repo) => repo.weight.toFixed(4),
    },
  ];

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
                fontSize: { xs: '0.95rem', sm: '1.1rem' },
                fontWeight: 500,
              }}
            >
              Repositories
            </Typography>
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.5),
                fontSize: '0.75rem',
              }}
            >
              ({displayCount})
            </Typography>
          </Box>
        </Box>

        <TextField
          size="small"
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
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
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(0);
                  }}
                  edge="end"
                  aria-label="clear search"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
          sx={searchFieldSx}
        />
      </Box>

      {!prs || prs.length === 0 ? (
        <EmptyStateMessage message="No repository contributions found" />
      ) : (
        <DataTable<RepoStats, RepoSortField>
          columns={columns}
          rows={pagedRepoStats}
          getRowKey={(repo) => repo.repository}
          minWidth="700px"
          stickyHeader
          size="medium"
          emptyState={
            <EmptyStateMessage message="No repositories found for the selected filters" />
          }
          sort={{
            field: sortField,
            order: sortOrder,
            onChange: handleSort,
          }}
          getRowSx={(repo) => ({
            opacity: isOutsideScoringWindow(repo.latestPrDate) ? 0.4 : 1,
            transition: 'opacity 0.2s',
          })}
          pagination={
            <TablePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          }
        />
      )}
    </Card>
  );
};

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
