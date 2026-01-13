import React, { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  CircularProgress,
  Avatar,
  TextField,
  InputAdornment,
  Chip,
  Select,
  MenuItem,
  FormControl,
  Grid,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import CodeIcon from "@mui/icons-material/Code";
import ReactECharts from "echarts-for-react";
import { useMinerGithubData, useMinerPRs, useGeneralConfig } from "../../api";
import { TIER_COLORS, CHART_COLORS } from "../../theme";
import { SectionCard } from "./SectionCard";
import { MinerRepoList } from "./MinerRepoList";

export interface MinerStats {
  githubId: string;
  author?: string;
  totalScore: number;
  baseTotalScore: number;
  totalPRs: number;
  linesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  hotkey: string;
  rank?: number;
  uniqueReposCount?: number;
  credibility?: number;
  currentTier?: string;
  usdPerDay?: number;
  totalMergedPrs?: number;
  totalOpenPrs?: number;
  totalClosedPrs?: number;
  // New fields for enhanced cards
  totalAdditions?: number;
  totalDeletions?: number;
  updatedAt?: string;
}

type SortOption = "totalScore" | "usdPerDay" | "totalPRs" | "credibility";
type TierFilter = "all" | "Gold" | "Silver" | "Bronze";

interface TopMinersTableProps {
  miners: MinerStats[];
  isLoading?: boolean;
  onSelectMiner: (githubId: string) => void;
}

// Get tier styling
const getTierColors = (tier: string | undefined) => {
  switch (tier) {
    case "Gold":
      return {
        border: "rgba(255, 215, 0, 0.5)",
        text: TIER_COLORS.gold,
        bg: "rgba(255, 215, 0, 0.1)",
      };
    case "Silver":
      return {
        border: "rgba(192, 192, 192, 0.5)",
        text: TIER_COLORS.silver,
        bg: "rgba(192, 192, 192, 0.1)",
      };
    case "Bronze":
      return {
        border: "rgba(205, 127, 50, 0.5)",
        text: TIER_COLORS.bronze,
        bg: "rgba(205, 127, 50, 0.1)",
      };
    default:
      return {
        border: "rgba(255, 255, 255, 0.15)",
        text: "rgba(255, 255, 255, 0.5)",
        bg: "rgba(255, 255, 255, 0.02)",
      };
  }
};

// Get rank colors
const getRankColors = (rank: number) => {
  if (rank === 1) return { color: "#FFD700", icon: "🥇" };
  if (rank === 2) return { color: "#C0C0C0", icon: "🥈" };
  if (rank === 3) return { color: "#CD7F32", icon: "🥉" };
  return { color: "rgba(255, 255, 255, 0.6)", icon: null };
};

// ============================================================================
// MINER CARD - Redesigned for better UI/UX
// ============================================================================
interface MinerCardProps {
  miner: MinerStats;
  onClick: () => void;
}

// Helper: Format large numbers compactly (e.g., 12500 -> "12.5k")
const formatCompact = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};

// Helper: Get relative time string
const getRelativeTime = (dateStr: string | undefined): string => {
  if (!dateStr) return "N/A";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
};

