import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
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

const getIssueAuthor = (issue: RepositoryIssue) =>
  issue.authorLogin ?? issue.author ?? null;

const isIssueOpen = (issue: RepositoryIssue) => !issue.closedAt;

const githubIssueUrl = (issue: RepositoryIssue) =>
  issue.url ??
  `https://github.com/${issue.repositoryFullName}/issues/${issue.number}`;

const githubSearchOpenByAuthor = (login: string) =>
  `https://github.com/search?q=${encodeURIComponent(`is:issue is:open author:${login}`)}&type=issues`;

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
  const { issuesByRepo, isLoading, isError, repoFetchLimit } =
    useMinerRepositoriesOpenIssues(scanRepos, !isLoadingPrs);

  const login = githubProfile?.login ?? '';

  const { mineByRepo, otherByRepo, mineTotal, otherTotal } = useMemo(() => {
    const mine = new Map<string, RepositoryIssue[]>();
    const other = new Map<string, RepositoryIssue[]>();
    let m = 0;
    let o = 0;
    const loginLower = login.toLowerCase();

    scanRepos.forEach((repo) => {
      const list = issuesByRepo.get(repo) ?? [];
      list.forEach((issue) => {
        if (!isIssueOpen(issue)) return;
        const author = getIssueAuthor(issue);
        const isMine =
          !!author && !!loginLower && author.toLowerCase() === loginLower;
        const target = isMine ? mine : other;
        const arr = target.get(repo) ?? [];
        arr.push(issue);
        target.set(repo, arr);
        if (isMine) m += 1;
        else o += 1;
      });
    });

    return {
      mineByRepo: mine,
      otherByRepo: other,
      mineTotal: m,
      otherTotal: o,
    };
  }, [issuesByRepo, login, scanRepos]);

  const [showOtherTracked, setShowOtherTracked] = useState(true);

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
                <LinkBox
                  href={`/miners/repository?name=${encodeURIComponent(repo)}`}
                  sx={{
                    color: 'primary.main',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    minWidth: 0,
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {repo}
                </LinkBox>
                <Chip
                  size="small"
                  label={`${issues.length} open`}
                  sx={{
                    borderColor: STATUS_COLORS.open,
                    color: STATUS_COLORS.open,
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
                      <OpenInNewIcon
                        sx={{
                          fontSize: '1rem',
                          color: (t) =>
                            alpha(t.palette.common.white, TEXT_OPACITY.muted),
                          flexShrink: 0,
                        }}
                      />
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
                          sx={{ color: STATUS_COLORS.info }}
                        >
                          Linked PR #{issue.prNumber}
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
      <Alert severity="info" sx={{ borderRadius: 2 }}>
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
              endIcon={<OpenInNewIcon fontSize="small" />}
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

      {isError ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Some issue lists could not be loaded. Try again later.
        </Alert>
      ) : null}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={36} />
        </Box>
      ) : (
        <>
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
              Your open reports
              {mineTotal > 0 ? (
                <Typography
                  component="span"
                  sx={{ ml: 1, color: 'text.secondary', fontSize: '0.85rem' }}
                >
                  ({mineTotal})
                </Typography>
              ) : null}
            </Typography>
            {mineTotal === 0 ? (
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                No open issues in this index matched your GitHub login as
                author. That usually means the API response does not yet include
                author fields, or you have no open reports in these
                repositories. Use the GitHub button above for a definitive list.
              </Typography>
            ) : null}
            {renderRepoAccordionMap(
              mineByRepo,
              'No matching open issues in the scanned repositories.',
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
              <Button
                size="small"
                onClick={() => setShowOtherTracked((v) => !v)}
                disabled={otherTotal === 0}
              >
                {showOtherTracked ? 'Hide' : 'Show'}
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Other people’s open issues in the same repositories (still part of
              the discovery index). Useful for triage and collaboration.
            </Typography>
            {showOtherTracked
              ? renderRepoAccordionMap(
                  otherByRepo,
                  'No other open issues in the scanned repositories.',
                )
              : null}
          </Card>
        </>
      )}
    </Stack>
  );
};

export default MinerOpenDiscoveryIssuesByRepo;
