import React from "react";
import { Box, Card, Typography, Tooltip } from "@mui/material";
import { ActivityCalendar } from "react-activity-calendar";

interface ContributionData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ContributionHeatmapProps {
  data: ContributionData[];
  contributionsLast30Days: number;
  totalDaysShown: number;
  /** Custom subtitle text. Defaults to "network contributions in the last 30 days" */
  subtitle?: string;
  /** Footer text shown below the heatmap */
  footerText?: string;
  /** Empty state title when no data */
  emptyTitle?: string;
  /** Empty state subtitle when no data */
  emptySubtitle?: string;
  /** If true, renders without Card wrapper */
  bare?: boolean;
}

const HEATMAP_THEME = {
  light: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
  dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
};

const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  data,
  contributionsLast30Days,
  totalDaysShown,
  subtitle = "network contributions in the last 30 days",
  footerText,
  emptyTitle = "No contributions yet",
  emptySubtitle = "Activity will appear here once PRs are merged",
  bare = false,
}) => {
  const isEmpty = data.length === 0;

  const content = (
    <>
      <Box sx={{ mb: 2.5 }}>
        <Typography
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
          {subtitle}
        </Typography>
      </Box>

      <Box sx={{ width: "100%", overflowX: "auto", mb: 1 }}>
        {isEmpty ? (
          <Box
            sx={{
              py: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 100,
            }}
          >
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.5)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              {emptyTitle}
            </Typography>
            {emptySubtitle && (
              <Typography
                sx={{
                  color: "rgba(255, 255, 255, 0.3)",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.75rem",
                  textAlign: "center",
                  mt: 0.5,
                }}
              >
                {emptySubtitle}
              </Typography>
            )}
          </Box>
        ) : (
          <ActivityCalendar
            data={data}
            theme={HEATMAP_THEME}
            labels={{
              legend: { less: "Less", more: "More" },
              months: [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
              ],
              totalCount: `{{count}} contributions in the last ${totalDaysShown} days`,
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
        )}
      </Box>

      {footerText && (
        <Typography
          variant="caption"
          sx={{
            color: "rgba(255, 255, 255, 0.25)",
            display: "block",
            fontStyle: "italic",
            fontSize: "0.7rem",
          }}
        >
          {footerText}
        </Typography>
      )}
    </>
  );

  if (bare) {
    return <Box>{content}</Box>;
  }

  return (
    <Card sx={{ height: "100%", p: 3 }}>
      {content}
    </Card>
  );
};

export default ContributionHeatmap;
