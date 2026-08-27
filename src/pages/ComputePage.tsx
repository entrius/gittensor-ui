import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import KpiCard from '../components/KpiCard';
import {
  ComputeFleetTable,
  ValidatorSnapshotFootnote,
  formatAlpha,
  formatRelative,
  formatRoundTime,
  formatUsd,
} from '../components/compute';
import {
  isNotFoundError,
  useServingMiners,
  useServingStatus,
  type ServingStatus,
} from '../api';
import { TEXT_OPACITY } from '../theme';

const POOL_EXPLAINER =
  'The serving pool pays RTX 5090 miners an estimated $0.70 per verified GPU-hour inside a 3.5% emission cap. Every 5 minutes the validator audits served traffic against its reference GPU, keeps a rolling 10-slot window (READY at mean ≥ 0.8), and settles scores over the trailing 12 rounds.';

const EMPTY_MESSAGE = 'No serving rounds recorded yet by this validator.';

const formatPoolShare = (status: ServingStatus): string =>
  `${(status.poolShare * 100).toFixed(2)}% of ${(status.poolCap * 100).toFixed(1)}% cap`;

const ComputeKpis: React.FC<{ status: ServingStatus }> = ({ status }) => {
  const perCardUsd = formatUsd(status.estUsdPerCardDay);
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
        title="Ready cards"
        value={status.ready}
        subtitle={`${status.probation} probation · ${status.quarantined} quarantined`}
      />
      <KpiCard
        title="Pool share"
        value={`${(status.poolShare * 100).toFixed(2)}%`}
        subtitle={formatPoolShare(status)}
      />
      <KpiCard
        title="Card-equivalents"
        value={status.cardEquivalents.toFixed(2)}
        subtitle="Sum of settled scores"
      />
      <KpiCard
        title="Est. α/day per card"
        value={formatAlpha(status.estAlphaPerCardDay)}
        subtitle={
          perCardUsd === '—'
            ? 'Full card, estimate'
            : `≈ ${perCardUsd}/day · est.`
        }
      />
      <KpiCard
        title="Last round"
        value={formatRelative(status.roundTs)}
        subtitle={`${formatRoundTime(status.roundTs)} · ${status.roundsLast24h} rounds in 24 h`}
      />
    </Box>
  );
};

const ComputePage: React.FC = () => {
  const theme = useTheme();
  const statusQuery = useServingStatus();
  const minersQuery = useServingMiners();

  const noRoundsYet =
    isNotFoundError(statusQuery.error) ||
    (statusQuery.isSuccess && !statusQuery.data);
  const statusError = statusQuery.isError && !noRoundsYet;
  const miners = noRoundsYet ? [] : (minersQuery.data ?? []);
  const minersError =
    minersQuery.isError && !isNotFoundError(minersQuery.error);

  const emptyState = (
    <Box sx={{ p: 3 }}>
      <Typography color="text.secondary">{EMPTY_MESSAGE}</Typography>
    </Box>
  );

  return (
    <Page title="Compute">
      <SEO
        title="Compute"
        description="RTX 5090 serving pool — READY cards, pool share, and per-miner audit status as observed by one validator."
        type="website"
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
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 700, mb: 0.75 }}
            >
              Compute
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: alpha(
                  theme.palette.common.white,
                  TEXT_OPACITY.secondary,
                ),
                maxWidth: 860,
                lineHeight: 1.55,
              }}
            >
              {POOL_EXPLAINER}
            </Typography>
          </Box>

          {statusQuery.data && !noRoundsYet ? (
            <ComputeKpis status={statusQuery.data} />
          ) : null}
          {statusError ? (
            <Typography color="error" variant="body2">
              Could not load the pool snapshot.
            </Typography>
          ) : null}

          <Box>
            <Typography
              variant="sectionTitle"
              component="h2"
              sx={{ display: 'block', mb: 1.25 }}
            >
              Fleet
            </Typography>
            <ComputeFleetTable
              miners={miners}
              isLoading={
                !noRoundsYet && (minersQuery.isLoading || statusQuery.isLoading)
              }
              isError={minersError}
              emptyState={emptyState}
            />
          </Box>

          <ValidatorSnapshotFootnote
            validatorHotkey={statusQuery.data?.validatorHotkey}
          />
        </Box>
      </Box>
    </Page>
  );
};

export default ComputePage;
