import React, { useMemo, useState } from 'react';
import { alpha, Box, Tooltip, Typography } from '@mui/material';
import { useRepositoryConfig, useRepositoryMiners } from '../../api';
import { mapRepositoryMinersToStats } from '../../utils/minerMapper';
import { tooltipSlotProps } from '../../theme';
import { TopMinersTable, type MinerStats } from '../leaderboard';

type MinersMode = 'oss' | 'discoveries';

interface RepositoryMinersTabProps {
  repositoryFullName: string;
}

const MODE_OPTIONS: ReadonlyArray<{ value: MinersMode; label: string }> = [
  { value: 'oss', label: 'OSS Contributions' },
  { value: 'discoveries', label: 'Issue Discovery' },
];

/** Coerce the raw `issueDiscoveryShare` config value into a finite number. */
const toShare = (value: number | string | undefined): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Per-repository leaderboard — the repurposed leaderboard table scoped to a
 * single repo. Sourced from `GET /repos/:repo/miners`, so scores, credibility
 * and eligibility are all per-repo. The OSS / Issue-Discovery toggle swaps
 * which per-repo track drives the ranking.
 *
 * A repo can route all of its scoring to one track via `issueDiscoveryShare`:
 * `1` makes OSS Contributions unreachable, `0` makes Issue Discovery
 * unreachable. Anything in between (or unset) keeps both tracks selectable.
 */
const RepositoryMinersTab: React.FC<RepositoryMinersTabProps> = ({
  repositoryFullName,
}) => {
  const { data, isLoading } = useRepositoryMiners(repositoryFullName);
  const { data: repoData } = useRepositoryConfig(repositoryFullName);
  const [mode, setMode] = useState<MinersMode>('oss');

  const issueDiscoveryShare = toShare(repoData?.config?.issueDiscoveryShare);
  const ossDisabled = issueDiscoveryShare === 1;
  const discoveriesDisabled = issueDiscoveryShare === 0;

  // Fall back to the only reachable track when the chosen one is disabled.
  const effectiveMode: MinersMode = ossDisabled
    ? 'discoveries'
    : discoveriesDisabled
      ? 'oss'
      : mode;

  const miners = useMemo(
    () => mapRepositoryMinersToStats(data ?? [], effectiveMode),
    [data, effectiveMode],
  );

  const getMinerHref = (miner: MinerStats): string =>
    effectiveMode === 'discoveries'
      ? `/miners/details?githubId=${miner.githubId}&mode=issues&tab=open-issues`
      : `/miners/details?githubId=${miner.githubId}`;

  const linkState = useMemo(
    () => ({ backLabel: `Back to ${repositoryFullName}` }),
    [repositoryFullName],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="sectionTitle" sx={{ fontSize: '1.05rem' }}>
          Miners
        </Typography>
        <Typography
          sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.5 }}
        >
          Miners scored in this repository, ranked by their per-repo{' '}
          {effectiveMode === 'discoveries' ? 'issue-discovery' : 'contribution'}{' '}
          score. Eligibility and credibility are specific to this repo.
        </Typography>
      </Box>

      {/* OSS / Issue Discovery segmented toggle */}
      <Box
        role="tablist"
        aria-label="Miner scoring track"
        sx={{
          display: 'inline-flex',
          alignSelf: 'flex-start',
          gap: 0.5,
          p: 0.5,
          borderRadius: 2,
          backgroundColor: 'surface.subtle',
        }}
      >
        {MODE_OPTIONS.map((option) => {
          const isActive = effectiveMode === option.value;
          const isDisabled =
            (option.value === 'oss' && ossDisabled) ||
            (option.value === 'discoveries' && discoveriesDisabled);
          const tab = (
            <Box
              key={option.value}
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled || undefined}
              tabIndex={isDisabled ? -1 : 0}
              onClick={isDisabled ? undefined : () => setMode(option.value)}
              onKeyDown={
                isDisabled
                  ? undefined
                  : (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setMode(option.value);
                      }
                    }
              }
              sx={{
                px: 2,
                py: 0.75,
                borderRadius: 1.5,
                fontSize: '0.8rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                transition: 'color 0.2s, background-color 0.2s',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                backgroundColor: isActive ? 'surface.elevated' : 'transparent',
                color: isDisabled
                  ? (t) => alpha(t.palette.text.primary, 0.25)
                  : isActive
                    ? 'text.primary'
                    : (t) => alpha(t.palette.text.primary, 0.5),
                ...(isDisabled
                  ? {}
                  : {
                      '&:hover': {
                        color: 'text.primary',
                        backgroundColor: 'surface.elevated',
                      },
                      '&:focus-visible': {
                        outline: (t) => `2px solid ${t.palette.primary.main}`,
                        outlineOffset: '2px',
                      },
                    }),
              }}
            >
              {option.label}
            </Box>
          );

          if (!isDisabled) return tab;

          return (
            <Tooltip
              key={option.value}
              title={
                option.value === 'oss'
                  ? 'Issue discovery is the only scored track for this repository.'
                  : 'OSS contributions are the only scored track for this repository.'
              }
              arrow
              slotProps={tooltipSlotProps}
            >
              {tab}
            </Tooltip>
          );
        })}
      </Box>

      <TopMinersTable
        miners={miners}
        isLoading={isLoading}
        getMinerHref={getMinerHref}
        linkState={linkState}
        variant={effectiveMode === 'discoveries' ? 'discoveries' : 'oss'}
      />
    </Box>
  );
};

export default RepositoryMinersTab;
