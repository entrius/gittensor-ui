import axios from 'axios';
import { isAbortError } from '../../hooks/useAbortableEffect';

/** Build a jsDelivr raw-file URL for a file at a given branch of a GitHub repo. */
export const jsdelivrUrl = (
  repositoryFullName: string,
  branch: string,
  path: string,
): string =>
  `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${branch}/${path}`;

export interface MarkdownProbeResult {
  content: string;
  branch: string;
}

/**
 * Probe jsDelivr for the first branch/path combination that returns a non-empty
 * file. Returns null when nothing was found or the signal was aborted.
 * Aborts are propagated by re-throwing so callers can distinguish them from
 * "not found".
 */
export async function fetchFirstMarkdown(
  repositoryFullName: string,
  branches: readonly string[],
  paths: readonly string[],
  signal: AbortSignal,
): Promise<MarkdownProbeResult | null> {
  for (const branch of branches) {
    for (const path of paths) {
      if (signal.aborted) return null;
      try {
        const { status, data } = await axios.get<string>(
          jsdelivrUrl(repositoryFullName, branch, path),
          { signal },
        );
        if (status === 200 && data) return { content: data, branch };
      } catch (err) {
        if (isAbortError(err)) return null;
        // 404 or other failure — try the next combination.
      }
    }
  }
  return null;
}
