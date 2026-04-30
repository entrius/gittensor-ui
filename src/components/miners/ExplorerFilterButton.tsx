import React from 'react';
import FilterButton from '../FilterButton';

interface ExplorerFilterButtonProps {
  label: string;
  count: number;
  color: string;
  selected: boolean;
  onClick: () => void;
}

/**
 * Compact filter button used inside dense miner-explorer toolbars. Thin
 * wrapper over the shared `FilterButton` (variant="compact") that keeps the
 * `selected` prop name historically used at call sites.
 */
const ExplorerFilterButton: React.FC<ExplorerFilterButtonProps> = ({
  label,
  count,
  color,
  selected,
  onClick,
}) => (
  <FilterButton
    label={label}
    count={count}
    color={color}
    isActive={selected}
    onClick={onClick}
    variant="compact"
  />
);

export default ExplorerFilterButton;
