/**
 * Central GitHub REST API and jsDelivr raw URL builders.
 * Keeps host strings in one place for repository browser and related features.
 */

export const GITHUB_API_BASE = 'https://api.github.com' as const;

export const JSDELIVR_GH_RAW_BASE = 'https://cdn.jsdelivr.net/gh' as const;

/** `GET /repos/{owner}/{repo}` */
export function githubRepoUrl(repositoryFullName: string) {
  return `${GITHUB_API_BASE}/repos/${repositoryFullName}`;
}

/** `GET /repos/{owner}/{repo}/commits/{sha}` */
export function githubCommitDetailUrl(repositoryFullName: string, sha: string) {
  return `${githubRepoUrl(repositoryFullName)}/commits/${sha}`;
}

/** `GET /repos/{owner}/{repo}/git/trees/{ref}` */
export function githubGitTreeUrl(
  repositoryFullName: string,
  treeSha: string,
  options?: { recursive?: boolean },
) {
  const base = `${githubRepoUrl(repositoryFullName)}/git/trees/${treeSha}`;
  return options?.recursive ? `${base}?recursive=1` : base;
}

/** `GET /repos/{owner}/{repo}/commits` */
export function githubCommitsUrl(
  repositoryFullName: string,
  searchParams: URLSearchParams,
) {
  const q = searchParams.toString();
  return q
    ? `${githubRepoUrl(repositoryFullName)}/commits?${q}`
    : `${githubRepoUrl(repositoryFullName)}/commits`;
}

/**
 * Raw file URL via jsDelivr (`owner/repo@branch/path`).
 * @param encodedPath Path with each segment URL-encoded (e.g. spaces → %20).
 */
export function jsDelivrRawFileUrl(
  repositoryFullName: string,
  branch: string,
  encodedPath: string,
) {
  return `${JSDELIVR_GH_RAW_BASE}/${repositoryFullName}@${branch}/${encodedPath}`;
}
