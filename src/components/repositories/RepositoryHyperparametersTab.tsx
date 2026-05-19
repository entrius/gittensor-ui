import React, { useMemo } from 'react';
import {
  alpha,
  Box,
  Card,
  Chip,
  Divider,
  Skeleton,
  Tooltip,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useRepositoryConfig } from '../../api';
import { STATUS_COLORS, tooltipSlotProps } from '../../theme';
import type { RepositoryConfig } from '../../api/models/Dashboard';
import {
  boundsLabel,
  formatRepoConfigValue,
  resolveRepoConfig,
  type ResolvedConfigField,
  type ResolvedConfigGroup,
} from '../../utils/repoConfig';

interface RepositoryHyperparametersTabProps {
  repositoryFullName: string;
}

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const formatShare = (value: number | undefined): string => {
  if (value === undefined) return '—';
  const pct = value * 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
};

/** Small accent chip marking a field as a repo override vs a global default. */
const StateChip: React.FC<{ override: boolean }> = ({ override }) => (
  <Chip
    label={override ? 'Override' : 'Default'}
    sx={{
      height: 18,
      fontSize: '0.6rem',
      fontWeight: 700,
      letterSpacing: '0.04em',
      bgcolor: override ? alpha(STATUS_COLORS.info, 0.15) : 'surface.light',
      color: override ? STATUS_COLORS.info : 'text.secondary',
      border: '1px solid',
      borderColor: override ? alpha(STATUS_COLORS.info, 0.4) : 'border.light',
      '& .MuiChip-label': { px: 0.75 },
    }}
  />
);

/** One resolved config knob — label, key/bounds, resolved value, override state. */
const FieldRow: React.FC<{ field: ResolvedConfigField }> = ({ field }) => {
  const { def, value, isOverride } = field;
  const bounds = boundsLabel(def);
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        py: 1.25,
        pl: 1.25,
        borderLeft: '2px solid',
        borderLeftColor: isOverride ? STATUS_COLORS.info : 'transparent',
        borderBottom: '1px solid',
        borderBottomColor: 'border.subtle',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            sx={{ fontSize: '0.8rem', fontWeight: 500, color: 'text.primary' }}
          >
            {def.label}
          </Typography>
          <Tooltip title={def.description} arrow slotProps={tooltipSlotProps}>
            <InfoOutlinedIcon
              aria-label={`About ${def.label}`}
              sx={{ fontSize: 13, color: 'text.secondary', cursor: 'pointer' }}
            />
          </Tooltip>
        </Box>
        <Typography
          sx={{ fontSize: '0.65rem', color: 'text.secondary', mt: 0.25 }}
        >
          {def.key}
          {bounds ? ` · ${bounds}` : ''}
        </Typography>
      </Box>
      <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
        <Typography
          sx={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: isOverride ? STATUS_COLORS.info : 'text.primary',
          }}
        >
          {formatRepoConfigValue(def.format, value)}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 0.75,
            mt: 0.25,
          }}
        >
          {isOverride ? (
            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
              default {formatRepoConfigValue(def.format, def.default)}
            </Typography>
          ) : null}
          <StateChip override={isOverride} />
        </Box>
      </Box>
    </Box>
  );
};

/** A resolved knob group (eligibility / scoring / time decay) as a card. */
const ResolvedSection: React.FC<{ group: ResolvedConfigGroup }> = ({
  group,
}) => (
  <Card sx={{ p: { xs: 2, md: 2.5 } }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 1,
      }}
    >
      <Typography variant="sectionTitle" sx={{ fontSize: '0.95rem' }}>
        {group.title}
      </Typography>
      <Chip
        label={
          group.overrideCount > 0
            ? `${group.overrideCount} overridden`
            : 'All defaults'
        }
        sx={{
          height: 20,
          fontSize: '0.65rem',
          fontWeight: 600,
          bgcolor:
            group.overrideCount > 0
              ? alpha(STATUS_COLORS.info, 0.15)
              : 'surface.light',
          color:
            group.overrideCount > 0 ? STATUS_COLORS.info : 'text.secondary',
          border: '1px solid',
          borderColor:
            group.overrideCount > 0
              ? alpha(STATUS_COLORS.info, 0.35)
              : 'border.light',
        }}
      />
    </Box>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        columnGap: 3,
      }}
    >
      {group.fields.map((f) => (
        <FieldRow key={f.def.key} field={f} />
      ))}
    </Box>
  </Card>
);

/** A plain label / value row for the top-level config fields. */
const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
      py: 1,
      borderBottom: '1px solid',
      borderBottomColor: 'border.subtle',
    }}
  >
    <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
      {label}
    </Typography>
    <Box sx={{ textAlign: 'right' }}>{children}</Box>
  </Box>
);

