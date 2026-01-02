import React, { useMemo } from "react";
import { Chip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import BlockIcon from "@mui/icons-material/Block";
import { STATUS_COLORS } from "../../theme";

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

export const getRiskAssessment = (credibility: number, totalPRs: number): RiskAssessment => {
  // Elite: 100% Credibility AND established history (5+ PRs)
  if (credibility >= 1 && totalPRs >= 5) {
    return {
      level: "elite",
      color: STATUS_COLORS.success,
      bgColor: `${STATUS_COLORS.success}1a`,
      border: `3px double ${STATUS_COLORS.success}`,
      icon: <WorkspacePremiumIcon sx={ICON_SIZE} />,
      message: "Proven Expert - Prioritize Merge",
    };
  }

  // High Priority: High credibility AND some history (3+ PRs)
  if (credibility >= 0.7 && totalPRs >= 3) {
    return {
      level: "low",
      color: STATUS_COLORS.success,
      bgColor: `${STATUS_COLORS.success}1a`,
      border: `1px solid ${STATUS_COLORS.success}4d`,
      icon: <CheckCircleIcon sx={ICON_SIZE} />,
      message: "High Trust - Expedite Code Review",
    };
  }

  // New Contributor: Good credibility but low history (< 3 PRs)
  if (credibility >= 0.5 && totalPRs < 3) {
    return {
      level: "medium",
      color: STATUS_COLORS.info,
      bgColor: `${STATUS_COLORS.info}1a`,
      border: `1px solid ${STATUS_COLORS.info}4d`,
      icon: <InfoOutlinedIcon sx={ICON_SIZE} />,
      message: "New Contributor - Standard Code Review",
    };
  }

  // Standard Priority: Medium credibility
  if (credibility >= 0.5) {
    return {
      level: "medium",
      color: "#9ca3af",
      bgColor: "rgba(156, 163, 175, 0.1)",
      border: "1px solid rgba(156, 163, 175, 0.25)",
      icon: <WarningAmberIcon sx={ICON_SIZE} />,
      message: "Moderate Trust - Standard Code Review",
    };
  }

  // Untrusted: Very low credibility (< 0.1)
  if (credibility < 0.1) {
    return {
      level: "critical",
      color: STATUS_COLORS.closed,
      bgColor: `${STATUS_COLORS.closed}26`,
      border: `3px double ${STATUS_COLORS.closed}`,
      icon: <BlockIcon sx={ICON_SIZE} />,
      message: "Untrusted - Heavy Code Review",
    };
  }

  // Low Priority: Low credibility (0.1 - 0.49)
  return {
    level: "high",
    color: STATUS_COLORS.closed,
    bgColor: `${STATUS_COLORS.closed}1a`,
    border: `1px solid ${STATUS_COLORS.closed}4d`,
    icon: <ErrorOutlineIcon sx={ICON_SIZE} />,
    message: "Low Trust - Strict Code Review",
  };
};

const TrustBadge: React.FC<TrustBadgeProps> = ({ credibility, totalPRs }) => {
  const assessment = useMemo(
    () => getRiskAssessment(credibility, totalPRs),
    [credibility, totalPRs]
  );

  return (
    <Chip
      icon={assessment.icon as React.ReactElement}
      label={assessment.message}
      size="small"
      sx={{
        backgroundColor: assessment.bgColor,
        border: assessment.border,
        color: assessment.color,
        "& .MuiChip-icon": { color: assessment.color },
      }}
    />
  );
};

export default TrustBadge;
