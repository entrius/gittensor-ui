export const getRepositoryOwnerAvatarSrc = (
  owner: string | null | undefined,
): string => {
  const normalizedOwner = owner?.trim();
  if (!normalizedOwner) return '';
  return `https://github.com/${encodeURIComponent(normalizedOwner)}.png`;
};

export const getGithubUserAvatarSrcById = (
  githubId: string | number | null | undefined,
): string => {
  const normalizedId = String(githubId ?? '').trim();
  if (!normalizedId) return '';
  return `https://avatars.githubusercontent.com/u/${encodeURIComponent(
    normalizedId,
  )}`;
};
