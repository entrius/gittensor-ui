export const minerDetailsPath = (
  githubId: string | number | null | undefined,
  options?: { mode?: string; tab?: string },
): string => {
  let path = `/miners/details?githubId=${encodeURIComponent(githubId ?? '')}`;
  if (options?.mode) path += `&mode=${options.mode}`;
  if (options?.tab) path += `&tab=${options.tab}`;
  return path;
};

export const bountyDetailsPath = (id: number | string): string =>
  `/bounties/details?id=${id}`;

export const minerPrPath = (
  repository: string,
  pullRequestNumber: number | string,
): string =>
  `/miners/pr?repo=${encodeURIComponent(repository)}&number=${pullRequestNumber}`;

export const minerRepositoryPath = (
  repositoryFullName: string,
  options?: { tab?: string },
): string => {
  const base = `/miners/repository?name=${encodeURIComponent(repositoryFullName)}`;
  return options?.tab ? `${base}&tab=${options.tab}` : base;
};

export const computePath = (): string => '/compute';
/** The landing page with the dial turned to compute — where the fleet actually lives in the UI. */
export const computeViewPath = (): string => '/?view=compute';

export const computeMinerPath = (hotkey: string): string =>
  `/compute/miner?hotkey=${encodeURIComponent(hotkey)}`;

/** Loose ss58 check — 48 chars, starts with `5` (Bittensor hotkeys). */
export const looksLikeSs58Hotkey = (value: string): boolean =>
  /^5[1-9A-HJ-NP-Za-km-z]{47}$/.test(value);
