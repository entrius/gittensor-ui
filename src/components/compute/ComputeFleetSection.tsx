import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  ButtonBase,
  Skeleton,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { useComputeFleet, type ComputeFleet } from '../../api';
import { useClipboardCopy } from '../../hooks/useClipboardCopy';
import { STATUS_COLORS, TEXT_OPACITY, tooltipSlotProps } from '../../theme';
import KpiCard from '../KpiCard';
import { DataTable, type DataTableColumn } from '../common/DataTable';
import { CopyableHotkey } from './CopyableHotkey';
import { FleetStatusChip } from './FleetStatusChip';
import {
  fleetRows,
  formatAgo,
  formatDuration,
  formatUsdRate,
  lastMiss,
  provenCards,
  type FleetRow,
} from './fleetFormat';

const cellSx = { py: 0.75, px: 1, whiteSpace: 'nowrap' } as const;
const headerSx = { px: 1 } as const;
const mono = { fontFamily: '"JetBrains Mono", monospace' } as const;

/** Unix seconds, re-read often enough that uptimes and "ago" labels move between polls. */
const useNowS = (everyMs = 10_000): number => {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() / 1000), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
};

const ScorecardKpi: React.FC<{ fleet: ComputeFleet; nowS: number }> = ({
  fleet,
  nowS,
}) => {
  const sha = fleet.scorecard?.sha256 ?? '';
  const { copied, copy, liveRegion } = useClipboardCopy({
    copiedMessage: 'Scorecard hash copied to clipboard',
  });
  const card = (
    <KpiCard
      sx={{ flex: 1 }}
      title="Scorecard"
      value={sha ? sha.slice(0, 10) : '—'}
      subtitle={
        !fleet.scorecard
          ? 'none written yet'
          : `${fleet.scorecard.valid ? 'signed' : 'not valid'} · ${formatAgo(fleet.scorecard.issued_at, nowS)}`
      }
    />
  );
  if (!sha) return card;
  return (
    <>
      <Tooltip
        title={copied ? 'Copied' : 'Copy the full sha256'}
        arrow
        placement="top"
        slotProps={tooltipSlotProps}
      >
        <ButtonBase
          onClick={() => void copy(sha)}
          aria-label="Copy scorecard hash"
          sx={{
            display: 'flex',
            alignItems: 'stretch',
            width: '100%',
            height: '100%',
            borderRadius: 3,
            textAlign: 'inherit',
            ...mono,
          }}
        >
          {card}
        </ButtonBase>
      </Tooltip>
      {liveRegion}
    </>
  );
};

const FleetKpis: React.FC<{ fleet: ComputeFleet; nowS: number }> = ({
  fleet,
  nowS,
}) => {
  const [gpu, rate] = Object.entries(fleet.rates)[0] ?? [];
  const recycle = fleet.scorecard?.recycle_share;
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          lg: 'repeat(6, minmax(0, 1fr))',
        },
      }}
    >
      <KpiCard
        title="Cards proven"
        value={provenCards(fleet)}
        subtitle={`${fleet.totals.boxes} box${fleet.totals.boxes === 1 ? '' : 'es'}`}
      />
      <KpiCard
        title="Cards leased"
        value={fleet.totals.cards_by_state.LEASED ?? 0}
        subtitle="serving a workload now"
      />
      <KpiCard
        title="Idle / leased rate"
        value={
          rate
            ? `${formatUsdRate(rate.idle_usd_per_card_hour)}/${formatUsdRate(rate.leased_usd_per_card_hour)}`
            : '—'
        }
        subtitle={gpu ? `USD per card-hour · ${gpu}` : 'USD per card-hour'}
      />
      <KpiCard
        title="Recycle share"
        value={recycle == null ? '—' : `${(recycle * 100).toFixed(1)}%`}
        subtitle="of compute emissions unspent"
      />
      <ScorecardKpi fleet={fleet} nowS={nowS} />
      <KpiCard
        title="Last proof round"
        value={formatAgo(fleet.controller.last_round_at, nowS)}
        subtitle={
          fleet.controller.round_n == null
            ? undefined
            : `round ${fleet.controller.round_n}`
        }
      />
    </Box>
  );
};

