import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Link,
  Breadcrumbs,
  Avatar,
  useTheme,
} from '@mui/material';
import { STATUS_COLORS } from '../../theme';
import { formatDistanceToNow } from 'date-fns';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CodeViewer from './CodeViewer';
import { buildFileTree, type FileNode } from './FileExplorer';
import { githubErrorMessage, githubFetch, useGithubQuery } from '../../api';

interface RepositoryCodeBrowserProps {
  repositoryFullName: string;
}

interface CommitInfo {
  message: string;
  /** GitHub REST `User.login` — same handle as `https://github.com/{login}`. */
  committerLogin: string;
  avatarUrl: string;
  date: string;
  sha: string;
}

/** GitHub user on a commit (`login` matches the profile URL path). */
type GhCommitUser = {
  id?: number;
  login?: string;
  avatar_url?: string;
};

interface GhCommitListItem {
  sha: string;
  commit: {
    message: string;
    committer?: { name?: string; email?: string; date?: string };
    author?: { name?: string; date?: string };
  };
  author?: GhCommitUser | null;
  committer?: GhCommitUser | null;
}

interface GhRepoData {
  default_branch?: string;
}

interface GhTreeResponse {
  tree?: { path: string; type: 'blob' | 'tree' }[];
}

/**
 * Commits done via the GitHub UI use @web-flow as committer; the human is on `author`.
 * Showing `web-flow` does not match github.com, which attributes the real user.
 */
const MECHANICAL_COMMITTER_LOGINS = new Set(['web-flow']);

function isMechanicalCommitter(login: string | undefined): boolean {
  if (!login) return false;
  return MECHANICAL_COMMITTER_LOGINS.has(login.toLowerCase());
}

async function resolveCommitPayload(
  repositoryFullName: string,
  listCommit: GhCommitListItem,
  signal: AbortSignal,
): Promise<GhCommitListItem> {
  if (
    listCommit.committer?.id ||
    listCommit.committer?.login ||
    !listCommit.sha
  ) {
    return listCommit;
  }
  try {
    return await githubFetch<GhCommitListItem>(
      `https://api.github.com/repos/${repositoryFullName}/commits/${listCommit.sha}`,
      { signal },
    );
  } catch {
    return listCommit;
  }
}

function resolveGithubCommitAttribution(
  ghCommitter: GhCommitUser | null | undefined,
  ghAuthor: GhCommitUser | null | undefined,
  commit: {
    committer?: { name?: string; email?: string; date?: string };
    author?: { name?: string; date?: string };
  },
): { login: string; avatarUrl: string } {
  if (isMechanicalCommitter(ghCommitter?.login) && ghAuthor?.login) {
    return {
      login: ghAuthor.login,
      avatarUrl: ghAuthor.avatar_url || '',
    };
  }

  if (ghCommitter?.login) {
    return {
      login: ghCommitter.login,
      avatarUrl: ghCommitter.avatar_url || '',
    };
  }

  if (ghAuthor?.login) {
    return {
      login: ghAuthor.login,
      avatarUrl: ghAuthor.avatar_url || '',
    };
  }

  if (ghCommitter?.id != null) {
    return {
      login: String(ghCommitter.id),
      avatarUrl: ghCommitter.avatar_url || '',
    };
  }

  return {
    login: commit.committer?.name ?? commit.author?.name ?? '',
    avatarUrl: '',
  };
}

