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
  if (!url || url.startsWith('http') || url.startsWith('//') || url.startsWith('#') || url.startsWith('mailto:')) {
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
