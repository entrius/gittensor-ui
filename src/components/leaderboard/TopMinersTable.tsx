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
import ReactECharts from "echarts-for-react";
import { useMinerGithubData, useMinerPRs, useGeneralConfig } from "../../api";
import { TIER_COLORS, CHART_COLORS } from "../../theme";

interface MinerStats {
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
      return { border: "rgba(255, 215, 0, 0.5)", text: TIER_COLORS.gold, bg: "rgba(255, 215, 0, 0.1)" };
    case "Silver":
      return { border: "rgba(192, 192, 192, 0.5)", text: TIER_COLORS.silver, bg: "rgba(192, 192, 192, 0.1)" };
    case "Bronze":
      return { border: "rgba(205, 127, 50, 0.5)", text: TIER_COLORS.bronze, bg: "rgba(205, 127, 50, 0.1)" };
    default:
      return { border: "rgba(255, 255, 255, 0.15)", text: "rgba(255, 255, 255, 0.5)", bg: "rgba(255, 255, 255, 0.02)" };
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

const MinerCard: React.FC<MinerCardProps> = ({ miner, onClick }) => {
  const tierColors = getTierColors(miner.currentTier);

  // Helper to check for numeric IDs or missing values
  const isNumericId = (val: string | undefined) => !val || /^\d+$/.test(val);

  // Fetch profile if author is missing or looks like an ID
  const shouldFetch = isNumericId(miner.author);
  const { data: githubData } = useMinerGithubData(miner.githubId, shouldFetch);
  // Also fetch PRs as fallback if github data is missing (common for unranked miners)
  const { data: prs } = useMinerPRs(miner.githubId, shouldFetch);

  const username = githubData?.login
    || prs?.[0]?.author
    || (!isNumericId(miner.author) ? miner.author : miner.githubId)
    || miner.githubId
    || "";
  const credibilityPercent = (miner.credibility || 0) * 100;

  // Tier-based gradient background
  const tierGradient =
    miner.currentTier === "Gold"
      ? "linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 215, 0, 0.02) 100%)"
      : miner.currentTier === "Silver"
        ? "linear-gradient(135deg, rgba(192, 192, 192, 0.08) 0%, rgba(192, 192, 192, 0.02) 100%)"
        : miner.currentTier === "Bronze"
          ? "linear-gradient(135deg, rgba(205, 127, 50, 0.08) 0%, rgba(205, 127, 50, 0.02) 100%)"
          : "rgba(22, 27, 34, 0.8)";
  const borderColor = miner.currentTier ? tierColors.border : "rgba(48, 54, 61, 0.4)";

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
          sx={{ width: 24, height: 24, border: "1px solid rgba(48, 54, 61, 0.5)", filter: "grayscale(100%)", opacity: 0.7 }}
        />
        <Typography sx={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', fontSize: "0.9rem", fontWeight: 500, color: "#8b949e", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {username}
        </Typography>
        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", fontWeight: 600, color: "#484f58", textTransform: "uppercase", border: "1px solid rgba(48, 54, 61, 0.5)", borderRadius: 1, px: 0.75, py: 0.1 }}>
          Unranked
        </Typography>
      </Card>
    );
  }

