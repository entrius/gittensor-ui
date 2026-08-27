import React, { useMemo } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Box, Link, Stack, Typography, alpha, useTheme } from '@mui/material';
import { Page } from '../components/layout';
import { BackButton, SEO } from '../components';
import KpiCard from '../components/KpiCard';
import {
  COMPUTE_STATUS_META,
  ComputeMissesTable,
  ComputeRoundChart,
  ComputeStatusBadge,
  CopyableHotkey,
  ValidatorSnapshotFootnote,
  describeMinerStatus,
  formatAlpha,
  formatFixed,
  formatPercent,
  formatRelative,
  formatUsd,
  shortHotkey,
  uptimeFraction,
} from '../components/compute';
import {
  isNotFoundError,
  useServingMinerDetail,
  type ServingMiner,
  type ServingRound,
} from '../api';
import { STATUS_COLORS, TEXT_OPACITY } from '../theme';
import { computePath, minerDetailsPath } from '../utils/paths';

const HISTORY_HOURS = 24;

const IdentityHeader: React.FC<{ miner: ServingMiner }> = ({ miner }) => {
  const theme = useTheme();
  const muted = alpha(theme.palette.common.white, TEXT_OPACITY.muted);
  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        gap={1.5}
        sx={{ mb: 0.5 }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          UID {miner.uid}
        </Typography>
        <ComputeStatusBadge status={miner.status} size="medium" />
      </Stack>
      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        sx={{ color: muted, fontSize: '0.85rem' }}
      >
        <CopyableHotkey hotkey={miner.hotkey} edge={8} />
        {miner.username ? (
          miner.githubId ? (
            <Link
              component={RouterLink}
              to={minerDetailsPath(miner.githubId)}
              underline="hover"
              sx={{ color: theme.palette.status.info }}
            >
              @{miner.username}
            </Link>
          ) : (
            <span>@{miner.username}</span>
          )
        ) : null}
        <Box
          component="span"
          sx={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          {miner.modelId}
        </Box>
      </Stack>
    </Box>
  );
};

const StatusCard: React.FC<{ miner: ServingMiner }> = ({ miner }) => {
  const theme = useTheme();
  const meta = COMPUTE_STATUS_META[miner.status];
  return (
    <Box
      sx={{
        borderRadius: 3,
        border: `1px solid ${alpha(meta.color, 0.35)}`,
        backgroundColor: alpha(meta.color, 0.06),
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 2.5 },
      }}
    >
      <Typography
        variant="dataLabel"
        sx={{ display: 'block', color: meta.color, mb: 0.5 }}
      >
        {meta.label}
      </Typography>
      <Typography
        variant="h6"
        component="p"
        sx={{ fontWeight: 600, lineHeight: 1.4 }}
      >
        {describeMinerStatus(miner)}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          mt: 1,
          color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
        }}
      >
        Last round {formatRelative(miner.roundTs)}
        {miner.lastMissReason ? ` · last miss: ${miner.lastMissReason}` : ''}
      </Typography>
    </Box>
  );
};

const MinerKpis: React.FC<{ miner: ServingMiner }> = ({ miner }) => {
  const usd = formatUsd(miner.estUsdPerDay);
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 1, sm: 1.5 },
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(5, minmax(0, 1fr))',
        },
      }}
    >
      <KpiCard
        title="Settled score"
        value={formatFixed(miner.settledScore, 3)}
        subtitle={`Round ${formatFixed(miner.roundScore, 3)}`}
      />
      <KpiCard
        title="Est. α/day"
        value={formatAlpha(miner.estAlphaPerDay)}
        subtitle={usd === '—' ? 'Estimate' : `≈ ${usd}/day · est.`}
      />
      <KpiCard
        title="tok/s"
        value={formatFixed(miner.probeTps, 0)}
        subtitle={`Capacity ${formatFixed(miner.capacity, 2)} (÷ 180)`}
      />
      <KpiCard title="TTFT credit" value={formatFixed(miner.credit, 2)} />
      <KpiCard
        title="Uptime 24h"
        value={formatPercent(uptimeFraction(miner))}
        subtitle={`${miner.readyRounds24h}/${miner.rounds24h} rounds READY`}
      />
    </Box>
  );
};