const ValueText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}
  >
    {children}
  </Typography>
);

/** Top-level emission / pool / label config (camelCase keys from the API). */
const TopLevelSection: React.FC<{ config: RepositoryConfig }> = ({
  config,
}) => {
  const fixedBaseScore = toNumber(config.fixedBaseScore);
  const defaultLabelMultiplier = toNumber(config.defaultLabelMultiplier);
  const labelMultipliers = config.labelMultipliers ?? {};
  const branches = config.additionalAcceptableBranches ?? [];
  const labelEntries = Object.entries(labelMultipliers);

  return (
    <Card sx={{ p: { xs: 2, md: 2.5 } }}>
      <Typography variant="sectionTitle" sx={{ fontSize: '0.95rem', mb: 1 }}>
        Emission &amp; pools
      </Typography>
      <Box>
        <InfoRow label="Emission share">
          <ValueText>{formatShare(toNumber(config.emissionShare))}</ValueText>
        </InfoRow>
        <InfoRow label="Issue discovery share">
          <ValueText>
            {formatShare(toNumber(config.issueDiscoveryShare))}
          </ValueText>
        </InfoRow>
        <InfoRow label="Maintainer cut">
          <ValueText>
            {formatShare(toNumber(config.maintainerCut) ?? 0)}
          </ValueText>
        </InfoRow>
        <InfoRow label="Fixed base score">
          <ValueText>
            {fixedBaseScore === undefined ? 'Not set' : fixedBaseScore}
          </ValueText>
        </InfoRow>
        <InfoRow label="Default label multiplier">
          <ValueText>{`${defaultLabelMultiplier ?? 1}×`}</ValueText>
        </InfoRow>
        <InfoRow label="Trusted label pipeline">
          <Chip
            label={config.trustedLabelPipeline ? 'Enabled' : 'Disabled'}
            sx={{
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 600,
              bgcolor: config.trustedLabelPipeline
                ? alpha(STATUS_COLORS.success, 0.15)
                : 'surface.light',
              color: config.trustedLabelPipeline
                ? STATUS_COLORS.success
                : 'text.secondary',
              border: '1px solid',
              borderColor: config.trustedLabelPipeline
                ? alpha(STATUS_COLORS.success, 0.35)
                : 'border.light',
            }}
          />
        </InfoRow>
        <InfoRow label="Scorable branches">
          {branches.length > 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                justifyContent: 'flex-end',
              }}
            >
              {branches.map((b) => (
                <Chip key={b} variant="info" label={b} />
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
              Default branch only
            </Typography>
          )}
        </InfoRow>
        <Box sx={{ pt: 1.5 }}>
          <Typography
            sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.75 }}
          >
            Label multipliers
          </Typography>
          {labelEntries.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {labelEntries.map(([label, mult]) => (
                <Chip
                  key={label}
                  variant="info"
                  label={`${label} · ${mult}×`}
                />
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
              None — every label uses the default multiplier.
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  );
};

const RepositoryHyperparametersTab: React.FC<
  RepositoryHyperparametersTabProps
> = ({ repositoryFullName }) => {
  const { data, isLoading } = useRepositoryConfig(repositoryFullName);
  const config = data?.config;
  const resolved = useMemo(() => resolveRepoConfig(config), [config]);

  const totalKnobs =
    resolved.eligibility.fields.length +
    resolved.scoring.fields.length +
    resolved.timeDecay.fields.length;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={i === 0 ? 240 : 280}
            sx={{ bgcolor: 'surface.light', borderRadius: 3 }}
          />
        ))}
      </Box>
    );
  }

  if (!config) {
    return (
      <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', py: 4 }}>
        No configuration is available for this repository.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography variant="sectionTitle" sx={{ fontSize: '1.05rem' }}>
          Repository hyperparameters
        </Typography>
        <Typography
          sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.5 }}
        >
          {resolved.overrideCount > 0 ? (
            <>
              <Box
                component="span"
                sx={{ color: STATUS_COLORS.info, fontWeight: 600 }}
              >
                {resolved.overrideCount} of {totalKnobs}
              </Box>{' '}
              scoring &amp; eligibility knobs are overridden for this repo.
            </>
          ) : (
            `All ${totalKnobs} scoring & eligibility knobs use the global defaults.`
          )}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'border.light' }} />

      <TopLevelSection config={config} />
      <ResolvedSection group={resolved.eligibility} />
      <ResolvedSection group={resolved.scoring} />
      <ResolvedSection group={resolved.timeDecay} />
    </Box>
  );
};

export default RepositoryHyperparametersTab;