  // ==========================================================================
  // ACTIVE CARD - Compact Premium Design
  // ==========================================================================
  return (
    <Card
      onClick={onClick}
      sx={{
        p: 1.5,
        backgroundColor: "#000000",
        backdropFilter: "blur(12px)",
        border: `1px solid ${borderColor}`,
        borderRadius: 2,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        position: "relative",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        "&:hover": {
          backgroundColor: "rgba(22, 27, 34, 0.6)",
          borderColor: tierColors.text,
          transform: "translateY(-2px)",
          boxShadow: `0 8px 24px -6px rgba(0, 0, 0, 0.6), 0 0 0 1px ${tierColors.border}40`,
        },
      }}
      elevation={0}
    >
      {/* Header: Identity + Rank */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={`https://avatars.githubusercontent.com/${username}`}
              sx={{ width: 36, height: 36, border: `2px solid ${tierColors.border}`, boxShadow: `0 0 10px ${tierColors.border}20` }}
            />
            <Box sx={{
              position: 'absolute', bottom: -4, right: -4,
              backgroundColor: '#0d1117', border: `1px solid ${tierColors.border}`, borderRadius: '4px',
              px: 0.5, py: 0
            }}>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", fontWeight: 700, color: tierColors.text }}>#{miner.rank}</Typography>
            </Box>
          </Box>
          <Box sx={{ overflow: "hidden" }}>
            <Typography sx={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
              fontSize: "1rem", fontWeight: 700, color: "#ffffff",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
            }}>
              {username}
            </Typography>

          </Box>
        </Box>
        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", fontWeight: 700, color: tierColors.text, textTransform: "uppercase", mt: 0.5, opacity: 0.8 }}>
          {miner.currentTier}
        </Typography>
      </Box>

      {/* Main Stats: Earnings & Credibility */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        {/* Earnings */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "1.6rem", fontWeight: 800, color: "#3fb950", lineHeight: 1 }}>
              ${Math.round(miner.usdPerDay || 0).toLocaleString()}
            </Typography>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.75rem", color: "#8b949e" }}>/day</Typography>
          </Box>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", color: "#3fb950", opacity: 0.7, mt: 0.2 }}>
            ~${Math.round((miner.usdPerDay || 0) * 30).toLocaleString()}/mo
          </Typography>
        </Box>

        {/* Credibility Donut */}
        <Box sx={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
          <ReactECharts
            option={{
              backgroundColor: "transparent",
              series: [{
                type: 'pie',
                radius: ['65%', '90%'],
                silent: true,
                label: { show: false },
                itemStyle: {
                  borderRadius: 3,
                  borderColor: "rgba(13, 17, 23, 0.8)", // Dark border to create separation
                  borderWidth: 2
                },
                data: [
                  { value: (miner.totalMergedPrs || 0), itemStyle: { color: CHART_COLORS.merged } },
                  { value: (miner.totalOpenPrs || 0), itemStyle: { color: CHART_COLORS.open } },
                  { value: (miner.totalClosedPrs || 0), itemStyle: { color: CHART_COLORS.closed } }
                ]
              }]
            }}
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'svg' }}
          />
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: '0.75rem', color: credibilityPercent >= 80 ? '#3fb950' : '#8b949e', fontWeight: 700 }}>
              {credibilityPercent.toFixed(0)}%
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer: Stats Grid */}
      <Box sx={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 1,
        backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 1.5, p: 1, alignItems: "center"
      }}>
        <Box>
          <Typography sx={{ fontSize: '0.6rem', color: '#8b949e', textTransform: 'uppercase', mb: 0.2 }}>Merged</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#3fb950', fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{miner.totalMergedPrs || 0}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.6rem', color: '#8b949e', textTransform: 'uppercase', mb: 0.2 }}>Open</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#c9d1d9', fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{miner.totalOpenPrs || 0}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.6rem', color: '#8b949e', textTransform: 'uppercase', mb: 0.2 }}>Closed</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#f85149', fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{miner.totalClosedPrs || 0}</Typography>
        </Box>
        <Box sx={{ textAlign: "right", borderLeft: "1px solid rgba(255,255,255,0.1)", pl: 1.5 }}>
          <Typography sx={{ fontSize: '0.6rem', color: '#8b949e', textTransform: 'uppercase', mb: 0.2 }}>Score</Typography>
          <Typography sx={{ fontSize: '0.9rem', color: '#e6edf3', fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{Number(miner.totalScore).toFixed(1)}</Typography>
        </Box>
      </Box>
    </Card>
  );
};

