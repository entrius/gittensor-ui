export interface FileNode {
  path: string;
  name: string;
  type: 'blob' | 'tree';
  children?: FileNode[];
  url?: string;
}

// Sorts folders first, then files, alphabetically by path. Because every
// child of a given parent shares that parent's path prefix, this single sort
// also yields the correct order at every level of the tree — so the builder
// below can append children in encounter order without a recursive resort.
export const buildFileTree = (
  flatFiles: { path: string; type: 'blob' | 'tree' }[],
): FileNode[] => {
  const sorted = [...flatFiles].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  const map: Record<string, FileNode> = {};
  const root: FileNode[] = [];

  for (const file of sorted) {
    const parts = file.path.split('/');
    const node: FileNode = {
      path: file.path,
      name: parts[parts.length - 1],
      type: file.type,
      children: file.type === 'tree' ? [] : undefined,
    };
    map[file.path] = node;

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parent = map[parts.slice(0, -1).join('/')];
      parent?.children?.push(node);
    }
  }

  return root;
};
