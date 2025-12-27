import React, { useMemo } from "react";
// @ts-ignore
import { ActivityCalendar } from "react-activity-calendar";
import { Tooltip } from "react-tooltip";
import { Box, Typography, Card, CircularProgress } from "@mui/material";
import { useMinerPRs } from "../../api";
import { subDays, format, parseISO, isAfter } from "date-fns";

interface MinerActivityProps {
    githubId: string;
}

const MinerActivity: React.FC<MinerActivityProps> = ({ githubId }) => {
    const { data: prs, isLoading } = useMinerPRs(githubId);

    const { activities, totalContributions } = useMemo(() => {
        if (!prs) return { activities: [], totalContributions: 0 };

        const today = new Date();
        // 6 months roughly to show a good chunk of "recent" history but keep it focused
        // User asked for 90 days, but grids often look better with a bit more context. 
        // Let's stick to ~90-100 days (3-4 months) as requested.
        const cutoffDate = subDays(today, 100);

        const dateMap = new Map<string, number>();
        let total = 0;

        // Initialize map with 0 for all days in range to ensure continuity (optional, but good for calendar)
        // Actually react-activity-calendar handles gaps, but explicit 0s are safer for "streak" logic if we added it.

        prs.forEach((pr) => {
            if (!pr.mergedAt) return;

            const mergedDate = parseISO(pr.mergedAt);
            if (isAfter(mergedDate, cutoffDate)) {
                const dateStr = format(mergedDate, "yyyy-MM-dd");
                dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
                total++;
            }
        });

        // Convert to array
        const activityData: Array<{ date: string; count: number; level: number }> = [];

        // We need to generate the full range for the "past 90 days" visual 
        // or rely on the calendar to fill gaps. 
        // Let's generate the array from cutoff to today
        for (let i = 0; i <= 100; i++) {
            const date = subDays(today, 100 - i);
            const dateStr = format(date, "yyyy-MM-dd");
            const count = dateMap.get(dateStr) || 0;

            // Determine level 0-4
            let level = 0;
            if (count >= 4) level = 4;
            else if (count >= 3) level = 3;
            else if (count >= 2) level = 2;
            else if (count >= 1) level = 1;

            activityData.push({
                date: dateStr,
                count,
                level
            });
        }

        return { activities: activityData, totalContributions: total };
    }, [prs]);

    // Premium Gold Theme
    const theme = {
        dark: ["#161b22", "#423308", "#947012", "#ce9d1e", "#f3b927"],
    };

    if (isLoading) {
        return (
            <Card
                sx={{
                    p: 4,
                    backgroundColor: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 3,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "200px"
                }}
            >
                <CircularProgress size={30} sx={{ color: "#f3b927" }} />
            </Card>
        );
    }

    // If no data or empty, we might still want to show the empty graph to encourage them
    if (!activities || activities.length === 0) {
        return null;
    }

    return (
        <Card
            elevation={0}
            sx={{
                backgroundColor: "transparent",
                borderRadius: 3,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                p: 3,
                mb: 3,
                width: "100%",
                overflow: "hidden"
            }}
        >
            <Box sx={{ mb: 3 }}>
                <Typography
                    sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        gap: 1
                    }}
                >
                    <Box component="span" sx={{ color: "#f3b927", fontSize: "1.2rem" }}>
                        {totalContributions}
                    </Box>
                    Contributions
                    <Box component="span" sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", fontWeight: 400, ml: 1 }}>
                        (Past 90 Days)
                    </Box>
                </Typography>
            </Box>

            <Box sx={{ width: "100%", overflowX: "auto", pb: 1, display: "flex", justifyContent: { xs: "flex-start", md: "center" } }}>
                <ActivityCalendar
                    data={activities}
                    theme={theme}
                    colorScheme="dark"
                    blockSize={14}
                    blockMargin={4}
                    fontSize={12}
                    hideTotalCount
                    hideColorLegend={false} // Legend is nice
                    renderBlock={(block: any, activity: any) => (
                        <Tooltip id="react-tooltip-activity" style={{ backgroundColor: "#1e1e1e", color: "#fff", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", border: "1px solid #30363d" }}>
                            {React.cloneElement(block, {
                                'data-tooltip-id': 'react-tooltip-activity',
                                'data-tooltip-content': `${activity.count} contributions on ${activity.date}`,
                            })}
                        </Tooltip>
                    )}
                />
                <Tooltip id="react-tooltip-activity" />
            </Box>
        </Card>
    );
};

export default MinerActivity;
