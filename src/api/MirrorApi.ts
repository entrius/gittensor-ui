// Mirror API — public endpoints of das-github-mirror.
// Used to verify a repository has the Gittensor Mirror GitHub App installed
// before letting registration submissions through.
const MIRROR_BASE_URL = import.meta.env.VITE_REACT_APP_MIRROR_BASE_URL;

interface RepoInstallationResponse {
  repo_full_name: string;
  installed: boolean;
}

/**
 * Returns true if the Gittensor Mirror GitHub App is installed on
 * `repoFullName` ("owner/name"), independent of whether the repo is already
 * registered — a repo is installed-but-unregistered while the user is still
 * going through registration, which is exactly the state this check gates.
 *
 * Uses the mirror's per-repo installation-status endpoint rather than the
 * /health repos list: /health only reports installed AND registered repos,
 * so a freshly-installed repo would be (wrongly) reported as not installed.
 *
 * Throws on missing config or network/parse failure so callers can
 * distinguish "couldn't check" from a definitive "not installed".
 */
export const isRepoInstalled = async (
  repoFullName: string,
): Promise<boolean> => {
  if (!MIRROR_BASE_URL) {
    throw new Error('Mirror base URL is not configured.');
  }
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repository full name: ${repoFullName}`);
  }
  const response = await fetch(
    `${MIRROR_BASE_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo,
    )}/installation`,
  );
  if (!response.ok) {
    throw new Error(`Mirror installation check failed (${response.status}).`);
  }
  const data = (await response.json()) as RepoInstallationResponse;
  return data.installed === true;
};
