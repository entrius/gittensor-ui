import React, { useMemo } from 'react';
import {
  Box,
  CircularProgress,
  Grid,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ReactECharts from 'echarts-for-react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useGeneralConfig, useStats } from '../../../api';
import {
  computeEmissionBreakdown,
  formatAlpha,
  formatUsdCompact,
  type EmissionBreakdown,
} from '../../../utils/emissionEconomics';

const MONO_FONT = '"JetBrains Mono", monospace';

const tooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: 'surface.tooltip',
      color: 'text.primary',
      fontSize: '0.75rem',
      fontFamily: MONO_FONT,
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid',
      borderColor: 'border.light',
      maxWidth: 280,
    },
  },
  arrow: { sx: { color: 'surface.tooltip' } },
};

interface EmissionSliceProps {
  label: string;
  alphaPerDay: number;
  usdPerDay: number | null;
  percent: number;
  color: string;
  tooltip: string;
  monthlyAlpha: number;
  monthlyUsd: number | null;
}

const EmissionSlice: React.FC<EmissionSliceProps> = ({
  label,
  alphaPerDay,
  usdPerDay,
  percent,
  color,
  tooltip,
  monthlyAlpha,
  monthlyUsd,
}) => {
  const usd = formatUsdCompact(usdPerDay);
  const monthlyUsdLabel = formatUsdCompact(monthlyUsd);

  return (
    <Tooltip title={tooltip} arrow placement="top" slotProps={tooltipSlotProps}>
      <Box
        sx={{
          backgroundColor: 'surface.subtle',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'border.subtle',
          p: 1.75,
          cursor: 'help',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          height: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            mb: 0.25,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: color,
              flexShrink: 0,
            }}
          />
          <Typography variant="statLabel">{label}</Typography>
          <Typography
            sx={{
              fontFamily: MONO_FONT,
              fontSize: '0.7rem',
              fontWeight: 600,
              color: (t) => alpha(t.palette.text.primary, 0.55),
              ml: 'auto',
            }}
          >
            {percent.toFixed(1)}%
          </Typography>
          <InfoOutlinedIcon sx={{ fontSize: '0.75rem', opacity: 0.4 }} />
        </Box>
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontSize: '1.35rem',
            fontWeight: 600,
            color,
            lineHeight: 1.15,
          }}
        >
          {formatAlpha(alphaPerDay)}{' '}
          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>α/day</span>
        </Typography>
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontSize: '0.78rem',
            color: (t) => alpha(t.palette.text.primary, 0.6),
          }}
        >
          {usd ? `${usd} / day` : '—'}
        </Typography>
        <Box
          sx={{
            mt: 0.5,
            pt: 0.5,
            borderTop: '1px dashed',
            borderColor: 'border.subtle',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography
            sx={{
              fontFamily: MONO_FONT,
              fontSize: '0.68rem',
              color: (t) => alpha(t.palette.text.primary, 0.45),
            }}
          >
            ~{formatAlpha(monthlyAlpha)} α/mo
          </Typography>
          {monthlyUsdLabel && (
            <Typography
              sx={{
                fontFamily: MONO_FONT,
                fontSize: '0.68rem',
                fontWeight: 600,
                color: (t) => alpha(t.palette.text.primary, 0.6),
              }}
            >
              {monthlyUsdLabel}/mo
            </Typography>
          )}
        </Box>
      </Box>
    </Tooltip>
  );
};

interface DonutProps {
  breakdown: EmissionBreakdown;
  minerColor: string;
  validatorColor: string;
}

const EmissionDonut: React.FC<DonutProps> = ({
  breakdown,
  minerColor,
  validatorColor,
}) => {
  const theme = useTheme();

  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.palette.surface.tooltip,
        borderColor: alpha(theme.palette.text.primary, 0.15),
        borderWidth: 1,
        textStyle: {
          color: theme.palette.text.primary,
          fontFamily: MONO_FONT,
          fontSize: 12,
        },
        formatter: ({
          name,
          value,
          percent,
        }: {
          name: string;
          value: number;
          percent: number;
        }) => `${name}: ${formatAlpha(value)} α (${percent}%)`,
      },
      title: {
        text: `${breakdown.totalDailyAlpha.toLocaleString()} α`,
        subtext: 'per day',
        left: 'center',
        top: '38%',
        textStyle: {
          color: theme.palette.text.primary,
          fontFamily: MONO_FONT,
          fontSize: 16,
          fontWeight: 'bold',
        },
        subtextStyle: {
          color: alpha(theme.palette.text.primary, 0.5),
          fontFamily: MONO_FONT,
          fontSize: 11,
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['60%', '82%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderColor: theme.palette.background.default,
            borderWidth: 2,
          },
          data: [
            {
              name: 'Miners',
              value: breakdown.minerAlphaPerDay,
              itemStyle: { color: minerColor },
            },
            {
              name: 'Validators',
              value: breakdown.validatorAlphaPerDay,
              itemStyle: { color: validatorColor },
            },
          ],
        },
      ],
    }),
    [breakdown, minerColor, validatorColor, theme],
  );

  return (
    <Box sx={{ width: '100%', height: 200 }}>
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </Box>
  );
};

