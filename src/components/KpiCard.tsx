import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  type SxProps,
  type Theme,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import theme from '../theme';

export interface KpiCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  variant?: 'large' | 'medium';
  sx?: SxProps<Theme>;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  variant = 'medium',
  sx,
}) => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isLarge = variant === 'large';
  const padding = isLarge
    ? { py: isMobile ? 1.6 : 2 }
    : { py: isMobile ? 1.1 : 1.35 };
  const valueVariant = isLarge ? 'h2' : 'h4';
  const titleSize = isLarge ? (isMobile ? 14 : 16) : isMobile ? 12 : 14;
  const cardSx: SxProps<Theme> = [
    (muiTheme) => ({
      borderRadius: 3,
      border: `1px solid ${muiTheme.palette.border.light}`,
      backgroundColor: 'transparent',
      height: '100%',
    }),
    ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
  ];

  const formattedValue =
    value !== undefined && value !== null
      ? typeof value === 'string' &&
        (value.startsWith('$') || value.includes('ل') || value.includes(','))
        ? value
        : typeof value === 'number' || typeof value === 'string'
          ? Number(value).toLocaleString()
          : value
      : undefined;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${muiTheme.palette.border.light}`,
        backgroundColor: 'transparent',
        height: '100%',
        ...sx,
      }}
      elevation={0}
    >
      <CardContent
        sx={{
          textAlign: 'center',
          ...padding,
          '&:last-child': { pb: padding.py },
        }}
      >
        <Typography
          variant="dataLabel"
          fontSize={titleSize}
          gutterBottom
          sx={{
            color: (muiTheme) => muiTheme.palette.text.primary,
            mb: isLarge ? 0.8 : 0.35,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant={valueVariant}
          fontWeight="bold"
          sx={{
            color: (muiTheme) => muiTheme.palette.text.primary,
            fontFamily: (muiTheme) => muiTheme.typography.mono.fontFamily,
            my: isLarge ? (isMobile ? 0.45 : 0.8) : 0.35,
            fontSize: isLarge
              ? isMobile
                ? '2rem'
                : undefined
              : isMobile
                ? '1.2rem'
                : '1.42rem',
          }}
        >
          {formattedValue ?? '-'}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              color: (muiTheme) => muiTheme.palette.text.tertiary,
              mt: isLarge ? 0.4 : 0.15,
              fontSize: isLarge ? (isMobile ? 12 : 14) : isMobile ? 11 : 12,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default KpiCard;
