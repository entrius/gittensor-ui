import React, { useState, useMemo, useRef, useEffect } from "react";
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
  Tooltip,
  IconButton,
  Collapse,
  TablePagination,
  Select,
  MenuItem,
  FormControl,
  Button,
  Stack,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import BarChartIcon from "@mui/icons-material/BarChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import ReactECharts from "echarts-for-react";
import { CommitLog } from "../../api/models/Dashboard";
import { formatUsdEstimate } from "../../utils";
import theme from "../../theme";

interface TopPRsTableProps {
  prs: CommitLog[];
  isLoading?: boolean;
  onSelectPR: (repository: string, pullRequestNumber: number) => void;
  onSelectMiner: (githubId: string) => void;
  onSelectRepository: (repositoryFullName: string) => void;
}

// Utility function to truncate text
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

const TopPRsTable: React.FC<TopPRsTableProps> = ({
  prs,
  isLoading,
  onSelectPR,
  onSelectMiner,
  onSelectRepository,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tierFilter, setTierFilter] = useState<
    "all" | "Gold" | "Silver" | "Bronze"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "open" | "closed" | "merged"
  >("all");
  const [useLogScale, setUseLogScale] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const rankedPRs = useMemo(() => {
    return prs.map((pr, index) => ({ ...pr, rank: index + 1 }));
  }, [prs]);

  const filteredPRs = useMemo(() => {
    let filtered = rankedPRs;

    // Apply tier filter
    if (tierFilter !== "all") {
      filtered = filtered.filter((pr) => pr.tier === tierFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      if (statusFilter === "merged") {
        filtered = filtered.filter(
          (pr) => pr.prState === "MERGED" || !!pr.mergedAt,
        );
      } else if (statusFilter === "open") {
        filtered = filtered.filter(
          (pr) => pr.prState === "OPEN" || (!pr.prState && !pr.mergedAt),
        );
      } else if (statusFilter === "closed") {
        filtered = filtered.filter(
          (pr) => pr.prState === "CLOSED" && !pr.mergedAt,
        );
      }
    }

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (pr) =>
          pr.pullRequestTitle?.toLowerCase().includes(lowerQuery) ||
          pr.author?.toLowerCase().includes(lowerQuery) ||
          pr.repository?.toLowerCase().includes(lowerQuery),
      );
    }

    return filtered;
  }, [rankedPRs, searchQuery, tierFilter, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: rankedPRs.length,
      open: rankedPRs.filter(
        (pr) => pr.prState === "OPEN" || (!pr.prState && !pr.mergedAt),
      ).length,
      merged: rankedPRs.filter((pr) => pr.prState === "MERGED" || !!pr.mergedAt)
        .length,
      closed: rankedPRs.filter((pr) => pr.prState === "CLOSED" && !pr.mergedAt)
        .length,
    };
  }, [rankedPRs]);

  const tierCounts = useMemo(() => {
    return {
      all: rankedPRs.length,
      gold: rankedPRs.filter((pr) => pr.tier === "Gold").length,
      silver: rankedPRs.filter((pr) => pr.tier === "Silver").length,
      bronze: rankedPRs.filter((pr) => pr.tier === "Bronze").length,
    };
  }, [rankedPRs]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Gold":
        return theme.palette.tier.gold;
      case "Silver":
        return theme.palette.tier.silver;
      case "Bronze":
        return theme.palette.tier.bronze;
      default:
        return theme.palette.status.neutral;
    }
  };

  const TierFilterButton = ({
    label,
    value,
    count,
    color,
  }: {
    label: string;
    value: typeof tierFilter;
    count: number;
    color: string;
  }) => (
    <Button
      size="small"
      onClick={() => {
        setTierFilter(value);
        setPage(0);
      }}
      sx={{
        color: tierFilter === value ? "#fff" : "rgba(255,255,255,0.5)",
        backgroundColor:
          tierFilter === value ? "rgba(255,255,255,0.1)" : "transparent",
        borderRadius: "6px",
        px: 2,
        minWidth: "auto",
        textTransform: "none",
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: "0.8rem",
        border:
          tierFilter === value ? `1px solid ${color}` : "1px solid transparent",
        "&:hover": {
          backgroundColor: "rgba(255,255,255,0.15)",
        },
      }}
    >
      {label}{" "}
      <span style={{ opacity: 0.6, marginLeft: "6px", fontSize: "0.75rem" }}>
        {count}
      </span>
    </Button>
  );

  const FilterButton = ({
    label,
    value,
    count,
    color,
  }: {
    label: string;
    value: typeof statusFilter;
    count?: number;
    color: string;
  }) => (
    <Button
      size="small"
      onClick={() => setStatusFilter(value)}
      sx={{
        color: statusFilter === value ? "#fff" : "rgba(255,255,255,0.5)",
        backgroundColor:
          statusFilter === value ? "rgba(255,255,255,0.1)" : "transparent",
        borderRadius: "6px",
        px: 2,
        minWidth: "auto",
        textTransform: "none",
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: "0.8rem",
        border:
          statusFilter === value
            ? `1px solid ${color}`
            : "1px solid transparent",
        "&:hover": {
          backgroundColor: "rgba(255,255,255,0.15)",
        },
      }}
    >
      {label}{" "}
      {count !== undefined && (
        <span style={{ opacity: 0.6, marginLeft: "6px", fontSize: "0.75rem" }}>
          {count}
        </span>
      )}
    </Button>
  );

  const getChartOption = () => {
    const chartData = filteredPRs.slice(0, 50);
    const textColor = "rgba(255, 255, 255, 0.85)";
    const gridColor = "rgba(255, 255, 255, 0.08)";

    const getTierColor = (tier: string) => {
      switch (tier) {
        case "Gold":
          return theme.palette.tier.gold;
        case "Silver":
          return theme.palette.tier.silver;
        case "Bronze":
          return theme.palette.tier.bronze;
        default:
          return theme.palette.status.neutral;
      }
    };

    const xAxisData = chartData.map(
      (item) => `#${item?.pullRequestNumber || ""}`,
    );

    const stemData = chartData.map((item) => ({
      value: Number(parseFloat(item?.score || "0")),
      tier: item?.tier || "N/A",
      title: item?.pullRequestTitle || "",
      author: item?.author || "",
      repository: item?.repository || "",
      prNumber: item?.pullRequestNumber || 0,
      rank: item?.rank || 0,
    }));

    const dotData = stemData.map((item) => ({
      value: item.value,
      tier: item.tier,
      title: item.title,
      author: item.author,
      repository: item.repository,
      prNumber: item.prNumber,
      rank: item.rank,
      itemStyle: {
        color: getTierColor(item.tier),
        shadowBlur: 10,
        shadowColor: getTierColor(item.tier),
      },
    }));

    return {
      backgroundColor: "transparent",
      title: {
        text: "Pull Request Performance Ranking",
        subtext: "Individual PR scores with tier classification",
        left: "center",
        top: 20,
        textStyle: {
          color: "#ffffff",
          fontFamily: "JetBrains Mono",
          fontSize: 18,
          fontWeight: 600,
        },
        subtextStyle: {
          color: "rgba(255, 255, 255, 0.6)",
          fontFamily: "JetBrains Mono",
          fontSize: 11,
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: "rgba(255, 255, 255, 0.05)",
          },
        },
        backgroundColor: "rgba(10, 10, 12, 0.98)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        textStyle: {
          color: "#fff",
          fontFamily: "JetBrains Mono",
          fontSize: 12,
        },
        padding: [14, 18],
        formatter: (params: any) => {
          const data = params[0]?.data || params[1]?.data;
          if (!data) return "";
          const tierColor = getTierColor(data.tier);

          return `
            <div style="font-family: 'JetBrains Mono', monospace;">
              <div style="font-weight: 700; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 8px;">
                PR #${data.prNumber}
              </div>
              <div style="margin-bottom: 10px; color: rgba(255,255,255,0.85); font-size: 11px; max-width: 300px; white-space: normal; word-break: break-word; line-height: 1.4;">
                ${data.title}
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${tierColor};"></div>
                <span style="color: ${tierColor}; font-weight: 600; font-size: 13px;">${data.tier} Tier</span>
              </div>
              <div style="display: grid; gap: 6px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Rank:</span>
                  <span style="color: #fff; font-weight: 600;">#${data.rank}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Score:</span>
                  <span style="color: #fff; font-weight: 600;">${data.value.toFixed(4)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Author:</span>
                  <span style="color: #fff; font-weight: 600;">${data.author}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                  <span style="color: rgba(255,255,255,0.65);">Repository:</span>
                  <span style="color: #fff; font-weight: 600;">${data.repository.split("/")[1] || data.repository}</span>
                </div>
              </div>
            </div>
          `;
        },
      },
      grid: {
        left: "3%",
        right: "3%",
        bottom: "18%",
        top: "18%",
        containLabel: true,
      },
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
      ],
      xAxis: {
        type: "category",
        data: xAxisData,
        axisLabel: {
          color: textColor,
          fontFamily: "JetBrains Mono",
          fontSize: 11,
          interval: 0,
          rotate: 45,
          margin: 12,
        },
        axisLine: {
          lineStyle: {
            color: gridColor,
            width: 1,
          },
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: {
        type: useLogScale ? "log" : "value",
        min: useLogScale ? 1 : 0,
        logBase: 10,
        name: "PR Score",
        nameTextStyle: {
          color: textColor,
          fontFamily: "JetBrains Mono",
          fontSize: 12,
        },
        axisLabel: {
          color: textColor,
          fontFamily: "JetBrains Mono",
          fontSize: 11,
          formatter: (value: number) => {
            // For small values in log scale, format appropriately
            if (value < 0.01) return value.toExponential(1);
            return value.toFixed(2);
          },
        },
        splitLine: {
          lineStyle: {
            color: gridColor,
            type: "dashed",
            opacity: 0.5,
          },
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
      },
      series: [
        {
          name: "Stems",
          type: "bar",
          data: dotData.map((item) => ({
            ...item,
            itemStyle: {
              color: getTierColor(item.tier),
              opacity: 0.4,
              borderRadius: [2, 2, 0, 0],
            },
          })),
          barWidth: 2,
          z: 1,
          animationDuration: 1000,
          animationEasing: "cubicOut",
          animationDelay: (idx: number) => idx * 30,
        },
        {
          name: "Dots",
          type: "scatter",
          data: dotData,
          symbolSize: 14,
          z: 2,
          emphasis: {
            scale: 1.5,
            itemStyle: {
              shadowBlur: 20,
              borderColor: "#fff",
              borderWidth: 2,
            },
          },
          animationDuration: 1000,
          animationEasing: "cubicOut",
          animationDelay: (idx: number) => idx * 30 + 100,
        },
      ],
    };
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [rowsPerPage]);

  if (isLoading) {
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
      }}
      elevation={0}
    >
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
        <Typography
          variant="h6"
          sx={{
            color: "#ffffff",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "1.1rem",
            fontWeight: 500,
          }}
        >
          Top Pull Requests{" "}
          <span style={{ opacity: 0.5, fontSize: "0.9rem" }}>
            ({filteredPRs.length})
          </span>
        </Typography>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Tooltip title={showFilters ? "Hide Filters" : "Show Filters"}>
            <IconButton
              onClick={() => setShowFilters(!showFilters)}
              size="small"
              sx={{
                color: showFilters ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 2,
                padding: "6px",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                },
              }}
            >
              <FilterListIcon fontSize="small" />
            </IconButton>
          </Tooltip>

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

          {showChart && (
            <FormControlLabel
              control={
                <Switch
                  checked={useLogScale}
                  onChange={(e) => setUseLogScale(e.target.checked)}
                  size="small"
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: "#primary.main",
                    },
                    "& .MuiSwitch-track": {
                      backgroundColor: "rgba(255, 255, 255, 0.3)",
                    },
                  }}
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "JetBrains Mono",
                    fontSize: "0.8rem",
                    color: "rgba(255, 255, 255, 0.7)",
                  }}
                >
                  Log Scale
                </Typography>
              }
            />
          )}

          <FormControl size="small">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.8rem",
                }}
              >
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
                  "&:hover fieldset": {
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  },
                  "&.Mui-focused fieldset": { borderColor: "primary.main" },
                  "& .MuiSelect-select": { py: 0.75 },
                }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
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

      <Collapse in={showFilters}>
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.5)",
                display: "block",
                mb: 1,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              TIER
            </Typography>
            <Stack direction="row" spacing={1}>
              <TierFilterButton
                label="All"
                value="all"
                count={tierCounts.all}
                color={theme.palette.status.neutral}
              />
              <TierFilterButton
                label="Gold"
                value="Gold"
                count={tierCounts.gold}
                color={theme.palette.tier.gold}
              />
              <TierFilterButton
                label="Silver"
                value="Silver"
                count={tierCounts.silver}
                color={theme.palette.tier.silver}
              />
              <TierFilterButton
                label="Bronze"
                value="Bronze"
                count={tierCounts.bronze}
                color={theme.palette.tier.bronze}
              />
            </Stack>
          </Box>

          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.5)",
                display: "block",
                mb: 1,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              STATUS
            </Typography>
            <Stack direction="row" spacing={1}>
              <FilterButton
                label="All"
                value="all"
                count={statusCounts.all}
                color={theme.palette.status.neutral}
              />
              <FilterButton
                label="Open"
                value="open"
                count={statusCounts.open}
                color={theme.palette.status.open}
              />
              <FilterButton
                label="Merged"
                value="merged"
                count={statusCounts.merged}
                color={theme.palette.status.merged}
              />
              <FilterButton
                label="Closed"
                value="closed"
                count={statusCounts.closed}
                color={theme.palette.status.closed}
              />
            </Stack>
          </Box>
        </Box>
      </Collapse>

      <Collapse in={showChart}>
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            height: "600px",
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
        >
          {showChart && filteredPRs.length > 0 && (
            <ReactECharts
              option={getChartOption()}
              style={{ height: "100%", width: "100%" }}
            />
          )}
        </Box>
      </Collapse>

      <TableContainer
        sx={{
          overflowY: "auto",
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "4px",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            },
          },
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
              <TableCell sx={{ ...headerCellStyle, width: "40%" }}>
                Pull Request
              </TableCell>
              <TableCell sx={{ ...headerCellStyle, width: "20%" }}>
                Author
              </TableCell>
              <TableCell sx={{ ...headerCellStyle, width: "20%" }}>
                Repository
              </TableCell>
              <TableCell sx={{ ...headerCellStyle, width: "10%" }}>
                Status
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  ...headerCellStyle,
                  color: "secondary.main",
                  width: "15%",
                }}
              >
                Score
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPRs
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((pr) => {
                const isLowValue = pr.lowValuePr === true;
                const rowContent = (
                  <TableRow
                    key={`${pr.repository}-${pr.pullRequestNumber}`}
                    hover
                    onClick={() =>
                      onSelectPR(pr.repository || "", pr.pullRequestNumber)
                    }
                    sx={{
                      cursor: "pointer",
                      ...(isLowValue && {
                        backgroundColor: "rgba(250, 204, 21, 0.10)",
                        borderLeft: "3px solid rgba(250, 204, 21, 0.5)",
                      }),
                      "&:hover": {
                        backgroundColor: isLowValue
                          ? "rgba(250, 204, 21, 0.15)"
                          : "rgba(255, 255, 255, 0.05)",
                      },
                      transition: "background-color 0.2s",
                    }}
                  >
                    <TableCell sx={{ ...bodyCellStyle, width: "80px" }}>
                      {getRankIcon(pr.rank || 0)}
                    </TableCell>
                    <TableCell sx={{ ...bodyCellStyle, width: "40%" }}>
                      <Tooltip
                        title={pr.pullRequestTitle || ""}
                        placement="top"
                      >
                        <Typography
                          component="span"
                          sx={{
                            color: "#ffffff",
                            fontWeight: 500,
                            cursor: "pointer",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                            "&:hover": {
                              color: "primary.main",
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {truncateText(pr.pullRequestTitle || "", 50)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ ...bodyCellStyle, width: "20%" }}>
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMiner(pr.githubId || pr.author || "");
                        }}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          cursor: "pointer",
                          "&:hover": {
                            "& .MuiTypography-root": {
                              color: "primary.main",
                              textDecoration: "underline",
                            },
                          },
                        }}
                      >
                        <Avatar
                          src={`https://avatars.githubusercontent.com/${pr.author}`}
                          sx={{ width: 20, height: 20 }}
                        />
                        <Tooltip title={pr.author || ""} placement="top">
                          <Typography
                            component="span"
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: "0.85rem",
                              transition: "color 0.2s",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                              display: "inline-block",
                            }}
                          >
                            {truncateText(pr.author || "", 20)}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ ...bodyCellStyle, width: "20%" }}>
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRepository(pr.repository || "");
                        }}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          cursor: "pointer",
                          "&:hover": {
                            "& .MuiTypography-root": {
                              color: "primary.main",
                              textDecoration: "underline",
                            },
                          },
                        }}
                      >
                        <Avatar
                          src={`https://avatars.githubusercontent.com/${(pr.repository || "").split("/")[0]}`}
                          alt={(pr.repository || "").split("/")[0]}
                          sx={{
                            width: 20,
                            height: 20,
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            backgroundColor:
                              (pr.repository || "").split("/")[0] ===
                              "opentensor"
                                ? "#ffffff"
                                : (pr.repository || "").split("/")[0] ===
                                    "bitcoin"
                                  ? "#F7931A"
                                  : "transparent",
                          }}
                        />
                        <Tooltip title={pr.repository || ""} placement="top">
                          <Typography
                            component="span"
                            sx={{
                              color: "#ffffff",
                              fontWeight: 500,
                              transition: "color 0.2s",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                              display: "inline-block",
                            }}
                          >
                            {truncateText(pr.repository || "", 30)}
                          </Typography>
                        </Tooltip>
                        <Chip
                          variant="tier"
                          label={pr.tier || "N/A"}
                          sx={{
                            ml: 1,
                            color: getTierColor(pr.tier || ""),
                            borderColor: getTierColor(pr.tier || ""),
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ ...bodyCellStyle, width: "10%" }}>
                      {(() => {
                        const state =
                          pr.prState?.toUpperCase() ||
                          (pr.mergedAt ? "MERGED" : "OPEN");
                        let color = theme.palette.status.neutral;
                        let label = state;

                        if (state === "MERGED") {
                          color = theme.palette.status.merged;
                        } else if (state === "OPEN") {
                          color = theme.palette.status.open;
                        } else if (state === "CLOSED") {
                          color = theme.palette.status.closed;
                        }

                        return (
                          <Chip
                            variant="status"
                            label={label}
                            sx={{
                              color: color,
                              borderColor: color,
                            }}
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ ...bodyCellStyle, width: "15%" }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 0.25,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: "#ffffff",
                            lineHeight: 1.2,
                          }}
                        >
                          {parseFloat(pr.score || "0").toFixed(4)}
                        </Typography>
                        {(pr.prState === "MERGED" || pr.mergedAt) &&
                          formatUsdEstimate(pr.predictedUsdPerDay, {
                            includeApproxPrefix: true,
                          }) && (
                            <Tooltip
                              title="This is an estimation. Actual payouts depend on validator consensus, network incentive distribution, and other miners' scores."
                              arrow
                              placement="bottom"
                              slotProps={{
                                tooltip: {
                                  sx: {
                                    backgroundColor: "rgba(15, 15, 17, 0.98)",
                                    color: "rgba(255, 255, 255, 0.85)",
                                    fontSize: "0.7rem",
                                    fontFamily: '"JetBrains Mono", monospace',
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    border:
                                      "1px solid rgba(255, 255, 255, 0.08)",
                                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                                  },
                                },
                                arrow: {
                                  sx: {
                                    color: "rgba(15, 15, 17, 0.98)",
                                  },
                                },
                              }}
                            >
                              <Typography
                                component="span"
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: "0.65rem",
                                  fontWeight: 500,
                                  color: "rgba(74, 222, 128, 0.7)",
                                  cursor: "pointer",
                                  lineHeight: 1,
                                  transition: "color 0.15s ease",
                                  "&:hover": {
                                    color: "rgba(74, 222, 128, 0.95)",
                                  },
                                }}
                              >
                                {formatUsdEstimate(pr.predictedUsdPerDay, {
                                  includeApproxPrefix: true,
                                })}
                                /d
                              </Typography>
                            </Tooltip>
                          )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
                return isLowValue ? (
                  <Tooltip
                    key={`${pr.repository}-${pr.pullRequestNumber}`}
                    title="This PR is marked as low value due to minimal code changes, documentation-only updates, or other factors that reduce its scoring weight. Low value PRs do not count towards score or tier unlock requirements."
                    arrow
                    placement="top"
                    slotProps={{
                      tooltip: {
                        sx: {
                          backgroundColor: "rgba(30, 30, 30, 0.95)",
                          color: "#ffffff",
                          fontSize: "0.75rem",
                          fontFamily: '"JetBrains Mono", monospace',
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          maxWidth: 300,
                        },
                      },
                      arrow: {
                        sx: {
                          color: "rgba(30, 30, 30, 0.95)",
                        },
                      },
                    }}
                  >
                    {rowContent}
                  </Tooltip>
                ) : (
                  rowContent
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[]}
        component="div"
        count={filteredPRs.length}
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

