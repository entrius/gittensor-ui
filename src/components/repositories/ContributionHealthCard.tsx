import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Skeleton,
  Chip,
  alpha,
  useTheme,
  type Theme,
} from '@mui/material';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import BugReportIcon from '@mui/icons-material/BugReport';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PeopleIcon from '@mui/icons-material/People';
import { differenceInDays, parseISO, subDays } from 'date-fns';
import { useAllPrs, useRepositoryIssues } from '../../api';
import { getPrStatusCounts, isMergedPr } from '../../utils/prStatus';
import type { CommitLog } from '../../api/models/Dashboard';
import type { RepositoryIssue } from '../../api/models/Miner';

interface ContributionHealthCardProps {
  repositoryFullName: string;
}

type HealthLabel = 'Great' | 'Good' | 'Fair' | 'Low';

const ACTIVE_CONTRIBUTOR_DAYS = 35;

const completionRate = (completed: number, closed: number): number => {
  const resolved = completed + closed;
  return resolved > 0 ? Math.round((completed / resolved) * 100) : 0;
};

const rateHealthLabel = (rate: number): HealthLabel =>
  rate >= 80 ? 'Great' : rate >= 60 ? 'Good' : rate >= 40 ? 'Fair' : 'Low';

const contributorHealthLabel = (count: number): HealthLabel =>
  count >= 15 ? 'Great' : count >= 8 ? 'Good' : count >= 3 ? 'Fair' : 'Low';

const mergeTimeHealthLabel = (days: number): HealthLabel =>
  days <= 2 ? 'Great' : days <= 5 ? 'Good' : days <= 10 ? 'Fair' : 'Low';

const healthLabelColor = (
  label: HealthLabel,
  palette: Theme['palette'],
): string => {
  switch (label) {
    case 'Great':
      return palette.status.success;
    case 'Good':
      return palette.credibility.good;
    case 'Fair':
      return palette.credibility.moderate;
    case 'Low':
      return palette.credibility.poor;
  }
};

const formatMergeTime = (days: number): string => {
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24));
    return `${hours}h`;
  }
  return `${days.toFixed(1)} days`;
};

const filterRepoPrs = (
  prs: CommitLog[] | undefined,
  repo: string,
): CommitLog[] =>
  prs?.filter((pr) => pr.repository.toLowerCase() === repo.toLowerCase()) ?? [];

const getSolveCounts = (issues: RepositoryIssue[]) => {
  const solved = issues.filter((i) => i.closedAt && i.prNumber).length;
  const closedUnsolved = issues.filter((i) => i.closedAt && !i.prNumber).length;
  return { solved, closedUnsolved };
};

const getAverageMergeDays = (prs: CommitLog[]): number | null => {
  const deltas: number[] = [];
  for (const pr of prs) {
    if (!isMergedPr(pr) || !pr.mergedAt || !pr.prCreatedAt) continue;
    const created = parseISO(pr.prCreatedAt);
    const merged = parseISO(pr.mergedAt);
    const days = differenceInDays(merged, created);
    if (days >= 0) deltas.push(days);
  }
  if (deltas.length === 0) return null;
  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
};

interface HealthRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  healthLabel: HealthLabel | null;
}

const HealthRow: React.FC<HealthRowProps> = ({
  icon,
  label,
  value,
  healthLabel,
}) => {
  const theme = useTheme();
  const badgeColor = healthLabel
    ? healthLabelColor(healthLabel, theme.palette)
    : undefined;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
      }}
    >
      <Box
        sx={{
          width: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'text.secondary',
          '& .MuiSvgIcon-root': { fontSize: 17 },
        }}
      >
        {icon}
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontSize: '13px', color: 'status.open' }}
        >
          {label}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            flexShrink: 0,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            {value}
          </Typography>
          {healthLabel && badgeColor ? (
            <Chip
              label={healthLabel}
              size="small"
              sx={{
                height: 20,
                fontSize: theme.typography.caption.fontSize,
                fontWeight: 600,
                color: badgeColor,
                bgcolor: alpha(badgeColor, 0.12),
                border: 'none',
                flexShrink: 0,
              }}
            />
          ) : null}
        </Box>
      </Box>
    </Box>
  );
};

