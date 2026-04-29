export const getRepositoryOwnerAvatarSrc = (
  owner: string | null | undefined,
): string => {
  const normalizedOwner = owner?.trim();
  if (!normalizedOwner) return '';
  return `https://github.com/${encodeURIComponent(normalizedOwner)}.png`;
};
