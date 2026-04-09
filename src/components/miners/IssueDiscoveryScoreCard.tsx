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
import { STATUS_COLORS, CREDIBILITY_COLORS } from '../../theme';

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

const credibilityColor = (cred: number) => {
  if (cred >= 0.9) return CREDIBILITY_COLORS.excellent;
  if (cred >= 0.7) return CREDIBILITY_COLORS.good;
  if (cred >= 0.5) return CREDIBILITY_COLORS.moderate;
  if (cred >= 0.3) return CREDIBILITY_COLORS.low;
  return CREDIBILITY_COLORS.poor;
};

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
  const issueCred = Number(minerStats.issueCredibility) || 0;
  const solvedIssues = Number(minerStats.totalSolvedIssues) || 0;
  const closedIssues = Number(minerStats.totalClosedIssues) || 0;
  const isEligible = minerStats.isIssueEligible ?? false;
  const eligibilityColor = isEligible
    ? STATUS_COLORS.success
    : STATUS_COLORS.neutral;

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
        <Grid item xs={6} sm={3}>
          <StatTile
            label="Discovery Score"
            value={discoveryScore.toFixed(2)}
            tooltip="Aggregate score for issue discovery contributions."
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatTile
            label="Issue Credibility"
            value={`${(issueCred * 100).toFixed(1)}%`}
            sub={`${solvedIssues} solved \u00B7 ${closedIssues} closed`}
            color={credibilityColor(issueCred)}
            tooltip="Ratio of solved issues to total attempts (solved + closed). Higher credibility means stronger scoring."
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatTile label="Solved Issues" value={String(solvedIssues)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatTile
            label="Eligibility"
            value={isEligible ? 'Eligible' : 'Ineligible'}
            color={eligibilityColor}
          />
        </Grid>
      </Grid>
    </Card>
  );
};

export default IssueDiscoveryScoreCard;
