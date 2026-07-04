import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Avatar, Box, Card, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { WatchlistButton } from '../common';
import { formatWeight, getRepositoryOwnerAvatarSrc } from '../../utils';
import { RankIcon } from './RankIcon';
import { RepositorySocialLinksInline } from '../repositories';
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

export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repo,
  maxWeight,
  href,
  linkState,
}) => {
  const navigate = useNavigate();
  const owner = (repo.repository || '').split('/')[0] || '';
  const weightPct =
    maxWeight > 0
      ? Math.max(0, Math.min(100, (repo.weight / maxWeight) * 100))
      : 0;

  const handleOpen = () => {
    navigate(href, { state: linkState });
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open ${repo.repository}`}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      sx={(theme) => ({
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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            flex: 1,
            minWidth: 0,
            overflow: 'visible',
          }}
        >
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
                minWidth: 0,
                flex: '1 1 auto',
              }}
            >
              {repo.repository}
            </Typography>
          </Tooltip>
          <RepositorySocialLinksInline repositoryFullName={repo.repository} />
        </Box>
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
        display={formatWeight(repo.weight)}
        pct={weightPct}
        accent="primary"
      />

      <ConfigBar
        label="Issue Discovery"
        value={repo.issueDiscoveryShare ?? 0}
        display={formatWeight(repo.issueDiscoveryShare ?? 0)}
        pct={Math.max(0, Math.min(100, (repo.issueDiscoveryShare ?? 0) * 100))}
        accent="discovery"
      />

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