const MinerCard: React.FC<MinerCardProps> = ({ miner, onClick }) => {
  const tierColors = getTierColors(miner.currentTier);

  // Helper to check for numeric IDs or missing values
  const isNumericId = (val: string | undefined) => !val || /^\d+$/.test(val);

  // Fetch profile if author is missing or looks like an ID
  const shouldFetchProfile = isNumericId(miner.author);
  const { data: githubData } = useMinerGithubData(miner.githubId, shouldFetchProfile);

  // Always fetch PRs to get repository data for the card
  const { data: prs } = useMinerPRs(miner.githubId, true);

  const username =
    githubData?.login ||
    prs?.[0]?.author ||
    (!isNumericId(miner.author) ? miner.author : miner.githubId) ||
    miner.githubId ||
    "";
  const credibilityPercent = (miner.credibility || 0) * 100;

  // Derived data for enhanced features
  const additions = miner.totalAdditions || miner.linesAdded || 0;
  const deletions = miner.totalDeletions || miner.linesDeleted || 0;

  // Trend indicator: based on credibility (high = trending up)
  const showTrendUp = credibilityPercent >= 75;
  const showTrendDown = credibilityPercent < 40 && credibilityPercent > 0;

  // Build sparkline data from PRs with state for coloring - show full history
  const sparklineData = useMemo(() => {
    if (!prs || prs.length === 0) return [];
    // Get all PRs in API order (Newest First) and reverse them (Oldest First) to match the Table display logic
    // Table shows Newest at Top. Sparkline shows Newest on Right.
    // So we just need to reverse the API list.
    const sorted = [...prs].reverse();
    return sorted.map((pr: any) => ({
      score: parseFloat(pr.score) || 0,
      state: (pr.prState || 'open').toLowerCase(),
    }));
  }, [prs]);

  // Tier-based gradient background
  const tierGradient =
    miner.currentTier === "Gold"
      ? "linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 215, 0, 0.02) 100%)"
      : miner.currentTier === "Silver"
        ? "linear-gradient(135deg, rgba(192, 192, 192, 0.08) 0%, rgba(192, 192, 192, 0.02) 100%)"
        : miner.currentTier === "Bronze"
          ? "linear-gradient(135deg, rgba(205, 127, 50, 0.08) 0%, rgba(205, 127, 50, 0.02) 100%)"
          : "rgba(22, 27, 34, 0.8)";
  const borderColor = miner.currentTier
    ? tierColors.border
    : "rgba(48, 54, 61, 0.4)";

  // Enhanced tier glow
  const tierGlow = miner.currentTier === "Gold"
    ? `0 0 20px rgba(255, 215, 0, 0.15), 0 0 40px rgba(255, 215, 0, 0.05)`
    : miner.currentTier === "Silver"
      ? `0 0 20px rgba(192, 192, 192, 0.12), 0 0 40px rgba(192, 192, 192, 0.04)`
      : miner.currentTier === "Bronze"
        ? `0 0 20px rgba(205, 127, 50, 0.12), 0 0 40px rgba(205, 127, 50, 0.04)`
        : "none";

  // ==========================================================================
  // INACTIVE CARD
  // ==========================================================================
  if (!miner.currentTier) {
    return (
      <Card
        onClick={onClick}
        sx={{
          p: 1.5,
          cursor: "pointer",
          backgroundColor: "#000000",
          border: "1px solid rgba(48, 54, 61, 0.4)",
          borderRadius: 2,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          "&:hover": {
            backgroundColor: "rgba(13, 17, 23, 0.8)",
            borderColor: "rgba(110, 118, 129, 0.5)",
            transform: "translateY(-1px)",
          },
        }}
        elevation={0}
      >
        <Avatar
          src={`https://avatars.githubusercontent.com/${username}`}
          sx={{
            width: 24,
            height: 24,
            border: "1px solid rgba(48, 54, 61, 0.5)",
            filter: "grayscale(100%)",
            opacity: 0.7,
          }}
        />
        <Typography
          sx={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
            fontSize: "0.9rem",
            fontWeight: 500,
            color: "#8b949e",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {username}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "#484f58",
            textTransform: "uppercase",
            border: "1px solid rgba(48, 54, 61, 0.5)",
            borderRadius: 1,
            px: 0.75,
            py: 0.1,
          }}
        >
          Unranked
        </Typography>
      </Card>
    );
  }

  // ==========================================================================
  // ACTIVE CARD - Premium Enhanced Design
  // ==========================================================================
  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2,
        backgroundColor: "#000000",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(48, 54, 61, 0.5)", // Neutral border
        borderRadius: 2.5,
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        position: "relative",
        boxShadow: "none", // No glow by default
        overflow: "hidden",
        "&:hover": {
          backgroundColor: "rgba(22, 27, 34, 0.6)",
          boxShadow: `0 12px 32px -8px rgba(0, 0, 0, 0.7), ${tierGlow}`, // Tier glow on hover
          borderColor: tierColors.border, // Color border on hover
        },
      }}
      elevation={0}
    >

      {/* Header: Identity + Rank + Score */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}
        >
          <Box sx={{ position: "relative" }}>
            <Avatar
              src={`https://avatars.githubusercontent.com/${username}`}
              sx={{
                width: 40,
                height: 40,
                border: `2px solid ${tierColors.border}`,
                boxShadow: `0 0 12px ${tierColors.border}30`,
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -4,
                right: -4,
                backgroundColor: "#0d1117",
                border: `1px solid ${tierColors.border}`,
                borderRadius: "4px",
                px: 0.5,
                py: 0,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: tierColors.text,
                }}
              >
                #{miner.rank}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ overflow: "hidden" }}>
            <Typography
              sx={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                fontSize: "1rem",
                fontWeight: 700,
                color: "#ffffff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {username}
            </Typography>
          </Box>
        </Box>

        {/* Score moved to Top Right */}
        <Box sx={{ textAlign: "right" }}>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "1.3rem",
              fontWeight: 700,
              color: "#e6edf3",
              lineHeight: 1,
            }}
          >
            {Number(miner.totalScore).toFixed(1)}
          </Typography>
        </Box>
      </Box>

      {/* Activity Sparkline - +/- chart: Merged up, Open down (collateral), Closed = 0 */}
      {sparklineData.length > 0 && (
        <Tooltip
          title="PR History — ↑ Green: Merged, ↓ Gray: Open (collateral), — Red: Closed"
          placement="top"
          arrow
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center", // Center baseline
              gap: "2px", // Smaller gap for more bars
              height: 28, // Taller to accommodate +/-
              px: 0,
              position: "relative",
              zIndex: 1,
              cursor: "help",
            }}
          >
            {sparklineData.map((item, idx) => {
              const maxVal = Math.max(...sparklineData.map(d => d.score), 1);
              const normalizedHeight = (item.score / maxVal) * 12; // Max 12px in either direction

              if (item.state === 'merged') {
                // Merged: Green bar going UP
                return (
                  <Box
                    key={idx}
                    sx={{
                      flex: 1,
                      height: Math.max(3, normalizedHeight),
                      borderRadius: "2px 2px 0 0",
                      backgroundColor: CHART_COLORS.merged,
                      alignSelf: "flex-end",
                      marginBottom: "14px", // Push up from center
                      transition: "height 0.3s ease",
                    }}
                  />
                );
              } else if (item.state === 'open') {
                // Open: Gray bar going DOWN (collateral)
                return (
                  <Box
                    key={idx}
                    sx={{
                      flex: 1,
                      height: Math.max(3, normalizedHeight),
                      borderRadius: "0 0 2px 2px",
                      backgroundColor: "#8b949e", // Gray for open
                      alignSelf: "flex-start",
                      marginTop: "14px", // Push down from center
                      transition: "height 0.3s ease",
                    }}
                  />
                );
              } else {
                // Closed: Thin red line at baseline (0 value)
                return (
                  <Box
                    key={idx}
                    sx={{
                      flex: 1,
                      height: 2,
                      borderRadius: 1,
                      backgroundColor: CHART_COLORS.closed,
                      alignSelf: "center",
                    }}
                  />
                );
              }
            })}
            {/* Center baseline indicator */}
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "50%",
                height: "1px",
                backgroundColor: "rgba(255,255,255,0.1)",
                pointerEvents: "none",
              }}
            />
          </Box>
        </Tooltip>
      )}

      {/* Main Stats Row: $ + Donut + MOC all together */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Earnings + Lines of Code */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#3fb950",
                lineHeight: 1,
              }}
            >
              ${Math.round(miner.usdPerDay || 0).toLocaleString()}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.75rem",
                color: "#8b949e",
              }}
            >
              /day
            </Typography>
          </Box>
          {/* Lines of Code */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.5 }}>
            <CodeIcon sx={{ fontSize: "0.8rem", color: "#6e7681" }} />
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.7rem",
                color: "#3fb950",
              }}
            >
              +{formatCompact(additions)}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.7rem",
                color: "#f85149",
              }}
            >
              -{formatCompact(deletions)}
            </Typography>
          </Box>
        </Box>

        {/* Donut + MOC stacked vertically */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {/* Credibility Donut */}
          <Box
            sx={{
              position: "relative",
              width: 56,
              height: 56,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: "100%",
                height: "100%",
              }}
            >
              <ReactECharts
                option={{
                  backgroundColor: "transparent",
                  series: [
                    {
                      type: "pie",
                      radius: ["65%", "90%"],
                      silent: true,
                      label: { show: false },
                      itemStyle: {
                        borderRadius: 3,
                        borderColor: "#000000",
                        borderWidth: 2,
                      },
                      data: [
                        {
                          value: miner.totalMergedPrs || 0,
                          itemStyle: { color: CHART_COLORS.merged },
                        },
                        {
                          value: miner.totalOpenPrs || 0,
                          itemStyle: { color: CHART_COLORS.open },
                        },
                        {
                          value: miner.totalClosedPrs || 0,
                          itemStyle: { color: CHART_COLORS.closed },
                        },
                      ],
                    },
                  ],
                }}
                style={{ width: "100%", height: "100%" }}
                opts={{ renderer: "svg" }}
              />
            </Box>
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: credibilityPercent >= 80 ? "#3fb950" : credibilityPercent >= 50 ? "#8b949e" : "#f85149",
                  fontWeight: 800,
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {credibilityPercent.toFixed(0)}%
              </Typography>
            </Box>
          </Box>

          {/* M.O.C Stacked Vertically - No bullets, bigger text */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.85rem", fontWeight: 700, color: "#3fb950", lineHeight: 1.2 }}>
              {miner.totalMergedPrs || 0}
            </Typography>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.85rem", fontWeight: 700, color: "#8b949e", lineHeight: 1.2 }}>
              {miner.totalOpenPrs || 0}
            </Typography>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.85rem", fontWeight: 700, color: "#f85149", lineHeight: 1.2 }}>
              {miner.totalClosedPrs || 0}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer Row: Repos spanning full width */}
      <Box
        sx={{
          pt: 0.5,
          position: "relative",
          zIndex: 1,
        }}
      >
        {(() => {
          const uniqueRepos = prs
            ? [...new Map(prs.map((pr: any) => [pr.repository, pr.repository])).values()]
              .map((repo: string) => ({
                fullName: repo,
                owner: repo.split('/')[0]
              }))
            : [];

          return (
            <MinerRepoList
              repos={uniqueRepos}
              tierBorderColor={tierColors.border}
            />
          );
        })()}
      </Box>
    </Card>
  );
};

