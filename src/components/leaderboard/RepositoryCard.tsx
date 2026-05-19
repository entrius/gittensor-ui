import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Avatar, Box, Card, Divider, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { linkResetSx, useLinkBehavior } from '../common/linkBehavior';
import { WatchlistButton } from '../common';
import { getRepositoryOwnerAvatarSrc } from '../../utils';
import { RankIcon } from './RankIcon';
import {
  FONTS,
  getRepositoryOwnerAvatarBackground,
  type RepoStats,
} from './types';

interface RepositoryCardProps {
  repo: RepoStats;
  maxWeight: number;
  href: string;
  linkState?: Record<string, unknown>;
}

interface ConfigBarProps {
  label: string;
  value: number;
  display: string;
  pct: number;
  accent: 'primary' | 'discovery';
}

const ConfigBar: React.FC<ConfigBarProps> = ({
  label,
  display,
  pct,
  accent,
}) => (
  <Box>
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 0.5,
      }}
    >
      <Typography
        sx={(theme) => ({
          fontFamily: FONTS.mono,
          fontSize: '0.65rem',
          color: theme.palette.text.tertiary,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        })}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'text.primary',
        }}
      >
        {display}
      </Typography>
    </Box>
    <Box
      aria-hidden="true"
      sx={(theme) => ({
        position: 'relative',
        height: 4,
        borderRadius: 2,
        backgroundColor: alpha(theme.palette.text.primary, 0.08),
        overflow: 'hidden',
      })}
    >
      <Box
        sx={(theme) => ({
          position: 'absolute',
          inset: 0,
          width: `${pct}%`,
          backgroundColor:
            accent === 'primary'
              ? theme.palette.primary.main
              : theme.palette.status.success,
          borderRadius: 2,
          transition: 'width 0.3s ease',
        })}
      />
    </Box>
  </Box>
);

interface LabelChipProps {
  label: string;
  multiplier: number;
}

const LabelChip: React.FC<LabelChipProps> = ({ label, multiplier }) => (
  <Box
    sx={(theme) => ({
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 0.5,
      px: 0.75,
      py: 0.25,
      borderRadius: '4px',
      border: '1px solid',
      borderColor: theme.palette.border.light,
      backgroundColor: alpha(theme.palette.text.primary, 0.04),
      fontFamily: FONTS.mono,
      fontSize: '0.7rem',
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
    })}
  >
    <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
      {label}
    </Box>
    <Box component="span" sx={{ color: 'text.tertiary', fontWeight: 600 }}>
      ×{multiplier.toFixed(2)}
    </Box>
  </Box>
);

export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repo,
  maxWeight,
  href,
  linkState,
}) => {
  const owner = (repo.repository || '').split('/')[0] || '';
  const weightPct =
    maxWeight > 0
      ? Math.max(0, Math.min(100, (repo.weight / maxWeight) * 100))
      : 0;
  const linkProps = useLinkBehavior<HTMLAnchorElement>(href, {
    state: linkState,
  });

  return (
    <Card
      component="a"
      {...linkProps}
      aria-label={`Open ${repo.repository}`}
      sx={(theme) => ({
        ...linkResetSx,
        p: { xs: 1.5, sm: 2 },
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: theme.palette.border.light,
        backgroundColor: theme.palette.surface.transparent,
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 1.25, sm: 1.5 },
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          backgroundColor: theme.palette.surface.light,
          borderColor: theme.palette.border.medium,
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: theme.palette.primary.main,
          outlineOffset: '2px',
        },
      })}
      elevation={0}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.75, sm: 1.25 },
          minWidth: 0,
        }}
      >
        <RankIcon rank={repo.rank || 0} />
        <Avatar
          src={getRepositoryOwnerAvatarSrc(owner) || undefined}
          alt={owner}
          sx={(theme) => ({
            width: { xs: 24, sm: 28 },
            height: { xs: 24, sm: 28 },
            flexShrink: 0,
            border: '1px solid',
            borderColor: theme.palette.border.medium,
            backgroundColor: getRepositoryOwnerAvatarBackground(owner),
          })}
        >
          {(owner[0] || '?').toUpperCase()}
        </Avatar>
        <Tooltip title={repo.repository || ''} placement="top" arrow>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: { xs: '0.8rem', sm: '0.85rem' },
              fontWeight: 500,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {repo.repository}
          </Typography>
        </Tooltip>
        {repo.repository && (
          <WatchlistButton
            category="repos"
            itemKey={repo.repository}
            size="small"
          />
        )}
      </Box>

      <ConfigBar
        label="Weight"
        value={repo.weight}
        display={repo.weight.toFixed(2)}
        pct={weightPct}
        accent="primary"
      />

      <ConfigBar
        label="Issue Discovery"
        value={repo.issueDiscoveryShare ?? 0}
        display={(repo.issueDiscoveryShare ?? 0).toFixed(2)}
        pct={Math.max(0, Math.min(100, (repo.issueDiscoveryShare ?? 0) * 100))}
        accent="discovery"
      />

      <Divider sx={{ borderColor: 'border.light', opacity: 0.85 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Typography
          sx={(theme) => ({
            fontFamily: FONTS.mono,
            fontSize: '0.65rem',
            color: theme.palette.text.tertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          })}
        >
          Label multipliers
        </Typography>
        {repo.labelMultipliers &&
        Object.keys(repo.labelMultipliers).length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {Object.entries(repo.labelMultipliers).map(([label, mult]) => (
              <LabelChip key={label} label={label} multiplier={mult} />
            ))}
          </Box>
        ) : (
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              color: 'text.tertiary',
              fontStyle: 'italic',
            }}
          >
            Default scoring (×1.00)
          </Typography>
        )}
      </Box>

      {repo.trustedLabelPipeline && (
        <Tooltip
          title="Maintainer-applied labels are trusted as scoring input, including those from GitHub Apps."
          placement="top"
          arrow
        >
          <Box
            sx={(theme) => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              alignSelf: 'flex-start',
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: theme.palette.status.success,
            })}
          >
            <CheckCircleIcon sx={{ fontSize: '0.85rem' }} />
            Trusted label pipeline
          </Box>
        </Tooltip>
      )}
    </Card>
  );
};
