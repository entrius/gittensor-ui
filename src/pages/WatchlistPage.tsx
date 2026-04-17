import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  alpha,
  Stack,
  Dialog,
  DialogTitle,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Chip,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Page } from '../components/layout';
import { TopMinersTable, SEO } from '../components';
import { useAllMiners, useReposAndWeights, useIssues } from '../api';
import { mapAllMinersToStats } from '../utils/minerMapper';
import { useWatchlist, type WatchlistCategory } from '../hooks/useWatchlist';
import type { Repository } from '../api/models/Dashboard';
import type { IssueBounty } from '../api/models/Issues';
import { STATUS_COLORS } from '../theme';
import StarIcon from '@mui/icons-material/Star';

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */

interface TabDef {
  key: WatchlistCategory;
  label: string;
  emptyMsg: string;
  emptyHint: string;
  emptyAction?: { to: string; label: string };
}

const TABS: TabDef[] = [
  {
    key: 'miners',
    label: 'Miners',
    emptyMsg: 'No pinned miners.',
    emptyHint: 'Browse the leaderboard and star miners you want to track.',
    emptyAction: { to: '/top-miners', label: 'Go to leaderboard' },
  },
  {
    key: 'repos',
    label: 'Repositories',
    emptyMsg: 'No pinned repositories.',
    emptyHint: 'Star repositories from their detail pages to track them here.',
    emptyAction: { to: '/repositories', label: 'Browse repositories' },
  },
  {
    key: 'bounties',
    label: 'Bounties',
    emptyMsg: 'No pinned bounties.',
    emptyHint: 'Star bounties from their detail pages to track them here.',
    emptyAction: { to: '/bounties', label: 'Browse bounties' },
  },
  {
    key: 'prs',
    label: 'Pull Requests',
    emptyMsg: 'No pinned pull requests.',
    emptyHint: 'Star PRs from their detail pages to track them here.',
  },
];

/* ------------------------------------------------------------------ */
/*  Compact table rows for non-miner categories                        */
/* ------------------------------------------------------------------ */

