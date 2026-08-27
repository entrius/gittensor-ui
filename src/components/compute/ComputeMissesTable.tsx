import React from 'react';
import type { ServingMiss } from '../../api';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import { formatRoundTime } from './computeFormat';

const columns: DataTableColumn<ServingMiss>[] = [
  {
    key: 'time',
    header: 'Round',
    width: 160,
    renderCell: (miss) => formatRoundTime(miss.roundTs),
  },
  {
    key: 'reason',
    header: 'Reason',
    renderCell: (miss) => miss.reason,
    cellSx: { whiteSpace: 'normal', overflowWrap: 'anywhere' },
  },
];

export const ComputeMissesTable: React.FC<{ misses: ServingMiss[] }> = ({
  misses,
}) => (
  <DataTable<ServingMiss>
    columns={columns}
    rows={misses}
    getRowKey={(miss) => `${miss.roundTs}-${miss.reason}`}
    emptyLabel="No misses recorded in this window."
    minWidth={480}
  />
);
