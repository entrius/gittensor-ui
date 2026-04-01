import React from 'react';
import { Alert, Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BackButton, SEO } from '../../components';
import { GlobalSearchBar, Page } from '../../components/layout';
import IssuesTab from './IssuesTab';
import MinerTab from './MinerTab';
import PullRequestsTab from './PullRequestsTab';
import RepositoryTab from './RepositoryTab';
import { MIN_SEARCH_QUERY_LENGTH, useSearchResults } from './searchData';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const SEARCH_TABS = ['miners', 'repositories', 'prs', 'issues'] as const;

type SearchTab = (typeof SEARCH_TABS)[number];

const TAB_LABELS: Record<SearchTab, string> = {
  miners: 'Miners',
  repositories: 'Repositories',
  prs: 'Pull Requests',
  issues: 'Issues',
};

const getLastValidPage = (count: number, rowsPerPage: number) =>
  Math.max(0, Math.ceil(count / rowsPerPage) - 1);

const paginateResults = <T,>(
  results: T[],
  page: number,
  rowsPerPage: number,
) => {
  const startIndex = page * rowsPerPage;
  return results.slice(startIndex, startIndex + rowsPerPage);
};

const SearchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const tabParam = searchParams.get('tab');
  const rowsParam = Number(searchParams.get('rows'));
  const pageParam = Number(searchParams.get('page'));

  const rowsPerPage = ROWS_PER_PAGE_OPTIONS.includes(rowsParam)
    ? rowsParam
    : 10;

  const page = Number.isInteger(pageParam) && pageParam >= 0 ? pageParam : 0;

  const explicitTabValue = SEARCH_TABS.includes(tabParam as SearchTab)
    ? (tabParam as SearchTab)
    : null;

  const previousQueryRef = React.useRef(query);

  const updateSearchParams = React.useCallback(
    (
      updates: Partial<Record<'tab' | 'page' | 'rows', string | number | null>>,
    ) => {
      const nextParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          nextParams.delete(key);
          return;
        }

        nextParams.set(key, String(value));
      });

      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const {
    datasets,
    hasQuery,
    minerResults,
    repositoryResults,
    prResults,
    issueResults,
  } = useSearchResults(query, {}, true, 'full');

  const resultCountByTab: Record<SearchTab, number> = {
    miners: minerResults.length,
    repositories: repositoryResults.length,
    prs: prResults.length,
    issues: issueResults.length,
  };

  const totalResults = Object.values(resultCountByTab).reduce(
    (sum, count) => sum + count,
    0,
  );

  // Use the URL param tab, or fall back to the first tab with results.
  const tabValue =
    explicitTabValue ||
    (hasQuery
      ? SEARCH_TABS.find((tab) => resultCountByTab[tab] > 0) || SEARCH_TABS[0]
      : SEARCH_TABS[0]);

  const isAnySectionLoading =
    datasets.miners.isLoading ||
    datasets.repositories.isLoading ||
    datasets.prs.isLoading ||
    datasets.issues.isLoading;

  const tabState = datasets[tabValue];
  const activeResultCount = resultCountByTab[tabValue];

  // Reset the active page when the search query changes.
  React.useEffect(() => {
    if (previousQueryRef.current === query) return;

    previousQueryRef.current = query;

    if (page !== 0) {
      updateSearchParams({ page: null });
    }
  }, [page, query, updateSearchParams]);

  // Keep the active tab page within valid bounds as result counts change.
  React.useEffect(() => {
    const lastValidPage = getLastValidPage(activeResultCount, rowsPerPage);
    if (page > lastValidPage) {
      updateSearchParams({ page: lastValidPage === 0 ? null : lastValidPage });
    }
  }, [activeResultCount, page, rowsPerPage, updateSearchParams]);

  const paginatedMinerResults = React.useMemo(
    () => paginateResults(minerResults, page, rowsPerPage),
    [minerResults, page, rowsPerPage],
  );

  const paginatedRepositoryResults = React.useMemo(
    () => paginateResults(repositoryResults, page, rowsPerPage),
    [page, repositoryResults, rowsPerPage],
  );

  const paginatedPrResults = React.useMemo(
    () => paginateResults(prResults, page, rowsPerPage),
    [page, prResults, rowsPerPage],
  );

  const paginatedIssueResults = React.useMemo(
    () => paginateResults(issueResults, page, rowsPerPage),
    [issueResults, page, rowsPerPage],
  );

  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage === 0 ? null : newPage });
  };

  const handleRowsPerPageChange = (nextRows: number) => {
    updateSearchParams({
      rows: nextRows === 10 ? null : nextRows,
      page: null,
    });
  };

  const searchBackState = {
    backTo: `${location.pathname}${location.search}`,
  };

  const handleSelectMiner = (githubId: string) => {
    navigate(`/miners/details?githubId=${encodeURIComponent(githubId)}`, {
      state: searchBackState,
    });
  };

  const handleSelectRepository = (fullName: string) => {
    navigate(`/miners/repository?name=${encodeURIComponent(fullName)}`, {
      state: searchBackState,
    });
  };

  const handleSelectPr = (repository: string, pullRequestNumber: number) => {
    navigate(
      `/miners/pr?repo=${encodeURIComponent(repository)}&number=${pullRequestNumber}`,
      {
        state: searchBackState,
      },
    );
  };

  const handleSelectIssue = (id: number) => {
    navigate(`/issues/details?id=${id}`, {
      state: searchBackState,
    });
  };

  return (
    <Page title="Search">
      <SEO
        title="Search"
        description="Search miners, repositories, PRs, and issues."
      />
      <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
        <BackButton to="/dashboard" label="Back" mb={2} />

        <Typography
          variant="h4"
          sx={(theme) => ({
            ...theme.typography.sectionTitle,
            mt: 1,
            mb: 2,
          })}
        >
          Search
        </Typography>

        <GlobalSearchBar />

        {!hasQuery && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Type at least {MIN_SEARCH_QUERY_LENGTH} characters to search.
          </Alert>
        )}

        {hasQuery && (
          <Stack gap={2} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {isAnySectionLoading && totalResults === 0
                ? `Loading search results for "${query}"...`
                : `${totalResults} result${totalResults === 1 ? '' : 's'} for "${query}"`}
            </Typography>

            <Box
              sx={(theme) => ({
                borderBottom: 1,
                borderColor: theme.palette.border.light,
              })}
            >
              <Tabs
                value={tabValue}
                onChange={(_event, newValue) =>
                  updateSearchParams({
                    tab: newValue,
                    page: null,
                  })
                }
                aria-label="search categories tabs"
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={(theme) => ({
                  '& .MuiTab-root': {
                    fontFamily: theme.typography.mono.fontFamily,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    color: theme.palette.text.secondary,
                    minHeight: 48,
                    '&.Mui-selected': {
                      color: theme.palette.text.primary,
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: theme.palette.text.primary,
                    height: 2,
                  },
                })}
              >
                {SEARCH_TABS.map((tab) => (
                  <Tab key={tab} value={tab} label={TAB_LABELS[tab]} />
                ))}
              </Tabs>
            </Box>

            {tabValue === 'miners' && (
              <MinerTab
                isError={tabState.isError}
                isLoading={tabState.isLoading}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                onSelectMiner={handleSelectMiner}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                paginatedMinerResults={paginatedMinerResults}
                minerResults={minerResults}
              />
            )}

            {tabValue === 'repositories' && (
              <RepositoryTab
                isError={tabState.isError}
                isLoading={tabState.isLoading}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                onSelectRepository={handleSelectRepository}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                paginatedRepositoryResults={paginatedRepositoryResults}
                repositoryResults={repositoryResults}
              />
            )}

            {tabValue === 'prs' && (
              <PullRequestsTab
                isError={tabState.isError}
                isLoading={tabState.isLoading}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                onSelectPr={handleSelectPr}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                paginatedPrResults={paginatedPrResults}
                prResults={prResults}
              />
            )}

            {tabValue === 'issues' && (
              <IssuesTab
                isError={tabState.isError}
                isLoading={tabState.isLoading}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                onSelectIssue={handleSelectIssue}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                paginatedIssueResults={paginatedIssueResults}
                issueResults={issueResults}
              />
            )}
          </Stack>
        )}
      </Box>
    </Page>
  );
};

export default SearchPage;
