import React, { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import axios from 'axios';
import { STATUS_COLORS } from '../../theme';
import { formatDistanceToNow } from 'date-fns';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
// import TextSnippetIcon from "@mui/icons-material/TextSnippet"; // Unused
import CodeViewer from './CodeViewer';
import { buildFileTree, type FileNode } from './FileExplorer';

interface RepositoryCodeBrowserProps {
  repositoryFullName: string;
}

interface CommitInfo {
  message: string;
  author: string;
  avatarUrl: string;
  date: string;
  sha: string;
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
      } catch (err: any) {
        console.error('Failed to load repository data', err);
        if (err.response?.status === 403) {
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
          const c = response.data[0];
          setPathCommits((prev) => ({
            ...prev,
            [pathKey]: {
              message: c.commit.message,
              author: c.commit.author.name,
              avatarUrl: c.author?.avatar_url || '',
              date: c.commit.author.date,
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

  const isFile = currentNode && currentNode.type === 'blob';
  const directoryChildren =
    !isFile && currentNode ? currentNode.children || [] : [];

  // Sort children: Folders first, then files
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
                  {currentCommit.author}
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
                <Typography sx={{ fontSize: '13px', color: STATUS_COLORS.open }}>
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
