import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useMinerGithubData, useMinerPRs } from '../../api';
import { LinkBox } from '../common/linkBehavior';
import { STATUS_COLORS, TEXT_OPACITY } from '../../theme';
import {
  selectMinerIssueScanRepos,
  useMinerRepositoriesOpenIssues,
} from '../../hooks/useMinerRepositoriesOpenIssues';
import { type RepositoryIssue } from '../../api/models/Miner';

const isIssueOpen = (issue: RepositoryIssue) => !issue.closedAt;

const githubIssueUrl = (issue: RepositoryIssue) =>
  issue.url ??
  `https://github.com/${issue.repositoryFullName}/issues/${issue.number}`;

const githubSearchOpenByAuthor = (login: string) =>
  `https://github.com/search?q=${encodeURIComponent(`is:issue is:open author:${login}`)}&type=issues`;

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
): Promise<number | null> => {
  try {
    const { data } = await axios.get<GithubIssueTimelineEvent[]>(
      `https://api.github.com/repos/${repositoryFullName}/issues/${issueNumber}/timeline`,
      {
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

const fetchGithubOpenIssuesByAuthor = async (
  login: string,
): Promise<RepositoryIssue[]> => {
  const { data } = await axios.get<GithubSearchIssuesResponse>(
    'https://api.github.com/search/issues',
    {
      params: {
        q: `is:issue is:open author:${login}`,
        per_page: 100,
      },
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
      );
      return {
        ...issue,
        prNumber,
      } satisfies RepositoryIssue;
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
  } = useQuery({
    queryKey: ['githubAuthorOpenIssues', login],
    queryFn: () => fetchGithubOpenIssuesByAuthor(login),
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

  const { mineByRepo, otherByRepo, mineTotal, otherTotal } = useMemo(() => {
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
      const list = [...listByNumber.values()];
      list.forEach((issue) => {
        if (!isIssueOpen(issue)) return;
        const key = `${repo}#${issue.number}`;
        indexedIssueByKey.set(key, issue);
        addToMap(other, repo, issue);
      });
    });

    // Canonical "mine" source: GitHub open issues authored by this miner.
    // We still overlay indexed records when available to preserve enriched fields
    // such as linked PR numbers in the row metadata.
    githubAuthoredIssues.forEach((issue) => {
      if (!isIssueOpen(issue)) return;
      const repo = issue.repositoryFullName;
      if (!repo) return;
      const key = `${repo}#${issue.number}`;
      if (mineKeys.has(key)) return;
      mineKeys.add(key);
      const indexedIssue = indexedIssueByKey.get(key);
      addToMap(mine, repo, indexedIssue ?? issue);
    });

    // Remove authored issues from "other" buckets in the same repos.
    const filteredOtherRaw = new Map<string, RepositoryIssue[]>();
    other.forEach((issues, repo) => {
      const filtered = issues.filter(
        (issue) => !mineKeys.has(`${repo}#${issue.number}`),
      );
      if (filtered.length) filteredOtherRaw.set(repo, filtered);
    });

    const mineRepos = new Set(mine.keys());
    const filteredOther = new Map<string, RepositoryIssue[]>();
    filteredOtherRaw.forEach((issues, repo) => {
      if (mineRepos.has(repo)) filteredOther.set(repo, issues);
    });

    const m = [...mine.values()].reduce((sum, items) => sum + items.length, 0);
    const o = [...filteredOther.values()].reduce(
      (sum, items) => sum + items.length,
      0,
    );

    return {
      mineByRepo: mine,
      otherByRepo: filteredOther,
      mineTotal: m,
      otherTotal: o,
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

  const renderRepoAccordionMap = (
    map: Map<string, RepositoryIssue[]>,
    emptyHint: string,
  ) => {
    const entries = [...map.entries()].filter(([, issues]) => issues.length);
    if (!entries.length) {
      return (
        <Typography color="text.secondary" sx={{ py: 1 }}>
          {emptyHint}
        </Typography>
      );
    }

    return (
      <Stack spacing={1}>
        {entries.map(([repo, issues]) => (
          <Accordion
            key={repo}
            disableGutters
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'border.light',
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.background.paper, 0.35),
              '&:before': { display: 'none' },
              overflow: 'hidden',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: 1,
                  pr: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    minWidth: 0,
                  }}
                >
                  <Avatar
                    src={`https://avatars.githubusercontent.com/${repo.split('/')[0]}`}
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  />
                  <LinkBox
                    href={`/miners/repository?name=${encodeURIComponent(repo)}`}
                    sx={{
                      color: (t) => alpha(t.palette.common.white, 0.9),
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        textDecoration: 'underline',
                        color: 'text.primary',
                      },
                    }}
                  >
                    {repo}
                  </LinkBox>
                </Box>
                <Chip
                  size="small"
                  label={`${issues.length} open`}
                  sx={{
                    borderColor: alpha(STATUS_COLORS.open, 0.4),
                    color: STATUS_COLORS.open,
                    bgcolor: alpha(STATUS_COLORS.open, 0.12),
                    flexShrink: 0,
                  }}
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
              <Stack spacing={1.25}>
                {issues.map((issue) => (
                  <Box
                    key={`${repo}-${issue.number}`}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                      py: 1,
                      borderTop: '1px solid',
                      borderColor: 'border.light',
                      '&:first-of-type': {
                        borderTop: 'none',
                        pt: 0,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 1,
                      }}
                    >
                      <Link
                        href={githubIssueUrl(issue)}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{
                          color: 'text.primary',
                          fontWeight: 500,
                          fontSize: '0.85rem',
                          minWidth: 0,
                        }}
                      >
                        <Typography component="span" sx={{ fontWeight: 600 }}>
                          #{issue.number}
                        </Typography>{' '}
                        <Typography component="span" sx={{ fontWeight: 400 }}>
                          {issue.title}
                        </Typography>
                      </Link>
                      <Link
                        href={githubIssueUrl(issue)}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="none"
                        sx={{ display: 'inline-flex', flexShrink: 0 }}
                        aria-label={`Open issue #${issue.number} on GitHub`}
                      >
                        <OpenInNewIcon
                          sx={{
                            fontSize: '1rem',
                            color: (t) =>
                              alpha(t.palette.common.white, TEXT_OPACITY.faint),
                          }}
                        />
                      </Link>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        alignItems: 'center',
                      }}
                    >
                      {issue.prNumber != null ? (
                        <Link
                          href={`https://github.com/${issue.repositoryFullName}/pull/${issue.prNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="caption"
                          sx={{ color: 'primary.main' }}
                        >
                          PR #{issue.prNumber}
                        </Link>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No linked PR yet
                        </Typography>
                      )}
                      {issue.createdAt ? (
                        <Typography variant="caption" color="text.secondary">
                          Opened{' '}
                          {new Date(issue.createdAt).toLocaleDateString()}
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    );
  };

  return (
    <Stack spacing={2}>
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
        Open issues are loaded from Gittensor’s per-repository issue index for
        up to {repoFetchLimit} repositories where you have scored PRs (most
        recent first). When the API includes an issue author, issues you opened
        are grouped separately. Use GitHub search for the canonical list of
        everything you have opened publicly.
        {login ? (
          <Box sx={{ mt: 1.5 }}>
            <Button
              component="a"
              href={githubSearchOpenByAuthor(login)}
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

      {isError || isAuthoredRepoIssuesError ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Some issue lists could not be loaded. Try again later.
        </Alert>
      ) : null}

      {isLoading ||
      isLoadingAuthoredIssues ||
      isFetchingAuthoredIssues ||
      isLoadingAuthoredRepoIssues ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={36} />
        </Box>
      ) : (
        <>
          {isAuthorFallbackError ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Could not load all authored open issues from GitHub right now.
              Showing indexed results only.
            </Alert>
          ) : null}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'border.light',
              p: 2.5,
            }}
          >
            <Typography variant="h6" sx={{ fontSize: '1.05rem', mb: 1 }}>
              Your open discovery issues
              {mineTotal > 0 ? (
                <Typography
                  component="span"
                  sx={{ ml: 1, color: 'text.secondary', fontSize: '0.85rem' }}
                >
                  ({mineTotal})
                </Typography>
              ) : null}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Open issues authored by you in the scanned repositories (discovery
              index plus GitHub fallback). Use this list to track your own
              active reports.
            </Typography>
            {mineTotal === 0 ? (
              <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                No open issues in this index matched your GitHub login as
                author. That usually means the API response does not yet include
                author fields, or you have no open reports in these
                repositories. Use the GitHub button above for a definitive list.
              </Typography>
            ) : (
              renderRepoAccordionMap(
                mineByRepo,
                'No matching open issues in the scanned repositories.',
              )
            )}
          </Card>

          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'border.light',
              p: 2.5,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                flexWrap: 'wrap',
                mb: 1,
              }}
            >
              <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>
                Other open discovery issues
                {otherTotal > 0 ? (
                  <Typography
                    component="span"
                    sx={{ ml: 1, color: 'text.secondary', fontSize: '0.85rem' }}
                  >
                    ({otherTotal})
                  </Typography>
                ) : null}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Other people’s open issues in the same repositories (still part of
              the discovery index). Useful for triage and collaboration.
            </Typography>
            {renderRepoAccordionMap(
              otherByRepo,
              'No other open issues in the scanned repositories.',
            )}
          </Card>
        </>
      )}
    </Stack>
  );
};

export default MinerOpenDiscoveryIssuesByRepo;
