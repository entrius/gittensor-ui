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
