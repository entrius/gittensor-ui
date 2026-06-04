// Build & parse github.com URLs. Builders take positional (repo, number) args so
// call sites stay one-liners regardless of the upstream field naming
// (repository / repositoryFullName / repo_full_name and number / issue_number /
// pullRequestNumber / prNumber).

export const buildPrUrl = (
  repoFullName: string,
  number: number | string,
): string => `https://github.com/${repoFullName}/pull/${number}`;

export const buildIssueUrl = (
  repoFullName: string,
  number: number | string,
): string => `https://github.com/${repoFullName}/issues/${number}`;

export const extractRepoFullName = (repoUrl: string): string | null => {
  try {
    const url = new URL(repoUrl.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.hostname.toLowerCase() !== 'github.com') return null;

    const [owner, rawRepo] = url.pathname.split('/').filter(Boolean);
    const ownerPattern = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
    const repoPattern = /^[a-z\d._-]+$/i;
    if (!owner || !rawRepo) return null;

    const repo = rawRepo.toLowerCase().endsWith('.git')
      ? rawRepo.slice(0, -4)
      : rawRepo;
    if (!ownerPattern.test(owner) || !repoPattern.test(repo)) return null;

    return `${owner}/${repo}`;
  } catch {
    return null;
  }
};
