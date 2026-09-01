import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ServingMiner } from '../../api';
import { useDataTableParams } from '../../hooks/useDataTableParams';
import { computeMinerPath } from '../../utils/paths';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import { ColumnHint } from './ColumnHint';
import { ComputeStatusBadge } from './ComputeStatusBadge';
import { CopyableHotkey } from './CopyableHotkey';
import { MissReasonText } from './MissReasonText';
import {
  COMPUTE_METRIC_HINTS,
  formatAlpha,
  formatFixed,
  formatMs,
  formatPercent,
  formatTokens,
  uptimeFraction,
} from './computeFormat';

const SORT_KEYS = [
  'uid',
  'status',
  'tps',
  'ttft',
  'credit',
  'tokens',
  'settled',
  'uptime',
  'alpha',
] as const;
type FleetSortKey = (typeof SORT_KEYS)[number];

const STATUS_RANK = { ready: 0, probation: 1, quarantined: 2 } as const;

// Compact single-line rows; numeric cells right-aligned.
const cellSx = { py: 0.75, px: 1, whiteSpace: 'nowrap' } as const;
const headerSx = { px: 1 } as const;

/** Payout only means something once a miner is READY. */
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
      return miner.decodeTps ?? -1;
    case 'ttft':
      return miner.ttftMs ?? Number.POSITIVE_INFINITY;
    case 'credit':
      return miner.credit;
    case 'tokens':
      return miner.tokens24h;
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
    defaultOrderOverrides: { uid: 'asc', status: 'asc', ttft: 'asc' },
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
        header: <ColumnHint label="tok/s" hint={COMPUTE_METRIC_HINTS.tps} />,
        width: 76,
        align: 'right',
        sortKey: 'tps',
        cellSx,
        headerSx,
        renderCell: (m) => formatFixed(m.decodeTps, 0),
      },
      {
        key: 'ttft',
        header: <ColumnHint label="TTFT" hint={COMPUTE_METRIC_HINTS.ttft} />,
        width: 84,
        align: 'right',
        sortKey: 'ttft',
        cellSx,
        headerSx,
        renderCell: (m) => formatMs(m.ttftMs),
      },
      {
        key: 'credit',
        header: <ColumnHint label="Speed" hint={COMPUTE_METRIC_HINTS.credit} />,
        width: 76,
        align: 'right',
        sortKey: 'credit',
        cellSx,
        headerSx,
        renderCell: (m) => formatFixed(m.credit, 2),
      },
      {
        key: 'tokens',
        header: (
          <ColumnHint label="Tokens 24h" hint={COMPUTE_METRIC_HINTS.tokens} />
        ),
        width: 100,
        align: 'right',
        sortKey: 'tokens',
        cellSx,
        headerSx,
        renderCell: (m) => formatTokens(m.tokens24h),
      },
      {
        key: 'settled',
        header: (
          <ColumnHint label="Settled" hint={COMPUTE_METRIC_HINTS.settled} />
        ),
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
