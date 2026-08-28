import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ServingMiner } from '../../api';
import { useDataTableParams } from '../../hooks/useDataTableParams';
import { computeMinerPath } from '../../utils/paths';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import { ComputeStatusBadge } from './ComputeStatusBadge';
import { CopyableHotkey } from './CopyableHotkey';
import { MissReasonText } from './MissReasonText';
import {
  formatAlpha,
  formatFixed,
  formatPercent,
  uptimeFraction,
} from './computeFormat';

const SORT_KEYS = [
  'uid',
  'status',
  'tps',
  'credit',
  'capacity',
  'settled',
  'uptime',
  'alpha',
] as const;
type FleetSortKey = (typeof SORT_KEYS)[number];

const STATUS_RANK = { ready: 0, probation: 1, quarantined: 2 } as const;

// Compact single-line rows; numeric cells right-aligned.
const cellSx = { py: 0.75, px: 1, whiteSpace: 'nowrap' } as const;
const headerSx = { px: 1 } as const;

/** Probe-derived metrics only mean something once a miner is READY. */
const readyOnly = (
  miner: ServingMiner,
  render: (m: ServingMiner) => string,
): string => (miner.status === 'ready' ? render(miner) : '—');

const sortValue = (miner: ServingMiner, key: FleetSortKey): number => {
  switch (key) {
    case 'uid':
      return miner.uid;
    case 'status':
      return STATUS_RANK[miner.status] ?? 3;
    case 'tps':
      return miner.probeTps ?? -1;
    case 'credit':
      return miner.credit;
    case 'capacity':
      return miner.capacity;
    case 'settled':
      return miner.settledScore;
    case 'uptime':
      return uptimeFraction(miner) ?? -1;
    case 'alpha':
      return miner.estAlphaPerDay ?? -1;
    default:
      return 0;
  }
};

interface ComputeFleetTableProps {
  miners: ServingMiner[];
  /** False when the validator had no alpha price — payouts render as "—". */
  priced?: boolean;
  isLoading: boolean;
  isError: boolean;
  emptyState: React.ReactNode;
}

export const ComputeFleetTable: React.FC<ComputeFleetTableProps> = ({
  miners,
  priced = true,
  isLoading,
  isError,
  emptyState,
}) => {
  const navigate = useNavigate();
  const { sortField, sortOrder, setSort } = useDataTableParams<FleetSortKey>({
    sortKeys: SORT_KEYS,
    defaultSortKey: 'settled',
    defaultOrderOverrides: { uid: 'asc', status: 'asc' },
  });

  const rows = useMemo(() => {
    const direction = sortOrder === 'asc' ? 1 : -1;
    return [...miners].sort((a, b) => {
      const diff = sortValue(a, sortField) - sortValue(b, sortField);
      return diff !== 0 ? diff * direction : a.uid - b.uid;
    });
  }, [miners, sortField, sortOrder]);

  const columns = useMemo<DataTableColumn<ServingMiner, FleetSortKey>[]>(
    () => [
      {
        key: 'uid',
        header: 'UID',
        width: 60,
        sortKey: 'uid',
        cellSx,
        headerSx,
        renderCell: (m) => m.uid,
      },
      {
        key: 'hotkey',
        header: 'Hotkey',
        width: 140,
        cellSx,
        headerSx,
        renderCell: (m) => <CopyableHotkey hotkey={m.hotkey} edge={5} />,
      },
      {
        key: 'status',
        header: 'Status',
        width: 118,
        sortKey: 'status',
        cellSx,
        headerSx,
        renderCell: (m) => <ComputeStatusBadge status={m.status} />,
      },
      {
        key: 'tps',
        header: 'tok/s',
        width: 76,
        align: 'right',
        sortKey: 'tps',
        cellSx,
        headerSx,
        renderCell: (m) => readyOnly(m, (x) => formatFixed(x.probeTps, 0)),
      },
      {
        key: 'credit',
        header: 'TTFT',
        width: 76,
        align: 'right',
        sortKey: 'credit',
        cellSx,
        headerSx,
        renderCell: (m) => readyOnly(m, (x) => formatFixed(x.credit, 2)),
      },
      {
        key: 'capacity',
        header: 'Capacity',
        width: 104,
        align: 'right',
        sortKey: 'capacity',
        cellSx,
        headerSx,
        renderCell: (m) => readyOnly(m, (x) => formatFixed(x.capacity, 2)),
      },
      {
        key: 'settled',
        header: 'Settled',
        width: 86,
        align: 'right',
        sortKey: 'settled',
        cellSx,
        headerSx,
        renderCell: (m) => formatFixed(m.settledScore, 3),
      },
      {
        key: 'uptime',
        header: 'Uptime 24h',
        width: 120,
        align: 'right',
        sortKey: 'uptime',
        cellSx,
        headerSx,
        renderCell: (m) => formatPercent(uptimeFraction(m)),
      },
      {
        key: 'alpha',
        header: 'Est. α/day',
        width: 120,
        align: 'right',
        sortKey: 'alpha',
        cellSx,
        headerSx,
        renderCell: (m) =>
          priced ? readyOnly(m, (x) => formatAlpha(x.estAlphaPerDay)) : '—',
      },
      {
        key: 'lastMiss',
        header: 'Last miss',
        cellSx,
        headerSx,
        renderCell: (m) => <MissReasonText reason={m.lastMissReason} />,
      },
    ],
    [priced],
  );

  return (
    <DataTable<ServingMiner, FleetSortKey>
      columns={columns}
      rows={rows}
      getRowKey={(m) => `${m.uid}-${m.hotkey}`}
      isLoading={isLoading}
      isError={isError}
      errorLabel="Could not load the compute fleet."
      emptyState={emptyState}
      onRowClick={(m) => navigate(computeMinerPath(m.hotkey))}
      sort={{ field: sortField, order: sortOrder, onChange: setSort }}
    />
  );
};
