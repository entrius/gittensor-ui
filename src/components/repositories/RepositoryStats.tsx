import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Skeleton,
  Divider,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import AnchorOutlined from '@mui/icons-material/AnchorOutlined';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import MergeTypeOutlined from '@mui/icons-material/MergeTypeOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import CardGiftcardOutlined from '@mui/icons-material/CardGiftcardOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import {
  useReposAndWeights,
  useAllPrs,
  useRepositoryIssues,
  useRepoBountySummary,
  useRepositoryConfig,
} from '../../api';
import {
  UI_COLORS,
  REPOSITORY_PR_ACCENT_ALPHA,
  REPOSITORY_PR_STATUS_CHIP,
  REPOSITORY_STATS_BOUNTY_ACCENT,
  STATUS_COLORS,
} from '../../theme';
import { formatTokenAmount } from '../../utils/format';
import { isMergedPr } from '../../utils/prStatus';

interface RepositoryStatsProps {
  repositoryFullName: string;
}

const StatRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  labelColor?: string;
  valueColor?: string;
}> = ({
  icon,
  label,
  value,
  labelColor: labelColorProp,
  valueColor: valueColorProp,
}) => {
  const labelColor = labelColorProp ?? alpha(UI_COLORS.white, 0.88);
  const valueColor = valueColorProp ?? alpha(UI_COLORS.white, 0.96);

  const rowLinePx = 20;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        minHeight: rowLinePx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          minWidth: 0,
          flex: 1,
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: rowLinePx,
            height: rowLinePx,
            flexShrink: 0,
            overflow: 'visible',
          }}
        >
          {icon}
        </Box>
        <Typography
          component="span"
          variant="body2"
          sx={{
            fontSize: '13px',
            lineHeight: `${rowLinePx}px`,
            color: labelColor,
            fontWeight: 400,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        component="span"
        variant="body2"
        sx={{
          fontSize: '13px',
          lineHeight: `${rowLinePx}px`,
          color: valueColor,
          fontWeight: 600,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

const RepositoryStats: React.FC<RepositoryStatsProps> = ({
  repositoryFullName,
}) => {
  const theme = useTheme();
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const { data: allPRs, isLoading: isLoadingPRs } = useAllPrs();
  const { data: issues, isLoading: isLoadingIssues } =
    useRepositoryIssues(repositoryFullName);
  const { data: bountySummary } = useRepoBountySummary(repositoryFullName);
  const { data: repoConfig } = useRepositoryConfig(repositoryFullName);

  const repository = useMemo(
    () =>
      repos?.find(
        (r) => r.fullName.toLowerCase() === repositoryFullName.toLowerCase(),
      ),
    [repos, repositoryFullName],
  );

  const stats = useMemo(() => {
    if (!allPRs) return { mergedPRs: 0, totalScore: 0 };

    const repoPRs = allPRs.filter(
      (pr) =>
        pr.repository.toLowerCase() === repositoryFullName.toLowerCase() &&
        isMergedPr(pr),
    );
    const totalScore = repoPRs.reduce(
      (acc, pr) => acc + parseFloat(pr.score || '0'),
      0,
    );

    return {
      mergedPRs: repoPRs.length,
      totalScore,
    };
  }, [allPRs, repositoryFullName]);

  const issueStats = useMemo(() => {
    if (!issues) return { totalIssues: 0, closedIssues: 0 };

    return {
      totalIssues: issues.length,
      closedIssues: issues.filter((issue) => issue.closedAt).length,
    };
  }, [issues]);

  const weightDisplay = repository
    ? parseFloat(repository.weight).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '—';

  const cardSx = useMemo(
    () => ({
      mb: 3,
      p: 2,
      borderRadius: '12px',
      border: `1px solid ${theme.palette.border.light}`,
      backgroundColor: alpha(UI_COLORS.black, 0.35),
    }),
    [theme.palette.border.light],
  );

  const tone = useMemo(
    () => ({
      valueLight: alpha(UI_COLORS.white, 0.96),
      iconMuted: alpha(UI_COLORS.white, 0.77),
      merged: REPOSITORY_PR_STATUS_CHIP.merged,
      closedStat: REPOSITORY_PR_STATUS_CHIP.closed,
      bounty: REPOSITORY_STATS_BOUNTY_ACCENT,
      success: alpha(STATUS_COLORS.success, REPOSITORY_PR_ACCENT_ALPHA),
    }),
    [],
  );

  const neutralIconSx = useMemo(
    () =>
      ({
        fontSize: 20,
        color: tone.iconMuted,
        flexShrink: 0,
      }) as const,
    [tone.iconMuted],
  );

  if (isLoadingRepos || isLoadingPRs || isLoadingIssues) {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: 'text.primary',
            fontWeight: 700,
            mb: 2,
            fontSize: '15px',
          }}
        >
          Repository Stats
        </Typography>
        <Skeleton
          variant="rectangular"
          height={200}
          sx={{ ...cardSx, bgcolor: 'surface.light' }}
        />
      </Box>
    );
  }

  if (!repository) {
    return null;
  }

  const showBountyBlock =
    bountySummary &&
    (bountySummary.totalBounties > 0 ||
      bountySummary.activeBounties > 0 ||
      bountySummary.completedBounties > 0);

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="subtitle2"
        sx={{
          color: 'text.primary',
          fontWeight: 700,
          mb: 2,
          fontSize: '15px',
        }}
      >
        Repository Stats
      </Typography>

      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          <StatRow
            icon={<AnchorOutlined sx={neutralIconSx} />}
            label="Weight"
            value={weightDisplay}
            valueColor={tone.valueLight}
          />

          <StatRow
            icon={<EmojiEventsOutlined sx={neutralIconSx} />}
            label="Total Score"
            value={stats.totalScore.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
            valueColor={tone.valueLight}
          />

          <StatRow
            icon={
              <MergeTypeOutlined
                sx={{ ...neutralIconSx, color: tone.merged }}
              />
            }
            label="Merged PRs"
            value={stats.mergedPRs}
            valueColor={tone.merged}
          />

          <StatRow
            icon={
              <CloseOutlined
                sx={{
                  ...neutralIconSx,
                  color: tone.closedStat,
                  fontSize: 22,
                }}
              />
            }
            label="Closed Issues"
            value={issueStats.closedIssues}
            valueColor={tone.closedStat}
          />

          {showBountyBlock && (
            <>
              <Divider sx={{ borderColor: 'border.light', my: 0.25 }} />

              {bountySummary.totalBounties > 0 && (
                <StatRow
                  icon={
                    <CardGiftcardOutlined
                      sx={{ ...neutralIconSx, color: tone.bounty }}
                    />
                  }
                  label="Bounties"
                  value={bountySummary.totalBounties}
                  labelColor={tone.bounty}
                  valueColor={tone.bounty}
                />
              )}

              {bountySummary.activeBounties > 0 && (
                <StatRow
                  icon={<PaymentsOutlined sx={neutralIconSx} />}
                  label="Available Rewards"
                  value={`${formatTokenAmount(bountySummary.totalAvailable, 2)} α`}
                  valueColor={tone.valueLight}
                />
              )}

              {bountySummary.completedBounties > 0 && (
                <StatRow
                  icon={
                    <PaymentsOutlined
                      sx={{
                        fontSize: 20,
                        flexShrink: 0,
                        color: alpha(UI_COLORS.white, 0.88),
                      }}
                    />
                  }
                  label="Total Paid Out"
                  value={`${formatTokenAmount(bountySummary.totalPaidOut, 2)} α`}
                  valueColor={tone.success}
                />
              )}
            </>
          )}

          {repoConfig?.additionalAcceptableBranches &&
            repoConfig.additionalAcceptableBranches.length > 0 && (
              <>
                <Divider sx={{ borderColor: 'border.light', my: 0.25 }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '13px',
                    color: alpha(UI_COLORS.white, 0.88),
                    fontWeight: 500,
                  }}
                >
                  Scorable Branches
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.75,
                  }}
                >
                  {repoConfig.additionalAcceptableBranches.map((branch) => (
                    <Chip
                      key={branch}
                      label={branch}
                      size="small"
                      sx={{
                        fontSize: '12px',
                        height: '24px',
                        bgcolor: 'surface.light',
                        color: alpha(UI_COLORS.white, 0.9),
                        border: `1px solid ${theme.palette.border.light}`,
                      }}
                    />
                  ))}
                </Box>
              </>
            )}
        </Box>
      </Box>
    </Box>
  );
};

export default RepositoryStats;
