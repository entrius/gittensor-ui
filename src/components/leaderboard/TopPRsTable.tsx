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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BarChartIcon from "@mui/icons-material/BarChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import ReactECharts from "echarts-for-react";
import { CommitLog } from "../../api/models/Dashboard";

interface TopPRsTableProps {
  prs: CommitLog[];
  isLoading?: boolean;
  onSelectPR: (repository: string, pullRequestNumber: number) => void;
  onSelectMiner: (githubId: string) => void;
  onSelectRepository: (repositoryFullName: string) => void;
}

const TopPRsTable: React.FC<TopPRsTableProps> = ({
  prs,
  isLoading,
  onSelectPR,
  onSelectMiner,
  onSelectRepository,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showChart, setShowChart] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tierFilter, setTierFilter] = useState<"all" | "Gold" | "Silver" | "Bronze">("all");
  const cardRef = useRef<HTMLDivElement>(null);

  const rankedPRs = useMemo(() => {
    return prs.map((pr, index) => ({ ...pr, rank: index + 1 }));
  }, [prs]);

  const filteredPRs = useMemo(() => {
    let filtered = rankedPRs;

    // Apply tier filter
    if (tierFilter !== "all") {
      filtered = filtered.filter(pr => pr.tier === tierFilter);
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
  }, [rankedPRs, searchQuery, tierFilter]);

  const tierCounts = useMemo(() => {
    return {
      all: rankedPRs.length,
      gold: rankedPRs.filter(pr => pr.tier === "Gold").length,
      silver: rankedPRs.filter(pr => pr.tier === "Silver").length,
      bronze: rankedPRs.filter(pr => pr.tier === "Bronze").length,
    };
  }, [rankedPRs]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Gold":
        return "#FFD700";
      case "Silver":
        return "#C0C0C0";
      case "Bronze":
        return "#CD7F32";
      default:
        return "#8b949e";
    }
  };

  const TierFilterButton = ({ label, value, count, color }: { label: string, value: typeof tierFilter, count: number, color: string }) => (
    <Button
      size="small"
      onClick={() => { setTierFilter(value); setPage(0); }}
      sx={{
        color: tierFilter === value ? "#fff" : "rgba(255,255,255,0.5)",
        backgroundColor: tierFilter === value ? "rgba(255,255,255,0.1)" : "transparent",
        borderRadius: "6px",
        px: 2,
        minWidth: "auto",
        textTransform: "none",
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: "0.8rem",
        border: tierFilter === value ? `1px solid ${color}` : "1px solid transparent",
        "&:hover": {
          backgroundColor: "rgba(255,255,255,0.15)",
        }
      }}
    >
      {label} <span style={{ opacity: 0.6, marginLeft: '6px', fontSize: '0.75rem' }}>{count}</span>
    </Button>
  );

  const getChartOption = () => {
    const chartData = filteredPRs;
    const textColor = "rgba(255, 255, 255, 0.7)";
    const axisLineColor = "rgba(255, 255, 255, 0.1)";

    const xAxisData = chartData.map((item) => `#${item?.pullRequestNumber || ""}`);
    const seriesData = chartData.map((item) => Number(parseFloat(item?.score || "0")));

    return {
      backgroundColor: "transparent",
      title: {
        text: "Top Pull Requests by Score",
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
        bottom: "15%",
        containLabel: true,
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          start: 0,
          end: 20,
          height: 20,
          bottom: 10,
          borderColor: "rgba(255,255,255,0.1)",
          fillerColor: "rgba(88, 166, 255, 0.2)",
          handleStyle: { color: "#ffffff" },
          textStyle: { color: textColor },
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
          interval: 0,
          rotate: 45,
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
            color: "rgba(255, 255, 255, 0.7)",
            borderRadius: [4, 4, 0, 0],
          },
          showBackground: true,
          backgroundStyle: {
            color: "rgba(255, 255, 255, 0.05)",
            borderRadius: [4, 4, 0, 0],
          },
          large: true,
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
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary">
            Highest scoring individual pull requests across all repositories.
          </Typography>
          <Stack direction="row" spacing={1}>
            <TierFilterButton label="All" value="all" count={tierCounts.all} color="#8b949e" />
            <TierFilterButton label="Gold" value="Gold" count={tierCounts.gold} color="#FFD700" />
            <TierFilterButton label="Silver" value="Silver" count={tierCounts.silver} color="#C0C0C0" />
            <TierFilterButton label="Bronze" value="Bronze" count={tierCounts.bronze} color="#CD7F32" />
          </Stack>
        </Box>

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

      <Collapse in={showChart}>
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            height: "400px",
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
              .map((pr) => (
                <TableRow
                  key={`${pr.repository}-${pr.pullRequestNumber}`}
                  hover
                  onClick={() => onSelectPR(pr.repository || "", pr.pullRequestNumber)}
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    },
                    transition: "background-color 0.2s",
                  }}
                >
                  <TableCell sx={{ ...bodyCellStyle, width: "80px" }}>
                    {getRankIcon(pr.rank || 0)}
                  </TableCell>
                  <TableCell sx={{ ...bodyCellStyle, width: "40%" }}>
                    <Typography
                      component="span"
                      sx={{
                        color: "#ffffff",
                        fontWeight: 500,
                        cursor: "pointer",
                        "&:hover": {
                          color: "primary.main",
                          textDecoration: "underline",
                        },
                      }}
                    >
                      {pr.pullRequestTitle || ""}
                    </Typography>
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
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: "0.85rem",
                          transition: "color 0.2s",
                        }}
                      >
                        {pr.author || ""}
                      </Typography>
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
                            (pr.repository || "").split("/")[0] === "opentensor"
                              ? "#ffffff"
                              : (pr.repository || "").split("/")[0] === "bitcoin"
                                ? "#F7931A"
                                : "transparent",
                        }}
                      />
                      <Typography
                        component="span"
                        sx={{
                          color: "#ffffff",
                          fontWeight: 500,
                          transition: "color 0.2s",
                        }}
                      >
                        {pr.repository || ""}
                      </Typography>
                      <Chip
                        label={pr.tier || "N/A"}
                        size="small"
                        sx={{
                          ml: 1,
                          height: "20px",
                          fontSize: "0.65rem",
                          fontFamily: '"JetBrains Mono", monospace',
                          backgroundColor: "transparent",
                          border: `1px solid ${getTierColor(pr.tier)}`,
                          color: getTierColor(pr.tier),
                          fontWeight: 600,
                          borderRadius: "4px",
                          "& .MuiChip-label": {
                            px: 1,
                          },
                        }}
                      />
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
                      {parseFloat(pr.score || "0").toFixed(4)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
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
    </Card >
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
