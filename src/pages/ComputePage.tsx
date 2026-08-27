import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Page } from '../components/layout';
import { SEO } from '../components';
import KpiCard from '../components/KpiCard';
import {
  ComputeFleetTable,
  ComputeReleaseCard,
  ValidatorSnapshotFootnote,
  hasPricing,
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

const poolExplainer = (status: ServingStatus | undefined): string => {
  const rate =
    status?.gpuHourUsd != null
      ? `an estimated $${status.gpuHourUsd.toFixed(2)} per verified GPU-hour`
      : 'a validator-set USD rate per verified GPU-hour';
  const cap =
    status?.poolCap != null
      ? `inside a ${(status.poolCap * 100).toFixed(1)}% emission cap`
      : 'inside an emission cap set by the validator';
  return `The serving pool pays RTX 5090 miners ${rate} ${cap}. Every 5 minutes the validator audits served traffic against its reference GPU, keeps a rolling 10-slot window (READY at mean ≥ 0.8), and settles scores over the trailing 12 rounds.`;
};

const EMPTY_MESSAGE = 'No serving rounds recorded yet by this validator.';

const formatPoolShare = (status: ServingStatus): string =>
  status.poolCap === null
    ? 'Cap not reported this round'
    : `of ${(status.poolCap * 100).toFixed(1)}% cap`;

const formatPerCardSubtitle = (status: ServingStatus): string => {
  if (!hasPricing(status.pricingSource)) return 'No price this round';
  const tempo = formatAlpha(status.estAlphaPerCardTempo);
  const usd = formatUsd(status.estUsdPerCardDay);
  const parts = [
    tempo === '—' ? null : `${tempo}/tempo`,
    usd === '—' ? null : `≈ ${usd}/day`,
  ].filter(Boolean);
  return parts.length ? `${parts.join(' · ')} · est.` : 'Full card, estimate';
};

const ComputeKpis: React.FC<{ status: ServingStatus }> = ({ status }) => {
  const priced = hasPricing(status.pricingSource);
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
        title="Est. alpha/day per card"
        value={priced ? formatAlpha(status.estAlphaPerCardDay) : '—'}
        subtitle={formatPerCardSubtitle(status)}
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
              {poolExplainer(statusQuery.data)}
            </Typography>
          </Box>

          {statusQuery.data && !noRoundsYet ? (
            <ComputeKpis status={statusQuery.data} />
          ) : null}
          {statusQuery.data?.release && !noRoundsYet ? (
            <ComputeReleaseCard release={statusQuery.data.release} />
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
              priced={hasPricing(statusQuery.data?.pricingSource)}
              isLoading={
                !noRoundsYet && (minersQuery.isLoading || statusQuery.isLoading)
              }
              isError={minersError}
              emptyState={emptyState}
            />
          </Box>

          <ValidatorSnapshotFootnote
            validatorHotkey={statusQuery.data?.validatorHotkey}
            pricingSource={statusQuery.data?.pricingSource}
          />
        </Box>
      </Box>
    </Page>
  );
};

export default ComputePage;
