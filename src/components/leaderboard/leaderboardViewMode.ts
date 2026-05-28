export type LeaderboardViewMode = 'cards' | 'list';

export const LEADERBOARD_VIEW_QUERY_PARAM = 'view';
const LEADERBOARD_VIEW_STORAGE_KEY = 'leaderboard:viewMode';

export const readStoredLeaderboardViewMode = (): LeaderboardViewMode => {
  try {
    return window.localStorage.getItem(LEADERBOARD_VIEW_STORAGE_KEY) === 'cards'
      ? 'cards'
      : 'list';
  } catch {
    return 'list';
  }
};

export const writeStoredLeaderboardViewMode = (
  mode: LeaderboardViewMode,
): void => {
  try {
    window.localStorage.setItem(LEADERBOARD_VIEW_STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable (private mode, quota).
  }
};

export const getLeaderboardViewModeFromQuery = (
  value: string | null,
  fallback: LeaderboardViewMode,
): LeaderboardViewMode => {
  if (value === 'cards') return 'cards';
  if (value === 'list') return 'list';
  return fallback;
};

// Card sizes divide by 1/2/3 so the last grid row is never partial across breakpoints.
export const LEADERBOARD_LIST_ROWS = [10, 25, 50] as const;
export const LEADERBOARD_CARD_ROWS = [12, 24, 48] as const;
export const LEADERBOARD_DEFAULT_LIST_ROWS = 25;
export const LEADERBOARD_DEFAULT_CARD_ROWS = 12;

export const LEADERBOARD_VALID_ROWS: readonly number[] = [
  ...LEADERBOARD_LIST_ROWS,
  ...LEADERBOARD_CARD_ROWS,
];

export const rowsOptionsForLeaderboardView = (
  mode: LeaderboardViewMode,
): readonly number[] =>
  mode === 'cards' ? LEADERBOARD_CARD_ROWS : LEADERBOARD_LIST_ROWS;

export const defaultRowsForLeaderboardView = (
  mode: LeaderboardViewMode,
): number =>
  mode === 'cards'
    ? LEADERBOARD_DEFAULT_CARD_ROWS
    : LEADERBOARD_DEFAULT_LIST_ROWS;

export const clampRowsForLeaderboardView = (
  rows: number,
  mode: LeaderboardViewMode,
): number => {
  const options = rowsOptionsForLeaderboardView(mode);
  if ((options as readonly number[]).includes(rows)) return rows;
  return defaultRowsForLeaderboardView(mode);
};
