import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Avatar,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
  Collapse,
  TablePagination,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import BarChartIcon from "@mui/icons-material/BarChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import ReactECharts from "echarts-for-react";
import { useAllMinerData, useAllMinerStats, useReposAndWeights } from "../api";
import { CommitLog } from "../api/models/Dashboard";

interface MinerLeaderboardProps {
  onSelectMiner: (githubId: string) => void;
}

interface MinerStats {
  githubId: string; // Numeric GitHub ID
  author?: string; // GitHub username for display/avatar
  totalScore: number; // Earned score (with penalties/boosts)
  baseTotalScore: number; // Base score (raw value without penalties/boosts)
  totalPRs: number;
  linesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  uniqueRepos: Set<string>;
  hotkey: string;
  repoImpactScore: number; // Sum of weights of unique repos contributed to
  avgRepoWeight: number;
  rank?: number;
}

interface RepoStats {
  repository: string;
  totalScore: number; // Sum of base scores for this repo
  totalPRs: number;
  uniqueMiners: Set<string>;
  rank?: number;
}

const MinerLeaderboard: React.FC<MinerLeaderboardProps> = ({
  onSelectMiner,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [showChart, setShowChart] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Safe hook usage
  const allMinerDataQuery = useAllMinerData();
  const allMinerStatsQuery = useAllMinerStats(); // Get all miners (max 256)
  // Memoize empty array to prevent infinite loops when data is loading
  const emptyArray = useMemo(() => [], []);
  const allPRs = Array.isArray(allMinerDataQuery?.data)
    ? allMinerDataQuery.data
    : emptyArray;
  const isLoadingPRs = allMinerDataQuery?.isLoading;
  const precomputedMinerStats = Array.isArray(allMinerStatsQuery?.data)
    ? allMinerStatsQuery.data
    : emptyArray;
  const isLoadingMinerStats = allMinerStatsQuery?.isLoading;

  const reposQuery = useReposAndWeights();
  const repos = Array.isArray(reposQuery?.data) ? reposQuery.data : emptyArray;
  const isLoadingRepos = reposQuery?.isLoading;

  const [repoWeights, setRepoWeights] = useState<Map<string, number>>(
    new Map(),
  );
  const [githubIdToUsername, setGithubIdToUsername] = useState<
    Map<string, string>
  >(new Map());
  const [minerStats, setMinerStats] = useState<MinerStats[]>([]);
  const [repoStats, setRepoStats] = useState<RepoStats[]>([]);
  const [topPRsLeaderboard, setTopPRsLeaderboard] = useState<any[]>([]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Process Repo Weights
  useEffect(() => {
    const map = new Map<string, number>();
    if (Array.isArray(repos)) {
      repos.forEach((repo) => {
        if (repo && repo.fullName) {
          map.set(repo.fullName, parseFloat(repo.weight || "0"));
        }
      });
    }
    setRepoWeights(map);
  }, [repos]);

  // Build githubId -> username mapping from PR data
  useEffect(() => {
    const map = new Map<string, string>();
    if (Array.isArray(allPRs)) {
      allPRs.forEach((pr: CommitLog) => {
        if (pr && pr.githubId && pr.author) {
          map.set(pr.githubId, pr.author);
        }
      });
    }
    setGithubIdToUsername(map);
  }, [allPRs]);

  // Process Miner Stats
  useEffect(() => {
    if (!Array.isArray(allPRs) || allPRs.length === 0) {
      setMinerStats([]);
      return;
    }

    const statsMap = new Map<string, MinerStats>();

    allPRs.forEach((pr: CommitLog) => {
      if (!pr || !pr.githubId) return;

      const current = statsMap.get(pr.githubId) || {
        githubId: pr.githubId, // Use numeric GitHub ID
        author: pr.author, // Store username for display/avatar
        totalScore: 0, // Earned score
        baseTotalScore: 0, // Base score
        totalPRs: 0,
        linesChanged: 0,
        linesAdded: 0,
        linesDeleted: 0,
        uniqueRepos: new Set<string>(),
        hotkey: pr.hotkey || "N/A",
        repoImpactScore: 0,
        avgRepoWeight: 0,
      };

      current.totalScore += parseFloat(pr.score || "0");
      current.baseTotalScore += parseFloat(pr.baseScore || "0");
      current.totalPRs += 1;
      current.linesChanged += (pr.additions || 0) + (pr.deletions || 0);
      current.linesAdded += pr.additions || 0;
      current.linesDeleted += pr.deletions || 0;

      if (pr.repository && !current.uniqueRepos.has(pr.repository)) {
        current.uniqueRepos.add(pr.repository);
        const weight = repoWeights.get(pr.repository) || 0;
        current.repoImpactScore += weight;
      }

      if (current.hotkey === "N/A" && pr.hotkey) {
        current.hotkey = pr.hotkey;
      }

      statsMap.set(pr.githubId, current);
    });

    const stats = Array.from(statsMap.values()).map((stat) => ({
      ...stat,
      avgRepoWeight:
        stat.uniqueRepos.size > 0
          ? stat.repoImpactScore / stat.uniqueRepos.size
          : 0,
    }));

    setMinerStats(stats);
  }, [allPRs, repoWeights]);

  // Process Repo Stats
  useEffect(() => {
    if (!Array.isArray(allPRs) || allPRs.length === 0) {
      setRepoStats([]);
      return;
    }

    const statsMap = new Map<string, RepoStats>();

    allPRs.forEach((pr: CommitLog) => {
      if (!pr || !pr.repository) return;

      const current = statsMap.get(pr.repository) || {
        repository: pr.repository,
        totalScore: 0, // Use base score for repo totals
        totalPRs: 0,
        uniqueMiners: new Set<string>(),
      };

      current.totalScore += parseFloat(pr.baseScore || "0"); // Use base score
      current.totalPRs += 1;
      if (pr.author) {
        current.uniqueMiners.add(pr.author);
      }

      statsMap.set(pr.repository, current);
    });

    setRepoStats(Array.from(statsMap.values()));
  }, [allPRs]);

  // Process Top PRs
  useEffect(() => {
    if (!Array.isArray(allPRs) || allPRs.length === 0) {
      setTopPRsLeaderboard([]);
      return;
    }
    const topPRs = [...allPRs]
      .sort(
        (a, b) =>
          parseFloat(b.baseScore || "0") - parseFloat(a.baseScore || "0"),
      )
      .slice(0, 100)
      .map((pr, index) => ({ ...pr, rank: index + 1 }));
    setTopPRsLeaderboard(topPRs);
  }, [allPRs]);

  // Use precomputed miner stats for Top Miners tab (only shows LIVE miners)
  const displayMinerStats = useMemo(() => {
    return precomputedMinerStats.map((stat) => {
      const mapped = {
        githubId: stat.githubId || "",
        author: githubIdToUsername.get(stat.githubId) || undefined, // Add username from mapping
        totalScore: Number(stat.totalScore) || 0, // Earned score
        baseTotalScore: Number(stat.baseTotalScore) || 0, // Base score
        totalPRs: Number(stat.totalPrs) || 0,
        linesChanged: Number(stat.totalLinesChanged) || 0,
        linesAdded: Number(stat.totalAdditions) || 0,
        linesDeleted: Number(stat.totalDeletions) || 0,
        uniqueRepos: new Set<string>(), // Will show count instead
        hotkey: stat.hotkey || "N/A",
        repoImpactScore: 0, // Not available in precomputed stats
        avgRepoWeight: 0, // Not available in precomputed stats
        uniqueReposCount: Number(stat.uniqueReposCount) || 0, // Add this for display
      };
      return mapped as any;
    });
  }, [precomputedMinerStats, githubIdToUsername]);

  // Derived Leaderboards with safety checks
  const overallLeaderboard = useMemo(() => {
    if (!Array.isArray(displayMinerStats)) return [];
    return [...displayMinerStats]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((miner, index) => ({ ...miner, rank: index + 1 }));
  }, [displayMinerStats]);

  const topReposLeaderboard = useMemo(() => {
    if (!Array.isArray(repoStats)) return [];
    return [...repoStats]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((repo, index) => ({ ...repo, rank: index + 1 }));
  }, [repoStats]);

  // Filtering logic
  const getFilteredData = (data: any[]) => {
    if (!Array.isArray(data)) return [];
    if (!searchQuery) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter((item) => {
      if (!item) return false;
      if (item.githubId && item.githubId.toLowerCase().includes(lowerQuery))
        return true;
      if (item.author && item.author.toLowerCase().includes(lowerQuery))
        return true;
      if (item.hotkey && item.hotkey.toLowerCase().includes(lowerQuery))
        return true;
      if (
        item.pullRequestTitle &&
        item.pullRequestTitle.toLowerCase().includes(lowerQuery)
      )
        return true;
      if (item.repository && item.repository.toLowerCase().includes(lowerQuery))
        return true;
      return false;
    });
  };

  const currentData = useMemo(() => {
    if (activeTab === 0) return getFilteredData(overallLeaderboard);
    if (activeTab === 1) return getFilteredData(topPRsLeaderboard);
    if (activeTab === 2) return getFilteredData(topReposLeaderboard);
    return [];
  }, [
    activeTab,
    overallLeaderboard,
    topPRsLeaderboard,
    topReposLeaderboard,
    searchQuery,
  ]);

  // Chart Configuration
  const getChartOption = () => {
    // Use all data instead of slicing
    const chartData = Array.isArray(currentData) ? currentData : [];
    const isDark = true; // Assuming dark mode based on UI
    const textColor = "rgba(255, 255, 255, 0.7)";
    const axisLineColor = "rgba(255, 255, 255, 0.1)";

    let xAxisData: string[] = [];
    let seriesData: number[] = [];
    let title = "";
    const color = "rgba(255, 255, 255, 0.7)";

    // Helper to truncate labels
    const truncateLabel = (label: string) => {
      return label.length > 15 ? label.substring(0, 12) + "..." : label;
    };

    if (activeTab === 0) {
      // Top Miners
      xAxisData = chartData.map(
        (item: any) => item?.author || item?.githubId || "",
      );
      seriesData = chartData.map((item: any) => Number(item?.totalScore) || 0);
      title = "Top Miners by Total Score";
    } else if (activeTab === 1) {
      // Top PRs
      xAxisData = chartData.map(
        (item: any) => `#${item?.pullRequestNumber || ""}`,
      );
      seriesData = chartData.map((item: any) =>
        Number(parseFloat(item?.baseScore || "0")),
      );
      title = "Top Pull Requests by Base Score";
    } else if (activeTab === 2) {
      // Top Repos
      xAxisData = chartData.map(
        (item: any) =>
          (item?.repository || "").split("/")[1] || item?.repository || "",
      );
      seriesData = chartData.map((item: any) => Number(item?.totalScore) || 0);
      title = "Top Repositories by Score Produced";
    }

    return {
      backgroundColor: "transparent",
      title: {
        text: title,
        left: "center",
        textStyle: { color: "#fff", fontFamily: "JetBrains Mono" },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(20, 20, 20, 0.9)",
        borderColor: "#333",
        textStyle: { color: "#fff" },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%", // Increased bottom margin for dataZoom
        containLabel: true,
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          start: 0,
          end: 20, // Show top 20% by default to avoid overcrowding
          height: 20,
          bottom: 10,
          borderColor: "rgba(255,255,255,0.1)",
          fillerColor: "rgba(88, 166, 255, 0.2)",
          handleStyle: {
            color: "#ffffff",
          },
          textStyle: {
            color: textColor,
          },
        },
        {
          type: "inside",
          start: 0,
          end: 20,
        },
      ],
      xAxis: {
        type: "category",
        data: xAxisData,
        axisLabel: {
          color: textColor,
          fontFamily: "JetBrains Mono",
          interval: 0, // Show all labels (zoom handles density)
          rotate: 45,
          formatter: truncateLabel, // Truncate long labels
        },
        axisLine: { lineStyle: { color: axisLineColor } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: textColor, fontFamily: "JetBrains Mono" },
        splitLine: { lineStyle: { color: axisLineColor } },
      },
      series: [
        {
          data: seriesData,
          type: "bar",
          itemStyle: {
            color: color,
            borderRadius: [4, 4, 0, 0],
          },
          showBackground: true,
          backgroundStyle: {
            color: "rgba(255, 255, 255, 0.05)",
            borderRadius: [4, 4, 0, 0],
          },
          large: true, // Optimize for large datasets
        },
      ],
    };
  };

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Reset page when tab or search changes
  React.useEffect(() => {
    setPage(0);
  }, [activeTab, searchQuery]);

  // Scroll to top when rows per page changes
  React.useEffect(() => {
    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [rowsPerPage]);

  if (isLoadingPRs || isLoadingRepos || isLoadingMinerStats) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={40} sx={{ color: "primary.main" }} />
      </Box>
    );
  }

  return (
    <Card
      ref={cardRef}
      sx={{
        borderRadius: 3,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "transparent",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        // Remove fixed height to allow natural growth
      }}
      elevation={0}
    >
      <Box sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            px: 2,
            minHeight: "48px",
            "& .MuiTab-root": {
              color: "rgba(255, 255, 255, 0.6)",
              fontFamily: '"JetBrains Mono", monospace',
              textTransform: "none",
              fontSize: "1rem",
              minHeight: "48px",
              fontWeight: 500,
              "&.Mui-selected": {
                color: "primary.main",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "primary.main",
            },
          }}
        >
          <Tab label="Top Miners" />
          <Tab label="Top PRs" />
          <Tab label="Top Repos" />
        </Tabs>
      </Box>

      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {activeTab === 0 && (
          <Typography variant="body2" color="text.secondary">
            Leading contributors ranked by current score across all
            repositories.
          </Typography>
        )}
        {activeTab === 1 && (
          <Typography variant="body2" color="text.secondary">
            Highest scoring individual pull requests across all repositories.
          </Typography>
        )}
        {activeTab === 2 && (
          <Typography variant="body2" color="text.secondary">
            Repositories generating the most score from contributor activity.
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Tooltip title={showChart ? "Hide Chart" : "Show Chart"}>
            <IconButton
              onClick={() => setShowChart(!showChart)}
              size="small"
              sx={{
                color: showChart ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 2,
                padding: "6px",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                },
              }}
            >
              {showChart ? (
                <TableChartIcon fontSize="small" />
              ) : (
                <BarChartIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <FormControl size="small">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)", fontFamily: '"JetBrains Mono", monospace', fontSize: "0.8rem" }}>
                Rows:
              </Typography>
              <Select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(e.target.value as number);
                  setPage(0);
                }}
                sx={{
                  color: "#ffffff",
                  fontFamily: '"JetBrains Mono", monospace',
                  backgroundColor: "rgba(0, 0, 0, 0.4)",
                  fontSize: "0.8rem",
                  height: "36px",
                  borderRadius: 2,
                  minWidth: "80px",
                  "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                  "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                  "&.Mui-focused fieldset": { borderColor: "primary.main" },
                  "& .MuiSelect-select": {
                    py: 0.75,
                  },
                }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={-1}>All</MenuItem>
              </Select>
            </Box>
          </FormControl>

          <TextField
            placeholder="Search..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "1rem" }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              width: "200px",
              "& .MuiOutlinedInput-root": {
                color: "#ffffff",
                fontFamily: '"JetBrains Mono", monospace',
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                fontSize: "0.8rem",
                height: "36px",
                borderRadius: 2,
                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                "&.Mui-focused fieldset": { borderColor: "primary.main" },
              },
            }}
          />
        </Box>
      </Box>

      <Collapse in={showChart}>
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            height: "400px",
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
        >
          {showChart &&
            Array.isArray(currentData) &&
            currentData.length > 0 && (
              <ReactECharts
                option={getChartOption()}
                style={{ height: "100%", width: "100%" }}
              />
            )}
        </Box>
      </Collapse>

      <TableContainer
        sx={{
          // Removed fixed height to allow natural expansion
          overflow: "visible",
        }}
      >
        <Table
          stickyHeader
          sx={{ tableLayout: "fixed", width: "100%", minWidth: "1000px" }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellStyle, width: "80px" }}>
                Rank
              </TableCell>

              {activeTab === 1 ? (
                // Top PRs Columns
                <>
                  <TableCell sx={{ ...headerCellStyle, width: "40%" }}>
                    Pull Request
                  </TableCell>
                  <TableCell sx={{ ...headerCellStyle, width: "20%" }}>
                    Author
                  </TableCell>
                  <TableCell sx={{ ...headerCellStyle, width: "20%" }}>
                    Repository
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      ...headerCellStyle,
                      color: "secondary.main",
                      width: "15%",
                    }}
                  >
                    Base Score
                  </TableCell>
                </>
              ) : activeTab === 2 ? (
                // Top Repos Columns
                <>
                  <TableCell sx={{ ...headerCellStyle, width: "40%" }}>
                    Repository
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      ...headerCellStyle,
                      color: "secondary.main",
                      width: "20%",
                    }}
                  >
                    Total Base Score
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...headerCellStyle, width: "20%" }}
                  >
                    PRs
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...headerCellStyle, width: "15%" }}
                  >
                    Contributors
                  </TableCell>
                </>
              ) : (
                // Miner Columns (Top Miners)
                <>
                  <TableCell
                    sx={{
                      ...headerCellStyle,
                      width: activeTab === 0 ? "30%" : "40%",
                    }}
                  >
                    Miner
                  </TableCell>
                  {/* Top Miners - show both Score and Base Score */}
                  {
                    <>
                      <TableCell
                        align="right"
                        sx={{
                          ...headerCellStyle,
                          color: "secondary.main",
                          width: "12%",
                        }}
                      >
                        Score
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          ...headerCellStyle,
                          width: "12%",
                        }}
                      >
                        Base Score
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ ...headerCellStyle, width: "10%" }}
                      >
                        PRs
                      </TableCell>
                    </>
                  }
                  {activeTab === 0 ? (
                    // Top Miners gets separate Added/Deleted columns plus total
                    <>
                      <TableCell
                        align="right"
                        sx={{ ...headerCellStyle, width: "11%" }}
                      >
                        Lines Added
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ ...headerCellStyle, width: "11%" }}
                      >
                        Lines Deleted
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ ...headerCellStyle, width: "11%" }}
                      >
                        Lines Changed
                      </TableCell>
                    </>
                  ) : null}
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(currentData) &&
              (rowsPerPage > 0
                ? currentData.slice(
                  page * rowsPerPage,
                  page * rowsPerPage + rowsPerPage,
                )
                : currentData
              ).map((item: any) => (
                <TableRow
                  key={
                    activeTab === 1
                      ? `${item?.repository}-${item?.pullRequestNumber}`
                      : activeTab === 2
                        ? item?.repository
                        : item?.githubId
                  }
                  hover
                  onClick={() =>
                    activeTab !== 1 &&
                    activeTab !== 2 &&
                    onSelectMiner(item?.githubId || item?.author)
                  }
                  sx={{
                    cursor:
                      activeTab !== 1 && activeTab !== 2
                        ? "pointer"
                        : "default",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    },
                    transition: "background-color 0.2s",
                  }}
                >
                  <TableCell sx={{ ...bodyCellStyle, width: "80px" }}>
                    {getRankIcon(item?.rank || 0)}
                  </TableCell>

                  {activeTab === 1 ? (
                    // Top PRs Rows
                    <>
                      <TableCell sx={{ ...bodyCellStyle, width: "40%" }}>
                        <a
                          href={`https://github.com/${item?.repository}/pull/${item?.pullRequestNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#ffffff",
                            textDecoration: "none",
                            fontWeight: 500,
                          }}
                        >
                          {item?.pullRequestTitle || ""}
                        </a>
                      </TableCell>
                      <TableCell sx={{ ...bodyCellStyle, width: "20%" }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Avatar
                            src={`https://avatars.githubusercontent.com/${item?.author}`}
                            sx={{ width: 20, height: 20 }}
                          />
                          {item?.author || ""}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ ...bodyCellStyle, width: "20%" }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Avatar
                            src={`https://avatars.githubusercontent.com/${(item?.repository || "").split('/')[0]}`}
                            alt={(item?.repository || "").split('/')[0]}
                            sx={{
                              width: 20,
                              height: 20,
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              backgroundColor: (item?.repository || "").split('/')[0] === 'opentensor' ? '#ffffff' : (item?.repository || "").split('/')[0] === 'bitcoin' ? '#F7931A' : 'transparent',
                            }}
                          />
                          {item?.repository || ""}
                        </Box>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ ...bodyCellStyle, width: "15%" }}
                      >
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {parseFloat(item?.baseScore || "0").toFixed(4)}
                        </Typography>
                      </TableCell>
                    </>
                  ) : activeTab === 2 ? (
                    // Top Repos Rows
                    <>
                      <TableCell sx={{ ...bodyCellStyle, width: "40%" }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Avatar
                            src={`https://avatars.githubusercontent.com/${(item?.repository || "").split('/')[0]}`}
                            alt={(item?.repository || "").split('/')[0]}
                            sx={{
                              width: 20,
                              height: 20,
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              backgroundColor: (item?.repository || "").split('/')[0] === 'opentensor' ? '#ffffff' : (item?.repository || "").split('/')[0] === 'bitcoin' ? '#F7931A' : 'transparent',
                            }}
                          />
                          <a
                            href={`https://github.com/${item?.repository}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#ffffff",
                              textDecoration: "none",
                              fontWeight: 500,
                            }}
                          >
                            {item?.repository || ""}
                          </a>
                        </Box>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ ...bodyCellStyle, width: "20%" }}
                      >
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {Number(item?.totalScore || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ ...bodyCellStyle, width: "20%" }}
                      >
                        {item?.totalPRs || 0}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ ...bodyCellStyle, width: "15%" }}
                      >
                        {item?.uniqueMiners?.size || 0}
                      </TableCell>
                    </>
                  ) : (
                    // Miner Rows
                    <>
                      <TableCell
                        sx={{
                          ...bodyCellStyle,
                          width: activeTab === 0 ? "30%" : "40%",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Avatar
                            src={`https://avatars.githubusercontent.com/${item?.author || item?.githubId}`}
                            alt={item?.author || item?.githubId}
                            sx={{
                              width: 24,
                              height: 24,
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                            }}
                          />
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: "#ffffff",
                                fontSize: "0.85rem",
                                fontFamily: '"JetBrains Mono", monospace',
                              }}
                            >
                              {item?.author || item?.githubId || ""}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: "rgba(255, 255, 255, 0.4)",
                                fontSize: "0.7rem",
                                fontFamily: '"JetBrains Mono", monospace',
                              }}
                            >
                              {(item?.hotkey || "").substring(0, 8)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      {/* Top Miners - show both Score and Base Score */}
                      {
                        <>
                          <TableCell
                            align="right"
                            sx={{ ...bodyCellStyle, width: "12%" }}
                          >
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              {Number(item?.totalScore || 0).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ ...bodyCellStyle, width: "12%" }}
                          >
                            <Typography
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "rgba(255, 255, 255, 0.7)",
                              }}
                            >
                              {Number(item?.baseTotalScore || 0).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ ...bodyCellStyle, width: "10%" }}
                          >
                            {item?.totalPRs || 0}
                          </TableCell>
                        </>
                      }
                      {activeTab === 0 ? (
                        // Top Miners gets separate Added/Deleted cells plus total
                        <>
                          <TableCell
                            align="right"
                            sx={{ ...bodyCellStyle, width: "11%" }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#7ee787",
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "0.85rem",
                              }}
                            >
                              +{(item?.linesAdded || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ ...bodyCellStyle, width: "11%" }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#ff7b72",
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "0.85rem",
                              }}
                            >
                              -{(item?.linesDeleted || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ ...bodyCellStyle, width: "11%" }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: "0.85rem",
                              }}
                            >
                              {(item?.linesChanged || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                        </>
                      ) : null}
                    </>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[]}
        component="div"
        count={currentData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        showFirstButton
        showLastButton
        sx={{
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          color: "rgba(255, 255, 255, 0.7)",
          ".MuiTablePagination-displayedRows": {
            fontFamily: '"JetBrains Mono", monospace',
          },
        }}
      />
    </Card>
  );
};

// Helper styles and functions
const headerCellStyle = {
  backgroundColor: "rgba(18, 18, 20, 0.95)",
  backdropFilter: "blur(8px)",
  color: "#ffffff",
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: "0.75rem",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  height: "56px", // Fixed height for uniformity across all tabs
  py: 1.5,
  boxSizing: "border-box" as const,
};

const bodyCellStyle = {
  color: "#ffffff",
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  fontSize: "0.85rem",
  py: 1,
  height: "60px", // Enforce consistent row height
  boxSizing: "border-box" as const,
};

const getRankIcon = (rank: number) => {
  if (rank === 1) return <EmojiEventsIcon sx={{ color: "#FFD700" }} />;
  if (rank === 2) return <EmojiEventsIcon sx={{ color: "#C0C0C0" }} />;
  if (rank === 3) return <EmojiEventsIcon sx={{ color: "#CD7F32" }} />;
  return `#${rank}`;
};

export default MinerLeaderboard;
