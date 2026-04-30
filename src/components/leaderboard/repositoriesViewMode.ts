import {
  CARD_LIST_VIEW_QUERY_PARAM,
  CARD_ROW_SIZES,
  DEFAULT_CARD_ROWS,
  DEFAULT_LIST_ROWS,
  LIST_ROW_SIZES,
  VALID_ROW_SIZES,
  cardListViewModeFromQuery,
  clampCardListRows,
  createCardListViewModeStorage,
  type CardListViewMode,
} from '../../utils/cardListViewMode';

export type RepositoriesViewMode = CardListViewMode;

export const REPOSITORIES_VIEW_QUERY_PARAM = CARD_LIST_VIEW_QUERY_PARAM;
export const REPOSITORIES_VIEW_STORAGE_KEY = 'repositories:viewMode';

const storage = createCardListViewModeStorage(REPOSITORIES_VIEW_STORAGE_KEY);
export const readStoredRepositoriesViewMode = storage.read;
export const writeStoredRepositoriesViewMode = storage.write;

export const getRepositoriesViewModeFromQuery = cardListViewModeFromQuery;

export const REPOSITORIES_LIST_ROWS = LIST_ROW_SIZES;
export const REPOSITORIES_CARD_ROWS = CARD_ROW_SIZES;
export const REPOSITORIES_VALID_ROWS = VALID_ROW_SIZES;
export const REPOSITORIES_DEFAULT_LIST_ROWS = DEFAULT_LIST_ROWS;
export const REPOSITORIES_DEFAULT_CARD_ROWS = DEFAULT_CARD_ROWS;

export const clampRowsForRepositoriesView = clampCardListRows;
