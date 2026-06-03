import type {
  MinerExplorerNumericRows,
  MinerExplorerRowsOption,
} from '../common/TablePagination';

export type MinerPrsViewMode = 'cards' | 'list';

export const MINER_PRS_TABLE_TO_CARD_ROWS: Record<
  MinerExplorerNumericRows,
  number
> = { 5: 6, 10: 12, 20: 24, 50: 48 };

export const resolveMinerPrsPageSize = (
  tableRows: MinerExplorerRowsOption,
  viewMode: MinerPrsViewMode,
): number | 'all' => {
  if (tableRows === 'all') return 'all';
  return viewMode === 'cards'
    ? MINER_PRS_TABLE_TO_CARD_ROWS[tableRows]
    : tableRows;
};

const STORAGE_KEY = 'miner:prs:viewMode';

export const readStoredMinerPrsViewMode = (): MinerPrsViewMode => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'cards';
  } catch {
    return 'list';
  }
};

export const writeStoredMinerPrsViewMode = (mode: MinerPrsViewMode): void => {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable
  }
};
