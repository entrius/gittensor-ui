import React, { useState } from 'react';
import {
  Box,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { STATUS_COLORS } from '../../theme';

export interface FileNode {
  path: string;
  name: string;
  type: 'blob' | 'tree';
  children?: FileNode[];
  url?: string; // API url
}

interface FileExplorerProps {
  files: FileNode[];
  onSelectFile: (path: string) => void;
  selectedFile: string | null;
}

const FileItem: React.FC<{
  node: FileNode;
  level: number;
  onSelect: (path: string) => void;
  selectedFile: string | null;
}> = ({ node, level, onSelect, selectedFile }) => {
  const [open, setOpen] = useState(false);
  const isSelected = selectedFile === node.path;

  const handleClick = () => {
    if (node.type === 'tree') {
      setOpen(!open);
    } else {
      onSelect(node.path);
    }
  };

  const getIcon = () => {
    if (node.type === 'tree') {
      return open ? (
        <FolderOpenIcon sx={{ fontSize: 18, color: STATUS_COLORS.open }} />
      ) : (
        <FolderIcon sx={{ fontSize: 18, color: STATUS_COLORS.open }} />
      );
    }
    return (
      <InsertDriveFileIcon sx={{ fontSize: 18, color: STATUS_COLORS.open }} />
    );
  };

  return (
    <>
      <ListItemButton
        onClick={handleClick}
        disableRipple
        sx={{
          pl: level * 1.5 + 1,
          py: 0.25,
          minHeight: 24,
          height: 24,
          backgroundColor: isSelected
            ? 'rgba(56, 139, 253, 0.15)'
            : 'transparent',
          borderLeft: isSelected
            ? '2px solid #388bfd'
            : '2px solid transparent',
          '&:hover': {
            backgroundColor: isSelected
              ? 'rgba(56, 139, 253, 0.15)'
              : 'rgba(255, 255, 255, 0.04)',
          },
          transition: 'all 0.1s ease-in-out',
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
          {node.type === 'tree' && (
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
          )}
          {node.type !== 'tree' && <Box sx={{ width: 14 }} />}
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
          primary={node.name}
          primaryTypographyProps={{
            sx: {
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: '13px',
              color: isSelected ? '#fff' : STATUS_COLORS.open,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: isSelected ? 500 : 400,
              lineHeight: 1,
            },
          }}
        />
      </ListItemButton>
      {node.type === 'tree' && node.children && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box sx={{ position: 'relative' }}>
            {/* Optional: Indentation guide line could go here */}
            <List component="div" disablePadding>
              {node.children.map((child) => (
                <FileItem
                  key={child.path}
                  node={child}
                  level={level + 1}
                  onSelect={onSelect}
                  selectedFile={selectedFile}
                />
              ))}
            </List>
          </Box>
        </Collapse>
      )}
    </>
  );
};

export const buildFileTree = (
  flatFiles: { path: string; type: 'blob' | 'tree' }[],
): FileNode[] => {
  const root: FileNode[] = [];
  const map: Record<string, FileNode> = {};

  // Sort: folders first, then files, alphabetically
  const sorted = [...flatFiles].sort((a, b) => {
    if (a.type === b.type) return a.path.localeCompare(b.path);
    return a.type === 'tree' ? -1 : 1;
  });

  sorted.forEach((file) => {
    const parts = file.path.split('/');
    const name = parts[parts.length - 1];
    const node: FileNode = {
      path: file.path,
      name,
      type: file.type,
      children: file.type === 'tree' ? [] : undefined,
    };
    map[file.path] = node;

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      if (map[parentPath] && map[parentPath].children) {
        map[parentPath].children!.push(node);
      } else {
        // Parent missing or unseen (should not happen with recursive tree if sorted properly? actually API order matters)
        // For robust handling we might need to create implicit parents, but recursive API usually gives full list
        // We will assume parents appear if we handle them correctly.
        // Github API recursive listing might not guarantee parent comes before child in list?
        // Actually, let's look at a simpler map approach or just robust path splitting.
      }
    }
  });

  // Re-sort children
  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'tree' ? -1 : 1;
    });
    nodes.forEach((n) => {
      if (n.children) sortNodes(n.children);
    });
  };
  sortNodes(root);

  return root;
};

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onSelectFile,
  selectedFile,
}) => (
  <Box
    sx={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}
  >
    <List component="nav" dense>
      {files.map((node) => (
        <FileItem
          key={node.path}
          node={node}
          level={0}
          onSelect={onSelectFile}
          selectedFile={selectedFile}
        />
      ))}
    </List>
  </Box>
);

export default FileExplorer;