const RepoRows: React.FC<{ ids: string[]; repos?: Repository[] }> = ({
  ids,
  repos,
}) => {
  const watchedRepos = useMemo(() => {
    const map = new Map((repos ?? []).map((r) => [r.fullName, r]));
    return ids.map((id) => map.get(id)).filter(Boolean) as Repository[];
  }, [ids, repos]);

  if (watchedRepos.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          No pinned repositories.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {watchedRepos.map((repo) => (
        <TableRow
          key={repo.fullName}
          hover
          sx={{ cursor: 'pointer' }}
          component={RouterLink}
          to={`/repositories/details?name=${encodeURIComponent(repo.fullName)}`}
          style={{ textDecoration: 'none' }}
        >
          <TableCell sx={{ fontWeight: 600 }}>{repo.fullName}</TableCell>
          <TableCell>
            <Chip label="Tracked" size="small" sx={{ fontSize: '0.7rem' }} />
          </TableCell>
          <TableCell align="right">
            <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

const BountyRows: React.FC<{ ids: string[]; issues?: IssueBounty[] }> = ({
  ids,
  issues,
}) => {
  const watchedBounties = useMemo(() => {
    const idSet = new Set(ids);
    return (issues ?? []).filter((b) => idSet.has(String(b.id)));
  }, [ids, issues]);

  if (watchedBounties.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          No pinned bounties.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {watchedBounties.map((b) => (
        <TableRow
          key={b.id}
          hover
          sx={{ cursor: 'pointer' }}
          component={RouterLink}
          to={`/bounties/details?id=${b.id}`}
          style={{ textDecoration: 'none' }}
        >
          <TableCell sx={{ fontWeight: 600 }}>
            {b.repositoryFullName} #{b.issueNumber}
          </TableCell>
          <TableCell>
            <Chip
              label={b.status}
              size="small"
              color={
                b.status === 'active'
                  ? 'success'
                  : b.status === 'completed'
                    ? 'info'
                    : 'default'
              }
              sx={{ fontSize: '0.7rem' }}
            />
          </TableCell>
          <TableCell align="right">
            <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

const PRRows: React.FC<{ ids: string[] }> = ({ ids }) => {
  if (ids.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          No pinned pull requests.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {ids.map((key) => {
        // PR keys stored as "repo#number"
        const [repo, num] = key.split('#');
        return (
          <TableRow
            key={key}
            hover
            sx={{ cursor: 'pointer' }}
            component={RouterLink}
            to={`/prs/details?repo=${encodeURIComponent(repo ?? '')}&number=${num ?? ''}`}
            style={{ textDecoration: 'none' }}
          >
            <TableCell sx={{ fontWeight: 600 }}>
              {repo} #{num}
            </TableCell>
            <TableCell />
            <TableCell align="right">
              <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

const WatchlistPage: React.FC = () => {
  const { items, count, clear } = useWatchlist();
  const [tabIdx, setTabIdx] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const currentTab = TABS[tabIdx];

  // --- Miner data ---
  const allMinerStatsQuery = useAllMiners();
  const allMinersStats = allMinerStatsQuery?.data;
  const isLoadingMinerStats = allMinerStatsQuery?.isLoading;
  const allMinerStats = useMemo(
    () => mapAllMinersToStats(allMinersStats ?? []),
    [allMinersStats],
  );
  const minerStats = useMemo(
    () => allMinerStats.filter((m) => new Set(items.miners).has(m.githubId)),
    [allMinerStats, items.miners],
  );

  // --- Repos data ---
  const { data: reposData } = useReposAndWeights();

  // --- Bounties data ---
  const { data: issuesData } = useIssues();

  const handleClear = () => {
    clear(currentTab.key);
    setConfirmOpen(false);
  };

  const categoryCount = items[currentTab.key].length;
  const isEmpty = categoryCount === 0;

  return (
    <Page title="Watchlist">
      <SEO
        title="Watchlist"
        description="Your pinned items on Gittensor. Track miners, repositories, bounties, and pull requests."
      />
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, sm: 1.5 },
          py: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          px: { xs: 2, sm: 2, md: 2.5, lg: 3 },
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Typography
            sx={{
              fontSize: '0.8rem',
              color: (t) => alpha(t.palette.text.primary, 0.5),
              lineHeight: 1.6,
            }}
          >
            Your watchlist — {count}{' '}
            {count === 1 ? 'item pinned' : 'items pinned'} across all
            categories. Stored locally in this browser.
          </Typography>
          {count > 0 && (
            <Button
              size="small"
              onClick={() => setConfirmOpen(true)}
              sx={{
                fontSize: '0.75rem',
                textTransform: 'none',
                color: 'text.secondary',
              }}
            >
              Clear watchlist
            </Button>
          )}
        </Stack>

        {/* Tabs */}
        <Tabs
          value={tabIdx}
          onChange={(_, v) => setTabIdx(v)}
          aria-label="watchlist category tabs"
          sx={(theme) => ({
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.85rem',
              minHeight: 40,
              '&.Mui-selected': { fontWeight: 600 },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.primary.main,
              height: 2,
            },
          })}
        >
          {TABS.map((t) => (
            <Tab
              key={t.key}
              label={`${t.label}${items[t.key].length > 0 ? ` (${items[t.key].length})` : ''}`}
            />
          ))}
        </Tabs>

        {/* Content */}
        {currentTab.key === 'miners' ? (
          isEmpty ? (
            <EmptyState tab={currentTab} />
          ) : (
            <Box sx={{ width: '100%' }}>
              <TopMinersTable
                miners={minerStats}
                isLoading={isLoadingMinerStats}
                getHref={(m) =>
                  `/miners/details?githubId=${encodeURIComponent(m.githubId)}`
                }
                linkState={{ backLabel: 'Back to Watchlist' }}
              />
            </Box>
          )
        ) : isEmpty ? (
          <EmptyState tab={currentTab} />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableBody>
                {currentTab.key === 'repos' && (
                  <RepoRows ids={items.repos} repos={reposData} />
                )}
                {currentTab.key === 'bounties' && (
                  <BountyRows ids={items.bounties} issues={issuesData} />
                )}
                {currentTab.key === 'prs' && <PRRows ids={items.prs} />}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>
          Clear all {categoryCount} pinned {currentTab.label.toLowerCase()}?
        </DialogTitle>
        <DialogActions>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClear}
            color="error"
            sx={{ textTransform: 'none' }}
          >
            Clear {currentTab.label.toLowerCase()}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
};

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

const EmptyState: React.FC<{ tab: TabDef }> = ({ tab }) => (
  <Box
    sx={{
      py: 8,
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      alignItems: 'center',
      color: 'text.secondary',
    }}
  >
    <Typography sx={{ fontSize: '0.95rem' }}>{tab.emptyMsg}</Typography>
    <Typography
      sx={{
        fontSize: '0.8rem',
        maxWidth: 480,
        color: (t) => alpha(t.palette.text.primary, 0.5),
      }}
    >
      {tab.emptyHint}
    </Typography>
    {tab.emptyAction && (
      <Button
        component={RouterLink}
        to={tab.emptyAction.to}
        variant="outlined"
        size="small"
        sx={{ textTransform: 'none', mt: 1 }}
      >
        {tab.emptyAction.label}
      </Button>
    )}
  </Box>
);

export default WatchlistPage;
