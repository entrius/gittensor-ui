import React, { useMemo } from 'react';
import { Chip, alpha, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
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
  level: string;
  color: string;
  bgColor: string;
  border: string;
  icon: React.ReactNode;
  message: string;
}

const ICON_SIZE = { fontSize: 18 };

export const getRiskAssessment = (
  theme: Theme,
  credibility: number,
  totalPRs: number,
): RiskAssessment => {
  // Elite: 100% Credibility AND established history (5+ PRs)
  if (credibility >= 1 && totalPRs >= 5) {
    return {
      level: 'elite',
      color: theme.palette.status.success,
      bgColor: alpha(theme.palette.status.success, 0.1),
      border: `3px double ${theme.palette.status.success}`,
      icon: <WorkspacePremiumIcon sx={ICON_SIZE} />,
      message: 'Proven Expert - Prioritize Merge',
    };
  }

  // High Priority: High credibility AND some history (3+ PRs)
  if (credibility >= 0.7 && totalPRs >= 3) {
    return {
      level: 'low',
      color: theme.palette.status.success,
      bgColor: alpha(theme.palette.status.success, 0.1),
      border: `1px solid ${alpha(theme.palette.status.success, 0.3)}`,
      icon: <CheckCircleIcon sx={ICON_SIZE} />,
      message: 'High Trust - Expedite Code Review',
    };
  }

  // New Contributor: Good credibility but low history (< 3 PRs)
  if (credibility >= 0.5 && totalPRs < 3) {
    return {
      level: 'medium',
      color: theme.palette.status.info,
      bgColor: alpha(theme.palette.status.info, 0.1),
      border: `1px solid ${alpha(theme.palette.status.info, 0.3)}`,
      icon: <InfoOutlinedIcon sx={ICON_SIZE} />,
      message: 'New Contributor - Standard Code Review',
    };
  }

  // Standard Priority: Medium credibility
  if (credibility >= 0.5) {
    return {
      level: 'medium',
      color: theme.palette.status.neutral,
      bgColor: alpha(theme.palette.status.neutral, 0.1),
      border: `1px solid ${alpha(theme.palette.status.neutral, 0.25)}`,
      icon: <WarningAmberIcon sx={ICON_SIZE} />,
      message: 'Moderate Trust - Standard Code Review',
    };
  }

  // Untrusted: Very low credibility (< 0.1)
  if (credibility < 0.1) {
    return {
      level: 'critical',
      color: theme.palette.status.closed,
      bgColor: alpha(theme.palette.status.closed, 0.15),
      border: `3px double ${theme.palette.status.closed}`,
      icon: <BlockIcon sx={ICON_SIZE} />,
      message: 'Untrusted - Heavy Code Review',
    };
  }

  // Low Priority: Low credibility (0.1 - 0.49)
  return {
    level: 'high',
    color: theme.palette.status.closed,
    bgColor: alpha(theme.palette.status.closed, 0.1),
    border: `1px solid ${alpha(theme.palette.status.closed, 0.3)}`,
    icon: <ErrorOutlineIcon sx={ICON_SIZE} />,
    message: 'Low Trust - Strict Code Review',
  };
};

const TrustBadge: React.FC<TrustBadgeProps> = ({ credibility, totalPRs }) => {
  const theme = useTheme();
  const assessment = useMemo(
    () => getRiskAssessment(theme, credibility, totalPRs),
    [credibility, theme, totalPRs],
  );

  return (
    <Chip
      variant="status"
      icon={assessment.icon as React.ReactElement}
      label={assessment.message}
      sx={{
        color: assessment.color,
        borderColor: assessment.color,
        border: assessment.border,
        '& .MuiChip-icon': { color: assessment.color },
      }}
    />
  );
};

export default TrustBadge;
