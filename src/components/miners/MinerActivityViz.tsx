import React, { useMemo } from "react";
import { Box, Card, Typography, Grid, CircularProgress, Chip, Stack } from "@mui/material";
import { ActivityCalendar } from "react-activity-calendar";
import ReactECharts from "echarts-for-react";
import { useMinerStats, useMinerPRs, useReposAndWeights, useAllMinerStats } from "../../api";
import { subDays, format } from "date-fns";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BlockIcon from '@mui/icons-material/Block';

interface MinerActivityVizProps {
    githubId: string;
}

const MinerActivityViz: React.FC<MinerActivityVizProps> = ({ githubId }) => {
    const { data: minerStats } = useMinerStats(githubId);
    const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
    const { data: repos } = useReposAndWeights();
    const { data: allMinerStats } = useAllMinerStats();

    const { contributionData, contributionsLast30Days, totalDaysShown } = useMemo(() => {
        if (!prs || prs.length === 0) return { contributionData: [], contributionsLast30Days: 0, totalDaysShown: 0 };

        const today = new Date();
        let earliestDate = today;

        prs.forEach(pr => {
            if (pr.mergedAt) {
                const d = new Date(pr.mergedAt);
                if (d < earliestDate) earliestDate = d;
            }
        });

        const diffTime = Math.abs(today.getTime() - earliestDate.getTime());
        const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysToShow = Math.max(daysDiff, 1);

        const dataMap = new Map<string, number>();

        for (let i = daysToShow; i >= 0; i--) {
            const date = subDays(today, i);
            const dateStr = format(date, "yyyy-MM-dd");
            dataMap.set(dateStr, 0);
        }

        let last30Count = 0;
        const thirtyDaysAgo = subDays(today, 30);

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
        if (!minerStats || !allMinerStats || allMinerStats.length === 0) return {};

        const maxCredibility = Math.max(...allMinerStats.map(m => m.credibility || 0), 0.01);
        const maxComplexity = Math.max(...allMinerStats.map(m => m.totalLinesChanged || 0), 1);
        const maxMergedPrs = Math.max(...allMinerStats.map(m => m.totalMergedPrs || 0), 1);
        const maxUniqueRepos = Math.max(...allMinerStats.map(m => m.uniqueReposCount || 0), 1);
        const maxTotalPrs = Math.max(...allMinerStats.map(m => m.totalPrs || 0), 1);

        const credibilityVal = ((minerStats.credibility || 0) / maxCredibility) * 100;
        const complexityVal = ((minerStats.totalLinesChanged || 0) / maxComplexity) * 100;
        const issuesSolvedVal = ((minerStats.totalMergedPrs || 0) / maxMergedPrs) * 100;
        const uniqueReposVal = ((minerStats.uniqueReposCount || 0) / maxUniqueRepos) * 100;
        const totalPrsVal = ((minerStats.totalPrs || 0) / maxTotalPrs) * 100;

        let avgWeightVal = 0;
        if (prs && prs.length > 0 && repos) {
            const repoWeights = new Map<string, number>();
            if (Array.isArray(repos)) {
                repos.forEach((repo) => {
                    if (repo && repo.fullName) {
                        repoWeights.set(repo.fullName, parseFloat(repo.weight || '0'));
                    }
                });
            }

            const totalWeight = prs.reduce((sum, pr) => {
                const weight = repoWeights.get(pr.repository) || 0;
                return sum + weight;
            }, 0);
            const avgWeight = totalWeight / prs.length;
            avgWeightVal = Math.min(avgWeight, 100);
        }

        return {
            backgroundColor: 'transparent',
            radar: {
                indicator: [
                    { name: 'Credibility', max: 100 },
                    { name: 'Complexity', max: 100 },
                    { name: 'Issues\nSolved', max: 100 },
                    { name: 'Unique\nRepos', max: 100 },
                    { name: 'Total\nPRs', max: 100 },
                    { name: 'Avg Repo\nWeight', max: 100 }
                ],
                center: ['50%', '50%'],
                radius: '50%',
                shape: 'circle',
                splitNumber: 5,
                axisName: {
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 9,
                    lineHeight: 12
                },
                splitLine: {
                    lineStyle: {
                        color: [
                            'rgba(255, 255, 255, 0.05)',
                            'rgba(255, 255, 255, 0.05)',
                            'rgba(255, 255, 255, 0.05)',
                            'rgba(255, 255, 255, 0.05)',
                            'rgba(255, 255, 255, 0.05)'
                        ]
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
    }, [minerStats, prs, repos, allMinerStats]);

    const qualityOption = useMemo(() => {
        if (!minerStats) return {};

        const merged = minerStats.totalMergedPrs || 0;
        const closed = minerStats.totalClosedPrs || 0;
        const open = minerStats.totalOpenPrs || 0;
        const credibility = (minerStats.credibility || 0) * 100;

        return {
            backgroundColor: 'transparent',
            title: {
                text: `${credibility.toFixed(0)}%`,
                subtext: 'Credibility',
                left: 'center',
                top: '38%',
                textStyle: {
                    color: '#fff',
                    fontSize: 28,
                    fontWeight: 'bold',
                    fontFamily: '"JetBrains Mono", monospace'
                },
                subtextStyle: {
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: 11,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 500
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                borderWidth: 1,
                textStyle: {
                    color: '#fff',
                    fontFamily: '"JetBrains Mono", monospace'
                }
            },
            series: [
                {
                    name: 'PR Status',
                    type: 'pie',
                    radius: ['58%', '72%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 6,
                        borderColor: '#0d1117',
                        borderWidth: 3
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: false
                        },
                        scale: true,
                        scaleSize: 5
                    },
                    labelLine: {
                        show: false
                    },
                    data: [
                        { value: merged, name: 'Merged', itemStyle: { color: '#4ade80' } },
                        { value: open, name: 'Open', itemStyle: { color: '#52525b' } },
                        { value: closed, name: 'Closed', itemStyle: { color: '#ef4444' } }
                    ]
                }
            ]
        };
    }, [minerStats]);

    // Risk Assessment Logic
    const riskAssessment = useMemo(() => {
        if (!minerStats) return { level: 'unknown', color: '#6b7280', icon: null, message: 'Insufficient data', border: '1px solid #6b7280' };

        const credibility = minerStats.credibility || 0;
        const totalPRs = minerStats.totalPrs || 0;

        // Elite: 100% Credibility AND established history (5+ PRs)
        if (credibility >= 1 && totalPRs >= 5) {
            return {
                level: 'elite',
                color: '#10b981',
                bgColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: '#10b981',
                border: '3px double #10b981',
                icon: <WorkspacePremiumIcon sx={{ fontSize: 18 }} />,
                message: 'Proven Expert - Prioritize Merge',
                recommendation: 'Proven Expert - Prioritize Merge'
            };
        }

        // High Priority: High credibility AND some history (3+ PRs)
        if (credibility >= 0.7 && totalPRs >= 3) {
            return {
                level: 'low',
                color: '#10b981',
                bgColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                icon: <CheckCircleIcon sx={{ fontSize: 18 }} />,
                message: 'High Trust - Expedite Code Review',
                recommendation: 'High Trust - Expedite Code Review'
            };
        }

        // New Contributor: Good credibility but low history (< 3 PRs)
        if (credibility >= 0.5 && totalPRs < 3) {
            return {
                level: 'medium',
                color: '#60a5fa',
                bgColor: 'rgba(96, 165, 250, 0.1)',
                borderColor: 'rgba(96, 165, 250, 0.3)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                icon: <InfoOutlinedIcon sx={{ fontSize: 18 }} />,
                message: 'New Contributor - Standard Code Review',
                recommendation: 'New Contributor - Standard Code Review'
            };
        }

        // Standard Priority: Medium credibility
        if (credibility >= 0.5) {
            return {
                level: 'medium',
                color: '#9ca3af',
                bgColor: 'rgba(156, 163, 175, 0.1)',
                borderColor: 'rgba(156, 163, 175, 0.25)',
                border: '1px solid rgba(156, 163, 175, 0.25)',
                icon: <WarningAmberIcon sx={{ fontSize: 18 }} />,
                message: 'Moderate Trust - Standard Code Review',
                recommendation: 'Moderate Trust - Standard Code Review'
            };
        }

        // Untrusted: Very low credibility (< 0.1)
        if (credibility < 0.1) {
            return {
                level: 'critical',
                color: '#ef4444',
                bgColor: 'rgba(239, 68, 68, 0.15)',
                borderColor: '#ef4444',
                border: '3px double #ef4444',
                icon: <BlockIcon sx={{ fontSize: 18 }} />,
                message: 'Untrusted - Heavy Code Review',
                recommendation: 'Untrusted - Heavy Code Review'
            };
        }

        // Low Priority: Low credibility (0.1 - 0.49)
        return {
            level: 'high',
            color: '#ef4444',
            bgColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            icon: <ErrorOutlineIcon sx={{ fontSize: 18 }} />,
            message: 'Low Trust - Strict Code Review',
            recommendation: 'Low Trust - Strict Code Review'
        };
    }, [minerStats]);

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
            {/* Header with Risk Signal */}
            <Box sx={{
                p: 2.5,
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', color: "#fff", fontSize: "1rem", fontWeight: 600 }}>
                    Developer Activity
                </Typography>
                <Chip
                    icon={riskAssessment.icon || undefined}
                    label={riskAssessment.message}
                    size="small"
                    sx={{
                        backgroundColor: riskAssessment.bgColor,
                        border: riskAssessment.border || `1px solid ${riskAssessment.borderColor}`,
                        color: riskAssessment.color,
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        '& .MuiChip-icon': {
                            color: riskAssessment.color
                        }
                    }}
                />
            </Box>

            {isLoadingPRs ? (
                <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                    <CircularProgress size={30} />
                </Box>
            ) : (
                <Grid container>
                    {/* Heatmap Section */}
                    <Grid item xs={12} md={6} sx={{
                        p: 3,
                        borderRight: { md: "1px solid rgba(255, 255, 255, 0.1)" },
                        borderBottom: { xs: "1px solid rgba(255, 255, 255, 0.1)", md: "none" }
                    }}>
                        <Box sx={{ mb: 2.5 }}>
                            <Typography variant="h3" sx={{
                                color: "#fff",
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700,
                                fontSize: '2.5rem',
                                lineHeight: 1
                            }}>
                                {contributionsLast30Days}
                            </Typography>
                            <Typography variant="body2" sx={{
                                color: "rgba(255, 255, 255, 0.4)",
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: '0.85rem',
                                mt: 0.5
                            }}>
                                contributions in the last 30 days
                            </Typography>
                        </Box>

                        <Box sx={{ width: "100%", overflowX: "auto", mb: 1 }}>
                            {contributionData.length > 0 ? (
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
                                    blockSize={11}
                                    blockMargin={3}
                                    fontSize={11}
                                    style={{ color: '#fff' }}
                                    showWeekdayLabels={false}
                                />
                            ) : (
                                <Box sx={{
                                    py: 4,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 100
                                }}>
                                    <Typography sx={{
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        fontFamily: '"JetBrains Mono", monospace',
                                        fontSize: '0.85rem',
                                        textAlign: 'center'
                                    }}>
                                        No contributions yet
                                    </Typography>
                                    <Typography sx={{
                                        color: 'rgba(255, 255, 255, 0.3)',
                                        fontFamily: '"JetBrains Mono", monospace',
                                        fontSize: '0.75rem',
                                        textAlign: 'center',
                                        mt: 0.5
                                    }}>
                                        Activity will appear here once PRs are merged
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                        <Typography variant="caption" sx={{
                            color: "rgba(255, 255, 255, 0.25)",
                            display: "block",
                            fontStyle: "italic",
                            fontSize: '0.7rem'
                        }}>
                            * Activity based on merged PRs in Gittensor-tracked repositories
                        </Typography>
                    </Grid>

                    {/* PR Status Distribution */}
                    <Grid item xs={12} md={3} sx={{
                        p: 3,
                        borderRight: { md: "1px solid rgba(255, 255, 255, 0.1)" },
                        borderBottom: { xs: "1px solid rgba(255, 255, 255, 0.1)", md: "none" },
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                    }}>
                        <Typography variant="subtitle2" sx={{
                            color: "rgba(255, 255, 255, 0.4)",
                            mb: 0.75,
                            fontFamily: '"JetBrains Mono", monospace',
                            textAlign: "center",
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase'
                        }}>
                            PR Success Ratio
                        </Typography>

                        <Box sx={{ height: "190px", width: "100%", mb: 0.75 }}>
                            <ReactECharts
                                option={qualityOption}
                                style={{ height: '100%', width: '100%' }}
                                opts={{ renderer: 'svg' }}
                            />
                        </Box>

                        {/* Stats Legend */}
                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5, mb: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#4ade80' }} />
                                <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.65rem", fontFamily: '"JetBrains Mono", monospace' }}>
                                    Merged
                                </Typography>
                                <Typography sx={{ color: "#4ade80", fontSize: "0.75rem", fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
                                    {minerStats.totalMergedPrs || 0}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#52525b' }} />
                                <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.65rem", fontFamily: '"JetBrains Mono", monospace' }}>
                                    Open
                                </Typography>
                                <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.75rem", fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
                                    {minerStats.totalOpenPrs || 0}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                                <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.65rem", fontFamily: '"JetBrains Mono", monospace' }}>
                                    Closed
                                </Typography>
                                <Typography sx={{ color: "#ef4444", fontSize: "0.75rem", fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
                                    {minerStats.totalClosedPrs || 0}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>

                    {/* Metric Overview - Radar Chart */}
                    <Grid item xs={12} md={3} sx={{
                        p: 3,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                    }}>
                        <Typography variant="subtitle2" sx={{
                            color: "rgba(255, 255, 255, 0.4)",
                            mb: 2,
                            fontFamily: '"JetBrains Mono", monospace',
                            textAlign: "center",
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase'
                        }}>
                            Performance Profile
                        </Typography>
                        <Box sx={{ height: "220px", width: "100%" }}>
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