const headerCellStyle = {
  backgroundColor: "rgba(18, 18, 20, 0.95)",
  backdropFilter: "blur(8px)",
  color: "#ffffff",
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: "0.75rem",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  height: "48px",
  py: 1,
  boxSizing: "border-box" as const,
};

const bodyCellStyle = {
  color: "#ffffff",
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  fontSize: "0.75rem",
  py: 0.75,
  height: "52px",
  boxSizing: "border-box" as const,
};

const getRankIcon = (rank: number) => {
  return (
    <Box
      sx={{
        backgroundColor: "#000000",
        borderRadius: "2px",
        width: "22px",
        height: "22px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        border: "1px solid",
        borderColor:
          rank === 1
            ? "rgba(255, 215, 0, 0.4)"
            : rank === 2
              ? "rgba(192, 192, 192, 0.4)"
              : rank === 3
                ? "rgba(205, 127, 50, 0.4)"
                : "rgba(255, 255, 255, 0.15)",
        boxShadow:
          rank === 1
            ? "0 0 12px rgba(255, 215, 0, 0.4), 0 0 4px rgba(255, 215, 0, 0.2)"
            : rank === 2
              ? "0 0 12px rgba(192, 192, 192, 0.4), 0 0 4px rgba(192, 192, 192, 0.2)"
              : rank === 3
                ? "0 0 12px rgba(205, 127, 50, 0.4), 0 0 4px rgba(205, 127, 50, 0.2)"
                : "none",
      }}
    >
      <Typography
        component="span"
        sx={{
          color:
            rank === 1
              ? "#FFD700"
              : rank === 2
                ? "#C0C0C0"
                : rank === 3
                  ? "#CD7F32"
                  : "rgba(255, 255, 255, 0.6)",
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: "0.65rem",
          fontWeight: 600,
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {rank}
      </Typography>
    </Box>
  );
};

export default TopPRsTable;
