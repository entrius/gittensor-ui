import React from 'react';
import { Avatar, Box, Card, Divider, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { linkResetSx, useLinkBehavior } from '../common/linkBehavior';
import { WatchlistButton } from '../common';
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

const INACTIVE_OPACITY = 0.5;

const formatMetric = (value: number, decimals = 0): string =>
  value > 0 ? (decimals > 0 ? value.toFixed(decimals) : String(value)) : '-';

interface MetricCellProps {
  label: string;
  value: string;
}

const MetricCell: React.FC<MetricCellProps> = ({ label, value }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      minWidth: 0,
    }}
  >
    <Typography
      sx={(theme) => ({
        fontFamily: FONTS.mono,
        fontSize: '0.65rem',
        color: theme.palette.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      })}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.9rem',
        fontWeight: 600,
        color: value === '-' ? 'text.secondary' : 'text.primary',
        lineHeight: 1.2,
      }}
    >
      {value}
    </Typography>
  </Box>
);

export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repo,
  maxWeight,
  href,
  linkState,
}) => {
  const owner = (repo.repository || '').split('/')[0] || '';
  const isInactive = !!repo.inactiveAt;
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
        p: 2,
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: theme.palette.border.light,
        backgroundColor: theme.palette.surface.transparent,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        cursor: 'pointer',
        transition: 'all 0.2s',
        opacity: isInactive ? INACTIVE_OPACITY : 1,
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <RankIcon rank={repo.rank || 0} />
        <Avatar
          src={`https://avatars.githubusercontent.com/${owner}`}
          alt={owner}
          sx={(theme) => ({
            width: 28,
            height: 28,
            flexShrink: 0,
            border: '1px solid',
            borderColor: theme.palette.border.medium,
            backgroundColor: getRepositoryOwnerAvatarBackground(owner),
          })}
        />
        <Tooltip title={repo.repository || ''} placement="top" arrow>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.85rem',
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
        <Typography
          component="span"
          sx={(theme) => ({
            fontFamily: FONTS.mono,
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            px: 0.75,
            py: 0.25,
            borderRadius: '4px',
            flexShrink: 0,
            color: isInactive
              ? theme.palette.status.closed
              : theme.palette.status.success,
            backgroundColor: isInactive
              ? alpha(theme.palette.status.closed, 0.12)
              : alpha(theme.palette.status.success, 0.12),
          })}
        >
          {isInactive ? 'Inactive' : 'Active'}
        </Typography>
        {repo.repository && (
          <WatchlistButton
            category="repos"
            itemKey={repo.repository}
            size="small"
          />
        )}
      </Box>

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
            Weight
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            {repo.weight.toFixed(2)}
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
              width: `${weightPct}%`,
              backgroundColor: theme.palette.primary.main,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            })}
          />
        </Box>
      </Box>

      <Box
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, pt: 0.5 }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 0.6fr 1fr',
            gap: 1.5,
          }}
        >
          <MetricCell
            label="OSS Score"
            value={formatMetric(repo.totalScore, 2)}
          />
          <MetricCell label="PRs" value={formatMetric(repo.totalPRs)} />
          <MetricCell
            label="Contributors"
            value={formatMetric(repo.uniqueMiners?.size ?? 0)}
          />
        </Box>

        <Divider sx={{ borderColor: 'border.light', opacity: 0.85 }} />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 0.6fr 1fr',
            gap: 1.5,
          }}
        >
          <MetricCell
            label="Issue score"
            value={formatMetric(repo.discoveryScore, 2)}
          />
          <MetricCell
            label="Issues"
            value={formatMetric(repo.discoveryIssues)}
          />
          <MetricCell
            label="Contributors"
            value={formatMetric(repo.discoveryContributors?.size ?? 0)}
          />
        </Box>
      </Box>
    </Card>
  );
};

export default RepositoryCard;
