import React from 'react';
import { TableCell, TableSortLabel } from '@mui/material';
import {
  type MinerRepoTableSortField,
  type SortOrder,
} from '../../utils/ExplorerUtils';
import { sortLabelSx } from './MinerRepositoriesTable.styles';

interface SortableHeaderCellProps {
  field: MinerRepoTableSortField;
  label: string;
  align?: 'left' | 'right';
  width?: string;
  defaultDirection: SortOrder;
  activeField: MinerRepoTableSortField;
  activeOrder: SortOrder;
  onSort: (field: MinerRepoTableSortField) => void;
  cellStyle: Record<string, unknown>;
}

const SortableHeaderCell: React.FC<SortableHeaderCellProps> = ({
  field,
  label,
  align,
  width,
  defaultDirection,
  activeField,
  activeOrder,
  onSort,
  cellStyle,
}) => {
  const isActive = activeField === field;
  const direction = isActive ? activeOrder : defaultDirection;

  return (
    <TableCell align={align} sx={{ ...cellStyle, ...(width ? { width } : {}) }}>
      <TableSortLabel
        active={isActive}
        direction={direction}
        onClick={() => onSort(field)}
        sx={sortLabelSx}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
};

export default SortableHeaderCell;
