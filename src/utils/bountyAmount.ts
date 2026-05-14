export const parseBountyAmount = (value: string | null | undefined): number => {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
};
