import React, { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Typography,
  alpha,
} from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { githubFetch, useMinerGithubData, useMinerPRs } from '../../api';
import {
  selectMinerIssueScanRepos,
  useMinerRepositoriesOpenIssues,
} from '../../hooks/useMinerRepositoriesOpenIssues';
import { type RepositoryIssue } from '../../api/models/Miner';
import { MinerIssueRepoSection } from './MinerIssueRepoSection';

const githubSearchIssuesByAuthor = (login: string) =>
  `https://github.com/search?q=${encodeURIComponent(`is:issue author:${login}`)}&type=issues`;

interface GithubSearchIssueItem {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  created_at: string | null;
  closed_at: string | null;
  user?: { login?: string | null } | null;
  pull_request?: unknown;
}

interface GithubSearchIssuesResponse {
  items: GithubSearchIssueItem[];
}

const parsePullNumberFromUrl = (url: string): number | null => {
  const match = url.match(/\/pull\/(\d+)(?:$|[/?#])/);
  if (!match?.[1]) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
};

const parseRepoFromRepositoryUrl = (repositoryUrl: string): string | null => {
  const marker = '/repos/';
  const idx = repositoryUrl.indexOf(marker);
  if (idx < 0) return null;
  const repo = repositoryUrl.slice(idx + marker.length);
  return repo || null;
};

interface GithubIssueTimelineEvent {
  event?: string;
  source?: {
    issue?: {
      pull_request?: {
        html_url?: string;
      } | null;
    } | null;
  } | null;
}

const fetchLinkedPrNumberForIssue = async (
  repositoryFullName: string,
  issueNumber: number,
  signal: AbortSignal,
): Promise<number | null> => {
  try {
    const data = await githubFetch<GithubIssueTimelineEvent[]>(
      `https://api.github.com/repos/${repositoryFullName}/issues/${issueNumber}/timeline`,
      {
        signal,
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    for (const event of data ?? []) {
      const prUrl = event.source?.issue?.pull_request?.html_url;
      if (!prUrl) continue;
      const prNumber = parsePullNumberFromUrl(prUrl);
      if (prNumber != null) return prNumber;
    }
  } catch {
    // Ignore timeline fetch failures and fall back to "No linked PR yet".
  }
  return null;
};

const fetchGithubIssuesByAuthor = async (
  login: string,
  signal: AbortSignal,
): Promise<RepositoryIssue[]> => {
  const data = await githubFetch<GithubSearchIssuesResponse>(
    'https://api.github.com/search/issues',
    {
      signal,
      params: { q: `is:issue author:${login}`, per_page: 100 },
    },
  );

  const mapped = (data.items || [])
    .filter((item) => !item.pull_request)
    .map((item) => {
      const repositoryFullName = parseRepoFromRepositoryUrl(
        item.repository_url,
      );
      return {
        number: item.number,
        repositoryFullName: repositoryFullName ?? '',
        prNumber: null,
        title: item.title,
        createdAt: item.created_at ?? null,
        closedAt: item.closed_at ?? null,
        state: item.closed_at ? 'closed' : 'open',
        author: item.user?.login ?? login,
        authorLogin: item.user?.login ?? login,
        url: item.html_url,
      } satisfies RepositoryIssue;
    })
    .filter((issue) => !!issue.repositoryFullName);

  const enriched = await Promise.all(
    mapped.map(async (issue) => {
      const prNumber = await fetchLinkedPrNumberForIssue(
        issue.repositoryFullName,
        issue.number,
        signal,
      );
      return { ...issue, prNumber } satisfies RepositoryIssue;
    }),
  );
  return enriched;
};

interface MinerOpenDiscoveryIssuesByRepoProps {
  githubId: string;
}

const MinerOpenDiscoveryIssuesByRepo: React.FC<
  MinerOpenDiscoveryIssuesByRepoProps
> = ({ githubId }) => {
  const { data: prs, isLoading: isLoadingPrs } = useMinerPRs(githubId);
  const { data: githubProfile, isLoading: isLoadingGithub } =
    useMinerGithubData(githubId);

  const scanRepos = useMemo(() => selectMinerIssueScanRepos(prs), [prs]);
  const login = githubProfile?.login ?? '';

  const {
    data: githubAuthoredIssues = [],
    isLoading: isLoadingAuthoredIssues,
    isFetching: isFetchingAuthoredIssues,
    isError: isAuthorFallbackError,
  } = useQuery<RepositoryIssue[], Error>({
    queryKey: ['githubAuthorIssues', login],
    queryFn: ({ signal }) => fetchGithubIssuesByAuthor(login, signal),
    enabled: !!login,
    staleTime: 60_000,
    retry: 1,
  });

  const authoredRepos = useMemo(
    () =>
      [
        ...new Set(githubAuthoredIssues.map((i) => i.repositoryFullName)),
      ].filter(Boolean),
    [githubAuthoredIssues],
  );

  const { issuesByRepo, isLoading, isError, repoFetchLimit } =
    useMinerRepositoriesOpenIssues(scanRepos, !isLoadingPrs);

  const {
    issuesByRepo: authoredReposIssuesByRepo,
    isLoading: isLoadingAuthoredRepoIssues,
    isError: isAuthoredRepoIssuesError,
  } = useMinerRepositoriesOpenIssues(
    authoredRepos,
    !isLoadingPrs && !isLoadingAuthoredIssues && authoredRepos.length > 0,
  );

  const reposForGrouping = useMemo(
    () => [...new Set([...scanRepos, ...authoredRepos])],
    [authoredRepos, scanRepos],
  );

  const { mineIssues, otherIssues } = useMemo(() => {
    const mine = new Map<string, RepositoryIssue[]>();
    const other = new Map<string, RepositoryIssue[]>();
    const mineKeys = new Set<string>();
    const indexedIssueByKey = new Map<string, RepositoryIssue>();

    const addToMap = (
      target: Map<string, RepositoryIssue[]>,
      repo: string,
      issue: RepositoryIssue,
    ) => {
      const arr = target.get(repo) ?? [];
      arr.push(issue);
      target.set(repo, arr);
    };

    reposForGrouping.forEach((repo) => {
      const fromScan = issuesByRepo.get(repo) ?? [];
      const fromAuthoredRepoFetch = authoredReposIssuesByRepo.get(repo) ?? [];
      const listByNumber = new Map<number, RepositoryIssue>();
      [...fromScan, ...fromAuthoredRepoFetch].forEach((issue) => {
        listByNumber.set(issue.number, issue);
      });
      listByNumber.forEach((issue) => {
        const key = `${repo}#${issue.number}`;
        indexedIssueByKey.set(key, issue);
        addToMap(other, repo, issue);
      });
    });

    githubAuthoredIssues.forEach((issue) => {
      const repo = issue.repositoryFullName;
      if (!repo) return;
      const key = `${repo}#${issue.number}`;
      if (mineKeys.has(key)) return;
      mineKeys.add(key);
      addToMap(mine, repo, indexedIssueByKey.get(key) ?? issue);
    });

    const filteredOther = new Map<string, RepositoryIssue[]>();
    const mineRepos = new Set(mine.keys());
    other.forEach((issues, repo) => {
      if (!mineRepos.has(repo)) return;
      const filtered = issues.filter(
        (issue) => !mineKeys.has(`${repo}#${issue.number}`),
      );
      if (filtered.length) filteredOther.set(repo, filtered);
    });

    return {
      mineIssues: [...mine.values()].flat(),
      otherIssues: [...filteredOther.values()].flat(),
    };
  }, [
    authoredReposIssuesByRepo,
    githubAuthoredIssues,
    issuesByRepo,
    reposForGrouping,
  ]);

  if (isLoadingPrs || isLoadingGithub) {
    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          p: 4,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={36} />
      </Card>
    );
  }

  if (!prs?.length) {
    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          p: 3,
        }}
      >
        <Typography color="text.secondary">
          No scored pull requests yet. Open issues are listed for repositories
          where you already have PR activity, so this view will populate after
          your first contributions are indexed.
        </Typography>
      </Card>
    );
  }

  if (!scanRepos.length) {
    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'border.light',
          p: 3,
        }}
      >
        <Typography color="text.secondary">
          No repositories found to scan for issues.
        </Typography>
      </Card>
    );
  }

  const isDataLoading =
    isLoading ||
    isLoadingAuthoredIssues ||
    isFetchingAuthoredIssues ||
    isLoadingAuthoredRepoIssues;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert
        severity="info"
        sx={{
          borderRadius: 2,
          bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
          border: '1px solid',
          borderColor: (t) => alpha(t.palette.warning.main, 0.22),
          '& .MuiAlert-icon': {
            color: (t) => alpha(t.palette.warning.light, 0.95),
          },
        }}
      >
        Open issues are loaded from Gittensor's per-repository issue index for
        up to {repoFetchLimit} repositories where you have scored PRs (most
        recent first). When the API includes an issue author, issues you opened
        are grouped separately. Use GitHub search for the canonical list of
        everything you have opened publicly.
        {login ? (
          <Box sx={{ mt: 1.5 }}>
            <Button
              component="a"
              href={githubSearchIssuesByAuthor(login)}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="outlined"
              color="inherit"
              endIcon={<OpenInNewIcon fontSize="small" />}
              sx={{
                borderColor: (t) => alpha(t.palette.warning.main, 0.45),
                color: (t) => alpha(t.palette.warning.light, 0.95),
                '&:hover': {
                  borderColor: (t) => alpha(t.palette.warning.main, 0.65),
                  bgcolor: (t) => alpha(t.palette.warning.main, 0.14),
                },
              }}
            >
              View all open issues by @{login} on GitHub
            </Button>
          </Box>
        ) : null}
      </Alert>

      {prs.length > repoFetchLimit ? (
        <Typography variant="caption" color="text.secondary">
          You have PRs in more than {repoFetchLimit} repositories; only the most
          active {repoFetchLimit} are scanned here to limit load.
        </Typography>
      ) : null}

      {(isError || isAuthoredRepoIssuesError) && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Some issue lists could not be loaded. Try again later.
        </Alert>
      )}
      {isAuthorFallbackError && !isDataLoading && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Could not load all authored open issues from GitHub right now. Showing
          indexed results only.
        </Alert>
      )}

      <MinerIssueRepoSection
        layout="inline"
        toolbarTitle="Your open discovery issues"
        toolbarSubtitle="Open issues authored by you in the scanned repositories (discovery index plus GitHub fallback). Use this list to track your own active reports."
        stickyHeader
        issues={mineIssues}
        isLoading={isDataLoading}
        getRowKey={(issue) => `${issue.repositoryFullName}-${issue.number}`}
        emptyWhenNoIssues={
          <Typography color="text.secondary">
            No open issues in this index matched your GitHub login as author.
            That usually means the API response does not yet include author
            fields, or you have no open reports in these repositories. Use the
            GitHub button above for a definitive list.
          </Typography>
        }
        emptyWhenFiltered={
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontSize: '0.9rem',
              textAlign: 'center',
            }}
          >
            No matching open issues in the scanned repositories.
          </Typography>
        }
      />

      <MinerIssueRepoSection
        layout="collapsible"
        summaryTitle="Other open discovery issues"
        toolbarSubtitle="Other people's open issues in the same repositories (still part of the discovery index). Useful for triage and collaboration."
        issues={otherIssues}
        isLoading={isDataLoading}
        getRowKey={(issue) =>
          `other-${issue.repositoryFullName}-${issue.number}`
        }
        emptyWhenNoIssues={
          <Typography color="text.secondary">
            No other open issues in the scanned repositories.
          </Typography>
        }
        emptyWhenFiltered={
          <Typography
            sx={{
              color: (t) => alpha(t.palette.text.primary, 0.5),
              fontSize: '0.9rem',
              textAlign: 'center',
            }}
          >
            No issues match the selected filters.
          </Typography>
        }
      />
    </Box>
  );
};

export default MinerOpenDiscoveryIssuesByRepo;
