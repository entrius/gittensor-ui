import React from 'react';
import {
  Card,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Tooltip,
  alpha,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useMinerStats } from '../../api';
import { RISK_COLORS } from '../../theme';
import { credibilityColor } from '../../utils/format';

const tooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: 'surface.tooltip',
      color: 'text.primary',
      fontSize: '0.75rem',
      fontFamily: '"JetBrains Mono", monospace',
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid',
      borderColor: 'border.light',
      maxWidth: 260,
    },
  },
  arrow: { sx: { color: 'surface.tooltip' } },
};

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  tooltip?: string;
}

const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  sub,
  color,
  tooltip,
}) => (
  <Box
    sx={{
      backgroundColor: 'surface.subtle',
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'border.subtle',
      p: 2,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {tooltip ? (
        <Tooltip
          title={tooltip}
          arrow
          placement="top"
          slotProps={tooltipSlotProps}
        >
          <Typography
            variant="statLabel"
            sx={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {label}
            <InfoOutlinedIcon sx={{ fontSize: '0.75rem' }} />
          </Typography>
        </Tooltip>
      ) : (
        <Typography variant="statLabel">{label}</Typography>
      )}
    </Box>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '1.5rem',
        fontWeight: 600,
        color: color || 'text.primary',
        lineHeight: 1.2,
      }}
    >
      {value}
    </Typography>
    {sub && (
      <Typography
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.75rem',
          color: (t) => alpha(t.palette.text.primary, 0.4),
          mt: 0.25,
        }}
      >
        {sub}
      </Typography>
    )}
  </Box>
);

interface IssueDiscoveryScoreCardProps {
  githubId: string;
}

const IssueDiscoveryScoreCard: React.FC<IssueDiscoveryScoreCardProps> = ({
  githubId,
}) => {
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);

  if (isLoading) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }} elevation={0}>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Card>
    );
  }

  if (error || !minerStats) {
    return null;
  }

  const discoveryScore = Number(minerStats.issueDiscoveryScore) || 0;
  const issueTokenScore = Number(minerStats.issueTokenScore) || 0;
  const issueCred = Number(minerStats.issueCredibility) || 0;
  const solvedIssues = Number(minerStats.totalSolvedIssues) || 0;
  const validSolvedIssues = Number(minerStats.totalValidSolvedIssues) || 0;
  const closedIssues = Number(minerStats.totalClosedIssues) || 0;
  const openIssues = Number(minerStats.totalOpenIssues) || 0;

  // Open issue spam threshold: min(5 + floor(tokenScore / 300), 30)
  const openIssueThreshold = Math.min(
    5 + Math.floor(issueTokenScore / 300),
    30,
  );

  const openIssueColor =
    openIssues >= openIssueThreshold
      ? RISK_COLORS.exceeded
      : openIssues >= openIssueThreshold - 1
        ? RISK_COLORS.critical
        : openIssues >= openIssueThreshold - 2
          ? RISK_COLORS.approaching
          : undefined;

  return (
    <Card sx={{ p: 3 }} elevation={0}>
      <Typography
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'text.primary',
          mb: 2,
        }}
      >
        Issue Discovery
      </Typography>

      <Grid container spacing={1.5}>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatTile
            label="Discovery Score"
            value={discoveryScore.toFixed(2)}
            tooltip="Aggregate score for issue discovery contributions."
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatTile
            label="Issue Credibility"
            value={`${(issueCred * 100).toFixed(1)}%`}
            sub={`${solvedIssues} solved \u00B7 ${validSolvedIssues} valid \u00B7 ${closedIssues} closed`}
            color={credibilityColor(issueCred)}
            tooltip="Ratio of solved issues to total attempts. 'Valid' = solved issues where the PR had token score >= 5 (counts toward the 7-issue eligibility gate)."
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatTile
            label="Token Score"
            value={issueTokenScore.toFixed(0)}
            tooltip="Sum of solving PR token scores across all valid scored issues. Reflects the code quality generated by your discovered issues."
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatTile
            label="Solved Issues"
            value={String(solvedIssues)}
            sub={`${validSolvedIssues} valid (need 7)`}
            tooltip="Total solved issues and how many meet the quality gate (solving PR token score >= 5). You need 7 valid solved issues for eligibility."
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatTile
            label="Open Risk"
            value={`${openIssues} / ${openIssueThreshold}`}
            color={openIssueColor}
            tooltip={`Open issues count toward spam detection. Exceeding ${openIssueThreshold} triggers a full penalty on all discovery scores. Threshold scales with token score (+1 per 300).`}
          />
        </Grid>
      </Grid>
    </Card>
  );
};

export default IssueDiscoveryScoreCard;
