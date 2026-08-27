import React, { useMemo } from 'react';
import { Box, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { ServingMiner } from '../../api';
import { useDataTableParams } from '../../hooks/useDataTableParams';
import { TEXT_OPACITY, tooltipSlotProps } from '../../theme';
import { computeMinerPath } from '../../utils/paths';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import { ComputeStatusBadge } from './ComputeStatusBadge';
import { CopyableHotkey } from './CopyableHotkey';
import {
  formatAlpha,
  formatFixed,
  formatPercent,
  formatWindow,
  uptimeFraction,
} from './computeFormat';

const SORT_KEYS = [
  'uid',
  'status',
  'window',
  'tps',
  'credit',
  'capacity',
  'settled',
  'uptime',
  'alpha',
] as const;
type FleetSortKey = (typeof SORT_KEYS)[number];

const STATUS_RANK = { ready: 0, probation: 1, quarantined: 2 } as const;
const LAST_MISS_MAX_CHARS = 28;

const sortValue = (miner: ServingMiner, key: FleetSortKey): number => {
  switch (key) {
    case 'uid':
      return miner.uid;
    case 'status':
      return STATUS_RANK[miner.status] ?? 3;
    case 'window':
      return miner.windowMean;
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
  isLoading: boolean;
  isError: boolean;
  emptyState: React.ReactNode;
}

export const ComputeFleetTable: React.FC<ComputeFleetTableProps> = ({
  miners,
  isLoading,
  isError,
  emptyState,
}) => {
  const theme = useTheme();
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

  const muted = alpha(theme.palette.common.white, TEXT_OPACITY.muted);

  const columns = useMemo<DataTableColumn<ServingMiner, FleetSortKey>[]>(
    () => [
      {
        key: 'uid',
        header: 'UID',
        width: 64,
        sortKey: 'uid',
        renderCell: (m) => m.uid,
      },
      {
        key: 'hotkey',
        header: 'Hotkey',
        width: 170,
        renderCell: (m) => <CopyableHotkey hotkey={m.hotkey} edge={5} />,
      },
      {
        key: 'status',
        header: 'Status',
        width: 120,
        sortKey: 'status',
        renderCell: (m) => <ComputeStatusBadge status={m.status} />,
      },
      {
        key: 'window',
        header: 'Window',
        width: 110,
        sortKey: 'window',
        renderCell: (m) => formatWindow(m),
      },
      {
        key: 'tps',
        header: 'tok/s',
        width: 84,
        align: 'right',
        sortKey: 'tps',
        renderCell: (m) => formatFixed(m.probeTps, 0),
      },
      {
        key: 'credit',
        header: 'TTFT credit',
        width: 100,
        align: 'right',
        sortKey: 'credit',
        renderCell: (m) => formatFixed(m.credit, 2),
      },
      {
        key: 'capacity',
        header: 'Capacity',
        width: 92,
        align: 'right',
        sortKey: 'capacity',
        renderCell: (m) => formatFixed(m.capacity, 2),
      },
      {
        key: 'settled',
        header: 'Settled',
        width: 92,
        align: 'right',
        sortKey: 'settled',
        renderCell: (m) => formatFixed(m.settledScore, 3),
      },
      {
        key: 'uptime',
        header: 'Uptime 24h',
        width: 100,
        align: 'right',
        sortKey: 'uptime',
        renderCell: (m) => formatPercent(uptimeFraction(m)),
      },
      {
        key: 'alpha',
        header: 'Est. α/day',
        width: 104,
        align: 'right',
        sortKey: 'alpha',
        renderCell: (m) => formatAlpha(m.estAlphaPerDay),
      },
      {
        key: 'lastMiss',
        header: 'Last miss',
        width: 200,
        renderCell: (m) => {
          const reason = m.lastMissReason?.trim();
          if (!reason) return <Box sx={{ color: muted }}>—</Box>;
          const truncated =
            reason.length > LAST_MISS_MAX_CHARS
              ? `${reason.slice(0, LAST_MISS_MAX_CHARS)}…`
              : reason;
          return (
            <Tooltip
              title={reason}
              arrow
              placement="top"
              slotProps={tooltipSlotProps}
            >
              <Typography
                component="span"
                sx={{
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  color: theme.palette.status.error,
                  whiteSpace: 'nowrap',
                }}
              >
                {truncated}
              </Typography>
            </Tooltip>
          );
        },
      },
    ],
    [muted, theme.palette.status.error],
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
      minWidth={1180}
      onRowClick={(m) => navigate(computeMinerPath(m.hotkey))}
      sort={{ field: sortField, order: sortOrder, onChange: setSort }}
    />
  );
};
