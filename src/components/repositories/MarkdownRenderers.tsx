/**
 * Extract a square pixel size from an image URL's `s` query param
 * (e.g. GitHub avatars: `https://avatars.githubusercontent.com/u/58493?s=48`).
 */
export const getImageSizeHint = (url: string | undefined): number | null => {
  if (!url) return null;
  const match = url.match(/[?&]s=(\d+)/);
  if (!match) return null;
  const size = parseInt(match[1], 10);
  return Number.isFinite(size) && size > 0 ? size : null;
};

/**
 * Resolve a relative URL to an absolute GitHub URL.
 * Returns the original URL if it's already absolute.
 */
export const resolveRelativeUrl = (
  url: string | undefined,
  repositoryFullName: string,
  defaultBranch: string,
  type: 'blob' | 'cdn' = 'blob',
): string | undefined => {
  if (
    !url ||
    url.startsWith('http') ||
    url.startsWith('//') ||
    url.startsWith('#') ||
    url.startsWith('mailto:')
  ) {
    return url;
  }

  const cleanPath = url.replace(/^\.\//, '').replace(/^\//, '');

  if (type === 'cdn') {
    return `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${defaultBranch}/${cleanPath}`;
  }

  const hasExtension = /\.[a-zA-Z0-9]+$/.test(cleanPath.replace(/\/$/, ''));
  const ghType = cleanPath.endsWith('/') || !hasExtension ? 'tree' : 'blob';
  return `https://github.com/${repositoryFullName}/${ghType}/${defaultBranch}/${cleanPath.replace(/\/$/, '')}`;
};
