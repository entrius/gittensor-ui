import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  alpha,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda'; // Unified
import ViewColumnIcon from '@mui/icons-material/ViewColumn'; // Split
import axios from 'axios';

import parseDiff, {
  type Change,
  type Chunk,
  type File as DiffFile,
} from 'parse-diff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { DIFF_COLORS, scrollbarSx } from '../../theme';
import { useClipboardCopy } from '../../hooks/useClipboardCopy';

interface PRFile {
  sha: string;
  filename: string;
  status:
    | 'added'
    | 'removed'
    | 'modified'
    | 'renamed'
    | 'copied'
    | 'changed'
    | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string; // patch contains the diff
}

interface PRFilesChangedProps {
  repository: string;
  pullRequestNumber: number;
  headSha?: string; // Optional SHA to fetch full tree from
}

// Tree types
interface TreeNode {
  name: string;
  path: string;
  children: Record<string, TreeNode>;
  type: 'blob' | 'tree';
  file?: PRFile; // If this node corresponds to a changed file
  hasChanges?: boolean; // If this folder contains changed files
  changeCount?: number; // Number of changed files inside
}

type SplitDiffRow =
  | { type: 'chunk-header'; left: null; right: null; headerContent: string }
  | { type: 'normal'; left: Change; right: Change }
  | { type: 'modify'; left: Change | null; right: Change | null };

const addedLineBackground = alpha(DIFF_COLORS.additions, 0.15);
const deletedLineBackground = alpha(DIFF_COLORS.deletions, 0.15);

const buildFullTree = (
  allFilesParams: { path: string; type: 'blob' | 'tree' }[],
  changedFiles: PRFile[],
) => {
  const root: Record<string, TreeNode> = {};

  // 1. Build structure from all files (full repo)
  allFilesParams.forEach((item) => {
    const parts = item.path.split('/');
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = index === parts.length - 1;

      if (!currentLevel[part]) {
        currentLevel[part] = {
          name: part,
          path: currentPath,
          children: {},
          type: isLast ? item.type : 'tree',
        };
      }
      currentLevel = currentLevel[part].children;
    });
  });

  // 2. Overlay changes
  changedFiles.forEach((file) => {
    const parts = file.filename.split('/');
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = index === parts.length - 1;

      if (!currentLevel[part]) {
        // Create node if missing (e.g. added file or folder)
        currentLevel[part] = {
          name: part,
          path: currentPath,
          children: {},
          type: isLast ? 'blob' : 'tree',
          // If it's a folder being created, we mark it changes?
          // Actually change count will update below.
        };
      }

      const node = currentLevel[part];
      node.hasChanges = true;
      node.changeCount = (node.changeCount || 0) + 1;

      // If it's the actual file, attach the PRFile data
      if (isLast) {
        node.file = file;
        node.type = 'blob'; // Ensure type is blob
      }
      currentLevel = node.children;
    });
  });

  return root;
};

