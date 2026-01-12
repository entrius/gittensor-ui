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
import { TIER_COLORS } from "../../theme";

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
  const rankColors = getRankColors(miner.rank || 0);
  const username = miner.author || miner.githubId || "";
  const credibilityPercent = (miner.credibility || 0) * 100;
  const isTopThree = (miner.rank || 0) <= 3;
  const isActive = !!miner.currentTier;

  // ==========================================================================
  // INACTIVE STATE (Collapsed)
  // ==========================================================================
  if (!isActive) {
    return (
      <Card
        onClick={onClick}
        sx={{
          p: 0,
          backgroundColor: "rgba(13, 17, 23, 0.6)",
          border: "1px solid rgba(48, 54, 61, 0.4)",
          borderRadius: 2,
          cursor: "pointer",
          transition: "all 0.15s ease",
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 1.5,
          gap: 1.5,
          "&:hover": {
            backgroundColor: "rgba(13, 17, 23, 0.9)",
            borderColor: "rgba(48, 54, 61, 0.8)",
            transform: "translateY(-1px)",
          },
        }}
        elevation={0}
      >

        <Avatar
          src={`https://avatars.githubusercontent.com/${username}`}
          sx={{ width: 24, height: 24, border: "1px solid rgba(48, 54, 61, 0.5)", filter: "grayscale(100%)", opacity: 0.7 }}
        />
        <Typography sx={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', fontSize: "0.85rem", fontWeight: 500, color: "#8b949e", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {username}
        </Typography>
        <Box sx={{ px: 1, py: 0.25, borderRadius: 1, backgroundColor: "rgba(110, 118, 129, 0.1)", border: "1px solid rgba(110, 118, 129, 0.2)" }}>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", fontWeight: 600, color: "#8b949e", textTransform: "uppercase" }}>
            Inactive
          </Typography>
        </Box>
      </Card>
    );
  }

  // ==========================================================================
  // ACTIVE STATE (Full Card) - Compact/Square
  // ==========================================================================
  return (
    <Card
      onClick={onClick}
      sx={{
        p: 0,
        backgroundColor: "rgba(22, 27, 34, 0.8)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${isTopThree ? tierColors.border : "rgba(48, 54, 61, 0.6)"}`,
        borderRadius: 2,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        "&:hover": {
          backgroundColor: "rgba(22, 27, 34, 0.95)",
          borderColor: tierColors.text,
          transform: "translateY(-4px)",
          boxShadow: `0 12px 32px -8px rgba(0, 0, 0, 0.5), 0 0 0 1px ${tierColors.border}40`,
          "& .miner-avatar": { transform: "scale(1.05)", boxShadow: `0 0 16px ${tierColors.border}60` },
        },
      }}
      elevation={0}
    >
      {/* Tier Badge - Compact */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          px: 1,
          py: 0.25,
          borderBottomLeftRadius: 6,
          backgroundColor: tierColors.bg,
          borderBottom: `1px solid ${tierColors.border}`,
          borderLeft: `1px solid ${tierColors.border}`,
        }}
      >
        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.55rem", fontWeight: 800, color: tierColors.text, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {miner.currentTier}
        </Typography>
      </Box>

      {/* Header: Avatar + Name (Rank removed) */}
      <Box sx={{ p: 1.5, pb: 0.5, display: "flex", alignItems: "center", gap: 1.5, pt: 2 }}>

        {/* Avatar */}
        <Avatar
          className="miner-avatar"
          src={`https://avatars.githubusercontent.com/${username}`}
          sx={{
            width: 40, height: 40, // Smaller
            border: `2px solid ${tierColors.border}`,
            backgroundColor: "#0d1117",
            transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />

        {/* Name */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', fontSize: "0.9rem", fontWeight: 600, color: "#e6edf3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.2s", "&:hover": { color: "#58a6ff" } }}>
            {username}
          </Typography>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", color: "#8b949e" }}>
            Rank #{miner.rank}
          </Typography>
        </Box>
      </Box>

      {/* Content Row: Earnings + Stats */}
      {/* Content Row: Earnings + Stats */}
      <Box sx={{ px: 2, pb: 2, display: "flex", gap: 1, alignItems: "center", minHeight: 90 }}>

        {/* Left: Earnings Box (Stacked) */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minWidth: 0
          }}
        >
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.6rem", color: "#8b949e", textTransform: "uppercase", mb: 0.5 }}>
            Earnings
          </Typography>

          {(miner.usdPerDay || 0) > 0 ? (
            <>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "1.4rem", fontWeight: 700, color: "#3fb950", lineHeight: 1 }}>
                  ${Math.round(miner.usdPerDay || 0).toLocaleString()}
                </Typography>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.75rem", color: "#8b949e" }}>/d</Typography>
              </Box>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", color: "#3fb950", opacity: 0.8, mt: 0.5 }}>
                ~${Math.round((miner.usdPerDay || 0) * 30).toLocaleString()}/mo
              </Typography>
            </>
          ) : (
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.85rem", color: "#484f58", fontStyle: "italic" }}>No active earnings</Typography>
          )}
        </Box>

        {/* Divider */}
        <Box sx={{ width: "1px", height: 40, backgroundColor: "rgba(48, 54, 61, 0.4)", mx: 0.5 }} />

        {/* Right: Donut & PR List */}
        <Box sx={{ flex: 1.2, display: "flex", alignItems: "center", gap: 1 }}>
          {/* Donut */}
          <Box sx={{ width: 52, height: 52, flexShrink: 0, position: "relative" }}>
            <ReactECharts
              option={{
                backgroundColor: "transparent",
                title: {
                  text: `${credibilityPercent.toFixed(0)}%`, left: "center", top: "28%",
                  textStyle: { color: "#e6edf3", fontSize: 9, fontWeight: "bold", fontFamily: '"JetBrains Mono", monospace' },
                },
                series: [{
                  type: "pie", radius: ["55%", "85%"], center: ["50%", "50%"],
                  itemStyle: { borderRadius: 2, borderColor: "rgba(13, 17, 23, 1)", borderWidth: 2 },
                  label: { show: false },
                  data: [
                    { value: miner.totalMergedPrs || 0, itemStyle: { color: "#3fb950" } },
                    { value: miner.totalOpenPrs || 0, itemStyle: { color: "#8b949e" } },
                    { value: miner.totalClosedPrs || 0, itemStyle: { color: "#f85149" } },
                  ],
                }],
              }}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "svg" }}
            />
          </Box>
          {/* List */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.25, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#3fb950" }} />
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", color: "#c9d1d9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{miner.totalMergedPrs || 0} merged</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#8b949e" }} />
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", color: "#8b949e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{miner.totalOpenPrs || 0} open</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#f85149" }} />
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", color: "#8b949e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{miner.totalClosedPrs || 0} closed</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Footer Stats - Compact */}
      <Box sx={{ px: 1.5, py: 1, borderTop: "1px solid rgba(48, 54, 61, 0.5)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.1)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", color: "#8b949e" }}>SCORE</Typography>
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.75rem", color: "#e6edf3", fontWeight: 700 }}>{Number(miner.totalScore || 0).toFixed(1)}</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Lines added" arrow>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", color: "#3fb950" }}>+{(miner.linesAdded || 0).toLocaleString()}</Typography>
          </Tooltip>
          <Tooltip title="Lines deleted" arrow>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.65rem", color: "#f85149" }}>-{(miner.linesDeleted || 0).toLocaleString()}</Typography>
          </Tooltip>
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
const SectionCard: React.FC<{ children: React.ReactNode; sx?: any; title?: string; action?: React.ReactNode }> = ({ children, sx, title, action }) => (
  <Card
    sx={{
      borderRadius: 3,
      border: "1px solid rgba(255, 255, 255, 0.1)",
      backgroundColor: "transparent",
      display: "flex",
      flexDirection: "column",
      ...sx,
    }}
    elevation={0}
  >
    {/* Optional Header */}
    {(title || action) && (
      <Box sx={{ p: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title && <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1rem', fontWeight: 600 }}>{title}</Typography>}
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
  title: React.ReactNode;
  count: number;
  miners: MinerStats[];
  color: { border: string; text: string };
  onSelectMiner: (id: string) => void;
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

  // Responsive grid Logic (Matching the Grid item props below: xs=12 sm=12 md=6 xl=4)
  // Columns per row: xs=1, sm=1, md=2, xl=3
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));
  const isMd = useMediaQuery(theme.breakpoints.up('md'));
  const isSm = useMediaQuery(theme.breakpoints.up('sm'));

  let columns = 1;
  if (isXl) columns = 3;
  else if (isMd) columns = 2;
  else columns = 1;

  // Limit = columns (one row)
  const limit = columns;
  const shouldTruncate = !expanded && miners.length > limit;

  // If truncating, we show (limit - 1) miners, and the last slot is the "More" card
  // So total items = limit (filling exactly one row)
  const visibleMiners = shouldTruncate ? miners.slice(0, limit - 1) : miners;
  const showMoreCount = miners.length - (limit - 1);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, borderBottom: `1px solid ${color.border}`, pb: 1 }}>
        <Typography variant="h6" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.1rem', fontWeight: 600, color: color.text }}>
          {title}
        </Typography>
        <Typography sx={{ ml: 2, color: 'text.secondary', fontSize: '0.9rem' }}>
          ({count})
        </Typography>

        {expanded && shouldTruncate === false && miners.length > limit && (
          <Box
            onClick={() => setExpanded(false)}
            sx={{ ml: 'auto', cursor: 'pointer', color: 'text.secondary', fontSize: '0.8rem', '&:hover': { color: 'white' } }}
          >
            Show Less
          </Box>
        )}
      </Box>

      <Grid container spacing={2}>
        {visibleMiners.map((miner) => (
          <Grid item xs={12} sm={12} md={6} xl={4} key={miner.hotkey}>
            <MinerCard miner={miner} onClick={() => onSelectMiner(miner.githubId || miner.author || "")} />
          </Grid>
        ))}

        {shouldTruncate && (
          <Grid item xs={12} sm={12} md={6} xl={4}>
            <Card
              onClick={() => setExpanded(true)}
              sx={{
                height: '100%',
                minHeight: compact ? 0 : 180,
                display: 'flex',
                flexDirection: compact ? 'row' : 'column',
                gap: compact ? 1.5 : 0,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                py: compact ? 2 : 0,
                px: compact ? 2 : 0,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  borderColor: color.text,
                  transform: 'translateY(-2px)',
                  color: color.text
                }
              }}
            >
              <Typography variant={compact ? "h6" : "h4"} sx={{ color: 'inherit', mb: compact ? 0 : 1, fontWeight: 300 }}>
                +{showMoreCount}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                View More
              </Typography>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
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

  // Header Actions (Search + Sort ONLY)
  const headerActions = (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>

      {/* Sort Select */}
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <Select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          displayEmpty
          variant="standard"
          disableUnderline
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.8rem",
            color: "#fff",
            "& .MuiSelect-select": { py: 0.5 },
            "& .MuiSvgIcon-root": { color: "rgba(255, 255, 255, 0.5)" },
          }}
        >
          <MenuItem value="totalScore">Sort: Score</MenuItem>
          <MenuItem value="usdPerDay">Sort: Earnings</MenuItem>
          <MenuItem value="totalPRs">Sort: PRs</MenuItem>
          <MenuItem value="credibility">Sort: Credibility</MenuItem>
        </Select>
      </FormControl>

      {/* Search Input */}
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
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* LEFT COLUMN: Main Miner Section (Unwrapped) */}
        <Grid item xs={12} lg={9}>
          {/* Header Card */}
          <SectionCard
            title={`Miners (${groupedMiners.totalFiltered})`}
            action={headerActions}
            sx={{ mb: 3 }}
          >
            {null}
          </SectionCard>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

            {/* GOLD SECTION */}
            {groupedMiners.gold.length > 0 && (
              <MinerSection
                title="Gold Tier 🥇"
                count={groupedMiners.gold.length}
                miners={groupedMiners.gold}
                color={getTierColors('Gold')}
                onSelectMiner={onSelectMiner}
              />
            )}

            {/* SILVER SECTION */}
            {groupedMiners.silver.length > 0 && (
              <MinerSection
                title="Silver Tier 🥈"
                count={groupedMiners.silver.length}
                miners={groupedMiners.silver}
                color={getTierColors('Silver')}
                onSelectMiner={onSelectMiner}
              />
            )}

            {/* BRONZE SECTION */}
            {groupedMiners.bronze.length > 0 && (
              <MinerSection
                title="Bronze Tier 🥉"
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
          <Stack spacing={3}>

            {/* CARD 1: Network Stats */}
            <SectionCard title="Network Stats">
              <Box sx={{ pt: 1, px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "0.85rem", color: "#8b949e" }}>Total Miners</Typography>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: "#e6edf3" }}>
                    {networkStats.totalMiners}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "0.85rem", color: "#8b949e" }}>Active Tier</Typography>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: "#e6edf3" }}>
                    {networkStats.activeTier}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "0.85rem", color: "#8b949e" }}>Total PRs</Typography>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: "#e6edf3" }}>
                    {networkStats.totalPRs}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: "0.85rem", color: "#8b949e" }}>Daily Pool</Typography>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: "#3fb950" }}>
                    ${networkStats.dailyPool.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </SectionCard>

            {/* CARD 2: Top Earners */}
            <SectionCard title="Top Earners">
              <Box sx={{ px: 2, pb: 2 }}>
                <Box sx={{ display: "flex", py: 1, borderBottom: "1px solid rgba(48, 54, 61, 0.5)", mb: 1 }}>
                  <Typography sx={{ fontSize: "0.7rem", color: "#8b949e", width: 24 }}>#</Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: "#8b949e", flex: 1 }}>MINER</Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: "#8b949e" }}>$/DAY</Typography>
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
                    <Typography sx={{ fontSize: "0.8rem", color: "#8b949e", width: 24 }}>{i + 1}</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${miner.author || miner.githubId}`}
                        sx={{ width: 20, height: 20 }}
                      />
                      <Typography sx={{ fontSize: "0.85rem", color: "#c9d1d9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {miner.author || miner.githubId}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.85rem", color: "#3fb950", fontFamily: '"JetBrains Mono", monospace' }}>
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
                  <Typography sx={{ fontSize: "0.7rem", color: "#8b949e", width: 24 }}>#</Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: "#8b949e", flex: 1 }}>MINER</Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: "#8b949e" }}>PRS</Typography>
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
                    <Typography sx={{ fontSize: "0.8rem", color: "#8b949e", width: 24 }}>{i + 1}</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${miner.author || miner.githubId}`}
                        sx={{ width: 20, height: 20 }}
                      />
                      <Typography sx={{ fontSize: "0.85rem", color: "#c9d1d9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {miner.author || miner.githubId}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.85rem", color: "#e6edf3", fontFamily: '"JetBrains Mono", monospace' }}>
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

