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
