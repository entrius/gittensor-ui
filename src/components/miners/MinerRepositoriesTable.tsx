import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useMinerPRs, useReposAndWeights, useIssues } from '../../api';
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
  type IssueRepoSortField,
  type SortOrder,
  type RepoStats,
  type IssueRepoStats,
  buildRepoWeightsMap,
  aggregatePRsByRepository,
  aggregateIssueDiscoveryByRepository,
  filterBySearch,
  sortMinerRepoStats,
  sortIssueRepoStats,
  hasActiveFilters,
  getDisplayCount,
  isOutsideScoringWindow,
} from '../../utils/ExplorerUtils';
import { formatTokenAmount } from '../../utils/format';

type ViewMode = 'prs' | 'issues';

interface MinerRepositoriesTableProps {
  githubId: string;
  viewMode?: ViewMode;
}

const PAGE_SIZE = 20;

const MinerRepositoriesTable: React.FC<MinerRepositoriesTableProps> = ({
  githubId,
  viewMode = 'prs',
}) => {
  const isIssueMode = viewMode === 'issues';
  const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
  const { data: issues, isLoading: isLoadingIssues } = useIssues();
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const [prSortField, setPrSortField] = useState<RepoSortField>('score');
  const [prSortOrder, setPrSortOrder] = useState<SortOrder>('desc');
  const [issueSortField, setIssueSortField] =
    useState<IssueRepoSortField>('issueTokenScore');
  const [issueSortOrder, setIssueSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  const repoWeights = useMemo(() => buildRepoWeightsMap(repos), [repos]);

  const repoStats = useMemo(
    () => aggregatePRsByRepository(prs || [], repoWeights),
    [prs, repoWeights],
  );

  const issueRepoStats = useMemo(
    () => aggregateIssueDiscoveryByRepository(prs || [], issues, repoWeights),
    [prs, issues, repoWeights],
  );

  const filteredRepoStats = useMemo(
    () => filterBySearch(repoStats, searchQuery),
    [repoStats, searchQuery],
  );

  const filteredIssueRepoStats = useMemo(
    () => filterBySearch(issueRepoStats, searchQuery),
    [issueRepoStats, searchQuery],
  );

  const sortedRepoStats = useMemo(
    () => sortMinerRepoStats(filteredRepoStats, prSortField, prSortOrder),
    [filteredRepoStats, prSortField, prSortOrder],
  );

  const sortedIssueRepoStats = useMemo(
    () =>
      sortIssueRepoStats(
        filteredIssueRepoStats,
        issueSortField,
        issueSortOrder,
      ),
    [filteredIssueRepoStats, issueSortField, issueSortOrder],
  );

  const activeSortedCount = isIssueMode
    ? sortedIssueRepoStats.length
    : sortedRepoStats.length;

  const pagedRepoRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedRepoStats.slice(start, start + PAGE_SIZE);
  }, [sortedRepoStats, page]);

  const pagedIssueRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedIssueRepoStats.slice(start, start + PAGE_SIZE);
  }, [sortedIssueRepoStats, page]);

  const totalPages = Math.ceil(activeSortedCount / PAGE_SIZE);

  const handlePrSort = (field: RepoSortField) => {
    if (prSortField === field) {
      setPrSortOrder(prSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPrSortField(field);
      setPrSortOrder('desc');
    }
    setPage(0);
  };

  const handleIssueSort = (field: IssueRepoSortField) => {
    if (issueSortField === field) {
      setIssueSortOrder(issueSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setIssueSortField(field);
      setIssueSortOrder('desc');
    }
    setPage(0);
  };

  const isFiltered = hasActiveFilters(searchQuery);
  const displayCount = getDisplayCount(
    activeSortedCount,
    isIssueMode ? issueRepoStats.length : repoStats.length,
    isFiltered,
  );

  const isLoading =
    isLoadingPRs || isLoadingRepos || (isIssueMode && isLoadingIssues);

  const backLabel = prs?.[0]?.author || githubId;

  const renderRepositoryCell = (repository: string) => {
    const owner = repository.split('/')[0];
    return (
      <LinkBox
        href={`/miners/repository?name=${encodeURIComponent(repository)}`}
        linkState={{ backLabel: `Back to ${backLabel}` }}
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
          title={repository}
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
          {repository}
        </Typography>
      </LinkBox>
    );
  };

  const prColumns: DataTableColumn<RepoStats, RepoSortField>[] = [
    {
      key: 'rank',
      header: 'Rank',
      width: '8%',
      sortKey: 'rank',
      renderCell: (repo) => {
        const indexInPage = pagedRepoRows.indexOf(repo);
        const rank = page * PAGE_SIZE + indexInPage;
        return <RankBadge rank={rank} displayNumber={rank + 1} />;
      },
    },
    {
      key: 'repository',
      header: 'Repository',
      width: '36%',
      sortKey: 'repository',
      renderCell: (repo) => renderRepositoryCell(repo.repository),
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

  const issueColumns: DataTableColumn<IssueRepoStats, IssueRepoSortField>[] = [
    {
      key: 'rank',
      header: 'Rank',
      width: '8%',
      sortKey: 'rank',
      renderCell: (repo) => {
        const indexInPage = pagedIssueRows.indexOf(repo);
        const rank = page * PAGE_SIZE + indexInPage;
        return <RankBadge rank={rank} displayNumber={rank + 1} />;
      },
    },
    {
      key: 'repository',
      header: 'Repository',
      width: '28%',
      sortKey: 'repository',
      renderCell: (repo) => renderRepositoryCell(repo.repository),
    },
    {
      key: 'solved',
      header: 'Solved',
      width: '9%',
      align: 'right',
      sortKey: 'solved',
      renderCell: (repo) => repo.solved,
    },
    {
      key: 'validSolved',
      header: 'Valid',
      width: '9%',
      align: 'right',
      sortKey: 'validSolved',
      renderCell: (repo) => repo.validSolved,
    },
    {
      key: 'issueTokenScore',
      header: 'Token score',
      width: '12%',
      align: 'right',
      sortKey: 'issueTokenScore',
      renderCell: (repo) => repo.issueTokenScore.toFixed(2),
    },
    {
      key: 'bountyEarned',
      header: 'Bounty (a)',
      width: '12%',
      align: 'right',
      sortKey: 'bountyEarned',
      renderCell: (repo) => formatTokenAmount(repo.bountyEarned),
    },
    {
      key: 'avgPerSolve',
      header: 'Avg / solve',
      width: '10%',
      align: 'right',
      cellSx: {
        color: (theme) => alpha(theme.palette.text.primary, 0.5),
      },
      renderCell: (repo) =>
        repo.solved > 0 ? (repo.issueTokenScore / repo.solved).toFixed(2) : '\u2014',
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

  const emptyPrs = !prs || prs.length === 0;
  const noIssueDiscoveryRepos = isIssueMode && issueRepoStats.length === 0;

  const headerToolbar = (
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
        }}
        sx={searchFieldSx}
      />
    </Box>
  );

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
      {!isIssueMode && emptyPrs ? (
        <>
          {headerToolbar}
          <EmptyStateMessage message="No repository contributions found" />
        </>
      ) : isIssueMode && noIssueDiscoveryRepos ? (
        <>
          {headerToolbar}
          <EmptyStateMessage message="No repositories with solved bounty issues for this miner" />
        </>
      ) : isIssueMode ? (
        <DataTable<IssueRepoStats, IssueRepoSortField>
          columns={issueColumns}
          rows={pagedIssueRows}
          getRowKey={(repo) => repo.repository}
          minWidth="700px"
          stickyHeader
          size="medium"
          header={headerToolbar}
          emptyState={
            <EmptyStateMessage message="No repositories found for the selected filters" />
          }
          sort={{
            field: issueSortField,
            order: issueSortOrder,
            onChange: handleIssueSort,
          }}
          getRowSx={(repo) => ({
            opacity: isOutsideScoringWindow(repo.latestActivityDate) ? 0.4 : 1,
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
      ) : (
        <DataTable<RepoStats, RepoSortField>
          columns={prColumns}
          rows={pagedRepoRows}
          getRowKey={(repo) => repo.repository}
          minWidth="700px"
          stickyHeader
          size="medium"
          header={headerToolbar}
          emptyState={
            <EmptyStateMessage message="No repositories found for the selected filters" />
          }
          sort={{
            field: prSortField,
            order: prSortOrder,
            onChange: handlePrSort,
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
