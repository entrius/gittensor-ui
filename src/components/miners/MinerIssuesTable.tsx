import React, { useEffect, useMemo, useState } from 'react';
import {
  useGitHubIssuesByAuthor,
  useMinerGithubData,
  useReposAndWeights,
  useMinerStats,
} from '../../api';
import {
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  useTheme,
  type Theme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { STATUS_COLORS } from '../../theme';
import ExplorerFilterButton from './ExplorerFilterButton';

type IssueTab = 'open' | 'closed' | 'all';

interface MinerIssuesTableProps {
  githubId: string;
}

const MinerIssuesTable: React.FC<MinerIssuesTableProps> = ({ githubId }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<IssueTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const minerStatsQuery = useMinerStats(githubId);
  const githubDataQuery = useMinerGithubData(githubId, true);
  const reposQuery = useReposAndWeights();

  const minerLogin = useMemo(
    () =>
      (
        githubDataQuery.data?.login ||
        minerStatsQuery.data?.githubUsername ||
        ''
      ).trim(),
    [githubDataQuery.data?.login, minerStatsQuery.data?.githubUsername],
  );

  const issuesQuery = useGitHubIssuesByAuthor(minerLogin, !!minerLogin);

  const registeredRepos = useMemo(
    () =>
      new Set(
        (reposQuery.data || []).map((repo) =>
          repo.fullName.toLowerCase().trim(),
        ),
      ),
    [reposQuery.data],
  );

  const authoredIssues = useMemo(() => {
    const registeredRepoIssues = (issuesQuery.data || []).filter((issue) =>
      registeredRepos.has(issue.repositoryFullName.toLowerCase().trim()),
    );

    return registeredRepoIssues.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    );
  }, [issuesQuery.data, registeredRepos]);

  const issuesByTab = useMemo(() => {
    const openIssues = authoredIssues.filter((issue) => issue.state === 'open');
    const closedIssues = authoredIssues.filter(
      (issue) => issue.state === 'closed',
    );

    return {
      open: openIssues,
      closed: closedIssues,
      all: authoredIssues,
    };
  }, [authoredIssues]);

  const isLoading =
    minerStatsQuery.isLoading ||
    githubDataQuery.isLoading ||
    issuesQuery.isLoading ||
    reposQuery.isLoading;

  useEffect(() => {
    setActiveTab('all');
    setSearchQuery('');
  }, [githubId]);

  const visibleIssues = useMemo(() => {
    const issuesForTab = issuesByTab[activeTab];
    const query = searchQuery.trim().toLowerCase();

    if (!query) return issuesForTab;

    return issuesForTab.filter(
      (issue) =>
        issue.title.toLowerCase().includes(query) ||
        issue.repositoryFullName.toLowerCase().includes(query) ||
        String(issue.issueNumber).includes(query),
    );
  }, [issuesByTab, activeTab, searchQuery]);

  const hasFilters = activeTab !== 'all' || !!searchQuery.trim();

  return (
    <Card
      sx={{
        p: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      elevation={0}
    >
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderBottom: '1px solid',
          borderColor: 'border.light',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
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
              Issues
            </Typography>
            <Typography
              sx={{
                color: (t) => alpha(t.palette.text.primary, 0.5),
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
              }}
            >
              ({visibleIssues.length}
              {hasFilters ? ` of ${authoredIssues.length}` : ''})
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
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <ExplorerFilterButton
                label="All"
                count={issuesByTab.all.length}
                color={theme.palette.status.neutral}
                selected={activeTab === 'all'}
                onClick={() => setActiveTab('all')}
              />
              <ExplorerFilterButton
                label="Open"
                count={issuesByTab.open.length}
                color={theme.palette.status.open}
                selected={activeTab === 'open'}
                onClick={() => setActiveTab('open')}
              />
              <ExplorerFilterButton
                label="Closed"
                count={issuesByTab.closed.length}
                color={theme.palette.status.closed}
                selected={activeTab === 'closed'}
                onClick={() => setActiveTab('closed')}
              />
            </Box>
          </Box>
        </Box>

        <TextField
          size="small"
          placeholder="Search by title, repo, or issue number..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
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
          sx={{
            mt: 2,
            maxWidth: 400,
            minWidth: { xs: '100%', sm: 350 },
            '& .MuiOutlinedInput-root': {
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              color: 'text.primary',
              backgroundColor: 'surface.subtle',
              borderRadius: 2,
              '& fieldset': { borderColor: 'border.light' },
              '&:hover fieldset': { borderColor: 'border.medium' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
      </Box>

      {!authoredIssues.length ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            }}
          >
            No issues found
          </Typography>
        </Box>
      ) : visibleIssues.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
            }}
          >
            No issues found for the selected filters
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{
            overflowY: 'auto',
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
              width: { xs: '6px', sm: '8px' },
              height: { xs: '6px', sm: '8px' },
            },
            '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'border.light',
              borderRadius: '4px',
              '&:hover': { backgroundColor: 'border.medium' },
            },
          }}
        >
          <Table stickyHeader sx={{ tableLayout: 'fixed', minWidth: '700px' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headerCellSx, width: '12%' }}>
                  Issue #
                </TableCell>
                <TableCell sx={{ ...headerCellSx, width: '38%' }}>
                  Title
                </TableCell>
                <TableCell sx={{ ...headerCellSx, width: '30%' }}>
                  Repository
                </TableCell>
                <TableCell sx={{ ...headerCellSx, width: '10%' }}>
                  State
                </TableCell>
                <TableCell align="right" sx={{ ...headerCellSx, width: '10%' }}>
                  Date
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleIssues.map((issue) => {
                const owner = issue.repositoryFullName.split('/')[0] || '';

                return (
                  <TableRow
                    key={`${issue.repositoryFullName}-${issue.issueNumber}`}
                    onClick={() =>
                      window.open(
                        issue.htmlUrl,
                        '_blank',
                        'noopener,noreferrer',
                      )
                    }
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'surface.subtle',
                      },
                      transition: 'all 0.2s',
                    }}
                  >
                    <TableCell
                      sx={{
                        ...bodyCellSx,
                        fontSize: { xs: '0.75rem', sm: '0.85rem' },
                      }}
                    >
                      <Box
                        component="a"
                        href={issue.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        sx={{
                          color: 'inherit',
                          textDecoration: 'none',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        #{issue.issueNumber}
                        <OpenInNewIcon sx={{ fontSize: 12, opacity: 0.5 }} />
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={{
                        ...bodyCellSx,
                        fontSize: { xs: '0.75rem', sm: '0.85rem' },
                      }}
                    >
                      <Box
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {issue.title}
                      </Box>
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          overflow: 'hidden',
                        }}
                      >
                        <Avatar
                          src={
                            owner
                              ? `https://avatars.githubusercontent.com/${owner}`
                              : undefined
                          }
                          alt={owner}
                          sx={{
                            width: 20,
                            height: 20,
                            flexShrink: 0,
                            border: '1px solid',
                            borderColor: 'border.medium',
                            backgroundColor: 'transparent',
                          }}
                        />
                        <Box
                          component="span"
                          sx={{
                            wordBreak: 'break-word',
                            lineHeight: 1.3,
                          }}
                        >
                          {issue.repositoryFullName}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Chip
                        label={issue.state.toUpperCase()}
                        variant="status"
                        sx={{
                          color:
                            issue.state === 'open'
                              ? STATUS_COLORS.open
                              : STATUS_COLORS.closed,
                          borderColor:
                            issue.state === 'open'
                              ? STATUS_COLORS.open
                              : STATUS_COLORS.closed,
                        }}
                      />
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        ...bodyCellSx,
                        fontSize: { xs: '0.75rem', sm: '0.85rem' },
                        color: (t) => alpha(t.palette.text.primary, 0.7),
                      }}
                    >
                      {new Date(
                        issue.updatedAt || issue.createdAt,
                      ).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: (t) => alpha(t.palette.background.default, 0.55),
            backdropFilter: 'blur(2px)',
          }}
        >
          <CircularProgress size={28} />
        </Box>
      )}
    </Card>
  );
};

const headerCellSx = {
  backgroundColor: 'surface.elevated',
  backdropFilter: 'blur(8px)',
  color: (t: Theme) => alpha(t.palette.text.primary, 0.7),
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: { xs: '0.65rem', sm: '0.75rem' },
  borderBottom: '1px solid',
  borderColor: 'border.light',
  height: { xs: '48px', sm: '56px' },
  py: { xs: 1, sm: 1.5 },
  px: { xs: 0.5, sm: 2 },
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const bodyCellSx = {
  color: 'text.primary',
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: '1px solid',
  borderColor: 'border.light',
  fontSize: '0.85rem',
  py: { xs: 0.75, sm: 1 },
  px: { xs: 0.5, sm: 2 },
  height: { xs: '52px', sm: '60px' },
};

export default MinerIssuesTable;
