import React from 'react';
import { Box, FormControl, MenuItem, Select, Typography } from '@mui/material';
import {
  MINER_EXPLORER_ROWS_OPTIONS,
  MINER_EXPLORER_ROWS_SELECT_SX,
  type MinerExplorerNumericRows,
  type MinerExplorerRowsOption,
} from '../common/TablePagination';
import { MINER_PRS_TABLE_TO_CARD_ROWS } from './minerPrsViewMode';

export interface MinerTableRowsSelectProps {
  value: MinerExplorerRowsOption;
  onChange: (next: MinerExplorerRowsOption) => void;
  id?: string;
  /** When true, menu and closed label show card grid sizes (6, 12, 24, 48). */
  cardView?: boolean;
}

const formatRowsLabel = (
  tableRows: MinerExplorerRowsOption,
  cardView: boolean,
): string => {
  if (tableRows === 'all') return 'All';
  return cardView
    ? String(MINER_PRS_TABLE_TO_CARD_ROWS[tableRows])
    : String(tableRows);
};

/** Rows-per-page control for the Miner PRs table header toolbar. */
const MinerTableRowsSelect: React.FC<MinerTableRowsSelectProps> = ({
  value,
  onChange,
  id = 'miner-table-rows',
  cardView = false,
}) => (
  <FormControl size="small" sx={{ flexShrink: 0 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
      >
        Rows:
      </Typography>
      <Select
        id={id}
        aria-label="Rows per page"
        value={value === 'all' ? 'all' : value}
        renderValue={(selected) => {
          const rows: MinerExplorerRowsOption =
            selected === 'all'
              ? 'all'
              : (Number(selected) as MinerExplorerNumericRows);
          return formatRowsLabel(rows, cardView);
        }}
        onChange={(e) => {
          const v = e.target.value;
          onChange(
            v === 'all' ? 'all' : (Number(v) as MinerExplorerRowsOption),
          );
        }}
        sx={MINER_EXPLORER_ROWS_SELECT_SX}
      >
        {MINER_EXPLORER_ROWS_OPTIONS.filter((o) => o !== 'all').map((n) => (
          <MenuItem key={n} value={n}>
            {formatRowsLabel(n, cardView)}
          </MenuItem>
        ))}
        <MenuItem value="all">All</MenuItem>
      </Select>
    </Box>
  </FormControl>
);

export default MinerTableRowsSelect;