const RepositoryCodeBrowser: React.FC<RepositoryCodeBrowserProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  const repoQuery = useGithubQuery<GhRepoData>(
    `https://api.github.com/repos/${repositoryFullName}`,
    { enabled: !!repositoryFullName },
  );
  const defaultBranch = repoQuery.data?.default_branch || 'main';

  const treeQuery = useGithubQuery<GhTreeResponse>(
    `https://api.github.com/repos/${repositoryFullName}/git/trees/${defaultBranch}`,
    {
      params: { recursive: 1 },
      enabled: !!repoQuery.data,
    },
  );

  const tree = useMemo<FileNode[]>(
    () => (treeQuery.data?.tree ? buildFileTree(treeQuery.data.tree) : []),
    [treeQuery.data],
  );

  const commitQuery = useGithubQuery<CommitInfo | null>(null, {
    queryKey: ['pathCommit', repositoryFullName, defaultBranch, currentPath],
    enabled: !!repoQuery.data,
    queryFn: async ({ signal }) => {
      const list = await githubFetch<GhCommitListItem[]>(
        `https://api.github.com/repos/${repositoryFullName}/commits`,
        {
          signal,
          params: {
            sha: defaultBranch,
            per_page: 1,
            ...(currentPath ? { path: currentPath } : {}),
          },
        },
      );
      if (!list || list.length === 0) return null;
      const resolved = await resolveCommitPayload(
        repositoryFullName,
        list[0],
        signal,
      );
      const ghCommitter = resolved.committer;
      const ghAuthor = resolved.author;
      const { login, avatarUrl } = resolveGithubCommitAttribution(
        ghCommitter,
        ghAuthor,
        resolved.commit,
      );
      const date =
        isMechanicalCommitter(ghCommitter?.login) && ghAuthor?.login
          ? resolved.commit.author?.date ||
            resolved.commit.committer?.date ||
            ''
          : resolved.commit.committer?.date ||
            resolved.commit.author?.date ||
            '';
      return {
        message: resolved.commit.message,
        committerLogin: login,
        avatarUrl,
        date,
        sha: resolved.sha.substring(0, 7),
      };
    },
  });

  const currentNode = useMemo(() => {
    if (!currentPath)
      return { children: tree, type: 'tree', path: '', name: '' };

    const parts = currentPath.split('/');
    let currentNodes = tree;
    let foundNode: FileNode | undefined;

    for (let i = 0; i < parts.length; i++) {
      foundNode = currentNodes.find((n) => n.name === parts[i]);
      if (!foundNode) return null;
      if (foundNode.type === 'tree' && foundNode.children) {
        currentNodes = foundNode.children;
      } else if (i < parts.length - 1) {
        return null;
      }
    }
    return foundNode;
  }, [tree, currentPath]);

  const handleNavigate = (path: string | null) => {
    setCurrentPath(path);
  };

  const loading =
    repoQuery.isLoading || (!!repoQuery.data && treeQuery.isLoading);

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const fatalError = repoQuery.error ?? treeQuery.error;
  if (fatalError) {
    return (
      <Box sx={{ p: 4, color: 'error.main', textAlign: 'center' }}>
        {githubErrorMessage(fatalError, 'Failed to load repository structure.')}
      </Box>
    );
  }

  const breadcrumbs = currentPath ? currentPath.split('/') : [];
  const currentCommit = commitQuery.data;

  const isFile = currentNode && currentNode.type === 'blob';
  const directoryChildren =
    !isFile && currentNode ? currentNode.children || [] : [];

  const sortedChildren = [...directoryChildren].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'tree' ? -1 : 1;
  });

  return (
    <Box>
      {/* Breadcrumbs & Header */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Breadcrumbs
          aria-label="breadcrumb"
          sx={{
            '& .MuiBreadcrumbs-separator': { color: STATUS_COLORS.open },
          }}
        >
          <Link
            component="button"
            underline="hover"
            color={!currentPath ? 'text.primary' : 'inherit'}
            onClick={() => handleNavigate(null)}
            sx={{
              fontWeight: !currentPath ? 600 : 400,
              color: !currentPath
                ? theme.palette.text.tertiary
                : STATUS_COLORS.info,
              cursor: !currentPath ? 'default' : 'pointer',
              fontSize: '14px',
            }}
          >
            {repositoryFullName}
          </Link>
          {breadcrumbs.map((part, index) => {
            const path = breadcrumbs.slice(0, index + 1).join('/');
            const isLast = index === breadcrumbs.length - 1;
            return (
              <Link
                key={path}
                component="button"
                underline={isLast ? 'none' : 'hover'}
                color={isLast ? 'text.primary' : 'inherit'}
                onClick={() => !isLast && handleNavigate(path)}
                sx={{
                  fontWeight: isLast ? 600 : 400,
                  color: isLast
                    ? theme.palette.text.tertiary
                    : STATUS_COLORS.info,
                  cursor: isLast ? 'default' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {part}
              </Link>
            );
          })}
        </Breadcrumbs>
      </Box>

      {/* Latest Commit Header (GitHub style blue/gray bar) */}
      {!isFile && (
        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.border.light}`,
            borderBottom: 'none',
            borderRadius: '6px 6px 0 0',
            backgroundColor: theme.palette.surface.elevated,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            justifyContent: 'space-between',
          }}
        >
          {commitQuery.isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography sx={{ fontSize: '13px', color: STATUS_COLORS.open }}>
                Loading commit info...
              </Typography>
            </Box>
          ) : currentCommit ? (
            <>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  overflow: 'hidden',
                }}
              >
                <Avatar
                  src={currentCommit.avatarUrl}
                  sx={{ width: 20, height: 20 }}
                />
                <Typography
                  sx={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: theme.palette.text.tertiary,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentCommit.committerLogin}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '13px',
                    color: STATUS_COLORS.open,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '600px',
                  }}
                >
                  {currentCommit.message}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '13px',
                    color: STATUS_COLORS.open,
                  }}
                >
                  {currentCommit.sha}
                </Typography>
                <Typography
                  sx={{ fontSize: '13px', color: STATUS_COLORS.open }}
                >
                  {formatDistanceToNow(new Date(currentCommit.date), {
                    addSuffix: true,
                  })}
                </Typography>
              </Box>
            </>
          ) : (
            <Typography sx={{ fontSize: '13px', color: STATUS_COLORS.open }}>
              {githubErrorMessage(
                commitQuery.error,
                'Latest commit info unavailable',
              )}
            </Typography>
          )}
        </Paper>
      )}

      {isFile ? (
        <CodeViewer
          repositoryFullName={repositoryFullName}
          filePath={currentPath}
          defaultBranch={defaultBranch}
        />
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.border.light}`,
            borderRadius: isFile ? '6px' : '0 0 6px 6px',
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Table size="small">
            <TableBody>
              {currentPath && (
                <TableRow
                  hover
                  sx={{
                    '&:hover': {
                      backgroundColor: theme.palette.surface.elevated,
                    },
                    cursor: 'pointer',
                  }}
                >
                  <TableCell
                    colSpan={3}
                    onClick={() => {
                      const parent = currentPath
                        .split('/')
                        .slice(0, -1)
                        .join('/');
                      handleNavigate(parent || null);
                    }}
                    sx={{
                      color: STATUS_COLORS.info,
                      borderBottom: `1px solid ${theme.palette.border.subtle}`,
                      py: 1,
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    ..
                  </TableCell>
                </TableRow>
              )}
              {sortedChildren.map((node) => (
                <TableRow
                  key={node.path}
                  hover
                  onClick={() => handleNavigate(node.path)}
                  sx={{
                    '&:hover': {
                      backgroundColor: theme.palette.surface.elevated,
                    },
                    cursor: 'pointer',
                    transition: 'background-color 0.1s',
                  }}
                >
                  <TableCell
                    sx={{
                      borderBottom: `1px solid ${theme.palette.border.subtle}`,
                      py: 1,
                      width: '32px',
                      pl: 2,
                    }}
                  >
                    {node.type === 'tree' ? (
                      <FolderIcon
                        sx={{ color: theme.palette.status.info, fontSize: 16 }}
                      />
                    ) : (
                      <InsertDriveFileIcon
                        sx={{ color: STATUS_COLORS.open, fontSize: 16 }}
                      />
                    )}
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: `1px solid ${theme.palette.border.subtle}`,
                      py: 1,
                      color: theme.palette.text.tertiary,
                      fontSize: '14px',
                      fontWeight: node.type === 'tree' ? 600 : 400,
                    }}
                  >
                    {node.name}
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: `1px solid ${theme.palette.border.subtle}`,
                      py: 1,
                      color: STATUS_COLORS.open,
                      fontSize: '13px',
                      textAlign: 'right',
                    }}
                  ></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default RepositoryCodeBrowser;