const RoundCharts: React.FC<{ rounds: ServingRound[] }> = ({ rounds }) => {
  const timestamps = useMemo(() => rounds.map((r) => r.roundTs), [rounds]);
  const scores = useMemo(() => rounds.map((r) => r.roundScore), [rounds]);
  const tps = useMemo(() => rounds.map((r) => r.probeTps), [rounds]);
  const credits = useMemo(() => rounds.map((r) => r.credit), [rounds]);
  const emptyHint = `No audit rounds for this miner in the last ${HISTORY_HOURS} h.`;
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 2, md: 3 },
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
      }}
    >
      <ComputeRoundChart
        title="Round score"
        timestamps={timestamps}
        values={scores}
        color={STATUS_COLORS.success}
        decimals={3}
        emptyHint={emptyHint}
      />
      <ComputeRoundChart
        title="Probe tok/s"
        timestamps={timestamps}
        values={tps}
        color={STATUS_COLORS.info}
        decimals={0}
        emptyHint={emptyHint}
      />
      <ComputeRoundChart
        title="TTFT credit"
        timestamps={timestamps}
        values={credits}
        color={STATUS_COLORS.warning}
        yMax={1}
        emptyHint={emptyHint}
      />
    </Box>
  );
};

const ComputeMinerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const hotkey = (searchParams.get('hotkey') ?? '').trim();
  const query = useServingMinerDetail(hotkey, HISTORY_HOURS);
  const theme = useTheme();

  const notFound = isNotFoundError(query.error);
  const miner = query.data?.miner ?? null;

  let body: React.ReactNode;
  if (!hotkey) {
    body = (
      <Typography color="text.secondary">
        Add <code>?hotkey=</code> to the URL to look up a compute miner.
      </Typography>
    );
  } else if (query.isLoading) {
    body = <Typography color="text.secondary">Loading…</Typography>;
  } else if (notFound || (query.isSuccess && !miner)) {
    body = (
      <Typography color="text.secondary">
        This validator has not seen hotkey {shortHotkey(hotkey, 8)} in any
        serving round.
      </Typography>
    );
  } else if (query.isError) {
    body = (
      <Typography color="error">Could not load this compute miner.</Typography>
    );
  } else if (miner && query.data) {
    body = (
      <>
        <IdentityHeader miner={miner} />
        <StatusCard miner={miner} />
        <MinerKpis miner={miner} />
        <Box>
          <Typography
            variant="sectionTitle"
            component="h2"
            sx={{ display: 'block', mb: 1.25 }}
          >
            Last {HISTORY_HOURS} h of audit rounds
          </Typography>
          <RoundCharts rounds={query.data.rounds} />
        </Box>
        <Box>
          <Typography
            variant="sectionTitle"
            component="h2"
            sx={{ display: 'block', mb: 1.25 }}
          >
            Recent misses
          </Typography>
          <ComputeMissesTable misses={query.data.misses} />
        </Box>
      </>
    );
  }

  return (
    <Page title={miner ? `Compute UID ${miner.uid}` : 'Compute miner'}>
      <SEO
        title={miner ? `Compute miner UID ${miner.uid}` : 'Compute miner'}
        description="Per-hotkey serving status, audit window, round history, and estimated payouts as observed by one validator."
      />
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          justifyContent: 'center',
          py: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            width: '100%',
            maxWidth: 1320,
            px: { xs: 2, md: 0 },
          }}
        >
          <Box>
            <BackButton
              to={computePath()}
              label="Back to Compute"
              variant="text"
            />
          </Box>
          {body}
          <Typography
            variant="caption"
            sx={{
              color: alpha(theme.palette.common.white, TEXT_OPACITY.muted),
            }}
          >
            Score = window pass × TTFT credit × capacity (probe tok/s ÷ 180),
            settled over the trailing 12 rounds. A WRONG answer wipes the window
            and quarantines the miner for 1 h.
          </Typography>
          <ValidatorSnapshotFootnote
            validatorHotkey={query.data?.validatorHotkey}
          />
        </Box>
      </Box>
    </Page>
  );
};

export default ComputeMinerPage;
