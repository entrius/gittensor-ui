import React, { useMemo } from "react";
import {
  Box,
  Card,
  Typography,
  Grid,
  CircularProgress,
  Chip,
} from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import CodeOffIcon from "@mui/icons-material/CodeOff";
import { subDays, format } from "date-fns";
import { useAllMiners, useAllPrs, useReposAndWeights } from "../../api";
import { STATUS_COLORS } from "../../theme";
import TierRepoCard from "./TierRepoCard";
import ContributionHeatmap from "./ContributionHeatmap";
import PRStatusChart from "./PRStatusChart";
import TierPerformanceTable from "./TierPerformanceTable";

const GlobalActivity: React.FC = () => {
  const { data: allMinerStats, isLoading: isLoadingStats } = useAllMiners();
  const { data: allPrs, isLoading: isLoadingPRs } = useAllPrs();
  const { data: repos } = useReposAndWeights();

  // Calculate Heatmap Data
  const { contributionData, contributionsLast30Days, totalDaysShown } =
    useMemo(() => {
      if (!Array.isArray(allPrs) || allPrs.length === 0) {
        return {
          contributionData: [],
          contributionsLast30Days: 0,
          totalDaysShown: 0,
        };
      }

      const today = new Date();
      let earliestDate = today;

      allPrs.forEach((pr) => {
        if (pr?.mergedAt) {
          const d = new Date(pr.mergedAt);
          if (!isNaN(d.getTime()) && d < earliestDate) earliestDate = d;
        }
      });

      const diffTime = Math.abs(today.getTime() - earliestDate.getTime());
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysToShow = isNaN(daysDiff) ? 1 : Math.max(daysDiff, 1);

      const dataMap = new Map<string, number>();
      for (let i = daysToShow; i >= 0; i--) {
        dataMap.set(format(subDays(today, i), "yyyy-MM-dd"), 0);
      }

      let last30Count = 0;
      const thirtyDaysAgo = subDays(today, 30);

      allPrs.forEach((pr) => {
        if (!pr?.mergedAt) return;
        const date = new Date(pr.mergedAt);
        if (isNaN(date.getTime())) return;

        const dateStr = format(date, "yyyy-MM-dd");
        if (dataMap.has(dateStr)) {
          dataMap.set(dateStr, (dataMap.get(dateStr) || 0) + 1);
        }
        if (date >= thirtyDaysAgo) last30Count++;
      });

      let maxDaily = 0;
      dataMap.forEach((count) => {
        if (count > maxDaily) maxDaily = count;
      });

      const data = Array.from(dataMap.entries())
        .map(([date, count]) => {
          let level: 0 | 1 | 2 | 3 | 4 = 0;
          if (count > 0) level = 1;
          if (count >= maxDaily * 0.25) level = 2;
          if (count >= maxDaily * 0.5) level = 3;
          if (count >= maxDaily * 0.75) level = 4;
          return { date, count, level };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        contributionData: data,
        contributionsLast30Days: last30Count,
        totalDaysShown: daysToShow,
      };
    }, [allPrs]);

  // Calculate Tier Stats
  const { activeStats, inactiveStats, tierStats } = useMemo(() => {
    const defaultStats = { merged: 0, open: 0, closed: 0, total: 0 };
    const defaultTierStats = {
      merged: 0,
      open: 0,
      closed: 0,
      total: 0,
      credibility: 0,
      totalScore: 0,
      uniqueRepos: 0,
      avgScorePerMiner: 0,
      totalPRs: 0,
    };

    if (!Array.isArray(allMinerStats)) {
      return {
        activeStats: { ...defaultStats, credibility: 0 },
        inactiveStats: { ...defaultStats, credibility: 0 },
        tierStats: {
          Gold: { ...defaultTierStats },
          Silver: { ...defaultTierStats },
          Bronze: { ...defaultTierStats },
          Candidate: { ...defaultTierStats },
        },
      };
    }

    const active = { ...defaultStats };
    const inactive = { ...defaultStats };
    const tiers: Record<string, typeof defaultTierStats> = {
      Gold: { ...defaultTierStats },
      Silver: { ...defaultTierStats },
      Bronze: { ...defaultTierStats },
    };

    allMinerStats.forEach((m) => {
      const isActive =
        m.currentTier && ["Bronze", "Silver", "Gold"].includes(m.currentTier);
      const target = isActive ? active : inactive;

      target.merged += m.totalMergedPrs || 0;
      target.open += m.totalOpenPrs || 0;
      target.closed += m.totalClosedPrs || 0;
      target.total += 1;

      if (m.currentTier && tiers[m.currentTier]) {
        const t = tiers[m.currentTier];
        const tierKey = m.currentTier.toLowerCase();
        t.merged += (m[`${tierKey}MergedPrs` as keyof typeof m] as number) || 0;
        t.closed += (m[`${tierKey}ClosedPrs` as keyof typeof m] as number) || 0;
        t.totalScore += Number(m[`${tierKey}Score` as keyof typeof m]) || 0;
        t.open +=
          ((m[`${tierKey}TotalPrs` as keyof typeof m] as number) || 0) -
          ((m[`${tierKey}MergedPrs` as keyof typeof m] as number) || 0) -
          ((m[`${tierKey}ClosedPrs` as keyof typeof m] as number) || 0);
        t.total += 1;
      }
    });

    // Calculate credibility and metrics for each tier
    const calculateCredibility = (stats: typeof defaultTierStats) => {
      const totalResolved = stats.merged + stats.closed;
      return totalResolved > 0 ? stats.merged / totalResolved : 0;
    };

    ["Gold", "Silver", "Bronze"].forEach((tier) => {
      const t = tiers[tier];
      t.credibility = calculateCredibility(t);
      t.totalPRs = t.merged + t.open + t.closed;
      t.avgScorePerMiner = t.total > 0 ? t.totalScore / t.total : 0;
    });

    // Candidate tier
    const candidateTier = {
      ...inactive,
      credibility:
        inactive.merged + inactive.closed > 0
          ? inactive.merged / (inactive.merged + inactive.closed)
          : 0,
      totalScore: allMinerStats
        .filter(
          (m) =>
            !m.currentTier ||
            !["Bronze", "Silver", "Gold"].includes(m.currentTier),
        )
        .reduce((sum, m) => sum + (Number(m.totalScore) || 0), 0),
      uniqueRepos: 0,
      totalPRs: inactive.merged + inactive.open + inactive.closed,
      avgScorePerMiner: 0,
    };
    candidateTier.avgScorePerMiner =
      candidateTier.total > 0
        ? candidateTier.totalScore / candidateTier.total
        : 0;

    return {
      activeStats: {
        ...active,
        credibility:
          active.merged + active.closed > 0
            ? active.merged / (active.merged + active.closed)
            : 0,
      },
      inactiveStats: {
        ...inactive,
        credibility:
          inactive.merged + inactive.closed > 0
            ? inactive.merged / (inactive.merged + inactive.closed)
            : 0,
      },
      tierStats: { ...tiers, Candidate: candidateTier },
    };
  }, [allMinerStats]);

  // Calculate max values for opacity scaling
  const { maxValues, getOpacity } = useMemo(() => {
    const tierNames = ["Gold", "Silver", "Bronze"];
    const maxVals = tierNames.reduce(
      (acc, tier) => {
        const s = (tierStats[tier as keyof typeof tierStats] as any) || {};
        return {
          total: Math.max(acc.total, s.total || 0),
          merged: Math.max(acc.merged, s.merged || 0),
          open: Math.max(acc.open, s.open || 0),
          closed: Math.max(acc.closed, s.closed || 0),
          totalScore: Math.max(acc.totalScore, s.totalScore || 0),
          avgScorePerMiner: Math.max(
            acc.avgScorePerMiner,
            s.avgScorePerMiner || 0,
          ),
        };
      },
      {
        total: 0,
        merged: 0,
        open: 0,
        closed: 0,
        totalScore: 0,
        avgScorePerMiner: 0,
      },
    );

    const getOp = (value: number, max: number) => {
      if (max === 0) return 0.6;
      return (0.6 + 0.4 * Math.min(value / max, 1)).toFixed(2);
    };

    return { maxValues: maxVals, getOpacity: getOp };
  }, [tierStats]);

  // Group repos by tier
  const topReposByTier = useMemo(() => {
    if (!repos || !Array.isArray(repos))
      return { Gold: [], Silver: [], Bronze: [] };

    const result: Record<string, Array<{ fullName: string; owner: string }>> = {
      Gold: [],
      Silver: [],
      Bronze: [],
    };

    repos.forEach((repo) => {
      if (repo.tier && result[repo.tier]) {
        result[repo.tier].push({ fullName: repo.fullName, owner: repo.owner });
      }
    });

    // Shuffle for variety
    Object.keys(result).forEach((tier) => {
      result[tier] = result[tier].sort(() => Math.random() - 0.5);
    });

    return result;
  }, [repos]);

  if (isLoadingPRs || isLoadingStats) {
    return (
      <Card sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={30} />
      </Card>
    );
  }

  const hasNoData = !allPrs || allPrs.length === 0;

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="sectionTitle">
          Global Developer Activity
        </Typography>
        <Chip
          variant="status"
          icon={<PublicIcon />}
          label="Active Network - Continuous Development"
          sx={{
            color: STATUS_COLORS.success,
            borderColor: `${STATUS_COLORS.success}4d`,
            "& .MuiChip-icon": { color: STATUS_COLORS.success },
          }}
        />
      </Box>

      {hasNoData ? (
        <Card
          sx={{
            p: 6,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CodeOffIcon
            sx={{ fontSize: 48, color: "rgba(255, 255, 255, 0.2)", mb: 2 }}
          />
          <Typography
            sx={{
              color: "rgba(255, 255, 255, 0.5)",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            No activity data available yet
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {/* Heatmap */}
          <Grid item xs={12} lg={7}>
            <ContributionHeatmap
              data={contributionData}
              contributionsLast30Days={contributionsLast30Days}
              totalDaysShown={totalDaysShown}
            />
          </Grid>

          {/* Active & Candidate Stats */}
          <Grid item xs={12} lg={5}>
            <Card
              sx={(theme) => ({
                height: "100%",
                p: { xs: 1.5, sm: 3 },
                display: "flex",
                flexDirection: "column",
                [theme.breakpoints.between("lg", "xl")]: { padding: "16px" },
                overflow: "visible",
              })}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  gap: { xs: 1, sm: 3, lg: 1.5, xl: 3 },
                  flex: 1,
                }}
              >
                <PRStatusChart
                  stats={activeStats}
                  title="Active"
                  subtitle="Paid"
                  variant="primary"
                />
                <PRStatusChart
                  stats={inactiveStats}
                  title="Unranked"
                  subtitle="Unpaid"
                  variant="secondary"
                />
              </Box>
            </Card>
          </Grid>

          {/* Tier Repo Cards */}
          <Grid item xs={12} lg={4}>
            <Box
              sx={(theme) => ({
                display: "flex",
                flexDirection: "column",
                gap: 1,
                height: "100%",
                [theme.breakpoints.between("lg", "xl")]: { gap: 0.5 },
              })}
            >
              {["Gold", "Silver", "Bronze"].map((tier) => (
                <TierRepoCard
                  key={tier}
                  tier={tier}
                  repos={topReposByTier[tier] || []}
                />
              ))}
            </Box>
          </Grid>

          {/* Tier Performance Table */}
          <Grid item xs={12} lg={8}>
            <TierPerformanceTable
              tierStats={tierStats}
              maxValues={maxValues}
              getOpacity={getOpacity}
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default GlobalActivity;
