import React from 'react';
import { Avatar, Box, Chip, Tooltip, Typography } from '@mui/material';
import { type Theme } from '@mui/material/styles';
import { type SystemStyleObject } from '@mui/system';
import { getTierColors } from '../../components/leaderboard/types';

type CellSx =
  | SystemStyleObject<Theme>
  | ((theme: Theme) => SystemStyleObject<Theme>);

type ThemeColorValue = string | ((theme: Theme) => string);

type AvatarContentCellProps = {
  avatarAlt?: string;
  avatarBorderRadius?: number | string;
  avatarSize?: number;
  avatarSrc?: string;
  avatarSx?: CellSx;
  children: React.ReactNode;
  gap?: number;
  showAvatarBorder?: boolean;
};

const SearchAvatarContentCell: React.FC<AvatarContentCellProps> = ({
  avatarAlt,
  avatarBorderRadius,
  avatarSize = 22,
  avatarSrc,
  avatarSx,
  children,
  gap = 1.25,
  showAvatarBorder = true,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap,
      minWidth: 0,
    }}
  >
    <Avatar
      src={avatarSrc}
      alt={avatarAlt}
      sx={[
        (theme) => ({
          width: avatarSize,
          height: avatarSize,
          flexShrink: 0,
          borderRadius: avatarBorderRadius,
          ...(showAvatarBorder
            ? { border: `1px solid ${theme.palette.border.light}` }
            : {}),
        }),
        ...(avatarSx ? [avatarSx] : []),
      ]}
    />
    <Box sx={{ minWidth: 0 }}>{children}</Box>
  </Box>
);

type TruncatedTextProps = {
  sx?: CellSx;
  text: React.ReactNode;
  tooltip?: React.ReactNode;
};

const SearchTruncatedText: React.FC<TruncatedTextProps> = ({
  sx,
  text,
  tooltip,
}) => {
  const content = (
    <Typography
      component="span"
      sx={[
        {
          display: 'block',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        ...(sx ? [sx] : []),
      ]}
    >
      {text}
    </Typography>
  );

  if (!tooltip) return content;

  return (
    <Tooltip title={tooltip} placement="top">
      {content}
    </Tooltip>
  );
};

type TierBadgeProps = {
  label?: string;
  tier?: string;
};

const SearchTierBadge: React.FC<TierBadgeProps> = ({ label, tier }) => {
  const resolvedLabel = tier || label;
  if (!resolvedLabel) return null;

  return (
    <Box
      component="span"
      sx={(theme) => {
        const tierColors = getTierColors(tier);

        return {
          display: 'inline-flex',
          alignItems: 'center',
          border: '1px solid',
          borderRadius: 1.25,
          px: 1,
          py: 0.25,
          ...theme.typography.monoSmall,
          lineHeight: 1,
          color: tierColors.text,
          borderColor: tierColors.border,
          backgroundColor: tierColors.bg,
        };
      }}
    >
      {resolvedLabel}
    </Box>
  );
};

type StatusChipProps = {
  backgroundColor: ThemeColorValue;
  borderColor: ThemeColorValue;
  color: ThemeColorValue;
  label: string;
};

const SearchStatusChip: React.FC<StatusChipProps> = ({
  backgroundColor,
  borderColor,
  color,
  label,
}) => (
  <Chip
    label={label}
    size="small"
    sx={(theme) => ({
      ...theme.typography.monoSmall,
      backgroundColor:
        typeof backgroundColor === 'function'
          ? backgroundColor(theme)
          : backgroundColor,
      color: typeof color === 'function' ? color(theme) : color,
      border: `1px solid ${
        typeof borderColor === 'function' ? borderColor(theme) : borderColor
      }`,
    })}
  />
);

export {
  SearchAvatarContentCell,
  SearchStatusChip,
  SearchTierBadge,
  SearchTruncatedText,
};