const ContributionHealthCard: React.FC<ContributionHealthCardProps> = ({
  repositoryFullName,
}) => {
  const { data: allPRs, isLoading: isLoadingPRs } = useAllPrs();
  const { data: issues, isLoading: isLoadingIssues } =
    useRepositoryIssues(repositoryFullName);

  const repoPRs = useMemo(
    () => filterRepoPrs(allPRs, repositoryFullName),
    [allPRs, repositoryFullName],
  );

  const metrics = useMemo(() => {
    const { merged, closed } = getPrStatusCounts(repoPRs);
    const mergeRate = completionRate(merged, closed);

    const issueRows = issues ?? [];
    const { solved, closedUnsolved } = getSolveCounts(issueRows);
    const solveRate = completionRate(solved, closedUnsolved);

    const avgMergeDays = getAverageMergeDays(repoPRs);

    const cutoff = subDays(new Date(), ACTIVE_CONTRIBUTOR_DAYS);
    const activeContributors = new Set(
      repoPRs
        .filter((pr) => {
          if (!pr.author || !pr.prCreatedAt) return false;
          return parseISO(pr.prCreatedAt) >= cutoff;
        })
        .map((pr) => pr.author),
    ).size;

    const mergeHealth = merged + closed > 0 ? rateHealthLabel(mergeRate) : null;
    const solveHealth =
      solved + closedUnsolved > 0 ? rateHealthLabel(solveRate) : null;
    const mergeTimeHealth =
      avgMergeDays != null ? mergeTimeHealthLabel(avgMergeDays) : null;
    const contributorHealth = contributorHealthLabel(activeContributors);

    return {
      mergeRate,
      solveRate,
      avgMergeDays,
      activeContributors,
      mergeHealth,
      solveHealth,
      mergeTimeHealth,
      contributorHealth,
      hasMergeData: merged + closed > 0,
      hasSolveData: solved + closedUnsolved > 0,
    };
  }, [repoPRs, issues]);

  if (isLoadingPRs || isLoadingIssues) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            mb: 2,
            fontSize: '14px',
          }}
        >
          Contribution Health
        </Typography>
        <Skeleton
          variant="rectangular"
          height={220}
          sx={{ bgcolor: 'surface.light', borderRadius: 2 }}
        />
      </Box>
    );
  }

  const rows: HealthRowProps[] = [
    {
      icon: <MergeTypeIcon />,
      label: 'PR Merge Rate',
      value: metrics.hasMergeData ? `${metrics.mergeRate}%` : '—',
      healthLabel: metrics.mergeHealth,
    },
    {
      icon: <BugReportIcon />,
      label: 'Issue Solve Rate',
      value: metrics.hasSolveData ? `${metrics.solveRate}%` : '—',
      healthLabel: metrics.solveHealth,
    },
    {
      icon: <ScheduleIcon />,
      label: 'Time to Merge',
      value:
        metrics.avgMergeDays != null
          ? formatMergeTime(metrics.avgMergeDays)
          : '—',
      healthLabel: metrics.mergeTimeHealth,
    },
    {
      icon: <PeopleIcon />,
      label: 'Active Contributors',
      value: String(metrics.activeContributors),
      healthLabel: metrics.contributorHealth,
    },
  ];

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="subtitle2"
        sx={{ color: 'text.primary', fontWeight: 600, mb: 2, fontSize: '14px' }}
      >
        Contribution Health
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((row) => (
          <HealthRow key={row.label} {...row} />
        ))}
      </Box>
    </Box>
  );
};

export default ContributionHealthCard;
