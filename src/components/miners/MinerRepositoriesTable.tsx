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
import { useMinerPRs, useReposAndWeights, useIssues } from '../../api';
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
  type IssueRepoSortField,
  type MinerRepoTableSortField,
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
  const theme = useTheme();
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

  const headerCellStyle = useMemo(() => getHeaderCellStyle(theme), [theme]);
  const bodyCellStyle = useMemo(() => getBodyCellStyle(theme), [theme]);

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

  const activeSorted = isIssueMode ? sortedIssueRepoStats : sortedRepoStats;

  const pagedRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return activeSorted.slice(start, start + PAGE_SIZE);
  }, [activeSorted, page]);

  const totalPages = Math.ceil(activeSorted.length / PAGE_SIZE);

  const handlePrSort = (field: MinerRepoTableSortField) => {
    const f = field as RepoSortField;
    if (prSortField === f) {
      setPrSortOrder(prSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPrSortField(f);
      setPrSortOrder('desc');
    }
  };

  const handleIssueSort = (field: MinerRepoTableSortField) => {
    const f = field as IssueRepoSortField;
    if (issueSortField === f) {
      setIssueSortOrder(issueSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setIssueSortField(f);
      setIssueSortOrder('desc');
    }
  };

  const resetPage = () => setPage(0);

  const isFiltered = hasActiveFilters(searchQuery);
  const displayCount = getDisplayCount(
    activeSorted.length,
    isIssueMode ? issueRepoStats.length : repoStats.length,
    isFiltered,
  );

  const isLoading =
    isLoadingPRs || isLoadingRepos || (isIssueMode && isLoadingIssues);

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

      {!isIssueMode && emptyPrs ? (
        <EmptyStateMessage message="No repository contributions found" />
      ) : isIssueMode && noIssueDiscoveryRepos ? (
        <EmptyStateMessage message="No repositories with solved bounty issues for this miner" />
      ) : activeSorted.length === 0 ? (
        <EmptyStateMessage message="No repositories found for the selected filters" />
      ) : (
        <>
          <TableContainer sx={tableContainerSx}>
            <Table
              stickyHeader
              sx={{ tableLayout: 'fixed', minWidth: '700px' }}
            >
              <TableHead>
                {isIssueMode ? (
                  <TableRow>
                    <SortableHeaderCell
                      field="rank"
                      label="Rank"
                      width="8%"
                      defaultDirection="desc"
                      activeField={issueSortField}
                      activeOrder={issueSortOrder}
                      onSort={handleIssueSort}
                      cellStyle={headerCellStyle}
                    />
                    <SortableHeaderCell
                      field="repository"
                      label="Repository"
                      width="28%"
                      defaultDirection="asc"
                      activeField={issueSortField}
                      activeOrder={issueSortOrder}
                      onSort={handleIssueSort}
                      cellStyle={headerCellStyle}
                    />
                    <SortableHeaderCell
                      field="solved"
                      label="Solved"
                      align="right"
                      width="9%"
                      defaultDirection="desc"
                      activeField={issueSortField}
                      activeOrder={issueSortOrder}
                      onSort={handleIssueSort}
                      cellStyle={headerCellStyle}
                    />
                    <SortableHeaderCell
                      field="validSolved"
                      label="Valid"
                      align="right"
                      width="9%"
                      defaultDirection="desc"
                      activeField={issueSortField}
                      activeOrder={issueSortOrder}
                      onSort={handleIssueSort}
                      cellStyle={headerCellStyle}
                    />
                    <SortableHeaderCell
                      field="issueTokenScore"
                      label="Token score"
                      align="right"
                      width="12%"
                      defaultDirection="desc"
                      activeField={issueSortField}
                      activeOrder={issueSortOrder}
                      onSort={handleIssueSort}
                      cellStyle={headerCellStyle}
                    />
                    <SortableHeaderCell
                      field="bountyEarned"
                      label="Bounty (α)"
                      align="right"
                      width="12%"
                      defaultDirection="desc"
                      activeField={issueSortField}
                      activeOrder={issueSortOrder}
                      onSort={handleIssueSort}
                      cellStyle={headerCellStyle}
                    />
                    <TableCell
                      align="right"
                      sx={{ ...headerCellStyle, width: '10%' }}
                    >
                      Avg / solve
                    </TableCell>
                    <SortableHeaderCell
                      field="weight"
                      label="Weight"
                      align="right"
                      width="12%"
                      defaultDirection="desc"
                      activeField={issueSortField}
                      activeOrder={issueSortOrder}
                      onSort={handleIssueSort}
                      cellStyle={headerCellStyle}
                    />
                  </TableRow>
                ) : (
                  <TableRow>
                    <SortableHeaderCell
                      field="rank"
                      label="Rank"
                      width="8%"
                      defaultDirection="desc"
                      activeField={prSortField}
                      activeOrder={prSortOrder}
                      onSort={handlePrSort}
                      cellStyle={headerCellStyle}
                    />
                    <SortableHeaderCell
                      field="repository"
                      label="Repository"
                      width="36%"
                      defaultDirection="asc"
                      activeField={prSortField}
                      activeOrder={prSortOrder}
                      onSort={handlePrSort}
                      cellStyle={headerCellStyle}
                    />
                    <SortableHeaderCell
                      field="prs"
                      label="PRs"
                      align="right"
                      width="8%"
                      defaultDirection="desc"
                      activeField={prSortField}
                      activeOrder={prSortOrder}
                      onSort={handlePrSort}
                      cellStyle={headerCellStyle}
                    />
                    <SortableHeaderCell
                      field="score"
                      label="Score"
                      align="right"
                      width="12%"
                      defaultDirection="desc"
                      activeField={prSortField}
                      activeOrder={prSortOrder}
                      onSort={handlePrSort}
                      cellStyle={headerCellStyle}
                    />
                    <SortableHeaderCell
                      field="tokenScore"
                      label="Token Score"
                      align="right"
                      width="12%"
                      defaultDirection="desc"
                      activeField={prSortField}
                      activeOrder={prSortOrder}
                      onSort={handlePrSort}
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
                      activeField={prSortField}
                      activeOrder={prSortOrder}
                      onSort={handlePrSort}
                      cellStyle={headerCellStyle}
                    />
                  </TableRow>
                )}
              </TableHead>
              <TableBody>
                {isIssueMode
                  ? (pagedRows as IssueRepoStats[]).map((repo, index) => {
                      const rank = page * PAGE_SIZE + index;
                      return (
                        <IssueRepoTableRow
                          key={repo.repository}
                          repo={repo}
                          rank={rank}
                          bodyCellStyle={bodyCellStyle}
                          backLabel={prs?.[0]?.author || githubId}
                        />
                      );
                    })
                  : (pagedRows as RepoStats[]).map((repo, index) => {
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
  const isStale = isOutsideScoringWindow(repo.latestPrDate);
  return (
    <TableRow
      sx={{
        opacity: isStale ? 0.4 : 1,
        '&:hover': {
          backgroundColor: 'surface.light',
        },
        transition: 'background-color 0.2s, opacity 0.2s',
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

interface IssueRepoTableRowProps {
  repo: IssueRepoStats;
  rank: number;
  bodyCellStyle: Record<string, unknown>;
  backLabel: string;
}

const IssueRepoTableRow: React.FC<IssueRepoTableRowProps> = ({
  repo,
  rank,
  bodyCellStyle,
  backLabel,
}) => {
  const owner = repo.repository.split('/')[0];
  const avatarBgColor = getAvatarBgColor(owner);
  const avgPerSolve =
    repo.solved > 0
      ? (repo.issueTokenScore / repo.solved).toFixed(2)
      : '\u2014';
  const isStale = isOutsideScoringWindow(repo.latestActivityDate);
  return (
    <TableRow
      sx={{
        opacity: isStale ? 0.4 : 1,
        '&:hover': {
          backgroundColor: 'surface.light',
        },
        transition: 'background-color 0.2s, opacity 0.2s',
      }}
    >
      <TableCell sx={bodyCellStyle}>
        <RankBadge rank={rank} displayNumber={rank + 1} />
      </TableCell>
      <TableCell sx={bodyCellStyle}>
        <LinkBox
          href={`/miners/repository?name=${encodeURIComponent(repo.repository)}`}
          linkState={{ backLabel: `Back to ${backLabel}` }}
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
        {repo.solved}
      </TableCell>
      <TableCell align="right" sx={bodyCellStyle}>
        {repo.validSolved}
      </TableCell>
      <TableCell align="right" sx={bodyCellStyle}>
        {repo.issueTokenScore.toFixed(2)}
      </TableCell>
      <TableCell align="right" sx={bodyCellStyle}>
        {formatTokenAmount(repo.bountyEarned)}
      </TableCell>
      <TableCell
        align="right"
        sx={{
          ...bodyCellStyle,
          color: (t) => alpha(t.palette.text.primary, 0.5),
        }}
      >
        {avgPerSolve}
      </TableCell>
      <TableCell align="right" sx={bodyCellStyle}>
        {repo.weight.toFixed(4)}
      </TableCell>
    </TableRow>
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
