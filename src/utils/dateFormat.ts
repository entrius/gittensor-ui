/**
 * Formats an ISO date-only string (`YYYY-MM-DD`) as a local calendar date.
 * We intentionally avoid `new Date("YYYY-MM-DD")` because it is parsed as UTC
 * and can shift to the previous/next day in non-UTC timezones.
 */
export const formatIsoDateOnlyForDisplay = (
  isoDate: string,
  locale = 'en-US',
): string => {
  const parts = isoDate.split('-');
  if (parts.length !== 3) {
    return isoDate;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return isoDate;
  }

  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
