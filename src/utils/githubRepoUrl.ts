export const extractRepoFullName = (repoUrl: string): string | null => {
  try {
    const url = new URL(repoUrl.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.hostname.toLowerCase() !== 'github.com') return null;

    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    const ownerPattern = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
    const repoPattern = /^[a-z\d._-]+$/i;
    if (!owner || !repo) return null;
    if (!ownerPattern.test(owner) || !repoPattern.test(repo)) return null;

    return `${owner}/${repo}`;
  } catch {
    return null;
  }
};
