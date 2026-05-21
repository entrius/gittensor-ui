import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  memo,
} from 'react';
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
  TextField,
  InputAdornment,
  Popper,
  ClickAwayListener,
  List,
  ListItemButton,
  alpha,
} from '@mui/material';
import { STATUS_COLORS, scrollbarSx, TEXT_OPACITY } from '../../theme';
import { formatDistanceToNow } from 'date-fns';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SearchIcon from '@mui/icons-material/Search';
import CodeViewer from './CodeViewer';
import { buildFileTree, type FileNode } from './fileTree';
import { useQuery } from '@tanstack/react-query';
import { RateLimitError, githubFetch } from '../../api';
import { ClearSearchAdornment } from '../common/ClearSearchAdornment';

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
  truncated?: boolean;
}

type GoToTreeEntry = { path: string; type: 'blob' | 'tree' };

const GO_TO_FILE_MAX_RESULTS = 100;
/** Weight match position over path length when ranking results. */
const GO_TO_PATH_SCORE_STRIDE = 10_000;

function filterAndSortGoToEntries(
  entries: GoToTreeEntry[],
  query: string,
): GoToTreeEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = entries
    .map((e) => {
      const lower = e.path.toLowerCase();
      const idx = lower.indexOf(q);
      if (idx === -1) return null;
      return { ...e, score: idx * GO_TO_PATH_SCORE_STRIDE + e.path.length };
    })
    .filter((x): x is GoToTreeEntry & { score: number } => x != null)
    .sort((a, b) => a.score - b.score || a.path.localeCompare(b.path));
  return scored.slice(0, GO_TO_FILE_MAX_RESULTS).map(({ path, type }) => ({
    path,
    type,
  }));
}

type GoToPathSegmentSx = {
  fontFamily: string;
  fontSize: string | number;
  lineHeight: string | number;
  display: 'inline';
};

type HighlightedFilePathProps = {
  path: string;
  query: string;
  dimColor: string;
  emphColor: string;
  segmentBaseSx: GoToPathSegmentSx;
};

const HighlightedFilePath = memo(function HighlightedFilePath({
  path,
  query,
  dimColor,
  emphColor,
  segmentBaseSx,
}: HighlightedFilePathProps) {
  const q = query.trim();
  const nodes: React.ReactNode[] = [];
  if (!q) {
    return (
      <Typography
        component="span"
        sx={{
          ...segmentBaseSx,
          color: dimColor,
        }}
      >
        {path}
      </Typography>
    );
  }
  const lowerPath = path.toLowerCase();
  const lowerQ = q.toLowerCase();
  const qLen = q.length;
  let i = 0;
  let key = 0;
  while (i < path.length) {
    const found = lowerPath.indexOf(lowerQ, i);
    if (found === -1) {
      nodes.push(
        <Typography
          component="span"
          key={key++}
          sx={{
            ...segmentBaseSx,
            color: dimColor,
          }}
        >
          {path.slice(i)}
        </Typography>,
      );
      break;
    }
    if (found > i) {
      nodes.push(
        <Typography
          component="span"
          key={key++}
          sx={{
            ...segmentBaseSx,
            color: dimColor,
          }}
        >
          {path.slice(i, found)}
        </Typography>,
      );
    }
    nodes.push(
      <Typography
        component="span"
        key={key++}
        sx={{
          ...segmentBaseSx,
          fontWeight: 700,
          color: emphColor,
        }}
      >
        {path.slice(found, found + qLen)}
      </Typography>,
    );
    i = found + qLen;
  }
  return <>{nodes}</>;
});

