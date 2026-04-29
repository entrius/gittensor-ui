import React from 'react';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GitHubIcon from '@mui/icons-material/GitHub';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { type SvgIconComponent } from '@mui/icons-material';
import {
  Avatar,
  Box,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { getGithubAvatarSrc } from '../../../utils';
import { type DashboardFeaturedWork } from '../dashboardData';

interface DashboardFeaturedWorkProps {
  items: DashboardFeaturedWork[];
  isLoading?: boolean;
}

const utcFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

const formatUtc = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : utcFmt.format(date).replace(',', '');
};

const tonePalette = (theme: Theme) =>
  ({
    merged: theme.palette.status.merged,
    closed: theme.palette.status.closed,
    open: theme.palette.status.open,
  }) satisfies Record<DashboardFeaturedWork['statusTone'], string>;

type Align = {
  alignItems: 'flex-start' | 'center' | 'flex-end';
  textAlign: 'left' | 'center' | 'right';
};
const ALIGN: Align[] = [
  { alignItems: 'flex-start', textAlign: 'left' },
  { alignItems: 'center', textAlign: 'center' },
  { alignItems: 'flex-end', textAlign: 'right' },
];

const metricAlign = (count: number, i: number): Align =>
  count === 2 ? (i === 0 ? ALIGN[0] : ALIGN[2]) : (ALIGN[i] ?? ALIGN[2]);

const metricColor = (
  theme: Theme,
  tone?: 'positive' | 'negative' | 'neutral',
) =>
  tone === 'negative'
    ? alpha(theme.palette.diff.deletions, 0.82)
    : tone === 'positive'
      ? alpha(theme.palette.diff.additions, 0.82)
      : alpha(theme.palette.text.primary, 0.9);

const CHANGES_SEP = ' / -';

const renderChangesMetric = (theme: Theme, value: string) => {
  const i = value.indexOf(CHANGES_SEP);
  if (i === -1) return value;
  return (
    <>
      {value.slice(0, i)}
      <Box
        component="span"
        sx={{ color: alpha(theme.palette.text.primary, 0.9) }}
      >
        {' '}
        /
      </Box>
      <Box
        component="span"
        sx={{ color: alpha(theme.palette.diff.deletions, 0.86) }}
      >
        {' '}
        -{value.slice(i + CHANGES_SEP.length)}
      </Box>
    </>
  );
};

const CATEGORY_STYLE: Record<
  string,
  { color: string; Icon: SvgIconComponent }
> = {
  'Top PR by Score': { color: '#F59E0B', Icon: EmojiEventsIcon },
  'Largest PR': { color: '#3B82F6', Icon: OpenInFullIcon },
  'Most Commits PR': { color: '#8B5CF6', Icon: AccountTreeIcon },
  'Newest Merged PR': { color: '#22C55E', Icon: CallMergeIcon },
  'Top Completed Issue': { color: '#14B8A6', Icon: TaskAltIcon },
  'Highest Bounty Issue': { color: '#F97316', Icon: MonetizationOnIcon },
};