// ============================================================================
// STYLED SECTION CARD (Dashboard Style)
// ============================================================================
// ============================================================================
// STYLED SECTION CARD (Dashboard Style)
// ============================================================================
const SectionCard: React.FC<{ children: React.ReactNode; sx?: any; title?: string; action?: React.ReactNode; centerContent?: React.ReactNode }> = ({ children, sx, title, action, centerContent }) => (
  <Card
    sx={{
      borderRadius: 3,
      border: "1px solid rgba(255, 255, 255, 0.1)",
      backgroundColor: "#000000",
      display: "flex",
      flexDirection: "column",
      ...sx,
    }}
    elevation={0}
  >
    {/* Optional Header */}
    {(title || action || centerContent) && (
      <Box sx={{ p: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        {title && <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.25rem', fontWeight: 600 }}>{title}</Typography>}

        {/* Centered Content (Absolute Position) */}
        {centerContent && (
          <Box sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex' }}>
            {centerContent}
          </Box>
        )}

        {action && <Box>{action}</Box>}
      </Box>
    )}

    <CardContent
      sx={{
        p: 0,
        "&:last-child": { pb: 0 },
        flex: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </CardContent>
  </Card>
);

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
  compact = false
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const theme = useTheme();

  // Determine how many items to show
  // User Requirement: "see at least top 3 in very tier without expanding the view"
  const INITIAL_DISPLAY_COUNT = 3;

  // If not expanded, show INITIAL_DISPLAY_COUNT. If expanded, show all.
  const visibleMiners = expanded ? miners : miners.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMoreMiners = miners.length > INITIAL_DISPLAY_COUNT;

  return (
    <Card
      sx={{
        backgroundColor: "#000000", // Black background (outline only)
        border: `1px solid ${color.border}`,
        borderRadius: 3,
        // Optional glow effect for tiers
        boxShadow: color.text !== '#8b949e' ? `0 0 20px -10px ${color.border}` : 'none',
        display: "flex",
        flexDirection: "column",
      }}
      elevation={0}
    >
      {title && (
        <Box sx={{
          px: 3,
          pt: 3, // Increased top padding for spacing
          pb: 1,
          display: 'flex',
          justifyContent: 'center', // Center content
          alignItems: 'center',
          // Removed borderBottom to match reference
          // background: `linear-gradient(90deg, ${color.border}10, transparent)` // Removed gradient
        }}>
          <Typography variant="h6" sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '1rem',
            fontWeight: 700,
            color: color.text,
            textTransform: 'uppercase', // All caps
            letterSpacing: '0.1em' // Tracking
          }}>
            {title}
          </Typography>
          {/* Removed count from header to match clean reference style, or keep it? 
              Reference doesn't show count in title, it shows it in the bubble.
              I will hide the count in the title for now to match exactly. 
          */}
        </Box>
      )}

      <Box sx={{ p: 3, pt: 2, flex: 1 }}>
        <Grid container spacing={2}>
          {visibleMiners.map((miner) => (
            <Grid item xs={12} sm={12} md={6} xl={4} key={miner.hotkey}>
              <MinerCard miner={miner} onClick={() => onSelectMiner(miner.githubId || miner.author || "")} />
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
            borderTop: `1px solid ${color.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              color: 'text.primary',
            }
          }}
        >
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {expanded ? "Show Less" : `View ${miners.length - INITIAL_DISPLAY_COUNT} More`}
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
        case "totalScore": return (b.totalScore || 0) - (a.totalScore || 0);
        case "usdPerDay": return (b.usdPerDay || 0) - (a.usdPerDay || 0);
        case "totalPRs": return (b.totalPRs || 0) - (a.totalPRs || 0);
        case "credibility": return (b.credibility || 0) - (a.credibility || 0);
        default: return 0;
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
          m.author?.toLowerCase().includes(lowerQuery)
      );
    }

    // 2. Group by Tier
    const gold = result.filter(m => m.currentTier === "Gold");
    const silver = result.filter(m => m.currentTier === "Silver");
    const bronze = result.filter(m => m.currentTier === "Bronze");
    const others = result.filter(m => !m.currentTier);

    // 3. Sort each Group
    return {
      gold: sortMinersList(gold, sortOption),
      silver: sortMinersList(silver, sortOption),
      bronze: sortMinersList(bronze, sortOption),
      others: sortMinersList(others, sortOption === "totalScore" ? "credibility" : sortOption),
      totalFiltered: result.length
    };
  }, [miners, searchQuery, sortOption]);

  // Stats (Use original unfiltered list for stats)
  const topEarners = useMemo(() =>
    [...miners].sort((a, b) => (b.usdPerDay || 0) - (a.usdPerDay || 0)).slice(0, 5),
    [miners]);

  const mostActive = useMemo(() =>
    [...miners].sort((a, b) => (b.totalPRs || 0) - (a.totalPRs || 0)).slice(0, 5),
    [miners]);

  // Network Stats Data
  const networkStats = useMemo(() => ({
    totalMiners: miners.length,
    activeTier: miners.filter(m => m.currentTier).length,
    totalPRs: miners.reduce((acc, m) => acc + (m.totalPRs || 0), 0),
    dailyPool: miners.reduce((acc, m) => acc + (m.usdPerDay || 0), 0),
  }), [miners]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={40} sx={{ color: "primary.main" }} />
      </Box>
    );
  }

  // Header Actions - Split into Sort (Center) and Search (Right)
  const sortButtons = (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {[
        { label: 'Score', value: 'totalScore' },
        { label: 'Earnings', value: 'usdPerDay' },
        { label: 'PRs', value: 'totalPRs' },
        { label: 'Credibility', value: 'credibility' },
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
            cursor: 'pointer',
            backgroundColor: sortOption === option.value ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            color: sortOption === option.value ? '#fff' : '#8b949e',
            border: '1px solid',
            borderColor: sortOption === option.value ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#e6edf3',
            },
          }}
        >
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.75rem", fontWeight: 600 }}>
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
            <SearchIcon sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "1rem" }} />
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
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* LEFT COLUMN: Main Miner Section (Unwrapped) */}
        <Grid item xs={12} lg={9}>
          {/* Header Card */}
          <SectionCard
            title={`Miners (${groupedMiners.totalFiltered})`}
            centerContent={sortButtons}
            action={searchAction}
            sx={{
              mb: 3,
              position: "sticky",
              top: 0,
              zIndex: 100,
              backgroundColor: "rgba(0, 0, 0, 0.65)", // X-style semi-transparent
              backdropFilter: "blur(12px)", // Liquid glass effect
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)", // Subtle separator
              boxShadow: "none" // Remove default shadow for cleaner blend
            }}
          >
            {null}
          </SectionCard>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

            {/* GOLD SECTION */}
            {groupedMiners.gold.length > 0 && (
              <MinerSection
                title="GOLD TIER"
                count={groupedMiners.gold.length}
                miners={groupedMiners.gold}
                color={getTierColors('Gold')}
                onSelectMiner={onSelectMiner}
              />
            )}

            {/* SILVER SECTION */}
            {groupedMiners.silver.length > 0 && (
              <MinerSection
                title="SILVER TIER"
                count={groupedMiners.silver.length}
                miners={groupedMiners.silver}
                color={getTierColors('Silver')}
                onSelectMiner={onSelectMiner}
              />
            )}

            {/* BRONZE SECTION */}
            {groupedMiners.bronze.length > 0 && (
              <MinerSection
                title="BRONZE TIER"
                count={groupedMiners.bronze.length}
                miners={groupedMiners.bronze}
                color={getTierColors('Bronze')}
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
        </Grid>

        {/* RIGHT COLUMN: Sidebar Stats */}
        <Grid item xs={12} lg={3}>
          <Stack spacing={3} sx={{ position: "sticky", top: 24 }}>

            {/* CARD 1: Network Stats */}
            <SectionCard title="Network Stats">
              <Box sx={{ pt: 1, px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "1rem", color: "#8b949e" }}>Total Miners</Typography>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "1.2rem", color: "#e6edf3" }}>
                    {networkStats.totalMiners}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "1rem", color: "#8b949e" }}>Active Tier</Typography>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "1.2rem", color: "#e6edf3" }}>
                    {networkStats.activeTier}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "1rem", color: "#8b949e" }}>Total PRs</Typography>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "1.2rem", color: "#e6edf3" }}>
                    {networkStats.totalPRs}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "1rem", color: "#8b949e" }}>Daily Pool</Typography>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: "1.2rem", color: "#3fb950" }}>
                    ${networkStats.dailyPool.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </SectionCard>

            {/* CARD 2: Top Earners */}
            <SectionCard title="Top Earners">
              <Box sx={{ px: 2, pb: 2 }}>
                <Box sx={{ display: "flex", py: 1, borderBottom: "1px solid rgba(48, 54, 61, 0.5)", mb: 1 }}>
                  <Typography sx={{ fontSize: "0.8rem", color: "#8b949e", width: 24 }}>#</Typography>
                  <Typography sx={{ fontSize: "0.8rem", color: "#8b949e", flex: 1 }}>MINER</Typography>
                  <Typography sx={{ fontSize: "0.8rem", color: "#8b949e" }}>$/DAY</Typography>
                </Box>
                {topEarners.map((miner, i) => (
                  <Box
                    key={miner.hotkey}
                    onClick={() => onSelectMiner(miner.githubId || miner.author || "")}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      py: 1,
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.03)", borderRadius: 1 }
                    }}
                  >
                    <Typography sx={{ fontSize: "1rem", color: "#8b949e", width: 24 }}>{i + 1}</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${miner.author || miner.githubId}`}
                        sx={{ width: 20, height: 20 }}
                      />
                      <Typography sx={{ fontSize: "1rem", color: "#c9d1d9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {miner.author || miner.githubId}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "1.1rem", color: "#3fb950", fontFamily: '"JetBrains Mono", monospace' }}>
                      ${Math.round(miner.usdPerDay || 0).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </SectionCard>

            {/* CARD 3: Most Active */}
            <SectionCard title="Most Active">
              <Box sx={{ px: 2, pb: 2 }}>
                <Box sx={{ display: "flex", py: 1, borderBottom: "1px solid rgba(48, 54, 61, 0.5)", mb: 1 }}>
                  <Typography sx={{ fontSize: "0.8rem", color: "#8b949e", width: 24 }}>#</Typography>
                  <Typography sx={{ fontSize: "0.8rem", color: "#8b949e", flex: 1 }}>MINER</Typography>
                  <Typography sx={{ fontSize: "0.8rem", color: "#8b949e" }}>PRS</Typography>
                </Box>
                {mostActive.map((miner, i) => (
                  <Box
                    key={miner.hotkey}
                    onClick={() => onSelectMiner(miner.githubId || miner.author || "")}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      py: 1,
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.03)", borderRadius: 1 }
                    }}
                  >
                    <Typography sx={{ fontSize: "1rem", color: "#8b949e", width: 24 }}>{i + 1}</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${miner.author || miner.githubId}`}
                        sx={{ width: 20, height: 20 }}
                      />
                      <Typography sx={{ fontSize: "1rem", color: "#c9d1d9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {miner.author || miner.githubId}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "1.1rem", color: "#e6edf3", fontFamily: '"JetBrains Mono", monospace' }}>
                      {miner.totalPRs}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </SectionCard>

          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};
export default TopMinersTable;

