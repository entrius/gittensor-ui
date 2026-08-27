import React from 'react';
import type { ServingMiss } from '../../api';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import { MissReasonText } from './MissReasonText';
import { formatRoundTime } from './computeFormat';

const cellSx = { py: 0.75, whiteSpace: 'nowrap' } as const;

const columns: DataTableColumn<ServingMiss>[] = [
  {
    key: 'time',
    header: 'Round',
    width: 170,
    cellSx,
    renderCell: (miss) => formatRoundTime(miss.roundTs),
  },
  {
    key: 'reason',
    header: 'Reason',
    cellSx,
    renderCell: (miss) => (
      <MissReasonText reason={miss.reason} maxWidth="100%" />
    ),
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
  />
);