const FileTreeItem: React.FC<{
  node: TreeNode;
  level: number;
  onSelect: (file: PRFile) => void;
  selectedParams: { filename: string | null };
}> = ({ node, level, onSelect, selectedParams }) => {
  const theme = useTheme();
  const unchangedFileColor = alpha(theme.palette.status.open, 0.5);
  // Auto-expand if it has changes, otherwise collapse to reduce noise in full tree
  const [open, setOpen] = useState(!!node.hasChanges);
  const hasChildren = Object.keys(node.children).length > 0;
  const isSelected =
    node.file && selectedParams.filename === node.file.filename;

  const handleClick = () => {
    if (hasChildren) {
      setOpen(!open);
    }
    if (node.file) {
      onSelect(node.file);
    }
  };

  const getIcon = () => {
    if (hasChildren) {
      const color = node.hasChanges ? 'status.warning' : 'status.open'; // Orange folder if changes inside
      return open ? (
        <FolderOpenIcon sx={{ fontSize: 16, color }} />
      ) : (
        <FolderIcon sx={{ fontSize: 16, color }} />
      );
    }

    // File icons
    let color: string = 'status.open';
    if (node.file) {
      if (node.file.status === 'added') color = 'status.success';
      if (node.file.status === 'removed') color = 'status.error';
      if (node.file.status === 'modified') color = 'status.warning';
    } else {
      // Unchanged file
      color = unchangedFileColor;
    }
    return <InsertDriveFileIcon sx={{ fontSize: 16, color }} />;
  };

  return (
    <>
      <ListItemButton
        onClick={handleClick}
        disableRipple
        sx={{
          pl: level * 1.5 + 1,
          py: 0.25,
          minHeight: 28,
          height: 'auto',
          backgroundColor: isSelected
            ? theme.palette.highlight.info
            : 'transparent',
          borderLeft: '2px solid',
          borderLeftColor: isSelected ? 'status.info' : 'transparent',
          '&:hover': {
            backgroundColor: isSelected
              ? theme.palette.highlight.info
              : 'surface.light',
          },
          opacity: node.file || node.hasChanges ? 1 : 0.6, // Dim unchanged items
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 20,
            mr: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {hasChildren ? (
            <Box
              component="span"
              sx={{ display: 'flex', alignItems: 'center', opacity: 0.7 }}
            >
              {open ? (
                <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
              ) : (
                <KeyboardArrowRightIcon sx={{ fontSize: 14 }} />
              )}
            </Box>
          ) : (
            <Box sx={{ width: 14 }} />
          )}
        </ListItemIcon>

        <ListItemIcon
          sx={{
            minWidth: 20,
            mr: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {getIcon()}
        </ListItemIcon>

        <ListItemText
          primary={
            <Box
              component="span"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              {node.name}
              {node.hasChanges && !open && hasChildren && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'status.warning',
                  }}
                />
              )}
            </Box>
          }
          primaryTypographyProps={{
            sx: {
              fontSize: '12px',
              color: isSelected
                ? 'text.primary'
                : node.file || node.hasChanges
                  ? 'text.tertiary'
                  : 'status.open',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: isSelected || node.hasChanges ? 600 : 400,
            },
          }}
        />
      </ListItemButton>
      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {/* Sort: Folders first, changed files first? Or standard alpha? GitHub uses alpha usually but lets prioritize changed for visibility? 
                Actually let's stick to standard folder-first alpha sort, but maybe put changed items on top? 
                No, standard sort is less confusing.
            */}
            {Object.values(node.children)
              .sort((a, b) => {
                const aIsFolder = Object.keys(a.children).length > 0;
                const bIsFolder = Object.keys(b.children).length > 0;
                if (aIsFolder && !bIsFolder) return -1;
                if (!aIsFolder && bIsFolder) return 1;
                return a.name.localeCompare(b.name);
              })
              .map((child) => (
                <FileTreeItem
                  key={child.path}
                  node={child}
                  level={level + 1}
                  onSelect={onSelect}
                  selectedParams={selectedParams}
                />
              ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

// Split View Component
const SplitDiffView: React.FC<{ patch: string; lineWrap: boolean }> = ({
  patch,
  lineWrap,
}) => {
  const files = useMemo(() => parseDiff(patch), [patch]);

  // Scroll Synchronization Refs
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncingLeftScroll = useRef(false);
  const isSyncingRightScroll = useRef(false);

  if (!files || files.length === 0) return null;

  const rows: SplitDiffRow[] = [];

  files[0].chunks.forEach((chunk: Chunk) => {
    rows.push({
      left: null,
      right: null,
      type: 'chunk-header',
      headerContent: chunk.content,
    });

    let deletions: Change[] = [];
    let additions: Change[] = [];

    chunk.changes.forEach((change: Change) => {
      if (change.type === 'normal') {
        const maxLen = Math.max(deletions.length, additions.length);
        for (let i = 0; i < maxLen; i++) {
          rows.push({
            left: deletions[i] || null,
            right: additions[i] || null,
            type: 'modify',
          });
        }
        deletions = [];
        additions = [];
        rows.push({ left: change, right: change, type: 'normal' });
      } else if (change.type === 'del') {
        deletions.push(change);
      } else if (change.type === 'add') {
        additions.push(change);
      }
    });

    const maxLen = Math.max(deletions.length, additions.length);
    for (let i = 0; i < maxLen; i++) {
      rows.push({
        left: deletions[i] || null,
        right: additions[i] || null,
        type: 'modify',
      });
    }
  });

  // If Line Wrap is enabled, use a single table layout
  if (lineWrap) {
    return (
      <TableContainer
        className="split-diff-table"
        sx={{
          overflowX: 'auto',
          backgroundColor: 'background.paper',
          fontSize: '12px',
        }}
      >
        <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '50px' }} />
            <col style={{ width: '50%' }} />
            <col style={{ width: '50px' }} />
            <col style={{ width: '50%' }} />
          </colgroup>
          <TableBody>
            {rows.map((row, idx) => {
              if (row.type === 'chunk-header') {
                return (
                  <TableRow
                    key={idx}
                    sx={{ backgroundColor: 'surface.elevated' }}
                  >
                    <TableCell
                      colSpan={4}
                      sx={{
                        color: 'status.open',
                        borderBottom: '1px solid',
                        borderColor: 'border.light',
                        py: 1,
                        px: 2,
                        fontFamily: 'inherit',
                        fontSize: '12px',
                      }}
                    >
                      {row.headerContent}
                    </TableCell>
                  </TableRow>
                );
              }

              return (
                <TableRow key={idx}>
                  <TableCell
                    sx={{
                      color: 'status.open',
                      borderRight: '1px solid',
                      borderColor: 'border.light',
                      borderBottom: 'none',
                      textAlign: 'right',
                      verticalAlign: 'top',
                      backgroundColor:
                        row.left?.type === 'del'
                          ? deletedLineBackground
                          : 'transparent',
                      userSelect: 'none',
                      p: '4px 8px',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                    }}
                  >
                    {row.left
                      ? row.left.type === 'normal'
                        ? row.left.ln1
                        : row.left.ln
                      : ''}
                  </TableCell>
                  <TableCell
                    sx={{
                      borderRight: '1px solid',
                      borderColor: 'border.light',
                      borderBottom: 'none',
                      verticalAlign: 'top',
                      backgroundColor:
                        row.left?.type === 'del'
                          ? deletedLineBackground
                          : 'transparent',
                      color: 'text.primary',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      p: '4px 8px',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                    }}
                  >
                    {row.left
                      ? row.left.content.startsWith('-') ||
                        row.left.content.startsWith('+')
                        ? row.left.content.substring(1)
                        : row.left.content
                      : ''}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: 'status.open',
                      borderRight: '1px solid',
                      borderColor: 'border.light',
                      borderBottom: 'none',
                      textAlign: 'right',
                      verticalAlign: 'top',
                      backgroundColor:
                        row.right?.type === 'add'
                          ? addedLineBackground
                          : 'transparent',
                      userSelect: 'none',
                      p: '4px 8px',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                    }}
                  >
                    {row.right
                      ? row.right.type === 'normal'
                        ? row.right.ln2
                        : row.right.ln
                      : ''}
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: 'none',
                      verticalAlign: 'top',
                      backgroundColor:
                        row.right?.type === 'add'
                          ? addedLineBackground
                          : 'transparent',
                      color: 'text.primary',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      p: '4px 8px',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                    }}
                  >
                    {row.right
                      ? row.right.content.startsWith('+') ||
                        row.right.content.startsWith('-')
                        ? row.right.content.substring(1)
                        : row.right.content
                      : ''}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  const handleScroll = (side: 'left' | 'right') => {
    const source = side === 'left' ? leftRef.current : rightRef.current;
    const target = side === 'left' ? rightRef.current : leftRef.current;
    const isSyncingSource =
      side === 'left' ? isSyncingLeftScroll : isSyncingRightScroll;
    const isSyncingTarget =
      side === 'left' ? isSyncingRightScroll : isSyncingLeftScroll;

    if (!source || !target) return;

    if (isSyncingSource.current) {
      isSyncingSource.current = false;
      return;
    }

    isSyncingTarget.current = true;
    target.scrollLeft = source.scrollLeft;
  };

  const renderPane = (side: 'left' | 'right') => (
    <Box
      ref={side === 'left' ? leftRef : rightRef}
      onScroll={() => handleScroll(side)}
      sx={{
        width: '50%',
        overflowX: 'auto',
        borderRight: side === 'left' ? '1px solid' : 'none',
        borderColor: 'border.light',
        ...scrollbarSx,
      }}
    >
      <Table
        size="small"
        sx={{
          width: '100%',
          minWidth: 'max-content',
          tableLayout: 'auto',
          borderCollapse: 'separate',
          borderSpacing: 0,
        }}
      >
        <TableBody>
          {rows.map((row, idx) => {
            if (row.type === 'chunk-header') {
              return (
                <TableRow
                  key={idx}
                  sx={{
                    height: '24px',
                    backgroundColor: 'surface.elevated',
                  }}
                >
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      width: '50px',
                      minWidth: '50px',
                      backgroundColor: 'surface.elevated',
                      borderBottom: '1px solid',
                      borderRight: '1px solid',
                      borderColor: 'border.light',
                      p: '4px 8px',
                      color: 'status.open',
                      fontFamily: 'inherit',
                      fontSize: '12px',
                      zIndex: 5,
                      isolation: 'isolate',
                    }}
                  >
                    ...
                  </TableCell>
                  <TableCell
                    sx={{
                      color: 'status.open',
                      borderBottom: '1px solid',
                      borderColor: 'border.light',
                      p: '4px 8px',
                      fontFamily: 'inherit',
                      fontSize: '12px',
                      whiteSpace: 'pre',
                    }}
                  >
                    {row.headerContent}
                  </TableCell>
                </TableRow>
              );
            }

            const item = side === 'left' ? row.left : row.right;
            const ln = item
              ? item.type === 'normal'
                ? side === 'left'
                  ? item.ln1
                  : item.ln2
                : item.ln
              : '';

            let bg = 'transparent';
            if (item && item.type === 'add') bg = addedLineBackground;
            if (item && item.type === 'del') bg = deletedLineBackground;

            return (
              <TableRow key={idx} sx={{ height: '24px' }}>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    width: '50px',
                    minWidth: '50px',
                    backgroundColor: 'background.paper',
                    // Isolated sticky cells paint their own layer, so preserve diff tint via a same-color gradient.
                    ...(bg !== 'transparent' && {
                      backgroundImage: `linear-gradient(${bg}, ${bg})`,
                    }),
                    color: 'status.open',
                    borderRight: '1px solid',
                    borderColor: 'border.light',
                    borderBottom: 'none',
                    textAlign: 'right',
                    verticalAlign: 'top',
                    userSelect: 'none',
                    p: '0 8px',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    lineHeight: '24px',
                    zIndex: 5,
                    isolation: 'isolate',
                  }}
                >
                  {ln}
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: bg,
                    color: 'text.primary',
                    borderBottom: 'none',
                    verticalAlign: 'top',
                    whiteSpace: 'pre',
                    p: '0 8px',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    lineHeight: '24px',
                    width: 'auto',
                  }}
                >
                  {item
                    ? item.content.startsWith('+') ||
                      item.content.startsWith('-')
                      ? item.content.substring(1)
                      : item.content
                    : ''}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );

  return (
    <Box
      className="split-diff-container"
      sx={{
        display: 'flex',
        width: '100%',
        backgroundColor: 'background.paper',
        fontSize: '12px',
      }}
    >
      {renderPane('left')}
      {renderPane('right')}
    </Box>
  );
};

// Unified View Component
const UnifiedDiffView: React.FC<{ patch: string; lineWrap: boolean }> = ({
  patch,
  lineWrap,
}) => {
  const files = useMemo(() => parseDiff(patch), [patch]);

  if (!files || files.length === 0) return null;

  const rows: (Change | { type: 'chunk-header'; content: string })[] = [];

  files[0].chunks.forEach((chunk: Chunk) => {
    rows.push({ type: 'chunk-header', content: chunk.content });
    chunk.changes.forEach((change: Change) => {
      rows.push(change);
    });
  });

  return (
    <TableContainer
      sx={{
        overflowX: 'auto',
        backgroundColor: 'background.paper',
        fontSize: '12px',
      }}
    >
      <Table
        size="small"
        sx={{ tableLayout: lineWrap ? 'fixed' : 'auto', width: '100%' }}
      >
        <colgroup>
          <col style={{ width: '50px' }} />
          <col style={{ width: '50px' }} />
          <col style={{ width: 'auto' }} />
        </colgroup>
        <TableBody>
          {rows.map((row, idx) => {
            if (row.type === 'chunk-header') {
              return (
                <TableRow
                  key={idx}
                  sx={{ backgroundColor: 'surface.elevated' }}
                >
                  <TableCell
                    colSpan={3}
                    sx={{
                      color: 'status.open',
                      borderBottom: '1px solid',
                      borderColor: 'border.light',
                      py: 1,
                      px: 2,
                      fontFamily: 'inherit',
                      fontSize: '12px',
                      whiteSpace: 'pre',
                    }}
                  >
                    {row.content}
                  </TableCell>
                </TableRow>
              );
            }

            const change = row as Change;
            let bg = 'transparent';
            if (change.type === 'add') bg = addedLineBackground;
            if (change.type === 'del') bg = deletedLineBackground;

            return (
              <TableRow key={idx}>
                {/* Old Line Number */}
                <TableCell
                  sx={{
                    width: '50px',
                    minWidth: '50px',
                    backgroundColor:
                      bg === 'transparent' ? 'background.paper' : bg,
                    color: 'status.open',
                    borderRight: '1px solid',
                    borderColor: 'border.light',
                    borderBottom: 'none',
                    textAlign: 'right',
                    verticalAlign: 'top',
                    userSelect: 'none',
                    p: '0 8px',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    lineHeight: '24px',
                  }}
                >
                  {change.type === 'normal'
                    ? change.ln1
                    : change.type === 'del'
                      ? change.ln
                      : ''}
                </TableCell>

                {/* New Line Number */}
                <TableCell
                  sx={{
                    width: '50px',
                    minWidth: '50px',
                    backgroundColor:
                      bg === 'transparent' ? 'background.paper' : bg,
                    color: 'status.open',
                    borderRight: '1px solid',
                    borderColor: 'border.light',
                    borderBottom: 'none',
                    textAlign: 'right',
                    verticalAlign: 'top',
                    userSelect: 'none',
                    p: '0 8px',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    lineHeight: '24px',
                  }}
                >
                  {change.type === 'normal'
                    ? change.ln2
                    : change.type === 'add'
                      ? change.ln
                      : ''}
                </TableCell>

                {/* Content */}
                <TableCell
                  sx={{
                    backgroundColor: bg,
                    color: 'text.primary',
                    borderBottom: 'none',
                    verticalAlign: 'top',
                    whiteSpace: lineWrap ? 'pre-wrap' : 'pre',
                    wordBreak: lineWrap ? 'break-all' : 'normal',
                    p: '0 8px',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    lineHeight: '24px',
                    width: '100%',
                  }}
                >
                  {change.content.startsWith('+') ||
                  change.content.startsWith('-')
                    ? change.content.substring(1)
                    : change.content}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Minimap Component
const DiffMinimap: React.FC<{
  files: DiffFile[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}> = ({ files, scrollContainerRef }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const minimapRef = useRef<HTMLDivElement>(null);

  // Parse chunks to lines structure for accurate mapping
  const { lines, totalLines } = useMemo(() => {
    if (!files || !files.length) return { lines: [], totalLines: 0 };
    const chunks = files[0].chunks;
    let tLines = 0;
    const mapLines: { type: string; index: number }[] = [];

    chunks.forEach((chunk: Chunk) => {
      // Chunk header counts as a line visually usually
      tLines++;
      mapLines.push({ type: 'header', index: tLines });

      chunk.changes.forEach((change: Change) => {
        tLines++;
        mapLines.push({ type: change.type, index: tLines });
      });
    });
    return { lines: mapLines, totalLines: tLines };
  }, [files]);

  // Sync with scroll container
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (!isDragging) {
        setScrollTop(el.scrollTop);
      }
    };

    const updateMetrics = () => {
      setViewportHeight(el.clientHeight);
      setContentHeight(el.scrollHeight);
      // Also update scroll top in case of resize
      setScrollTop(el.scrollTop);
    };

    el.addEventListener('scroll', handleScroll);
    // Use ResizeObserver for robust updates
    const ro = new ResizeObserver(updateMetrics);
    ro.observe(el);
    // Initial update
    updateMetrics();

    return () => {
      el.removeEventListener('scroll', handleScroll);
      ro.disconnect();
    };
  }, [scrollContainerRef, isDragging]);

  // Interaction Handlers
  const handleMinimapClick = (e: React.MouseEvent) => {
    if (!minimapRef.current || !scrollContainerRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const percentage = clickY / rect.height;

    const targetScroll =
      percentage * scrollContainerRef.current.scrollHeight - viewportHeight / 2;
    scrollContainerRef.current.scrollTo({
      top: targetScroll,
      behavior: 'auto',
    });
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      if (!minimapRef.current || !scrollContainerRef.current) return;
      const rect = minimapRef.current.getBoundingClientRect();
      // simple clamp
      const relativeY = Math.max(
        0,
        Math.min(e.clientY - rect.top, rect.height),
      );
      const percentage = relativeY / rect.height;
      const targetScroll =
        percentage * scrollContainerRef.current.scrollHeight -
        viewportHeight / 2;

      scrollContainerRef.current.scrollTop = targetScroll;
      setScrollTop(targetScroll);
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, viewportHeight, scrollContainerRef]);

  if (totalLines === 0) return null;

  // We use percentages for CSS to avoid needing exact pixel height in render
  const overlayTopPct = contentHeight ? (scrollTop / contentHeight) * 100 : 0;
  const overlayHeightPct = contentHeight
    ? (viewportHeight / contentHeight) * 100
    : 0;

  return (
    <Box
      ref={minimapRef}
      onClick={handleMinimapClick}
      sx={{
        width: '16px',
        height: '100%',
        position: 'sticky', // Sticky relative to parent flex container
        top: 0,
        right: 0,
        zIndex: 5,
        backgroundColor: 'background.paper',
        borderLeft: '1px solid',
        borderColor: 'border.light',
        cursor: 'pointer',
        overflow: 'hidden', // Hide map parts that overflow
        '&:hover': {
          backgroundColor: 'surface.elevated',
        },
      }}
    >
      {/* Map Content (Scaled down) */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          opacity: 0.6,
        }}
      >
        {lines.map((line, i) => {
          // Draw lines as % positions
          const top = (i / totalLines) * 100;
          const height = (1 / totalLines) * 100;
          let color = 'transparent';
          if (line.type === 'add') color = DIFF_COLORS.additions;
          if (line.type === 'del') color = DIFF_COLORS.deletions;
          if (color === 'transparent') return null;

          return (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                top: `${top}%`,
                height: `max(1px, ${height}%)`,
                left: 0,
                right: 0,
                backgroundColor: color,
              }}
            />
          );
        })}
      </Box>

      {/* Viewport Overlay */}
      <Box
        onMouseDown={handleDragStart}
        sx={{
          position: 'absolute',
          top: `${overlayTopPct}%`,
          left: 0,
          right: 0,
          height: `${overlayHeightPct}%`,
          backgroundColor: 'border.light',
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'border.medium',
          transition: isDragging ? 'none' : 'top 0.1s',
          zIndex: 2,
          cursor: 'grab',
          '&:active': {
            cursor: 'grabbing',
            backgroundColor: 'border.medium',
          },
        }}
      />
    </Box>
  );
};

// Updated SplitDiffView to accept parsed files if desired, or parse internally.
// Let's parse inside PRFileRow to share state?
// For now, let's keep SplitDiffView self-contained but we need to parse for Minimap in parent?
// Actually, let's just make a new wrapper component for the file content.

const PRFileDiffViewer: React.FC<{
  file: PRFile;
  viewMode: 'unified' | 'split';
  lineWrap: boolean;
}> = ({ file, viewMode, lineWrap }) => {
  // Memoize parseDiff result
  const parsedDiff = useMemo(() => {
    if (!file.patch) return [];
    return parseDiff(file.patch);
  }, [file.patch]);

  const { copied, copy, liveRegion } = useClipboardCopy({
    copiedMessage: 'File path copied to clipboard',
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    void copy(file.filename);
  };

  if (!file.patch) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'status.open' }}>
        <Typography sx={{ fontSize: '0.9rem' }}>
          {file.status === 'renamed'
            ? 'File renamed without changes.'
            : 'Binary file or large diff not shown.'}
        </Typography>
        <Typography
          component="a"
          href={file.blob_url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: 'status.info',
            fontSize: '0.85rem',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
            mt: 1,
            display: 'inline-block',
          }}
        >
          View file
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      id={`file-${file.sha}`}
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'border.light',
        borderRadius: '6px',
        backgroundColor: 'background.paper',
        overflow: 'hidden',
        scrollMarginTop: '100px',
        mb: 3,
      }}
    >
      <Accordion
        defaultExpanded
        disableGutters
        sx={{
          backgroundColor: 'surface.elevated',
          color: 'text.tertiary',
          boxShadow: 'none',
          borderRadius: 0,
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: 0 },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: 'status.open' }} />}
          sx={{
            borderBottom: '1px solid',
            borderColor: 'border.light',
            minHeight: '48px',
            position: 'sticky', // STICKY HEADER
            top: 0,
            zIndex: 10,
            backgroundColor: 'surface.elevated',
            '& .MuiAccordionSummary-content': {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '12px 0',
              width: '100%',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              overflow: 'hidden',
              minWidth: 0,
              flex: 1,
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {file.filename}
            </Typography>
            {file.status !== 'modified' && (
              <Chip
                variant="info"
                label={file.status}
                sx={{ color: 'status.open' }}
              />
            )}
            <Tooltip title={copied ? 'Copied!' : 'Copy path'}>
              <IconButton
                size="small"
                onClick={handleCopyPath}
                aria-label="Copy file path"
                sx={{ color: 'status.open', ml: 1, p: 0.5 }}
              >
                {copied ? (
                  <CheckIcon sx={{ fontSize: 14, color: 'status.success' }} />
                ) : (
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                )}
              </IconButton>
            </Tooltip>
            {liveRegion}
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              ml: 1,
              mr: 1,
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                color: 'diff.additions',
                fontSize: { xs: '0.8rem', sm: '0.85rem' },
                fontWeight: 600,
              }}
            >
              +{file.additions}
            </Typography>
            <Typography
              sx={{
                color: 'diff.deletions',
                fontSize: { xs: '0.8rem', sm: '0.85rem' },
                fontWeight: 600,
              }}
            >
              -{file.deletions}
            </Typography>
          </Box>
        </AccordionSummary>

        <AccordionDetails
          sx={{
            p: 0,
            backgroundColor: 'background.paper',
            position: 'relative',
            display: 'flex',
            maxHeight: '80vh',
          }}
        >
          {/* Diff Content */}
          <Box
            ref={scrollContainerRef}
            sx={{
              flex: 1,
              overflowX: 'auto',
              overflowY: 'auto',
              mr: { xs: 0, sm: '16px' },
              ...scrollbarSx,
            }}
          >
            {viewMode === 'unified' ? (
              <UnifiedDiffView patch={file.patch} lineWrap={lineWrap} />
            ) : (
              <SplitDiffView patch={file.patch} lineWrap={lineWrap} />
            )}
          </Box>

          {/* Minimap (hidden on mobile) */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
            <DiffMinimap
              files={parsedDiff}
              scrollContainerRef={scrollContainerRef}
            />
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

const PRFilesChanged: React.FC<PRFilesChangedProps> = ({
  repository,
  pullRequestNumber,
  headSha,
}) => {
  const theme = useTheme();
  // ... existing state ...
  const [files, setFiles] = useState<PRFile[]>([]);
  const [fullTreeData, setFullTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('split');
  const [lineWrap, setLineWrap] = useState(false);

  // ... existing useEffect ... (keep it)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const filesResponse = await axios.get(
          `https://api.github.com/repos/${repository}/pulls/${pullRequestNumber}/files?per_page=100`,
        );
        const changedFiles = filesResponse.data;
        setFiles(changedFiles);

        const treeSha = headSha || 'main';
        try {
          const treeResponse = await axios.get(
            `https://api.github.com/repos/${repository}/git/trees/${treeSha}?recursive=1`,
          );
          if (treeResponse.data.tree) {
            setFullTreeData(treeResponse.data.tree);
          }
        } catch (treeErr) {
          console.error(
            'Failed to fetch full tree, falling back to sparse tree',
            treeErr,
          );
          setFullTreeData(
            changedFiles.map((f: PRFile) => ({
              path: f.filename,
              type: 'blob' as const,
            })),
          );
        }
      } catch (err: unknown) {
        console.error('Failed to fetch PR data', err);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    if (repository && pullRequestNumber) {
      fetchData();
    }
  }, [repository, pullRequestNumber, headSha]);

  const fileTree = useMemo(
    () => buildFullTree(fullTreeData, files),
    [fullTreeData, files],
  );

  const handleFileSelect = (file: PRFile) => {
    setSelectedFile(file.filename);
    const element = document.getElementById(`file-${file.sha}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: 'unified' | 'split' | null,
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          p: 3,
          border: `1px solid ${alpha(theme.palette.status.error, 0.3)}`,
          borderRadius: 2,
          backgroundColor: alpha(theme.palette.status.error, 0.05),
          color: 'status.error',
          textAlign: 'center',
        }}
      >
        <Typography>{error}</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {/* Sidebar - File Tree */}
      <Grid item xs={12} md={3}>
        <Box
          sx={{
            position: { xs: 'static', md: 'sticky' },
            top: { md: 24 },
            maxHeight: { xs: 280, md: 'calc(100vh - 100px)' },
            overflowY: 'auto',
            backgroundColor: 'background.paper',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'border.light',
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            ...scrollbarSx,
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'border.light',
              mb: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'text.primary',
              }}
            >
              Files Changed ({files.length})
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={lineWrap}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLineWrap(e.target.checked)
                  }
                  size="small"
                />
              }
              label={
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: 'status.open',
                  }}
                >
                  Wrap Lines
                </Typography>
              }
              sx={{ m: 0 }}
            />

            {/* View Mode Toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="diff view mode"
              size="small"
              sx={{
                width: '100%',
                '& .MuiToggleButton-root': {
                  flex: 1,
                  color: 'status.open',
                  borderColor: 'border.light',
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  py: 0.5,
                  '&.Mui-selected': {
                    color: 'text.primary',
                    backgroundColor: theme.palette.highlight.info,
                    borderColor: 'status.info',
                  },
                  '&:hover': {
                    backgroundColor: 'surface.light',
                  },
                },
              }}
            >
              <ToggleButton value="unified" aria-label="unified view">
                <ViewAgendaIcon sx={{ fontSize: 16, mr: 1 }} />
                Unified
              </ToggleButton>
              <ToggleButton value="split" aria-label="split view">
                <ViewColumnIcon sx={{ fontSize: 16, mr: 1 }} />
                Split
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <List component="nav" dense disablePadding>
            {Object.values(fileTree)
              .sort((a, b) => {
                const aIsFolder = Object.keys(a.children).length > 0;
                const bIsFolder = Object.keys(b.children).length > 0;
                if (aIsFolder && !bIsFolder) return -1;
                if (!aIsFolder && bIsFolder) return 1;
                return a.name.localeCompare(b.name);
              })
              .map((node) => (
                <FileTreeItem
                  key={node.path}
                  node={node}
                  level={0}
                  onSelect={handleFileSelect}
                  selectedParams={{ filename: selectedFile }}
                />
              ))}
          </List>
        </Box>
      </Grid>

      {/* Content - File Diffs */}
      <Grid item xs={12} md={9}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, md: 3 },
            pb: { xs: 4, md: 20 },
          }}
        >
          {files.map((file) => (
            <PRFileDiffViewer
              key={file.sha}
              file={file}
              viewMode={viewMode}
              lineWrap={lineWrap}
            />
          ))}
        </Box>
      </Grid>
    </Grid>
  );
};

export default PRFilesChanged;
