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

/**
 * Robust avatar source resolver.
 * Handles both usernames (github.com/user.png) and numeric IDs (avatars.githubusercontent.com/u/ID).
 * If both are provided, it prefers username unless it looks like a numeric ID.
 */
export const getGithubAvatarSrc = (
  username?: string | null,
  id?: string | number | null,
): string => {
  const trimmedUsername = username?.trim();
  const isNumeric = (val?: string | null) => !!val && /^\d+$/.test(val);

  if (trimmedUsername && !isNumeric(trimmedUsername)) {
    return getRepositoryOwnerAvatarSrc(trimmedUsername);
  }

  if (id) {
    return getGithubUserAvatarSrcById(id);
  }

  if (isNumeric(trimmedUsername)) {
    return getGithubUserAvatarSrcById(trimmedUsername);
  }

  return '';
};
