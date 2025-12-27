import React, { useMemo } from "react";
import { Box, Card, Typography, Grid, useTheme, CircularProgress } from "@mui/material";
import { ActivityCalendar } from "react-activity-calendar";
import ReactECharts from "echarts-for-react";
import { useMinerStats, useMinerPRs, useReposAndWeights } from "../../api";
import { subDays, format, parseISO, isSameDay } from "date-fns";

interface MinerActivityVizProps {
    githubId: string;
}

const MinerActivityViz: React.FC<MinerActivityVizProps> = ({ githubId }) => {
    const theme = useTheme();
    const { data: minerStats } = useMinerStats(githubId);
    const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
    const { data: repos } = useReposAndWeights();

    const { contributionData, contributionsLast30Days, totalDaysShown } = useMemo(() => {
        if (!prs || prs.length === 0) return { contributionData: [], contributionsLast30Days: 0, totalDaysShown: 0 };

        const today = new Date();
        let earliestDate = today;

        // Find the earliest contribution date
        prs.forEach(pr => {
            if (pr.mergedAt) {
                const d = new Date(pr.mergedAt);
                if (d < earliestDate) earliestDate = d;
            }
        });

        // Calculate days difference
        const diffTime = Math.abs(today.getTime() - earliestDate.getTime());
        const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Show exact history length (minimum 1 day)
        const daysToShow = Math.max(daysDiff, 1);

        const dataMap = new Map<string, number>();

        // Initialize map for the range
        for (let i = daysToShow; i >= 0; i--) {
            const date = subDays(today, i);
            const dateStr = format(date, "yyyy-MM-dd");
            dataMap.set(dateStr, 0);
        }

        let last30Count = 0;
        const thirtyDaysAgo = subDays(today, 30);

        // Populate with actual PR data
        prs.forEach(pr => {
            const dateString = pr.mergedAt;

            if (dateString) {
                const date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    const dateStr = format(date, "yyyy-MM-dd");

                    if (dataMap.has(dateStr)) {
                        dataMap.set(dateStr, (dataMap.get(dateStr) || 0) + 1);
                    }

                    if (date >= thirtyDaysAgo) {
                        last30Count++;
                    }
                }
            }
        });

        const data = Array.from(dataMap.entries()).map(([date, count]) => {
            let level = 0;
            if (count > 0) level = 1;
            if (count >= 2) level = 2;
            if (count >= 3) level = 3;
            if (count >= 5) level = 4;

            return {
                date,
                count,
                level: level as 0 | 1 | 2 | 3 | 4,
            };
        }).sort((a, b) => a.date.localeCompare(b.date));

        return { contributionData: data, contributionsLast30Days: last30Count, totalDaysShown: daysToShow };
    }, [prs]);

    const radarOption = useMemo(() => {
        if (!minerStats) return {};

        const maxPrs = 50;
        const maxLines = 10000;
        const maxRepos = 10;

        // 1. Credibility
        const credibilityVal = (minerStats.credibility || 0) * 100;

        // 2. Complexity (Scored Lines/Changes)
        const complexityVal = Math.min((minerStats.totalLinesChanged || 0) / maxLines * 100, 100);

        // 3. Issues Solved (Merged PRs as proxy)
        const issuesSolvedVal = Math.min((minerStats.totalMergedPrs || 0) / maxPrs * 100, 100);

        // 4. Unique Repos
        const uniqueReposVal = Math.min((minerStats.uniqueReposCount || 0) / maxRepos * 100, 100);

        // 5. Total PRs
        const totalPrsVal = Math.min((minerStats.totalPrs || 0) / maxPrs * 100, 100);

        // 6. Average Repo Weights (Using actual repository weights from repos API)
        let avgWeightVal = 0;
        if (prs && prs.length > 0 && repos) {
            // Build repository weights map
            const repoWeights = new Map<string, number>();
            if (Array.isArray(repos)) {
                repos.forEach((repo) => {
                    if (repo && repo.fullName) {
                        repoWeights.set(repo.fullName, parseFloat(repo.weight || '0'));
                    }
                });
            }

            // Calculate weighted average based on PRs
            const totalWeight = prs.reduce((sum, pr) => {
                const weight = repoWeights.get(pr.repository) || 0;
                return sum + weight;
            }, 0);
            const avgWeight = totalWeight / prs.length;
            // Normalize to 0-100 scale (repository weights range from 0-100)
            avgWeightVal = Math.min(avgWeight, 100);
        }

        return {
            backgroundColor: 'transparent',
            radar: {
                indicator: [
                    { name: 'Credibility', max: 100 },
                    { name: 'Complexity', max: 100 },
                    { name: 'Issues Solved', max: 100 },
                    { name: 'Unique Repos', max: 100 },
                    { name: 'Total PRs', max: 100 },
                    { name: 'Avg Repo Weight', max: 100 }
                ],
                center: ['50%', '50%'],
                radius: '65%',
                shape: 'circle',
                splitNumber: 4,
                axisName: {
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 11
                },
                splitLine: {
                    lineStyle: {
                        color: [
                            'rgba(255, 255, 255, 0.05)',
                            'rgba(255, 255, 255, 0.05)',
                            'rgba(255, 255, 255, 0.05)',
                            'rgba(255, 255, 255, 0.05)'
                        ].reverse()
                    }
                },
                splitArea: {
                    show: false
                },
                axisLine: {
                    lineStyle: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            series: [
                {
                    type: 'radar',
                    lineStyle: {
                        width: 2,
                        color: '#4ade80'
                    },
                    areaStyle: {
                        color: 'rgba(74, 222, 128, 0.2)'
                    },
                    data: [
                        {
                            value: [credibilityVal, complexityVal, issuesSolvedVal, uniqueReposVal, totalPrsVal, avgWeightVal],
                            name: 'Miner Stats',
                            symbol: 'circle',
                            symbolSize: 4,
                            itemStyle: {
                                color: '#4ade80'
                            }
                        }
                    ]
                }
            ]
        };
    }, [minerStats, prs, repos]);

    if (!minerStats) return null;

    return (
        <Card
            sx={{
                borderRadius: 3,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backgroundColor: "transparent",
                p: 0,
                overflow: "hidden",
                mb: 3
            }}
            elevation={0}
        >
            {/* Header */}
            <Box sx={{
                p: 2,
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                backgroundColor: "rgba(255, 255, 255, 0.02)"
            }}>
                <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', color: "#fff", fontSize: "1rem" }}>
                    Developer Activity
                </Typography>
            </Box>

            {isLoadingPRs ? (
                <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                    <CircularProgress size={30} />
                </Box>
            ) : (
                <Grid container>
                    {/* Heatmap Section */}
                    <Grid item xs={12} md={8} sx={{
                        p: 3,
                        borderRight: { md: "1px solid rgba(255, 255, 255, 0.1)" },
                        borderBottom: { xs: "1px solid rgba(255, 255, 255, 0.1)", md: "none" }
                    }}>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="h4" sx={{ color: "#fff", fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                                {contributionsLast30Days}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.5)", fontFamily: '"JetBrains Mono", monospace' }}>
                                contributions in the last 30 days
                            </Typography>
                        </Box>

                        <Box sx={{ width: "100%", overflowX: "auto" }}>
                            <ActivityCalendar
                                data={contributionData}
                                theme={{
                                    light: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
                                    dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
                                }}
                                labels={{
                                    legend: {
                                        less: 'Less',
                                        more: 'More',
                                    },
                                    months: [
                                        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                                    ],
                                    totalCount: `{{count}} contributions in the last ${totalDaysShown} days`,
                                    weekdays: [
                                        'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
                                    ]
                                }}
                                blockSize={12}
                                blockMargin={4}
                                fontSize={12}
                                style={{ color: '#fff' }}
                                showWeekdayLabels={false}
                            />
                        </Box>
                        <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.3)", mt: 2, display: "block", fontStyle: "italic" }}>
                            * Activity based on merged PRs in Gittensor-tracked repositories
                        </Typography>
                    </Grid>

                    {/* Radar Chart Section */}
                    <Grid item xs={12} md={4} sx={{ p: 3, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <Typography variant="subtitle2" sx={{ color: "rgba(255, 255, 255, 0.5)", mb: 1, fontFamily: '"JetBrains Mono", monospace', textAlign: "center" }}>
                            Metric Overview
                        </Typography>
                        <Box sx={{ height: "250px", width: "100%" }}>
                            <ReactECharts
                                option={radarOption}
                                style={{ height: '100%', width: '100%' }}
                                opts={{ renderer: 'svg' }}
                            />
                        </Box>
                    </Grid>
                </Grid>
            )}
        </Card>
    );
};

export default MinerActivityViz;
