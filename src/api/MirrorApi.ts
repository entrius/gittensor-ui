// Mirror API — public health endpoint of das-github-mirror.
// Used to verify a repository has the Gittensor Mirror GitHub App installed
// before letting registration submissions through.
const MIRROR_BASE_URL = import.meta.env.VITE_REACT_APP_MIRROR_BASE_URL;

interface MirrorHealthRepo {
  repo_full_name: string;
  last_event_at: string | null;
  hours_ago: number | null;
}

interface MirrorHealthResponse {
  status: 'ok' | 'error';
  repos?: MirrorHealthRepo[];
}

/**
 * Fetches the mirror's public /health response. Throws on missing config,
 * non-2xx responses, or network/parse failure so callers can distinguish
 * "couldn't check" from a successful empty result.
 */
const fetchMirrorHealth = async (): Promise<MirrorHealthResponse> => {
  if (!MIRROR_BASE_URL) {
    throw new Error('Mirror base URL is not configured.');
  }
  const response = await fetch(`${MIRROR_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Mirror health check failed (${response.status}).`);
  }
  return (await response.json()) as MirrorHealthResponse;
};

/**
 * Returns true if `repoFullName` ("owner/name") is currently in the mirror's
 * tracked repos list. Match is case-insensitive. Throws on fetch failure.
 */
export const isRepoTracked = async (repoFullName: string): Promise<boolean> => {
  const data = await fetchMirrorHealth();
  const tracked = new Set(
    (data.repos ?? []).map((repo) => repo.repo_full_name.toLowerCase()),
  );
  return tracked.has(repoFullName.toLowerCase());
};
