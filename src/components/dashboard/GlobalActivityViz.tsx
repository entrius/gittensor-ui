import { useNavigate } from "react-router-dom";
import React, { useMemo } from "react";
import {
    Box,
    Card,
    Typography,
    Grid,
    CircularProgress,
    Chip,
    Tooltip,
    Divider,
} from "@mui/material";
import { ActivityCalendar } from "react-activity-calendar";
import ReactECharts from "echarts-for-react";
import {
    useAllMinerStats,
    useAllMinerData,
    useReposAndWeights,
} from "../../api";
import { subDays, format } from "date-fns";
import PublicIcon from "@mui/icons-material/Public";
import CodeOffIcon from "@mui/icons-material/CodeOff";

const GlobalActivityViz: React.FC = () => {
    const navigate = useNavigate();
    // We use all miner stats for aggregation
    const { data: allMinerStats, isLoading: isLoadingStats } = useAllMinerStats();
    // We use all PRs for the heatmap
    const { data: allPrs, isLoading: isLoadingPRs } = useAllMinerData();
    const { data: repos } = useReposAndWeights();

    // 1. Calculate Heatmap Data (from all PRs)
    const { contributionData, contributionsLast30Days, totalDaysShown } =
        useMemo(() => {
            // Defensive check: Ensure allPrs is a valid array
            if (!Array.isArray(allPrs) || allPrs.length === 0)
                return {
                    contributionData: [],
                    contributionsLast30Days: 0,
                    totalDaysShown: 0,
                };

            const today = new Date();
            let earliestDate = today;

            // Find range of dates
            allPrs.forEach((pr) => {
                if (pr && pr.mergedAt) {
                    const d = new Date(pr.mergedAt);
                    // Ensure date is valid before comparison
                    if (!isNaN(d.getTime()) && d < earliestDate) {
                        earliestDate = d;
                    }
                }
            });

            // Limit to reasonable history if needed, or stick to actual earliest.
            // MinerActivityViz uses dynamic range.
            const diffTime = Math.abs(today.getTime() - earliestDate.getTime());
            const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // Handle potential NaN if dates were weird, though isNaN check helps
            const daysToShow = isNaN(daysDiff) ? 1 : Math.max(daysDiff, 1);

            const dataMap = new Map<string, number>();

            // Init map
            for (let i = daysToShow; i >= 0; i--) {
                const date = subDays(today, i);
                const dateStr = format(date, "yyyy-MM-dd");
                dataMap.set(dateStr, 0);
            }

            let last30Count = 0;
            const thirtyDaysAgo = subDays(today, 30);

            // Fill data
            allPrs.forEach((pr) => {
                // Defensive check for pr
                if (!pr) return;

                const dateString = pr.mergedAt;
                if (dateString) {
                    const date = new Date(dateString);
                    if (!isNaN(date.getTime())) {
                        const dateStr = format(date, "yyyy-MM-dd");
                        // Only count if it's within our display range (should be always if derived from min)
                        if (dataMap.has(dateStr)) {
                            dataMap.set(dateStr, (dataMap.get(dateStr) || 0) + 1);
                        }
                        if (date >= thirtyDaysAgo) {
                            last30Count++;
                        }
                    }
                }
            });

            // Convert to ActivityCalendar format
            // Levels need to be adjusted for global scale since volumes are higher
            // Miner scale: 1, 2, 3, 5. Global scale should be higher.
            // Let's find max daily commits to scale dynamically.
            let maxDaily = 0;
            dataMap.forEach((count) => {
                if (count > maxDaily) maxDaily = count;
            });

            const data = Array.from(dataMap.entries())
                .map(([date, count]) => {
                    let level = 0;
                    // Simple dynamic scaling:
                    if (count > 0) level = 1;
                    if (count >= maxDaily * 0.25) level = 2;
                    if (count >= maxDaily * 0.5) level = 3;
                    if (count >= maxDaily * 0.75) level = 4;

                    return {
                        date,
                        count,
                        level: level as 0 | 1 | 2 | 3 | 4,
                    };
                })
                .sort((a, b) => a.date.localeCompare(b.date));

            return {
                contributionData: data,
                contributionsLast30Days: last30Count,
                totalDaysShown: daysToShow,
            };
        }, [allPrs]);

    // 2. Calculate Aggregated Stats for PR Success Ratio
    // 2. Calculate Aggregated Stats for PR Success Ratio (Active vs Inactive)
    const { activeStats, inactiveStats, tierStats } = useMemo(() => {
        const defaultStats = { merged: 0, open: 0, closed: 0, total: 0 };

        if (!Array.isArray(allMinerStats))
            return {
                activeStats: { ...defaultStats, credibility: 0 },
                inactiveStats: { ...defaultStats, credibility: 0 },
                tierStats: {
                    Gold: { ...defaultStats },
                    Silver: { ...defaultStats },
                    Bronze: { ...defaultStats },
                    Candidate: { ...defaultStats }
                }
            };

        const active = { ...defaultStats };
        const inactive = { ...defaultStats };
        const tiers: Record<string, typeof defaultStats> = {
            Gold: { ...defaultStats },
            Silver: { ...defaultStats },
            Bronze: { ...defaultStats }
        };

        allMinerStats.forEach((m) => {
            // Check for active tier (Bronze, Silver, Gold)
            const isActive = m.currentTier && ["Bronze", "Silver", "Gold"].includes(m.currentTier);
            const target = isActive ? active : inactive;

            target.merged += m.totalMergedPrs || 0;
            target.open += m.totalOpenPrs || 0;
            target.closed += m.totalClosedPrs || 0;
            target.total += 1; // Count miners

            // Tier Stats
            if (m.currentTier && tiers[m.currentTier]) {
                const t = tiers[m.currentTier];
                t.merged += m.totalMergedPrs || 0;
                t.open += m.totalOpenPrs || 0;
                t.closed += m.totalClosedPrs || 0;
                t.total += 1;
            }
        });

        // Calculate Credibility
        const calculateCredibility = (stats: typeof defaultStats) => {
            const totalResolved = stats.merged + stats.closed;
            return totalResolved > 0 ? stats.merged / totalResolved : 0;
        };

        return {
            activeStats: { ...active, credibility: calculateCredibility(active) },
            inactiveStats: { ...inactive, credibility: calculateCredibility(inactive) },
            tierStats: { ...tiers, Candidate: inactive }
        };
    }, [allMinerStats]);

    // Graph for Active Miners
    const activeOption = useMemo(() => {
        const { merged, open, closed, credibility } = activeStats;
        const credibilityPercent = credibility * 100;

        return {
            backgroundColor: "transparent",
            title: {
                text: `${credibilityPercent.toFixed(0)}%`,
                left: "center",
                top: "44%", // Adjusted down to align with visual center of ring
                textStyle: {
                    color: "#fff",
                    fontSize: 28,
                    fontWeight: "bold",
                    fontFamily: '"JetBrains Mono", monospace',
                    textVerticalAlign: "middle"
                },
            },

            tooltip: {
                trigger: "item",
                formatter: "{b}: {c} ({d}%)",
                backgroundColor: "rgba(0, 0, 0, 0.9)",
                borderColor: "rgba(255, 255, 255, 0.15)",
                borderWidth: 1,
                textStyle: { color: "#fff", fontFamily: '"JetBrains Mono", monospace' },
            },
            series: [
                {
                    name: "Active PR Status",
                    type: "pie",
                    radius: ["70%", "85%"],
                    center: ["50%", "42%"], // Moved chart up
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 4,
                        borderColor: "#0d1117",
                        borderWidth: 2,
                    },
                    label: { show: false, position: "center" },
                    emphasis: { label: { show: false }, scale: true, scaleSize: 3 },
                    labelLine: { show: false },
                    data: [
                        { value: merged, name: "Merged", itemStyle: { color: "#4ade80" } },
                        { value: open, name: "Open", itemStyle: { color: "#52525b" } },
                        { value: closed, name: "Closed", itemStyle: { color: "#ef4444" } },
                    ],
                },
            ],
        };
    }, [activeStats]);

    // Graph for Inactive Miners
    const inactiveOption = useMemo(() => {
        const { merged, open, closed, credibility } = inactiveStats;
        const credibilityPercent = credibility * 100;

        return {
            backgroundColor: "transparent",
            title: {
                text: `${credibilityPercent.toFixed(0)}%`,
                left: "center",
                top: "44%", // Adjusted down to align with visual center of ring
                textStyle: {
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: 24,
                    fontWeight: "bold",
                    fontFamily: '"JetBrains Mono", monospace',
                    textVerticalAlign: "middle"
                },
            },
            tooltip: {
                trigger: "item",
                formatter: "{b}: {c} ({d}%)",
                backgroundColor: "rgba(0, 0, 0, 0.9)",
                borderColor: "rgba(255, 255, 255, 0.15)",
                borderWidth: 1,
                textStyle: { color: "#fff", fontFamily: '"JetBrains Mono", monospace' },
            },
            series: [
                {
                    name: "Candidate PR Status",
                    type: "pie",
                    radius: ["70%", "85%"],
                    center: ["50%", "42%"], // Moved chart up
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 4,
                        borderColor: "#0d1117",
                        borderWidth: 2,
                    },
                    label: { show: false, position: "center" },
                    emphasis: { label: { show: false }, scale: true, scaleSize: 3 },
                    labelLine: { show: false },
                    data: [
                        { value: merged, name: "Merged", itemStyle: { color: "#4ade80", opacity: 0.7 } },
                        { value: open, name: "Open", itemStyle: { color: "#52525b", opacity: 0.7 } },
                        { value: closed, name: "Closed", itemStyle: { color: "#ef4444", opacity: 0.7 } },
                    ],
                },
            ],
        };
    }, [inactiveStats]);

    // 3. Calculate Top Repositories by Score (Total Score from PRs)
    const topRepos = useMemo(() => {
        if (!Array.isArray(allPrs) || !repos) return [];

        const repoScores = new Map<string, number>();

        allPrs.forEach((pr) => {
            if (pr && pr.repository && pr.score) {
                const currentScore = repoScores.get(pr.repository) || 0;
                repoScores.set(pr.repository, currentScore + parseFloat(pr.score));
            }
        });

        // Convert to array and sort
        return Array.from(repoScores.entries())
            .map(([fullName, score]) => {
                const repoMeta = repos.find((r) => r.fullName === fullName);
                // Use a fallback for owner if metadata not found
                const owner = repoMeta ? repoMeta.owner : fullName.split("/")[0];
                const weight = repoMeta ? repoMeta.weight : "0";
                return {
                    fullName,
                    owner,
                    totalScore: score,
                    weight,
                };
            })
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 100);
    }, [allPrs, repos]);

    if (isLoadingPRs || isLoadingStats) {
        return (
            <Card
                sx={{
                    borderRadius: 3,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    backgroundColor: "transparent",
                    p: 4,
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <CircularProgress size={30} />
            </Card>
        );
    }

    // Empty state when no data
    const hasNoData = !allPrs || allPrs.length === 0;

    return (
        <Box sx={{ width: "100%" }}>
            {/* Header / Title Section */}
            <Box
                sx={{
                    mb: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        color: "#fff",
                        fontSize: "1rem",
                        fontWeight: 600,
                    }}
                >
                    Global Developer Activity
                </Typography>
                <Chip
                    icon={<PublicIcon sx={{ fontSize: 18 }} />}
                    label="Active Network - Continuous Development"
                    size="small"
                    sx={{
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "#10b981",
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        "& .MuiChip-icon": {
                            color: "#10b981",
                        },
                    }}
                />
            </Box>

            {hasNoData ? (
                <Card
                    sx={{
                        borderRadius: 3,
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        backgroundColor: "transparent",
                        p: 6,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    elevation={0}
                >
                    <CodeOffIcon
                        sx={{
                            fontSize: 48,
                            color: "rgba(255, 255, 255, 0.2)",
                            mb: 2,
                        }}
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
                    {/* 1. Heatmap Section (Large Card) */}
                    <Grid item xs={12} md={8}>
                        <Card
                            sx={{
                                height: "100%",
                                borderRadius: 3,
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                backgroundColor: "transparent",
                                p: 3,
                            }}
                            elevation={0}
                        >
                            <Box sx={{ mb: 2.5 }}>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        color: "#fff",
                                        fontFamily: '"JetBrains Mono", monospace',
                                        fontWeight: 700,
                                        fontSize: "2.5rem",
                                        lineHeight: 1,
                                    }}
                                >
                                    {contributionsLast30Days.toLocaleString()}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: "rgba(255, 255, 255, 0.4)",
                                        fontFamily: '"JetBrains Mono", monospace',
                                        fontSize: "0.85rem",
                                        mt: 0.5,
                                    }}
                                >
                                    network contributions in the last 30 days
                                </Typography>
                            </Box>

                            <Box sx={{ width: "100%", overflowX: "auto", mb: 1 }}>
                                <ActivityCalendar
                                    data={contributionData}
                                    theme={{
                                        light: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
                                        dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
                                    }}
                                    labels={{
                                        legend: { less: "Less", more: "More" },
                                        months: [
                                            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                                        ],
                                        totalCount: `{{count}} network contributions in the last ${totalDaysShown} days`,
                                        weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                                    }}
                                    blockSize={11}
                                    blockMargin={3}
                                    fontSize={11}
                                    style={{ color: "#fff" }}
                                    showWeekdayLabels={false}
                                    renderBlock={(block, activity) => (
                                        <Tooltip
                                            title={`${activity.count} contribution${activity.count !== 1 ? "s" : ""} on ${new Date(activity.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                                            arrow
                                            placement="top"
                                        >
                                            {block}
                                        </Tooltip>
                                    )}
                                />
                            </Box>
                        </Card>
                    </Grid>

                    {/* 2. Top Scored Repos (Smaller Card) */}
                    <Grid item xs={12} md={4}>
                        <Card
                            sx={{
                                height: "100%",
                                borderRadius: 3,
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                backgroundColor: "transparent",
                                p: 3,
                                display: "flex",
                                flexDirection: "column",
                            }}
                            elevation={0}
                        >
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    color: "rgba(255, 255, 255, 0.4)",
                                    mb: 2,
                                    fontFamily: '"JetBrains Mono", monospace',
                                    textAlign: "center",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    letterSpacing: "0.5px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Top Scoring Repositories
                            </Typography>

                            <Box
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 1.5,
                                    justifyContent: "center",
                                    alignContent: "flex-start",
                                    flex: 1,
                                }}
                            >
                                {topRepos.slice(0, 11).map((repo) => (
                                    <Tooltip
                                        key={repo.fullName}
                                        title={`${repo.fullName} (Score: ${repo.totalScore.toFixed(0)})`}
                                        arrow
                                    >
                                        <Box
                                            onClick={() =>
                                                navigate(
                                                    `/miners/repository?name=${encodeURIComponent(repo.fullName)}`,
                                                )
                                            }
                                            sx={{
                                                textDecoration: "none",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={`https://avatars.githubusercontent.com/${repo.owner}`}
                                                alt={repo.fullName}
                                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                    e.currentTarget.style.display = "none";
                                                }}
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: "50%",
                                                    border: "2px solid transparent",
                                                    backgroundColor:
                                                        repo.owner === "opentensor"
                                                            ? "#ffffff"
                                                            : repo.owner === "bitcoin"
                                                                ? "#F7931A"
                                                                : "transparent",
                                                    transition: "all 0.2s",
                                                    "&:hover": {
                                                        transform: "scale(1.1)",
                                                        borderColor: "#f78166",
                                                        boxShadow: "0 0 8px rgba(247, 129, 102, 0.4)",
                                                    },
                                                }}
                                            />
                                        </Box>
                                    </Tooltip>
                                ))}
                                {topRepos.length > 11 && (
                                    <Tooltip title="View all top repositories" arrow>
                                        <Box
                                            onClick={() => navigate("/top-repos")}
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: "50%",
                                                backgroundColor: "rgba(255, 255, 255, 0.1)",
                                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                                "&:hover": {
                                                    transform: "scale(1.1)",
                                                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                                                    borderColor: "rgba(255, 255, 255, 0.3)",
                                                },
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    color: "rgba(255, 255, 255, 0.7)",
                                                    fontSize: "0.75rem",
                                                    fontFamily: '"JetBrains Mono", monospace',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                +{topRepos.length - 11}
                                            </Typography>
                                        </Box>
                                    </Tooltip>
                                )}
                            </Box>
                        </Card>
                    </Grid>


                    {/* 3. Combined Active & Candidate Stats */}
                    <Grid item xs={12} md={6}>
                        <Card
                            sx={{
                                height: "100%",
                                borderRadius: 3,
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                backgroundColor: "transparent",
                                p: 3,
                                display: "flex",
                                flexDirection: "column",
                            }}
                            elevation={0}
                        >
                            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3, flex: 1 }}>
                                {/* Active Section */}
                                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <Typography sx={{ color: "#10b981", fontSize: "0.85rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase", textAlign: 'center', mb: 1 }}>
                                        Active <Box component="span" sx={{ fontSize: "0.7rem", opacity: 0.7, textTransform: "none", fontWeight: 500 }}>(Paid)</Box>
                                    </Typography>

                                    <Box sx={{ width: "100%", flex: 1, minHeight: "150px" }}>
                                        <ReactECharts
                                            option={activeOption}
                                            style={{ height: "100%", width: "100%" }}
                                            opts={{ renderer: "svg" }}
                                        />
                                    </Box>

                                    <Box sx={{ display: "flex", gap: 3, mt: 1 }}>
                                        <Box sx={{ textAlign: "center" }}>
                                            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase" }}>Merged</Typography>
                                            <Typography sx={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{activeStats.merged}</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: "center" }}>
                                            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase" }}>Open</Typography>
                                            <Typography sx={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{activeStats.open}</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: "center" }}>
                                            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase" }}>Closed</Typography>
                                            <Typography sx={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{activeStats.closed}</Typography>
                                        </Box>
                                    </Box>
                                </Box>



                                {/* Candidate Section */}
                                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.85rem", fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase", textAlign: 'center', mb: 1 }}>
                                        Candidate <Box component="span" sx={{ fontSize: "0.7rem", opacity: 0.7, textTransform: "none", fontWeight: 500 }}>(Unpaid)</Box>
                                    </Typography>

                                    <Box sx={{ width: "100%", flex: 1, minHeight: "150px" }}>
                                        <ReactECharts
                                            option={inactiveOption}
                                            style={{ height: "100%", width: "100%" }}
                                            opts={{ renderer: "svg" }}
                                        />
                                    </Box>

                                    <Box sx={{ display: "flex", gap: 3, mt: 1 }}>
                                        <Box sx={{ textAlign: "center" }}>
                                            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase" }}>Merged</Typography>
                                            <Typography sx={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{inactiveStats.merged}</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: "center" }}>
                                            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase" }}>Open</Typography>
                                            <Typography sx={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{inactiveStats.open}</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: "center" }}>
                                            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase" }}>Closed</Typography>
                                            <Typography sx={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{inactiveStats.closed}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        </Card>
                    </Grid>

                    {/* 4. Tier Performance Stats */}
                    <Grid item xs={12} md={6}>
                        <Card
                            sx={{
                                height: "100%",
                                borderRadius: 3,
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                backgroundColor: "transparent",
                                p: 3,
                                display: "flex",
                                flexDirection: "column",
                            }}
                            elevation={0}
                        >
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    color: "rgba(255, 255, 255, 0.4)",
                                    mb: 2,
                                    fontFamily: '"JetBrains Mono", monospace',
                                    textAlign: "center",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    letterSpacing: "0.5px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Tier Performance
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, justifyContent: 'center' }}>
                                {["Gold", "Silver", "Bronze", "Candidate"].map((tier) => {
                                    const stats = tierStats[tier as keyof typeof tierStats] || { total: 0, merged: 0, open: 0 };
                                    const isCandidate = tier === "Candidate";
                                    const color = tier === "Gold"
                                        ? "#FFD700"
                                        : tier === "Silver"
                                            ? "#C0C0C0"
                                            : tier === "Bronze"
                                                ? "#CD7F32"
                                                : "#ffffff";

                                    return (
                                        <Box key={tier} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                                {!isCandidate && (
                                                    <Box
                                                        sx={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: "50%",
                                                            backgroundColor: color,
                                                            boxShadow: `0 0 8px ${color}40`,
                                                            animation: "pulse 2s infinite",
                                                            "@keyframes pulse": {
                                                                "0%": {
                                                                    boxShadow: `0 0 0 0 ${color}40`,
                                                                },
                                                                "70%": {
                                                                    boxShadow: `0 0 0 6px ${color}00`,
                                                                },
                                                                "100%": {
                                                                    boxShadow: `0 0 0 0 ${color}00`,
                                                                },
                                                            },
                                                        }}
                                                    />
                                                )}
                                                <Typography sx={{ color: "#fff", fontFamily: '"JetBrains Mono", monospace', fontSize: "0.8rem", fontWeight: 700, pl: isCandidate ? 0.5 : 0 }}>
                                                    {tier}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ display: "flex", gap: 3 }}>
                                                <Box sx={{ textAlign: "right", minWidth: 35 }}>
                                                    <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem", fontFamily: '"JetBrains Mono", monospace' }}>Miners</Typography>
                                                    <Typography sx={{ color: "#fff", fontSize: "0.8rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{stats.total}</Typography>
                                                </Box>
                                                <Box sx={{ textAlign: "right", minWidth: 35 }}>
                                                    <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem", fontFamily: '"JetBrains Mono", monospace' }}>Merged</Typography>
                                                    <Typography sx={{ color: "#4ade80", fontSize: "0.8rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{stats.merged}</Typography>
                                                </Box>
                                                <Box sx={{ textAlign: "right", minWidth: 35 }}>
                                                    <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem", fontFamily: '"JetBrains Mono", monospace' }}>Open</Typography>
                                                    <Typography sx={{ color: "#fff", fontSize: "0.8rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{stats.open}</Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Card>
                    </Grid >
                </Grid >
            )}
        </Box >
    );
};

export default GlobalActivityViz;
