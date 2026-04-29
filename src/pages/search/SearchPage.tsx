import React from 'react';
import { Alert, Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useLocation, useSearchParams } from 'react-router-dom';
import { BackButton, SEO } from '../../components';
import { GlobalSearchBar, Page } from '../../components/layout';
import IssuesTab from './IssuesTab';
import MinerTab from './MinerTab';
import PullRequestsTab from './PullRequestsTab';
import RepositoryTab from './RepositoryTab';
import { MIN_SEARCH_QUERY_LENGTH, useSearchResults } from './searchData';
import {
  getNextSearchSort,
  parseSearchSort,
  sortIssueRows,
  sortMinerRows,
  sortPrRows,
  sortRepoRows,
  type IssueSearchSortKey,
  type MinerSearchSortKey,
  type PrSearchSortKey,
  type RepoSearchSortKey,
  type SearchSortTab,
} from './searchSort';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const tabParam = searchParams.get('tab');
  const rowsParam = Number(searchParams.get('rows'));
  const pageParam = Number(searchParams.get('page'));
  const sortParam = searchParams.get('sort');
  const orderParam = searchParams.get('order');

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
      updates: Partial<
        Record<
          'tab' | 'page' | 'rows' | 'sort' | 'order',
          string | number | null
        >
      >,
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

  // Reset the active page and sort when the search query changes.
  React.useEffect(() => {
    if (previousQueryRef.current === query) return;

    previousQueryRef.current = query;

    updateSearchParams({
      sort: null,
      order: null,
      ...(page !== 0 ? { page: null } : {}),
    });
  }, [page, query, updateSearchParams]);

  // Keep the active tab page within valid bounds as result counts change.
  React.useEffect(() => {
    const lastValidPage = getLastValidPage(activeResultCount, rowsPerPage);
    if (page > lastValidPage) {
      updateSearchParams({ page: lastValidPage === 0 ? null : lastValidPage });
    }
  }, [activeResultCount, page, rowsPerPage, updateSearchParams]);

  const minerSortCfg = React.useMemo(
    () => parseSearchSort('miners', sortParam, orderParam),
    [sortParam, orderParam],
  );
  const repoSortCfg = React.useMemo(
    () => parseSearchSort('repositories', sortParam, orderParam),
    [sortParam, orderParam],
  );
  const prSortCfg = React.useMemo(
    () => parseSearchSort('prs', sortParam, orderParam),
    [sortParam, orderParam],
  );
  const issueSortCfg = React.useMemo(
    () => parseSearchSort('issues', sortParam, orderParam),
    [sortParam, orderParam],
  );

  const sortedMinerResults = React.useMemo(
    () => sortMinerRows(minerResults, minerSortCfg.field, minerSortCfg.order),
    [minerResults, minerSortCfg],
  );
  const sortedRepositoryResults = React.useMemo(
    () => sortRepoRows(repositoryResults, repoSortCfg.field, repoSortCfg.order),
    [repositoryResults, repoSortCfg],
  );
  const sortedPrResults = React.useMemo(
    () => sortPrRows(prResults, prSortCfg.field, prSortCfg.order),
    [prResults, prSortCfg],
  );
  const sortedIssueResults = React.useMemo(
    () => sortIssueRows(issueResults, issueSortCfg.field, issueSortCfg.order),
    [issueResults, issueSortCfg],
  );

  const paginatedMinerResults = React.useMemo(
    () => paginateResults(sortedMinerResults, page, rowsPerPage),
    [sortedMinerResults, page, rowsPerPage],
  );

  const paginatedRepositoryResults = React.useMemo(
    () => paginateResults(sortedRepositoryResults, page, rowsPerPage),
    [page, sortedRepositoryResults, rowsPerPage],
  );

  const paginatedPrResults = React.useMemo(
    () => paginateResults(sortedPrResults, page, rowsPerPage),
    [page, sortedPrResults, rowsPerPage],
  );

  const paginatedIssueResults = React.useMemo(
    () => paginateResults(sortedIssueResults, page, rowsPerPage),
    [sortedIssueResults, page, rowsPerPage],
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

  const handleSearchSort = React.useCallback(
    (field: string) => {
      const tab = tabValue as SearchSortTab;
      const current = parseSearchSort(tab, sortParam, orderParam);
      const next = getNextSearchSort(tab, current.field, current.order, field);
      updateSearchParams({
        sort: next.field,
        order: next.order,
        page: null,
      });
    },
    [orderParam, sortParam, tabValue, updateSearchParams],
  );

  const searchBackState = {
    backTo: `${location.pathname}${location.search}`,
  };

  const getMinerHref = (miner: { githubId: string }) =>
    `/miners/details?githubId=${encodeURIComponent(miner.githubId)}`;

  const getRepositoryHref = (repo: { fullName: string }) =>
    `/miners/repository?name=${encodeURIComponent(repo.fullName)}`;

  const getPrHref = (pr: { repository: string; pullRequestNumber: number }) =>
    `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`;

  const getIssueHref = (issue: { id: number }) =>
    `/bounties/details?id=${issue.id}`;

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
              {isAnySectionLoading && activeResultCount === 0
                ? `Loading search results for "${query}"...`
                : `${activeResultCount} result${activeResultCount === 1 ? '' : 's'} in ${TAB_LABELS[tabValue]} for "${query}"`}
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
                    sort: null,
                    order: null,
                  })
                }
                aria-label="search categories tabs"
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={(theme) => ({
                  '& .MuiTab-root': {
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
                getMinerHref={getMinerHref}
                linkState={searchBackState}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                paginatedMinerResults={paginatedMinerResults}
                minerResults={sortedMinerResults}
                sort={{
                  field: minerSortCfg.field as MinerSearchSortKey,
                  order: minerSortCfg.order,
                  onChange: handleSearchSort,
                }}
              />
            )}

            {tabValue === 'repositories' && (
              <RepositoryTab
                isError={tabState.isError}
                isLoading={tabState.isLoading}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                getRepositoryHref={getRepositoryHref}
                linkState={searchBackState}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                paginatedRepositoryResults={paginatedRepositoryResults}
                repositoryResults={sortedRepositoryResults}
                sort={{
                  field: repoSortCfg.field as RepoSearchSortKey,
                  order: repoSortCfg.order,
                  onChange: handleSearchSort,
                }}
              />
            )}

            {tabValue === 'prs' && (
              <PullRequestsTab
                isError={tabState.isError}
                isLoading={tabState.isLoading}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                getPrHref={getPrHref}
                linkState={searchBackState}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                paginatedPrResults={paginatedPrResults}
                prResults={sortedPrResults}
                sort={{
                  field: prSortCfg.field as PrSearchSortKey,
                  order: prSortCfg.order,
                  onChange: handleSearchSort,
                }}
              />
            )}

            {tabValue === 'issues' && (
              <IssuesTab
                isError={tabState.isError}
                isLoading={tabState.isLoading}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                getIssueHref={getIssueHref}
                linkState={searchBackState}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                paginatedIssueResults={paginatedIssueResults}
                issueResults={sortedIssueResults}
                sort={{
                  field: issueSortCfg.field as IssueSearchSortKey,
                  order: issueSortCfg.order,
                  onChange: handleSearchSort,
                }}
              />
            )}
          </Stack>
        )}
      </Box>
    </Page>
  );
};

export default SearchPage;
