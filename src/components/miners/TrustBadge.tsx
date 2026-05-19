import React, { useMemo } from 'react';
import { Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BlockIcon from '@mui/icons-material/Block';
import { STATUS_COLORS } from '../../theme';

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

/**
 * Credibility eligibility gate (gittensor MIN_CREDIBILITY). A miner at or above
 * this clears the PR-eligibility bar; below it they do not. Per-repo configs
 * can raise it, but the badge uses the global default as the reference point.
 */
const CREDIBILITY_GATE = 0.8;

const getRiskAssessment = (
  credibility: number,
  totalPRs: number,
): RiskAssessment => {
  // Elite: perfect credibility AND established history (5+ PRs)
  if (credibility >= 1 && totalPRs >= 5) {
    return {
      level: 'elite',
      color: STATUS_COLORS.success,
      bgColor: `${STATUS_COLORS.success}1a`,
      border: `3px double ${STATUS_COLORS.success}`,
      icon: <WorkspacePremiumIcon sx={ICON_SIZE} />,
      message: 'Proven Expert - Prioritize Merge',
    };
  }

  // High Trust: clears the eligibility gate AND has some history (3+ PRs)
  if (credibility >= CREDIBILITY_GATE && totalPRs >= 3) {
    return {
      level: 'low',
      color: STATUS_COLORS.success,
      bgColor: `${STATUS_COLORS.success}1a`,
      border: `1px solid ${STATUS_COLORS.success}4d`,
      icon: <CheckCircleIcon sx={ICON_SIZE} />,
      message: 'High Trust - Expedite Code Review',
    };
  }

  // New Contributor: clears the eligibility gate but has limited history (< 3 PRs)
  if (credibility >= CREDIBILITY_GATE) {
    return {
      level: 'medium',
      color: STATUS_COLORS.info,
      bgColor: `${STATUS_COLORS.info}1a`,
      border: `1px solid ${STATUS_COLORS.info}4d`,
      icon: <InfoOutlinedIcon sx={ICON_SIZE} />,
      message: 'New Contributor - Standard Code Review',
    };
  }

  // Below the eligibility bar: some credibility but under the 0.80 gate
  if (credibility >= 0.5) {
    return {
      level: 'medium',
      color: STATUS_COLORS.neutral,
      bgColor: alpha(STATUS_COLORS.neutral, 0.1),
      border: `1px solid ${alpha(STATUS_COLORS.neutral, 0.25)}`,
      icon: <WarningAmberIcon sx={ICON_SIZE} />,
      message: 'Below Eligibility Bar - Standard Code Review',
    };
  }

  // Untrusted: Very low credibility (< 0.1)
  if (credibility < 0.1) {
    return {
      level: 'critical',
      color: STATUS_COLORS.closed,
      bgColor: `${STATUS_COLORS.closed}26`,
      border: `3px double ${STATUS_COLORS.closed}`,
      icon: <BlockIcon sx={ICON_SIZE} />,
      message: 'Untrusted - Heavy Code Review',
    };
  }

  // Low Priority: Low credibility (0.1 - 0.49)
  return {
    level: 'high',
    color: STATUS_COLORS.closed,
    bgColor: `${STATUS_COLORS.closed}1a`,
    border: `1px solid ${STATUS_COLORS.closed}4d`,
    icon: <ErrorOutlineIcon sx={ICON_SIZE} />,
    message: 'Low Trust - Strict Code Review',
  };
};

const TrustBadge: React.FC<TrustBadgeProps> = ({ credibility, totalPRs }) => {
  const assessment = useMemo(
    () => getRiskAssessment(credibility, totalPRs),
    [credibility, totalPRs],
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
        maxWidth: '100%',
        '& .MuiChip-label': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        '& .MuiChip-icon': { color: assessment.color },
      }}
    />
  );
};

export default TrustBadge;
