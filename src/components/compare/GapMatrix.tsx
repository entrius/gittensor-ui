import React from 'react';
import {
  Avatar,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  useTheme,
} from '@mui/material';
import { STATUS_COLORS } from '../../theme';
import { getGithubAvatarSrc } from '../../utils/ExplorerUtils';

const MINER_COLORS = [
  STATUS_COLORS.merged,
  STATUS_COLORS.info,
  STATUS_COLORS.warning,
  STATUS_COLORS.error,
];

interface GapMinerData {
  githubId: string;
  username: string;
  totalScore: number;
  rank: number;
  credibility: number;
  totalMergedPrs: number;
  totalSolvedIssues: number;
  usdPerDay: number;
}

interface GapMatrixProps {
  miners: GapMinerData[];
}

interface MetricDef {
  key: keyof GapMinerData;
  label: string;
  /** Higher is better by default; set to false for rank (lower is better) */
  higherIsBetter: boolean;
  format: (v: number) => string;
}

const METRICS: MetricDef[] = [
  {
    key: 'totalScore',
    label: 'Score',
    higherIsBetter: true,
    format: (v) => v.toFixed(2),
  },
  {
    key: 'rank',
    label: 'Rank',
    higherIsBetter: false,
    format: (v) => `#${v}`,
  },
  {
    key: 'credibility',
    label: 'Credibility',
    higherIsBetter: true,
    format: (v) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: 'totalMergedPrs',
    label: 'Merges',
    higherIsBetter: true,
    format: (v) => String(v),
  },
  {
    key: 'totalSolvedIssues',
    label: 'Issues',
    higherIsBetter: true,
    format: (v) => String(v),
  },
  {
    key: 'usdPerDay',
    label: '$/day',
    higherIsBetter: true,
    format: (v) => `$${Math.round(v).toLocaleString()}`,
  },
];

const getCellColor = (
  value: number,
  best: number,
  worst: number,
  higherIsBetter: boolean,
): 'lead' | 'trail' | 'tie' => {
  if (best === worst) return 'tie';
  if (higherIsBetter) {
    return value === best ? 'lead' : value === worst ? 'trail' : 'tie';
  }
  // Lower is better (e.g. rank): best = min, worst = max
  return value === best ? 'lead' : value === worst ? 'trail' : 'tie';
};

export const GapMatrix: React.FC<GapMatrixProps> = ({ miners }) => {
  const theme = useTheme();

  if (miners.length < 2) return null;

  const cellBg = {
    lead: alpha(STATUS_COLORS.success, 0.12),
    trail: alpha(STATUS_COLORS.error, 0.08),
    tie: 'transparent',
  };

  const cellColor = {
    lead: STATUS_COLORS.success,
    trail: STATUS_COLORS.error,
    tie: theme.palette.text.secondary,
  };

  const headerSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.65rem',
    fontWeight: 600,
    color: theme.palette.text.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    borderBottom: `1px solid ${theme.palette.border.light}`,
    py: 0.75,
    px: 1,
    whiteSpace: 'nowrap' as const,
  };

  return (
    <Box>
      <Typography
        sx={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'text.primary',
          mb: 1.5,
          fontFamily: '"JetBrains Mono", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Head-to-Head
      </Typography>
      <TableContainer
        sx={{
          border: `1px solid ${theme.palette.border.light}`,
          borderRadius: 2,
          overflowX: 'auto',
        }}
      >
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 90 }} />
            {miners.map((m) => (
              <col key={m.githubId} />
            ))}
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell sx={headerSx}>Metric</TableCell>
              {miners.map((m) => (
                <TableCell key={m.githubId} align="center" sx={headerSx}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.75,
                    }}
                  >
                    <Avatar
                      component="a"
                      href={`/miners/details?githubId=${encodeURIComponent(m.githubId)}`}
                      src={getGithubAvatarSrc(m.username)}
                      sx={{
                        width: 18,
                        height: 18,
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 },
                      }}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    />
                    {m.username}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {METRICS.map((metric) => {
              const values = miners.map((m) => Number(m[metric.key]) || 0);
              const best = metric.higherIsBetter
                ? Math.max(...values)
                : Math.min(...values);
              const worst = metric.higherIsBetter
                ? Math.min(...values)
                : Math.max(...values);

              return (
                <TableRow key={metric.key}>
                  <TableCell
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                      borderBottom: `1px solid ${theme.palette.border.light}`,
                      py: 0.75,
                      px: 1,
                    }}
                  >
                    {metric.label}
                  </TableCell>
                  {miners.map((m, i) => {
                    const val = values[i];
                    const status = getCellColor(
                      val,
                      best,
                      worst,
                      metric.higherIsBetter,
                    );
                    return (
                      <TableCell
                        key={m.githubId}
                        align="center"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: cellColor[status],
                          backgroundColor: cellBg[status],
                          borderBottom: `1px solid ${theme.palette.border.light}`,
                          py: 0.75,
                          px: 1,
                          transition: 'background-color 0.2s',
                        }}
                      >
                        {metric.format(val)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
