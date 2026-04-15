import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  IconButton,
  Tooltip,
} from '@mui/material';
import axios from 'axios';
import { STATUS_COLORS } from '../../theme';
import { formatDistanceToNow } from 'date-fns';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
// import TextSnippetIcon from "@mui/icons-material/TextSnippet"; // Unused
import CodeViewer from './CodeViewer';
import { buildFileTree, type FileNode } from './FileExplorer';

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

/**
 * Commits done via the GitHub UI use @web-flow as committer; the human is on `author`.
 * Showing `web-flow` does not match github.com, which attributes the real user.
 */
const MECHANICAL_COMMITTER_LOGINS = new Set(['web-flow']);

function isMechanicalCommitter(login: string | undefined): boolean {
  if (!login) return false;
  return MECHANICAL_COMMITTER_LOGINS.has(login.toLowerCase());
}

async function fetchCommitPayload(
  repositoryFullName: string,
  listCommit: {
    sha: string;
    commit: unknown;
    author?: GhCommitUser | null;
    committer?: GhCommitUser | null;
  },
) {
  let c = listCommit;
  if (!c.committer?.id && !c.committer?.login && c.sha) {
    try {
      const { data } = await axios.get(
        `https://api.github.com/repos/${repositoryFullName}/commits/${c.sha}`,
      );
      c = data;
    } catch {
      // keep list payload
    }
  }
  return c;
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
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultBranch, setDefaultBranch] = useState<string>('main');
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  // Cache commit info to avoid spamming
  const [pathCommits, setPathCommits] = useState<Record<string, CommitInfo>>(
    {},
  );
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [copyTooltipTitle, setCopyTooltipTitle] = useState('Copy');
  const copyTooltipResetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTooltipResetTimer.current) {
        window.clearTimeout(copyTooltipResetTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchRepoData = async () => {
      setLoading(true);
      try {
        const repoResponse = await axios.get(
          `https://api.github.com/repos/${repositoryFullName}`,
        );
        const branch = repoResponse.data.default_branch || 'main';
        setDefaultBranch(branch);

        const treeResponse = await axios.get(
          `https://api.github.com/repos/${repositoryFullName}/git/trees/${branch}?recursive=1`,
        );

        if (treeResponse.data.tree) {
          const nodes = buildFileTree(treeResponse.data.tree);
          setTree(nodes);
        }
      } catch (err: unknown) {
        console.error('Failed to load repository data', err);
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          setError('GitHub API rate limit exceeded. Please try again later.');
        } else {
          setError('Failed to load repository structure.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (repositoryFullName) {
      fetchRepoData();
    }
  }, [repositoryFullName]);

  // Fetch commit info for current path
  useEffect(() => {
    const fetchCommit = async () => {
      const pathKey = currentPath || 'root';
      if (pathCommits[pathKey]) return; // Already cached

      setLoadingCommit(true);
      try {
        const params = new URLSearchParams();
        params.append('sha', defaultBranch);
        params.append('per_page', '1');
        if (currentPath) {
          params.append('path', currentPath);
        }

        const response = await axios.get(
          `https://api.github.com/repos/${repositoryFullName}/commits?${params.toString()}`,
        );

        if (response.data && response.data.length > 0) {
          const listCommit = response.data[0];
          const c = await fetchCommitPayload(repositoryFullName, listCommit);
          const commit = c.commit as {
            message: string;
            committer?: { name?: string; email?: string; date?: string };
            author?: { date?: string };
          };
          const ghCommitter = c.committer as GhCommitUser | null | undefined;
          const ghAuthor = c.author as GhCommitUser | null | undefined;
          const { login: committerLogin, avatarUrl } =
            resolveGithubCommitAttribution(ghCommitter, ghAuthor, commit);
          const date =
            isMechanicalCommitter(ghCommitter?.login) && ghAuthor?.login
              ? commit.author?.date || commit.committer?.date || ''
              : commit.committer?.date || commit.author?.date || '';
          setPathCommits((prev) => ({
            ...prev,
            [pathKey]: {
              message: commit.message,
              committerLogin,
              avatarUrl,
              date,
              sha: c.sha.substring(0, 7),
            },
          }));
        }
      } catch (err) {
        console.error('Failed to fetch commit', err);
      } finally {
        setLoadingCommit(false);
      }
    };

    if (!loading && defaultBranch) {
      // Only fetch if we are not viewing a file (files handle their own commit info usually, but we can do it here too)
      fetchCommit();
    }
  }, [currentPath, repositoryFullName, defaultBranch, loading, pathCommits]);

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
        // path segment matches a file but there are more segments? Should not happen in valid tree
        return null;
      }
    }
    return foundNode;
  }, [tree, currentPath]);

  const handleNavigate = (path: string | null) => {
    setCurrentPath(path);
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, color: 'error.main', textAlign: 'center' }}>{error}</Box>
    );
  }

  const breadcrumbs = currentPath ? currentPath.split('/') : [];
  const currentCommit = pathCommits[currentPath || 'root'];

  const isFile = currentNode?.type === 'blob';
  const encodedFilePath = currentPath
    ? currentPath
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')
    : '';
  const rawFileUrl =
    isFile && encodedFilePath
      ? `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${defaultBranch}/${encodedFilePath}`
      : '';
  const fileExtension = currentPath?.split('.').pop()?.toLowerCase() ?? '';
  const isImageFile = [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'svg',
    'webp',
    'ico',
  ].includes(fileExtension);
  const directoryChildren =
    !isFile && currentNode ? currentNode.children || [] : [];

  // Sort children: Folders first, then files
  const sortedChildren = [...directoryChildren].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'tree' ? -1 : 1;
  });

  const showCopiedTooltip = () => {
    setCopyTooltipTitle('Copied');
    if (copyTooltipResetTimer.current) {
      window.clearTimeout(copyTooltipResetTimer.current);
    }
    copyTooltipResetTimer.current = window.setTimeout(() => {
      setCopyTooltipTitle('Copy');
      copyTooltipResetTimer.current = null;
    }, 1200);
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result ?? ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleCopyFileContent = async () => {
    if (!rawFileUrl) return;
    try {
      if (isImageFile) {
        const response = await axios.get<Blob>(rawFileUrl, {
          responseType: 'blob',
        });
        const imageBlob = response.data;

        if (
          navigator.clipboard?.write &&
          typeof window.ClipboardItem !== 'undefined'
        ) {
          const mimeType = imageBlob.type || `image/${fileExtension || 'png'}`;
          await navigator.clipboard.write([
            new window.ClipboardItem({ [mimeType]: imageBlob }),
          ]);
        } else {
          // Fallback to Data URL string when binary clipboard is unavailable.
          const dataUrl = await blobToDataUrl(imageBlob);
          await navigator.clipboard.writeText(dataUrl);
        }
      } else {
        const response = await axios.get<string>(rawFileUrl, {
          transformResponse: [(data) => data],
        });
        await navigator.clipboard.writeText(response.data);
      }
      showCopiedTooltip();
    } catch (err) {
      try {
        // Fallback for environments where clipboard API is unavailable.
        const fallbackText = isImageFile
          ? rawFileUrl
          : (
              await axios.get<string>(rawFileUrl, {
                transformResponse: [(data) => data],
              })
            ).data;
        const textarea = document.createElement('textarea');
        textarea.value = fallbackText;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showCopiedTooltip();
      } catch (fallbackErr) {
        console.error('Failed to copy file content', fallbackErr ?? err);
      }
    }
  };

  const handleDownloadFile = async () => {
    if (!rawFileUrl || !currentPath) return;
    try {
      const filename = currentPath.split('/').pop() || 'download';
      const response = await axios.get<Blob>(rawFileUrl, {
        responseType: 'blob',
      });
      const objectUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Failed to download file', err);
    }
  };

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
              color: !currentPath ? '#c9d1d9' : STATUS_COLORS.info,
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
                  color: isLast ? '#c9d1d9' : STATUS_COLORS.info,
                  cursor: isLast ? 'default' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {part}
              </Link>
            );
          })}
        </Breadcrumbs>
        {isFile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {!isImageFile && (
              <Tooltip title={copyTooltipTitle}>
                <IconButton
                  size="small"
                  onClick={handleCopyFileContent}
                  sx={{ color: STATUS_COLORS.open }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Download file">
              <IconButton
                size="small"
                onClick={handleDownloadFile}
                sx={{ color: STATUS_COLORS.open }}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Latest Commit Header (GitHub style blue/gray bar) */}
      {!isFile && (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid #30363d',
            borderBottom: 'none',
            borderRadius: '6px 6px 0 0',
            backgroundColor: '#161b22',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            justifyContent: 'space-between',
          }}
        >
          {loadingCommit ? (
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
                    color: '#c9d1d9',
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
                    fontFamily: '"JetBrains Mono", monospace',
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
              Latest commit info unavailable
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
            border: '1px solid #30363d',
            borderRadius: isFile ? '6px' : '0 0 6px 6px', // Connect to header
            backgroundColor: '#0d1117',
          }}
        >
          <Table size="small">
            <TableBody>
              {/* Parent Directory Link (.. ) */}
              {currentPath && (
                <TableRow
                  hover
                  sx={{
                    '&:hover': { backgroundColor: '#161b22' },
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
                      borderBottom: '1px solid #21262d',
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
                    '&:hover': { backgroundColor: '#161b22' },
                    cursor: 'pointer',
                    transition: 'background-color 0.1s',
                  }}
                >
                  <TableCell
                    sx={{
                      borderBottom: '1px solid #21262d',
                      py: 1,
                      width: '32px',
                      pl: 2,
                    }}
                  >
                    {node.type === 'tree' ? (
                      <FolderIcon sx={{ color: '#54aeff', fontSize: 16 }} />
                    ) : (
                      <InsertDriveFileIcon
                        sx={{ color: STATUS_COLORS.open, fontSize: 16 }}
                      />
                    )}
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: '1px solid #21262d',
                      py: 1,
                      color: '#c9d1d9',
                      fontSize: '14px',
                      fontWeight: node.type === 'tree' ? 600 : 400,
                    }}
                  >
                    {node.name}
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: '1px solid #21262d',
                      py: 1,
                      color: STATUS_COLORS.open,
                      fontSize: '13px',
                      textAlign: 'right',
                    }}
                  >
                    {/* Commit message col (optional placeholder) */}
                  </TableCell>
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