const DashboardFeaturedWorkSection: React.FC<DashboardFeaturedWorkProps> = ({
  items,
  isLoading = false,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const mono = theme.typography.fontFamily;
  const border = theme.palette.border.light;
  const divider = {
    pt: 0.6,
    borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.2)}`,
  };

  const openDetails = (item: DashboardFeaturedWork) =>
    item.kind === 'pr'
      ? navigate(
          `/miners/pr?repo=${encodeURIComponent(item.repository)}&number=${encodeURIComponent(String(item.prNumber ?? ''))}`,
        )
      : navigate(
          `/bounties/details?id=${encodeURIComponent(String(item.issueId ?? ''))}`,
        );

  const renderCard = (item: DashboardFeaturedWork) => {
    const toneColor = tonePalette(theme)[item.statusTone];
    const owner = item.repository.split('/')[0] || '';
    const metrics = item.metrics.slice(0, 3);
    const n = metrics.length || 1;
    const cat = CATEGORY_STYLE[item.featuredLabel];
    const catColor = cat?.color ?? alpha(theme.palette.status.merged, 0.9);
    const CatIcon = cat?.Icon;

    return (
      <Stack
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={() => openDetails(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetails(item);
          }
        }}
        sx={{
          height: '100%',
          minHeight: 262,
          p: 0.9,
          fontFamily: mono,
          backgroundColor: alpha(catColor, 0.04),
          borderRadius: 2,
          border: `1px solid ${border}`,
          borderTop: `2.5px solid ${alpha(catColor, 0.55)}`,
          display: 'grid',
          gridTemplateRows: 'auto auto 2.56em auto auto',
          rowGap: 0.55,
          cursor: 'pointer',
          transition:
            'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            borderColor: alpha(catColor, 0.45),
            borderTopColor: catColor,
            backgroundColor: alpha(catColor, 0.07),
            boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.22)}`,
          },
          '&:focus-visible': {
            outline: `2px solid ${alpha(catColor, 0.5)}`,
            outlineOffset: '2px',
          },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '64px minmax(0, 1fr)',
            columnGap: 1.15,
            alignItems: 'center',
            minWidth: 0,
            py: 0.35,
          }}
        >
          <Avatar
            src={getGithubAvatarSrc(owner)}
            alt={owner}
            sx={{
              width: 64,
              height: 64,
              bgcolor: theme.palette.surface.light,
              border: `1px solid ${border}`,
              '& .MuiSvgIcon-root': { fontSize: 29 },
            }}
          >
            <GitHubIcon />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                color: theme.palette.text.primary,
                fontFamily: 'inherit',
                fontSize: '1.1rem',
                fontWeight: 800,
                letterSpacing: '0.01em',
                lineHeight: 1.05,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {item.repository}
            </Typography>
            <Stack
              direction="row"
              spacing={0.4}
              alignItems="center"
              sx={{ mt: 0.28, minWidth: 0 }}
            >
              {CatIcon && (
                <CatIcon
                  sx={{ fontSize: 13, color: catColor, flexShrink: 0 }}
                />
              )}
              <Typography
                sx={{
                  color: catColor,
                  fontFamily: mono,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.featuredLabel}
              </Typography>
            </Stack>
          </Box>
        </Box>

        <Tooltip title={item.title} arrow placement="bottom">
          <Typography
            sx={{
              color: alpha(theme.palette.text.primary, 0.78),
              fontFamily: 'inherit',
              fontSize: '0.8rem',
              fontWeight: 500,
              lineHeight: 1.28,
              height: '2.52em',
              display: '-webkit-box',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              mt: 1.05,
              mb: -0.35,
            }}
          >
            {item.title}
          </Typography>
        </Tooltip>

        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ mt: -0.15 }}
        >
          <Avatar
            src={getGithubAvatarSrc(item.githubUsername)}
            alt={item.authorLabel}
            sx={{
              width: 18,
              height: 18,
              fontSize: '0.6rem',
              bgcolor: theme.palette.surface.light,
              border: `1px solid ${border}`,
            }}
          >
            {item.authorLabel.slice(0, 1).toUpperCase()}
          </Avatar>
          <Typography
            sx={{
              color: alpha(theme.palette.text.primary, 0.64),
              fontFamily: mono,
              fontSize: '0.74rem',
              fontWeight: 600,
            }}
          >
            by {item.authorLabel}
          </Typography>
        </Stack>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={divider}
        >
          <Box
            sx={{
              px: 0.72,
              py: 0.16,
              borderRadius: 1.5,
              border: `1px solid ${alpha(toneColor, 0.55)}`,
              bgcolor: alpha(toneColor, 0.1),
            }}
          >
            <Typography
              sx={{
                color: alpha(toneColor, 0.92),
                fontFamily: mono,
                fontSize: '0.74rem',
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {item.statusLabel}
            </Typography>
          </Box>
          <Typography
            sx={{
              color: alpha(theme.palette.text.primary, 0.7),
              fontFamily: mono,
              fontSize: '0.72rem',
              whiteSpace: 'nowrap',
            }}
          >
            {formatUtc(item.openedAt)}
          </Typography>
        </Stack>

        <Box sx={divider}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
              gap: 0,
            }}
          >
            {metrics.map((metric, i) => {
              const { alignItems, textAlign } = metricAlign(n, i);
              return (
                <Stack
                  key={`${item.id}-${metric.label}`}
                  spacing={0.2}
                  sx={{ alignItems, px: 0.65 }}
                >
                  <Typography
                    sx={{
                      color: alpha(theme.palette.text.primary, 0.58),
                      fontFamily: mono,
                      fontSize: '0.74rem',
                      textAlign,
                    }}
                  >
                    {metric.label}
                  </Typography>
                  <Typography
                    sx={{
                      color: metricColor(theme, metric.tone),
                      fontFamily: mono,
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      lineHeight: 1.15,
                      textAlign,
                    }}
                  >
                    {metric.label === 'Changes' &&
                    metric.value.includes(CHANGES_SEP)
                      ? renderChangesMetric(theme, metric.value)
                      : metric.value}
                  </Typography>
                </Stack>
              );
            })}
          </Box>
        </Box>
      </Stack>
    );
  };

  return (
    <Box
      sx={{
        width: '100%',
        p: { xs: 1.45, sm: 1.65 },
        borderRadius: 3,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: 'transparent',
      }}
    >
      <Typography
        sx={{
          mb: 1.35,
          color: theme.palette.text.primary,
          fontFamily: mono,
          fontSize: { xs: '1.02rem', sm: '1.1rem' },
          fontWeight: 700,
        }}
      >
        Featured Work
      </Typography>

      {isLoading ? (
        <Box
          sx={{
            minHeight: 170,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={28} />
        </Box>
      ) : items.length === 0 ? (
        <Typography
          sx={{ color: 'text.secondary', fontFamily: mono, fontSize: '0.8rem' }}
        >
          No featured PRs or issues available yet.
        </Typography>
      ) : (
        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            gridAutoRows: '1fr',
            gap: 1.15,
          }}
        >
          {items.slice(0, 6).map(renderCard)}
        </Box>
      )}
    </Box>
  );
};

export default DashboardFeaturedWorkSection;