// ============================================================================
// MINER SECTION (Expandable Grid)
// ============================================================================
interface MinerSectionProps {
  title?: string;
  count: number;
  miners: MinerStats[];
  color: { border: string; text: string; bg?: string };
  onSelectMiner: (githubId: string) => void;
  defaultExpanded?: boolean;
  compact?: boolean;
}

const MinerSection: React.FC<MinerSectionProps> = ({
  title,
  count,
  miners,
  color,
  onSelectMiner,
  defaultExpanded = false,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const theme = useTheme();

  // Determine how many items to show
  // User Requirement: "see at least top 3 in very tier without expanding the view"
  const INITIAL_DISPLAY_COUNT = 3;

  // If not expanded, show INITIAL_DISPLAY_COUNT. If expanded, show all.
  const visibleMiners = expanded
    ? miners
    : miners.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMoreMiners = miners.length > INITIAL_DISPLAY_COUNT;

  return (
    <Card
      sx={{
        backgroundColor: "#000000", // Black background (outline only)
        border: "1px solid rgba(48, 54, 61, 0.5)", // Normal outline (neutral)
        borderRadius: 3,
        boxShadow: "none", // Remove glow
        display: "flex",
        flexDirection: "column",
      }}
      elevation={0}
    >
      {title && (
        <Box
          sx={{
            px: 2,
            pt: 1.5, // Reduced top padding
            pb: 0.5,
            display: "flex",
            justifyContent: "center", // Center content
            alignItems: "center",
            // Removed borderBottom to match reference
            // background: `linear-gradient(90deg, ${color.border}10, transparent)` // Removed gradient
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "1rem",
              fontWeight: 700,
              color: color.text,
              textTransform: "uppercase", // All caps
              letterSpacing: "0.1em", // Tracking
            }}
          >
            {title}
          </Typography>
          {/* Removed count from header to match clean reference style, or keep it? 
              Reference doesn't show count in title, it shows it in the bubble.
              I will hide the count in the title for now to match exactly. 
          */}
        </Box>
      )}

      <Box sx={{ p: 1.5, pt: 1, flex: 1 }}>
        <Grid container spacing={2}>
          {visibleMiners.map((miner) => (
            <Grid item xs={12} sm={6} md={4} lg={4} xl={4} key={miner.hotkey}>
              <MinerCard
                miner={miner}
                onClick={() =>
                  onSelectMiner(miner.githubId || miner.author || "")
                }
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Footer Toggle Button */}
      {hasMoreMiners && (
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            py: 1, // Reduced padding
            borderTop: "1px solid rgba(48, 54, 61, 0.5)", // Neutral border
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            color: "text.secondary",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              color: "text.primary",
            },
          }}
        >
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {expanded
              ? "Show Less"
              : `View ${miners.length - INITIAL_DISPLAY_COUNT} More`}
          </Typography>
        </Box>
      )}
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const TopMinersTable: React.FC<TopMinersTableProps> = ({
  miners,
  isLoading,
  onSelectMiner,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  // Removed tierFilter state
  const [sortOption, setSortOption] = useState<SortOption>("totalScore");

  // Helper to sort a list of miners
  const sortMinersList = (list: MinerStats[], option: SortOption) => {
    return [...list].sort((a, b) => {
      switch (option) {
        case "totalScore":
          return (b.totalScore || 0) - (a.totalScore || 0);
        case "usdPerDay":
          return (b.usdPerDay || 0) - (a.usdPerDay || 0);
        case "totalPRs":
          return (b.totalPRs || 0) - (a.totalPRs || 0);
        case "credibility":
          return (b.credibility || 0) - (a.credibility || 0);
        default:
          return 0;
      }
    });
  };

  // Process and filter miners
  const groupedMiners = useMemo(() => {
    let result = [...miners];
    result = result.map((miner, index) => ({ ...miner, rank: index + 1 }));

    // 1. Filter by Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.githubId?.toLowerCase().includes(lowerQuery) ||
          m.author?.toLowerCase().includes(lowerQuery),
      );
    }

    // 2. Group by Tier
    const gold = result.filter((m) => m.currentTier === "Gold");
    const silver = result.filter((m) => m.currentTier === "Silver");
    const bronze = result.filter((m) => m.currentTier === "Bronze");
    const others = result.filter((m) => !m.currentTier);

    // 3. Sort each Group
    return {
      gold: sortMinersList(gold, sortOption),
      silver: sortMinersList(silver, sortOption),
      bronze: sortMinersList(bronze, sortOption),
      others: sortMinersList(
        others,
        sortOption === "totalScore" ? "credibility" : sortOption,
      ),
      totalFiltered: result.length,
    };
  }, [miners, searchQuery, sortOption]);

  // Stats logic removed (moved to LeaderboardSidebar)

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={40} sx={{ color: "primary.main" }} />
      </Box>
    );
  }

  // Header Actions - Split into Sort (Center) and Search (Right)
  const sortButtons = (
    <Box
      sx={{
        display: "flex",
        gap: 0.5,
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {[
        { label: "Score", value: "totalScore" },
        { label: "Earnings", value: "usdPerDay" },
        { label: "PRs", value: "totalPRs" },
        { label: "Credibility", value: "credibility" },
      ].map((option) => (
        <Box
          key={option.value}
          onClick={() => setSortOption(option.value as SortOption)}
          sx={{
            px: 1.5,
            height: 32,
            display: "flex",
            alignItems: "center",
            borderRadius: 2,
            cursor: "pointer",
            backgroundColor:
              sortOption === option.value
                ? "rgba(255, 255, 255, 0.1)"
                : "transparent",
            color: sortOption === option.value ? "#fff" : "#8b949e",
            border: "1px solid",
            borderColor:
              sortOption === option.value
                ? "rgba(255, 255, 255, 0.2)"
                : "transparent",
            transition: "all 0.2s",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "#e6edf3",
            },
          }}
        >
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            {option.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );

  const searchAction = (
    <TextField
      placeholder="Search..."
      size="small"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon
              sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "1rem" }}
            />
          </InputAdornment>
        ),
      }}
      sx={{
        width: 180,
        "& .MuiOutlinedInput-root": {
          color: "#ffffff",
          fontFamily: '"JetBrains Mono", monospace',
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          fontSize: "0.8rem",
          borderRadius: 2,
          height: 32,
          "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
          "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
          "&.Mui-focused fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" },
        },
      }}
    />
  );

  return (
    <Box sx={{ p: 2 }}>
      {/* Header Card */}
      <SectionCard
        title={`Miners (${groupedMiners.totalFiltered})`}
        centerContent={sortButtons}
        action={searchAction}
        sx={{
          mb: 2,
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: "rgba(0, 0, 0, 0.65)", // X-style semi-transparent
          backdropFilter: "blur(12px)", // Liquid glass effect
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)", // Subtle separator
          boxShadow: "none", // Remove default shadow for cleaner blend
        }}
      >
        {null}
      </SectionCard>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* GOLD SECTION */}
        {groupedMiners.gold.length > 0 && (
          <MinerSection
            title="GOLD TIER"
            count={groupedMiners.gold.length}
            miners={groupedMiners.gold}
            color={getTierColors("Gold")}
            onSelectMiner={onSelectMiner}
          />
        )}

        {/* SILVER SECTION */}
        {groupedMiners.silver.length > 0 && (
          <MinerSection
            title="SILVER TIER"
            count={groupedMiners.silver.length}
            miners={groupedMiners.silver}
            color={getTierColors("Silver")}
            onSelectMiner={onSelectMiner}
          />
        )}

        {/* BRONZE SECTION */}
        {groupedMiners.bronze.length > 0 && (
          <MinerSection
            title="BRONZE TIER"
            count={groupedMiners.bronze.length}
            miners={groupedMiners.bronze}
            color={getTierColors("Bronze")}
            onSelectMiner={onSelectMiner}
          />
        )}

        {/* INACTIVE / OTHER SECTION */}
        {groupedMiners.others.length > 0 && (
          <MinerSection
            title="Unranked"
            count={groupedMiners.others.length}
            miners={groupedMiners.others}
            color={{ border: "rgba(255,255,255,0.1)", text: "#8b949e" }}
            onSelectMiner={onSelectMiner}
            compact={true}
          />
        )}

        {groupedMiners.totalFiltered === 0 && (
          <Box sx={{ py: 8, textAlign: "center", color: "text.secondary" }}>
            <Typography>No miners found matching your filters.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
export default TopMinersTable;
