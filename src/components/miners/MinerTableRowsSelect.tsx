import React from 'react';
import { Box, FormControl, MenuItem, Select, Typography } from '@mui/material';
import {
  MINER_EXPLORER_ROWS_OPTIONS,
  MINER_EXPLORER_ROWS_SELECT_SX,
  type MinerExplorerRowsOption,
} from '../common/TablePagination';

export interface MinerTableRowsSelectProps {
  value: MinerExplorerRowsOption;
  onChange: (next: MinerExplorerRowsOption) => void;
  id?: string;
}

/** Rows-per-page control for the Miner PRs table header toolbar. */
const MinerTableRowsSelect: React.FC<MinerTableRowsSelectProps> = ({
  value,
  onChange,
  id = 'miner-table-rows',
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
            {n}
          </MenuItem>
        ))}
        <MenuItem value="all">All</MenuItem>
      </Select>
    </Box>
  </FormControl>
);

export default MinerTableRowsSelect;