const EmissionEconomicsCard: React.FC = () => {
  const theme = useTheme();
  const { data: config, isLoading: configLoading } = useGeneralConfig();
  const { data: stats, isLoading: statsLoading } = useStats();

  const breakdown = useMemo(
    () => computeEmissionBreakdown(config?.emission, stats?.prices),
    [config?.emission, stats?.prices],
  );

  const isLoading = configLoading || statsLoading;

  if (isLoading) {
    return (
      <Box
        sx={{
          width: '100%',
          p: 3,
          borderRadius: 3,
          border: `1px solid ${theme.palette.border.light}`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 240,
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!breakdown) return null;

  const minerColor = theme.palette.status.merged;
  const validatorColor = theme.palette.status.info;

  return (
    <Box
      sx={{
        width: '100%',
        p: { xs: 1.75, sm: 2 },
        borderRadius: 3,
        border: `1px solid ${theme.palette.border.light}`,
        backgroundColor: 'transparent',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: MONO_FONT,
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            Network Economics
          </Typography>
          <Typography
            sx={{
              fontFamily: MONO_FONT,
              fontSize: '0.72rem',
              color: (t) => alpha(t.palette.text.primary, 0.5),
              mt: 0.25,
            }}
          >
            Daily alpha emission split between miners and validators
          </Typography>
        </Box>
        {breakdown.alphaPriceUsd != null && (
          <Box
            sx={{
              px: 1.25,
              py: 0.5,
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'border.light',
              backgroundColor: 'surface.subtle',
            }}
          >
            <Typography
              sx={{
                fontFamily: MONO_FONT,
                fontSize: '0.68rem',
                color: (t) => alpha(t.palette.text.primary, 0.55),
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              α Price
            </Typography>
            <Typography
              sx={{
                fontFamily: MONO_FONT,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'text.primary',
              }}
            >
              ${breakdown.alphaPriceUsd.toFixed(2)}
            </Typography>
          </Box>
        )}
      </Box>

      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={5}>
          <EmissionDonut
            breakdown={breakdown}
            minerColor={minerColor}
            validatorColor={validatorColor}
          />
        </Grid>
        <Grid item xs={12} md={7}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <EmissionSlice
                label="Miners"
                alphaPerDay={breakdown.minerAlphaPerDay}
                usdPerDay={breakdown.minerUsdPerDay}
                percent={breakdown.minerSharePercent}
                color={minerColor}
                tooltip="Share of daily subnet emissions routed to miners for merged PR contributions and issue discovery."
                monthlyAlpha={
                  breakdown.minerAlphaPerDay * breakdown.daysInMonth
                }
                monthlyUsd={
                  breakdown.minerUsdPerDay != null
                    ? breakdown.minerUsdPerDay * breakdown.daysInMonth
                    : null
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <EmissionSlice
                label="Validators"
                alphaPerDay={breakdown.validatorAlphaPerDay}
                usdPerDay={breakdown.validatorUsdPerDay}
                percent={breakdown.validatorSharePercent}
                color={validatorColor}
                tooltip="Remaining share of daily subnet emissions routed to validators for scoring and consensus work."
                monthlyAlpha={
                  breakdown.validatorAlphaPerDay * breakdown.daysInMonth
                }
                monthlyUsd={
                  breakdown.validatorUsdPerDay != null
                    ? breakdown.validatorUsdPerDay * breakdown.daysInMonth
                    : null
                }
              />
            </Grid>
            <Grid item xs={12}>
              <Box
                sx={{
                  backgroundColor: 'surface.subtle',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'border.subtle',
                  px: 1.75,
                  py: 1.25,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="statLabel">Total subnet</Typography>
                  <Typography
                    sx={{
                      fontFamily: MONO_FONT,
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      color: 'text.primary',
                    }}
                  >
                    {formatAlpha(breakdown.totalDailyAlpha)} α / day
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="statLabel">Monthly</Typography>
                  <Typography
                    sx={{
                      fontFamily: MONO_FONT,
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      color:
                        breakdown.totalUsdPerDay != null
                          ? theme.palette.status.success
                          : 'text.primary',
                    }}
                  >
                    {breakdown.totalUsdPerDay != null
                      ? formatUsdCompact(
                          breakdown.totalUsdPerDay * breakdown.daysInMonth,
                        )
                      : `${formatAlpha(
                          breakdown.totalDailyAlpha * breakdown.daysInMonth,
                        )} α`}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmissionEconomicsCard;