/** The live pool: KPIs and one row per card, from the state the controller publishes. */
export const ComputeFleetSection: React.FC = () => {
  const theme = useTheme();
  const secondary = alpha(theme.palette.common.white, TEXT_OPACITY.secondary);
  const { data: fleet, isLoading, isError } = useComputeFleet();
  const nowS = useNowS();
  const rows = useMemo(() => fleetRows(fleet?.boxes ?? []), [fleet]);

  const columns = useMemo<DataTableColumn<FleetRow>[]>(
    () => [
      {
        key: 'uid',
        header: 'UID',
        width: 60,
        cellSx,
        headerSx,
        renderCell: (r) => (r.leads ? (r.box.uid ?? '—') : ''),
      },
      {
        key: 'hotkey',
        header: 'Hotkey',
        width: 140,
        cellSx,
        headerSx,
        renderCell: (r) =>
          r.leads ? <CopyableHotkey hotkey={r.box.hotkey} edge={5} /> : null,
      },
      {
        key: 'status',
        header: 'Status',
        width: 112,
        cellSx,
        headerSx,
        renderCell: (r) => <FleetStatusChip status={r.status} />,
      },
      {
        key: 'workload',
        header: 'Workload',
        cellSx,
        headerSx,
        renderCell: (r) =>
          r.card?.workload ? (
            <Tooltip
              title={r.card.image ?? r.card.workload}
              arrow
              placement="top"
              slotProps={tooltipSlotProps}
            >
              <Box component="span" sx={{ ...mono, fontSize: '0.8rem' }}>
                {r.card.workload}
              </Box>
            </Tooltip>
          ) : (
            '—'
          ),
      },
      {
        key: 'gpu',
        header: 'GPU',
        width: 96,
        cellSx,
        headerSx,
        renderCell: (r) => r.box.gpu_type ?? '—',
      },
      {
        key: 'uptime',
        header: 'Uptime',
        width: 96,
        align: 'right',
        cellSx,
        headerSx,
        renderCell: (r) => {
          if (!r.card) return '—';
          const from =
            r.status === 'LEASED' && r.card.leased_at
              ? r.card.leased_at
              : r.card.since;
          return from == null ? '—' : formatDuration(nowS - from);
        },
      },
      {
        key: 'standing',
        header: 'Standing',
        width: 100,
        cellSx,
        headerSx,
        renderCell: (r) => (r.leads ? r.box.standing : ''),
      },
      {
        key: 'lastMiss',
        header: 'Last miss',
        cellSx,
        headerSx,
        renderCell: (r) => {
          const miss = lastMiss(r, nowS);
          if (!miss) return '—';
          // A bench reason is a sentence now, not a check name: cap it so one long one does not widen the table,
          // and keep the whole of it a hover away.
          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 0.75,
                minWidth: 0,
              }}
            >
              <Tooltip
                title={miss.text}
                arrow
                placement="top"
                slotProps={tooltipSlotProps}
              >
                <Box
                  component="span"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 360,
                  }}
                >
                  {miss.text}
                </Box>
              </Tooltip>
              {miss.when && (
                <Box component="span" sx={{ color: secondary, flexShrink: 0 }}>
                  {miss.when}
                </Box>
              )}
            </Box>
          );
        },
      },
      {
        key: 'bench',
        header: 'Benched until',
        width: 130,
        cellSx,
        headerSx,
        renderCell: (r) =>
          r.status === 'BENCHED' && r.box.bench_until
            ? r.box.bench_until > nowS
              ? `in ${formatDuration(r.box.bench_until - nowS)}`
              : 'next proof'
            : '—',
      },
    ],
    [nowS, secondary],
  );

  // Not wired (404), the controller is down (503), a bad document (502): the page keeps its static content.
  if (isError || (!isLoading && !fleet)) {
    return (
      <Typography variant="body2" sx={{ color: secondary, maxWidth: 860 }}>
        A live fleet table (card status, workload, uptime) returns here once the
        pool publishes its state.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {fleet ? (
        <FleetKpis fleet={fleet} nowS={nowS} />
      ) : (
        <Skeleton variant="rounded" height={88} />
      )}
      {fleet?.stale && (
        <Typography
          variant="body2"
          role="status"
          sx={{ color: STATUS_COLORS.warning }}
        >
          Last update {formatAgo(fleet.generated_at, nowS)}. The pool has not
          published since; what follows may be out of date.
        </Typography>
      )}
      <DataTable<FleetRow>
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.key}
        isLoading={isLoading}
        minWidth={980}
        emptyState={
          <Typography variant="body2" sx={{ color: secondary, py: 3 }}>
            No cards in the pool yet. Be the first:{' '}
            <Box component="span" sx={{ ...mono, color: 'common.white' }}>
              gitt up
            </Box>
          </Typography>
        }
      />
    </Box>
  );
};
