export type RepositoriesViewMode = 'cards' | 'list';

export const REPOSITORIES_VIEW_QUERY_PARAM = 'view';
export const REPOSITORIES_VIEW_STORAGE_KEY = 'repositories:viewMode';

export const readStoredRepositoriesViewMode = (): RepositoriesViewMode => {
  try {
    return window.localStorage.getItem(REPOSITORIES_VIEW_STORAGE_KEY) ===
      'cards'
      ? 'cards'
      : 'list';
  } catch {
    return 'list';
  }
};

export const writeStoredRepositoriesViewMode = (
  mode: RepositoriesViewMode,
): void => {
  try {
    window.localStorage.setItem(REPOSITORIES_VIEW_STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable (private mode, quota) — preference won't persist
  }
};

export const getRepositoriesViewModeFromQuery = (
  value: string | null,
  fallback: RepositoriesViewMode,
): RepositoriesViewMode => {
  if (value === 'cards') return 'cards';
  if (value === 'list') return 'list';
  return fallback;
};

// Card grid is up to 3 cols (lg/md), 2 (sm), 1 (xs). These page sizes
// divide evenly by 1, 2 and 3, so the last row of cards is never partial.
export const REPOSITORIES_LIST_ROWS = [10, 25, 50] as const;
export const REPOSITORIES_CARD_ROWS = [12, 24, 48] as const;
export const REPOSITORIES_VALID_ROWS: readonly number[] = [
  ...REPOSITORIES_LIST_ROWS,
  ...REPOSITORIES_CARD_ROWS,
];
export const REPOSITORIES_DEFAULT_LIST_ROWS = 10;
export const REPOSITORIES_DEFAULT_CARD_ROWS = 12;

export const clampRowsForRepositoriesView = (
  rows: number,
  mode: RepositoriesViewMode,
): number => {
  const options =
    mode === 'cards' ? REPOSITORIES_CARD_ROWS : REPOSITORIES_LIST_ROWS;
  if ((options as readonly number[]).includes(rows)) return rows;
  return mode === 'cards'
    ? REPOSITORIES_DEFAULT_CARD_ROWS
    : REPOSITORIES_DEFAULT_LIST_ROWS;
};
