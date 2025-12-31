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
} from "@mui/material";
import { ActivityCalendar } from "react-activity-calendar";
import ReactECharts from "echarts-for-react";
import {
    useAllMinerStats,
    useAllMinerData,
    useReposAndWeights,
} from "../../api";
import { subDays, format } from "date-fns";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PublicIcon from "@mui/icons-material/Public";

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
    // 2. Calculate Aggregated Stats for PR Success Ratio
    const aggregatedStats = useMemo(() => {
        if (!Array.isArray(allMinerStats))
            return { merged: 0, open: 0, closed: 0, globalCredibility: 0 };

        let merged = 0;
        let open = 0;
        let closed = 0;

        allMinerStats.forEach((m) => {
            merged += m.totalMergedPrs || 0;
            open += m.totalOpenPrs || 0;
            closed += m.totalClosedPrs || 0;
        });

        // Global Credibility = Merged / (Merged + Closed)
        const totalResolved = merged + closed;
        const globalCredibility = totalResolved > 0 ? merged / totalResolved : 0;

        return { merged, open, closed, globalCredibility };
    }, [allMinerStats]);

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

    // Graph for PR Status (same as MinerActivityViz)
    const qualityOption = useMemo(() => {
        const { merged, open, closed, globalCredibility } = aggregatedStats;
        const credibilityPercent = globalCredibility * 100;

        return {
            backgroundColor: "transparent",
            title: {
                text: `${credibilityPercent.toFixed(0)}%`,
                subtext: "Success Rate",
                left: "center",
                top: "40%",
                textStyle: {
                    color: "#fff",
                    fontSize: 32,
                    fontWeight: "bold",
                    fontFamily: '"JetBrains Mono", monospace',
                },
                subtextStyle: {
                    color: "rgba(255, 255, 255, 0.4)",
                    fontSize: 11,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 500,
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
                    name: "PR Status",
                    type: "pie",
                    radius: ["65%", "80%"],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 6,
                        borderColor: "#0d1117",
                        borderWidth: 3,
                    },
                    label: { show: false, position: "center" },
                    emphasis: { label: { show: false }, scale: true, scaleSize: 5 },
                    labelLine: { show: false },
                    data: [
                        { value: merged, name: "Merged", itemStyle: { color: "#4ade80" } },
                        { value: open, name: "Open", itemStyle: { color: "#52525b" } },
                        { value: closed, name: "Closed", itemStyle: { color: "#ef4444" } },
                    ],
                },
            ],
        };
    }, [aggregatedStats]);

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

    return (
        <Card
            sx={{
                borderRadius: 3,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backgroundColor: "transparent",
                p: 0,
                overflow: "hidden",
                mb: 0, // Removed bottom margin to fit in grid
                height: "100%",
            }}
            elevation={0}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 2.5,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
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

            <Grid container sx={{ height: "100%" }}>
                {/* Heatmap Section */}
                <Grid
                    item
                    xs={12}
                    md={6}
                    sx={{
                        p: 3,
                        borderRight: { md: "1px solid rgba(255, 255, 255, 0.1)" },
                        borderBottom: {
                            xs: "1px solid rgba(255, 255, 255, 0.1)",
                            md: "none",
                        },
                    }}
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
                                    "Jan",
                                    "Feb",
                                    "Mar",
                                    "Apr",
                                    "May",
                                    "Jun",
                                    "Jul",
                                    "Aug",
                                    "Sep",
                                    "Oct",
                                    "Nov",
                                    "Dec",
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
                    <Typography
                        variant="caption"
                        sx={{
                            color: "rgba(255, 255, 255, 0.25)",
                            display: "block",
                            fontStyle: "italic",
                            fontSize: "0.7rem",
                        }}
                    >
                        * Gittensor Network activity across all contributors
                    </Typography>
                </Grid>

                {/* PR Status Distribution */}
                <Grid
                    item
                    xs={12}
                    md={3}
                    sx={{
                        p: 3,
                        borderRight: { md: "1px solid rgba(255, 255, 255, 0.1)" },
                        borderBottom: {
                            xs: "1px solid rgba(255, 255, 255, 0.1)",
                            md: "none",
                        },
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start",
                    }}
                >
                    <Typography
                        variant="subtitle2"
                        sx={{
                            color: "rgba(255, 255, 255, 0.4)",
                            mb: 0.5,
                            fontFamily: '"JetBrains Mono", monospace',
                            textAlign: "center",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                        }}
                    >
                        PR Success Ratio
                    </Typography>

                    <Box sx={{ height: "200px", width: "100%", mb: 1.5 }}>
                        <ReactECharts
                            option={qualityOption}
                            style={{ height: "100%", width: "100%" }}
                            opts={{ renderer: "svg" }}
                        />
                    </Box>

                    {/* Stats Legend */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "row",
                            gap: 1,
                            justifyContent: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Box
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    backgroundColor: "#4ade80",
                                }}
                            />
                            <Typography
                                sx={{
                                    color: "rgba(255, 255, 255, 0.6)",
                                    fontSize: "0.65rem",
                                    fontFamily: '"JetBrains Mono", monospace',
                                }}
                            >
                                Merged
                            </Typography>
                            <Typography
                                sx={{
                                    color: "#4ade80",
                                    fontSize: "0.75rem",
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontWeight: 700,
                                }}
                            >
                                {aggregatedStats.merged.toLocaleString()}
                            </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Box
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    backgroundColor: "#52525b",
                                }}
                            />
                            <Typography
                                sx={{
                                    color: "rgba(255, 255, 255, 0.6)",
                                    fontSize: "0.65rem",
                                    fontFamily: '"JetBrains Mono", monospace',
                                }}
                            >
                                Open
                            </Typography>
                            <Typography
                                sx={{
                                    color: "rgba(255, 255, 255, 0.6)",
                                    fontSize: "0.75rem",
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontWeight: 700,
                                }}
                            >
                                {aggregatedStats.open.toLocaleString()}
                            </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Box
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    backgroundColor: "#ef4444",
                                }}
                            />
                            <Typography
                                sx={{
                                    color: "rgba(255, 255, 255, 0.6)",
                                    fontSize: "0.65rem",
                                    fontFamily: '"JetBrains Mono", monospace',
                                }}
                            >
                                Closed
                            </Typography>
                            <Typography
                                sx={{
                                    color: "#ef4444",
                                    fontSize: "0.75rem",
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontWeight: 700,
                                }}
                            >
                                {aggregatedStats.closed.toLocaleString()}
                            </Typography>
                        </Box>
                    </Box>
                </Grid>

                {/* Top Scoring Repositories (PFPs) */}
                <Grid
                    item
                    xs={12}
                    md={3}
                    sx={{
                        p: 3,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start", // Align to top
                    }}
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
                </Grid>
            </Grid>
        </Card>
    );
};

export default GlobalActivityViz;