const GoToFileSearch = memo(function GoToFileSearch({
  pathEntries,
  treeTruncated,
  onNavigate,
}: {
  pathEntries: GoToTreeEntry[];
  treeTruncated: boolean;
  onNavigate: (path: string) => void;
}) {
  const theme = useTheme();
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const filtered = useMemo(
    () => filterAndSortGoToEntries(pathEntries, query),
    [pathEntries, query],
  );

  const pathDimColor = theme.palette.text.tertiary;
  const pathEmphColor = theme.palette.text.primary;

  const goToPathSegmentBaseSx = useMemo<GoToPathSegmentSx>(
    () => ({
      fontFamily: 'inherit',
      fontSize: theme.typography.body2.fontSize ?? '0.875rem',
      lineHeight: theme.spacing(2.5),
      display: 'inline',
    }),
    [theme],
  );

  const inputFieldSx = useMemo(
    () =>
      ({
        color: theme.palette.text.primary,
        backgroundColor: alpha(theme.palette.common.black, 0.4),
        fontSize: '0.8rem',
        fontFamily: 'monospace',
        height: theme.spacing(4.5),
        borderRadius: 2,
        '& fieldset': { borderColor: theme.palette.border.light },
        '&:hover fieldset': { borderColor: theme.palette.border.medium },
        '&.Mui-focused fieldset': { borderColor: 'primary.main' },
        '& .MuiOutlinedInput-input::placeholder': {
          opacity: 1,
          color: theme.palette.text.tertiary,
        },
      }) as const,
    [theme],
  );

  const popperModifiers = useMemo(
    () => [
      {
        name: 'offset' as const,
        options: {
          offset: [0, Number.parseFloat(theme.spacing(0.5)) || 4] as [
            number,
            number,
          ],
        },
      },
    ],
    [theme],
  );

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    if (filtered.length === 0) return;
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-go-file-index="${highlightIndex}"]`,
    );
    row?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, filtered]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlightIndex(0);
  }, []);

  const choose = useCallback(
    (path: string) => {
      onNavigate(path);
      close();
    },
    [onNavigate, close],
  );

  const showPanel = open && (filtered.length > 0 || query.trim().length > 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPanel && e.key !== 'Escape') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length === 0) return;
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length === 0) return;
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      const hit = filtered[highlightIndex];
      if (hit) choose(hit.path);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  const minPanelWidth = Number.parseFloat(theme.spacing(40)) || 320;
  const maxPanelWidth = theme.spacing(70);
  const viewportGutter = theme.spacing(4);
  const maxPanelHeight = theme.spacing(45);
  const pathLineHeight = theme.spacing(2.5);
  const iconCellWidth = theme.spacing(2.75);
  const iconCellHeight = theme.spacing(2.5);
  const iconGlyphSize = theme.spacing(2);

  return (
    <ClickAwayListener
      onClickAway={() => {
        setOpen(false);
      }}
    >
      <Box
        ref={anchorRef}
        sx={(t) => ({
          flexShrink: 0,
          width: { xs: '100%', sm: t.spacing(35) },
          maxWidth: '100%',
        })}
      >
        <TextField
          size="small"
          placeholder="Search files and folders"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  sx={{
                    color: alpha(
                      theme.palette.common.white,
                      TEXT_OPACITY.muted,
                    ),
                    fontSize: '1rem',
                  }}
                />
              </InputAdornment>
            ),
            endAdornment: (
              <ClearSearchAdornment
                visible={Boolean(query)}
                onClear={() => setQuery('')}
              />
            ),
          }}
          sx={{
            width: '100%',
            '& .MuiOutlinedInput-root': inputFieldSx,
          }}
        />
        <Popper
          open={showPanel}
          anchorEl={anchorRef.current}
          placement="bottom-end"
          style={{ zIndex: theme.zIndex.modal }}
          modifiers={popperModifiers}
        >
          <Paper
            elevation={8}
            sx={{
              width: Math.max(
                anchorRef.current?.offsetWidth ?? minPanelWidth,
                minPanelWidth,
              ),
              maxWidth: `min(${maxPanelWidth}, calc(100vw - ${viewportGutter}))`,
              maxHeight: maxPanelHeight,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${theme.palette.border.light}`,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            {treeTruncated && (
              <Typography
                variant="caption"
                sx={{
                  px: 1.5,
                  py: 1,
                  color: 'warning.main',
                  borderBottom: `1px solid ${theme.palette.border.subtle}`,
                }}
              >
                File list was truncated by GitHub; some files may be missing.
              </Typography>
            )}
            {filtered.length === 0 ? (
              <Typography
                variant="body2"
                color="text.tertiary"
                sx={{ px: 2, py: 2 }}
              >
                {query.trim()
                  ? 'No matching files or folders'
                  : 'Type to filter by path'}
              </Typography>
            ) : (
              <List
                dense
                disablePadding
                ref={listRef}
                sx={{ overflow: 'auto', py: 0.5, ...scrollbarSx }}
              >
                {filtered.map((hit, index) => (
                  <ListItemButton
                    key={hit.path}
                    data-go-file-index={index}
                    selected={index === highlightIndex}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => choose(hit.path)}
                    sx={{
                      py: 0.75,
                      px: 1.5,
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 1,
                      '&.Mui-selected': {
                        backgroundColor: 'transparent',
                        outline: `1px solid ${theme.palette.primary.main}`,
                        outlineOffset: '-1px',
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: theme.palette.surface.elevated,
                      },
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: iconCellWidth,
                        height: iconCellHeight,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {hit.type === 'tree' ? (
                        <FolderIcon
                          sx={{
                            fontSize: iconGlyphSize,
                            color: theme.palette.status.info,
                          }}
                        />
                      ) : (
                        <InsertDriveFileIcon
                          sx={{
                            fontSize: iconGlyphSize,
                            color: STATUS_COLORS.open,
                          }}
                        />
                      )}
                    </Box>
                    <Box
                      sx={{
                        minWidth: 0,
                        flex: 1,
                        wordBreak: 'break-all',
                        lineHeight: pathLineHeight,
                      }}
                    >
                      <HighlightedFilePath
                        path={hit.path}
                        query={query}
                        dimColor={pathDimColor}
                        emphColor={pathEmphColor}
                        segmentBaseSx={goToPathSegmentBaseSx}
                      />
                    </Box>
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
});

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

  const repoQuery = useQuery<GhRepoData, Error>({
    queryKey: ['github', 'repo', repositoryFullName],
    queryFn: ({ signal }) =>
      githubFetch<GhRepoData>(
        `https://api.github.com/repos/${repositoryFullName}`,
        { signal },
      ),
    enabled: !!repositoryFullName,
    retry: false,
  });
  const defaultBranch = repoQuery.data?.default_branch || 'main';

  const treeQuery = useQuery<GhTreeResponse, Error>({
    queryKey: ['github', 'tree', repositoryFullName, defaultBranch],
    queryFn: ({ signal }) =>
      githubFetch<GhTreeResponse>(
        `https://api.github.com/repos/${repositoryFullName}/git/trees/${defaultBranch}`,
        { signal, params: { recursive: 1 } },
      ),
    enabled: !!repoQuery.data,
    retry: false,
  });

  const tree = useMemo<FileNode[]>(
    () => (treeQuery.data?.tree ? buildFileTree(treeQuery.data.tree) : []),
    [treeQuery.data],
  );

  const goToPathEntries = useMemo<GoToTreeEntry[]>(() => {
    const entries = treeQuery.data?.tree;
    if (!entries) return [];
    return entries
      .filter((e) => e.type === 'blob' || e.type === 'tree')
      .map((e) => ({ path: e.path, type: e.type }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [treeQuery.data]);

  const commitQuery = useQuery<CommitInfo | null, Error>({
    queryKey: [
      'github',
      'pathCommit',
      repositoryFullName,
      defaultBranch,
      currentPath,
    ],
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
    enabled: !!repoQuery.data,
    retry: false,
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

  const handleNavigate = useCallback((path: string | null) => {
    setCurrentPath(path);
  }, []);

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
        {fatalError instanceof RateLimitError
          ? fatalError.message
          : 'Failed to load repository structure.'}
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
      {/* Breadcrumbs & Go to file */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          alignItems: 'center',
          gap: 2,
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
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
        {!isFile && (
          <GoToFileSearch
            pathEntries={goToPathEntries}
            treeTruncated={treeQuery.data?.truncated === true}
            onNavigate={handleNavigate}
          />
        )}
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
                  alt={currentCommit.committerLogin}
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
              {commitQuery.error instanceof RateLimitError
                ? commitQuery.error.message
                : 'Latest commit info unavailable'}
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
