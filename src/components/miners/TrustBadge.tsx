import React, { useMemo } from 'react';
import { Chip } from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BlockIcon from '@mui/icons-material/Block';

interface TrustBadgeProps {
  credibility: number;
  totalPRs: number;
}

interface RiskAssessment {
  level: 'elite' | 'low' | 'medium-new' | 'medium' | 'critical' | 'high';
  icon: React.ReactNode;
  message: string;
}

const ICON_SIZE = { fontSize: 18 };

export const getRiskAssessment = (
  credibility: number,
  totalPRs: number,
): RiskAssessment => {
  if (credibility >= 1 && totalPRs >= 5)
    return {
      level: 'elite',
      icon: <WorkspacePremiumIcon sx={ICON_SIZE} />,
      message: 'Proven Expert - Prioritize Merge',
    };
  if (credibility >= 0.7 && totalPRs >= 3)
    return {
      level: 'low',
      icon: <CheckCircleIcon sx={ICON_SIZE} />,
      message: 'High Trust - Expedite Code Review',
    };
  if (credibility >= 0.5 && totalPRs < 3)
    return {
      level: 'medium-new',
      icon: <InfoOutlinedIcon sx={ICON_SIZE} />,
      message: 'New Contributor - Standard Code Review',
    };
  if (credibility >= 0.5)
    return {
      level: 'medium',
      icon: <WarningAmberIcon sx={ICON_SIZE} />,
      message: 'Moderate Trust - Standard Code Review',
    };
  if (credibility < 0.1)
    return {
      level: 'critical',
      icon: <BlockIcon sx={ICON_SIZE} />,
      message: 'Untrusted - Heavy Code Review',
    };
  return {
    level: 'high',
    icon: <ErrorOutlineIcon sx={ICON_SIZE} />,
    message: 'Low Trust - Strict Code Review',
  };
};

function resolveColor(
  level: RiskAssessment['level'],
  palette: Theme['palette'],
): string {
  switch (level) {
    case 'elite':
    case 'low':
      return palette.status.success;
    case 'medium-new':
      return palette.status.info;
    case 'medium':
      return palette.status.neutral;
    case 'critical':
    case 'high':
      return palette.status.closed;
  }
}

const TrustBadge: React.FC<TrustBadgeProps> = ({ credibility, totalPRs }) => {
  const theme = useTheme();
  const assessment = useMemo(
    () => getRiskAssessment(credibility, totalPRs),
    [credibility, totalPRs],
  );
  const color = resolveColor(assessment.level, theme.palette);
  const isDouble =
    assessment.level === 'elite' || assessment.level === 'critical';

  return (
    <Chip
      variant="status"
      icon={assessment.icon as React.ReactElement}
      label={assessment.message}
      sx={{
        color,
        border: isDouble
          ? `3px double ${color}`
          : `1px solid ${alpha(color, 0.4)}`,
        backgroundColor: alpha(color, 0.08),
        maxWidth: '100%',
        '& .MuiChip-label': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        '& .MuiChip-icon': { color },
      }}
    />
  );
};

export default TrustBadge;
