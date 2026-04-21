// TODO: remove after MinerRepositoriesTable migrates to DataTable (its only caller).
import { TableCell, TableSortLabel } from '@mui/material';
import { type SortOrder } from '../../utils/ExplorerUtils';
import { sortLabelSx } from './MinerRepositoriesTable.styles';

interface SortableHeaderCellProps<TField extends string> {
  field: TField;
  label: string;
  align?: 'left' | 'right';
  width?: string;
  defaultDirection: SortOrder;
  activeField: TField;
  activeOrder: SortOrder;
  onSort: (field: TField) => void;
  cellStyle: Record<string, unknown>;
}

const SortableHeaderCell = <TField extends string>({
  field,
  label,
  align,
  width,
  defaultDirection,
  activeField,
  activeOrder,
  onSort,
  cellStyle,
}: SortableHeaderCellProps<TField>) => {
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
