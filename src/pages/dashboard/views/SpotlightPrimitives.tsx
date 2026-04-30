import React from 'react';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {
  Avatar,
  Box,
  ButtonBase,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, type Theme, useTheme } from '@mui/material/styles';
import { getGithubAvatarSrc } from '../../../utils';
import { credibilityColor } from '../../../utils/format';
import { getInitials } from './spotlightUtils';

export interface SpotlightKpi {
  label: string;
  value: string;
  detail?: string;
  tone?: 'positive' | 'neutral' | 'warning';
}

interface SpotlightKpiCardProps {
  kpi: SpotlightKpi;
  getToneColor: (tone: SpotlightKpi['tone'], theme: Theme) => string;
}

interface SpotlightSectionProps {
  headingId: string;
  title: string;
  chipLabel: string;
  chipColor: string;
  subtitle: string;
  railColor: string;
  viewAllAriaLabel: string;
  children: React.ReactNode;
  onViewAll?: () => void;
}

interface SpotlightRowShellProps {
  ariaLabel?: string;
  children: React.ReactNode;
  minHeight?: { xs: number; sm: number };
  onClick?: () => void;
  toneColor: string;
}

interface SpotlightIdentityProps {
  avatarUsername?: string;
  label: string;
  markerColor: string;
  name: string;
  trailing?: React.ReactNode;
}

interface SpotlightMetricBlockProps {
  gridArea: string;
  label: string;
  value: string;
  valueColor?: string;
  valueFontSize?: string;
}

const repoLabel = (repo: string) => repo.split('/').pop() || repo;

const getRoundedUsdPerDay = (value?: number) => Math.round(value ?? 0);

export const formatSpotlightUsdPerDay = (value?: number) =>
  `$${getRoundedUsdPerDay(value).toLocaleString('en-US')}/d`;

