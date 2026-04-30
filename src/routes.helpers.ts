/**
 * Centralized URL builders for app routes. Keep route paths and their query
 * parameter contracts in one place so a path/param rename only requires
 * editing this file (and `routes.tsx`), instead of 30+ call sites.
 */

export type MinerMode = 'prs' | 'issues';

export const getMinerHref = (
  githubId: string | number,
  opts?: { mode?: MinerMode; tab?: string },
): string => {
  const params = new URLSearchParams();
  params.set('githubId', String(githubId));
  if (opts?.mode) params.set('mode', opts.mode);
  if (opts?.tab) params.set('tab', opts.tab);
  return `/miners/details?${params.toString()}`;
};

export const getRepoHref = (name: string): string =>
  `/miners/repository?name=${encodeURIComponent(name)}`;

export const getPrHref = (
  repo: string,
  number: number | string,
): string =>
  `/miners/pr?repo=${encodeURIComponent(repo)}&number=${encodeURIComponent(String(number))}`;

export const getBountyHref = (id: number | string): string =>
  `/bounties/details?id=${id}`;