export const SpotlightSection: React.FC<SpotlightSectionProps> = ({
  headingId,
  title,
  chipLabel,
  chipColor,
  subtitle,
  railColor,
  viewAllAriaLabel,
  children,
  onViewAll,
}) => {
  const theme = useTheme();

  return (
    <Box
      component="section"
      aria-labelledby={headingId}
      sx={{
        width: '100%',
        p: { xs: 1.2, sm: 1.35 },
        borderRadius: 2,
        border: `1px solid ${alpha(railColor, 0.22)}`,
        borderLeft: `3px solid ${railColor}`,
        backgroundColor: theme.palette.common.black,
      }}
    >
      <Stack spacing={1.1}>
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.7} alignItems="center">
              <Typography
                id={headingId}
                sx={{
                  color: theme.palette.text.primary,
                  fontSize: { xs: '0.98rem', sm: '1.05rem' },
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
              <Box
                sx={{
                  height: 21,
                  px: 0.75,
                  borderRadius: 1.5,
                  color: chipColor,
                  borderColor: alpha(chipColor, 0.3),
                  backgroundColor: alpha(chipColor, 0.08),
                  border: '1px solid',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  lineHeight: '19px',
                  whiteSpace: 'nowrap',
                }}
              >
                {chipLabel}
              </Box>
            </Stack>
            <Typography
              sx={{
                mt: 0.35,
                color: alpha(theme.palette.text.primary, 0.48),
                fontSize: '0.72rem',
                fontWeight: 500,
                lineHeight: 1.35,
              }}
            >
              {subtitle}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={0.8}
            alignItems="center"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <Typography
              sx={{
                color: alpha(theme.palette.text.primary, 0.36),
                fontSize: '0.66rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              Updated with dashboard data
            </Typography>
            {onViewAll && (
              <ButtonBase
                onClick={onViewAll}
                aria-label={viewAllAriaLabel}
                sx={{
                  ml: 'auto',
                  px: 0.8,
                  py: 0.45,
                  borderRadius: 1.5,
                  color: alpha(theme.palette.text.primary, 0.56),
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.35,
                  transition: 'color 0.15s ease, background-color 0.15s ease',
                  '&:hover': {
                    color: theme.palette.text.primary,
                    backgroundColor: alpha(theme.palette.text.primary, 0.04),
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${alpha(chipColor, 0.55)}`,
                    outlineOffset: '2px',
                  },
                }}
              >
                View all
                <ArrowForwardIcon sx={{ fontSize: 13 }} />
              </ButtonBase>
            )}
          </Stack>
        </Box>

        {children}
      </Stack>
    </Box>
  );
};

export const SpotlightKpiGrid: React.FC<{
  getToneColor: (tone: SpotlightKpi['tone'], theme: Theme) => string;
  kpis: SpotlightKpi[];
}> = ({ getToneColor, kpis }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: {
        xs: 'repeat(2, minmax(0, 1fr))',
        md: 'repeat(5, minmax(0, 1fr))',
      },
      gap: 0.75,
    }}
  >
    {kpis.map((kpi) => (
      <SpotlightKpiCard key={kpi.label} kpi={kpi} getToneColor={getToneColor} />
    ))}
  </Box>
);

export const SpotlightKpiCard: React.FC<SpotlightKpiCardProps> = ({
  kpi,
  getToneColor,
}) => {
  const theme = useTheme();
  const toneColor = getToneColor(kpi.tone, theme);

  return (
    <Box
      sx={{
        minWidth: 0,
        p: { xs: 0.9, sm: 1 },
        minHeight: 58,
        borderRadius: 2,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: theme.palette.common.black,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 0.4,
      }}
    >
      <Typography
        sx={{
          color: alpha(theme.palette.text.primary, 0.48),
          fontSize: '0.66rem',
          fontWeight: 600,
          lineHeight: 1.2,
        }}
      >
        {kpi.label}
      </Typography>
      <Stack direction="row" spacing={0.75} alignItems="baseline" minWidth={0}>
        <Typography
          sx={{
            color: theme.palette.text.primary,
            fontSize: { xs: '0.92rem', sm: '1rem' },
            fontWeight: 700,
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {kpi.value}
        </Typography>
        {kpi.detail && (
          <Typography
            sx={{
              color: toneColor,
              fontSize: '0.62rem',
              fontWeight: 600,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {kpi.detail}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export const SpotlightRowShell: React.FC<SpotlightRowShellProps> = ({
  ariaLabel,
  children,
  minHeight = { xs: 86, sm: 70 },
  onClick,
  toneColor,
}) => {
  const theme = useTheme();
  const rowSx = {
    width: '100%',
    minWidth: 0,
    p: { xs: 0.85, sm: 0.9 },
    minHeight,
    borderRadius: 2,
    border: `1px solid ${theme.palette.border.light}`,
    backgroundColor: theme.palette.common.black,
    display: 'grid',
    gridTemplateColumns: {
      xs: '30px minmax(0, 1fr)',
      sm: '34px minmax(150px, 1.25fr) minmax(112px, 0.62fr) minmax(118px, 0.7fr) minmax(120px, 0.72fr) 18px',
    },
    gridTemplateAreas: {
      xs: `
        "rank identity"
        "rank primary"
        "rank secondary"
        "rank credibility"
        "rank repos"
      `,
      sm: `
        "rank identity primary secondary repos arrow"
        "rank identity credibility credibility repos arrow"
      `,
    },
    alignItems: 'center',
    columnGap: { xs: 0.75, sm: 1 },
    rowGap: { xs: 0.55, sm: 0 },
    textAlign: 'left',
    transition: 'border-color 0.16s ease, background-color 0.16s ease',
    ...(onClick
      ? {
          cursor: 'pointer',
          '&:hover': {
            borderColor: alpha(toneColor, 0.42),
            backgroundColor: alpha(theme.palette.text.primary, 0.025),
          },
          '&:focus-visible': {
            outline: `2px solid ${alpha(toneColor, 0.58)}`,
            outlineOffset: '2px',
          },
        }
      : {}),
  } as const;

  if (!onClick) {
    return <Box sx={rowSx}>{children}</Box>;
  }

  return (
    <ButtonBase onClick={onClick} aria-label={ariaLabel} sx={rowSx}>
      {children}
    </ButtonBase>
  );
};

export const SpotlightRank: React.FC<{ rank: number }> = ({ rank }) => {
  const theme = useTheme();

  return (
    <Typography
      sx={{
        gridArea: 'rank',
        color: alpha(theme.palette.text.primary, 0.42),
        fontSize: '0.76rem',
        fontWeight: 700,
        textAlign: 'center',
      }}
    >
      #{rank}
    </Typography>
  );
};

export const SpotlightIdentity: React.FC<SpotlightIdentityProps> = ({
  avatarUsername,
  label,
  markerColor,
  name,
  trailing,
}) => {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      spacing={0.8}
      alignItems="center"
      sx={{ gridArea: 'identity', minWidth: 0 }}
    >
      <Avatar
        src={getGithubAvatarSrc(avatarUsername)}
        alt={name}
        sx={{
          width: 34,
          height: 34,
          flexShrink: 0,
          fontSize: '0.76rem',
          fontWeight: 700,
          bgcolor: theme.palette.surface.light,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.border.light}`,
        }}
      >
        {getInitials(name)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            color: theme.palette.text.primary,
            fontSize: '0.82rem',
            fontWeight: 700,
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </Typography>
        <Stack
          direction="row"
          spacing={0.55}
          alignItems="center"
          sx={{ minWidth: 0 }}
        >
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: markerColor,
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              color: alpha(theme.palette.text.primary, 0.58),
              fontSize: '0.65rem',
              fontWeight: 600,
              flex: '1 1 auto',
              minWidth: 0,
              lineHeight: 1.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Typography>
          {trailing}
        </Stack>
      </Box>
    </Stack>
  );
};

export const SpotlightMetricBlock: React.FC<SpotlightMetricBlockProps> = ({
  gridArea,
  label,
  value,
  valueColor,
  valueFontSize = '0.78rem',
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ gridArea, minWidth: 0 }}>
      <Typography
        sx={{
          color: valueColor ?? alpha(theme.palette.text.primary, 0.78),
          fontSize: valueFontSize,
          fontWeight: 700,
          lineHeight: 1.1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          mt: 0.2,
          color: alpha(theme.palette.text.primary, 0.4),
          fontSize: '0.62rem',
          fontWeight: 600,
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export const SpotlightDailyEarnings: React.FC<{ value?: number }> = ({
  value,
}) => {
  const theme = useTheme();

  return (
    <Typography
      sx={{
        color: theme.palette.status.merged,
        fontSize: '0.62rem',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {formatSpotlightUsdPerDay(value)}
    </Typography>
  );
};

export const SpotlightEmptyState: React.FC<{ message: string }> = ({
  message,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        px: 0.9,
        py: 0.8,
        borderRadius: 2,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: theme.palette.common.black,
      }}
    >
      <Typography
        sx={{
          color: alpha(theme.palette.text.primary, 0.58),
          fontSize: '0.72rem',
          fontWeight: 600,
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export const SpotlightLoadingState: React.FC<{
  rowCount?: number;
  skeletonKeyPrefix: string;
}> = ({ rowCount = 3, skeletonKeyPrefix }) => (
  <Stack spacing={1}>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(5, minmax(0, 1fr))',
        },
        gap: 0.75,
      }}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton
          key={`${skeletonKeyPrefix}-kpi-skeleton-${index}`}
          variant="rounded"
          height={58}
          sx={{ borderRadius: 2 }}
        />
      ))}
    </Box>
    <Stack spacing={0.65}>
      {Array.from({ length: rowCount }, (_, index) => (
        <Skeleton
          key={`${skeletonKeyPrefix}-row-skeleton-${index}`}
          variant="rounded"
          height={72}
          sx={{ borderRadius: 2 }}
        />
      ))}
    </Stack>
  </Stack>
);

export const SpotlightRepoPills: React.FC<{
  repos: string[];
  name: string;
}> = ({ repos, name }) => {
  const theme = useTheme();
  const visibleRepos = repos.slice(0, 2);
  const hiddenCount = Math.max(0, repos.length - visibleRepos.length);

  if (repos.length === 0) {
    return (
      <Typography
        sx={{
          color: alpha(theme.palette.text.primary, 0.34),
          fontSize: '0.66rem',
          fontWeight: 600,
        }}
      >
        no repo context
      </Typography>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={0.45}
      useFlexGap
      flexWrap="wrap"
      justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
    >
      {visibleRepos.map((repo) => (
        <Box
          key={`${name}-${repo}`}
          sx={{
            maxWidth: { xs: 132, sm: 118 },
            px: 0.7,
            py: 0.32,
            borderRadius: 1.5,
            border: `1px solid ${theme.palette.border.light}`,
            color: alpha(theme.palette.text.primary, 0.72),
            fontSize: '0.64rem',
            fontWeight: 600,
            lineHeight: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={repo}
        >
          {repoLabel(repo)}
        </Box>
      ))}
      {hiddenCount > 0 && (
        <Box
          sx={{
            px: 0.7,
            py: 0.32,
            borderRadius: 1.5,
            backgroundColor: theme.palette.common.black,
            color: alpha(theme.palette.text.primary, 0.62),
            fontSize: '0.64rem',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          +{hiddenCount}
        </Box>
      )}
    </Stack>
  );
};

export const SpotlightCredibilityLine: React.FC<{
  value?: number;
  ariaLabelPrefix: string;
  getColor?: (value: number, theme: Theme) => string;
}> = ({ value, ariaLabelPrefix, getColor }) => {
  const theme = useTheme();
  if (!Number.isFinite(value)) return null;

  const clamped = Math.min(1, Math.max(0, value ?? 0));
  const percent = Math.round(clamped * 100);
  const color = getColor?.(clamped, theme) ?? credibilityColor(clamped);

  return (
    <Box sx={{ gridArea: 'credibility', minWidth: 0 }}>
      <Stack
        direction="row"
        spacing={0.65}
        alignItems="center"
        sx={{ minWidth: 0 }}
      >
        <Box
          sx={{
            position: 'relative',
            flex: 1,
            minWidth: 42,
            height: 3,
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.text.primary, 0.12),
            overflow: 'hidden',
          }}
          aria-label={`${ariaLabelPrefix} ${percent}%`}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              width: `${percent}%`,
              borderRadius: 'inherit',
              backgroundColor: color,
            }}
          />
        </Box>
        <Typography
          sx={{
            color: alpha(theme.palette.text.primary, 0.42),
            fontSize: '0.6rem',
            fontWeight: 700,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {percent}% cred
        </Typography>
      </Stack>
    </Box>
  );
};
