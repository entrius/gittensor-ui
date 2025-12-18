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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BarChartIcon from "@mui/icons-material/BarChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import ReactECharts from "echarts-for-react";

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
}

interface TopMinersTableProps {
  miners: MinerStats[];
  isLoading?: boolean;
  onSelectMiner: (githubId: string) => void;
}

const TopMinersTable: React.FC<TopMinersTableProps> = ({
  miners,
  isLoading,
  onSelectMiner,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showChart, setShowChart] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const cardRef = useRef<HTMLDivElement>(null);

  // 1. Assign ranks to all miners based on the incoming order (assumed to be sorted by score from parent)
  const rankedMiners = useMemo(() => {
    return miners.map((miner, index) => ({ ...miner, rank: index + 1 }));
  }, [miners]);

  // 2. Filter based on search query
  const filteredMiners = useMemo(() => {
    if (!searchQuery) return rankedMiners;
    const lowerQuery = searchQuery.toLowerCase();
    return rankedMiners.filter(
      (miner) =>
        miner.githubId?.toLowerCase().includes(lowerQuery) ||
        miner.author?.toLowerCase().includes(lowerQuery) ||
        miner.hotkey?.toLowerCase().includes(lowerQuery),
    );
  }, [rankedMiners, searchQuery]);

  // 3. Explicitly sort by totalScore to guarantee order before pagination
  // We use totalScore as the source of truth, as rank is a derived property
  const displayMiners = useMemo(() => {
    // Create a strict copy to avoid any mutation issues
    return [...filteredMiners].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  }, [filteredMiners]);

  const getChartOption = () => {
    // Clone to ensure chart doesn't mutate source data
    const chartData = [...displayMiners];
    const textColor = "rgba(255, 255, 255, 0.7)";
    const axisLineColor = "rgba(255, 255, 255, 0.1)";

    const xAxisData = chartData.map(
      (item) => item?.author || item?.githubId || "",
    );
    const seriesData = chartData.map((item) => Number(item?.totalScore) || 0);

    return {
      backgroundColor: "transparent",
      title: {
        text: "Top Miners by Total Score",
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
          formatter: (label: string) =>
            label.length > 15 ? label.substring(0, 12) + "..." : label,
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
        <Typography variant="body2" color="text.secondary">
          Leading contributors ranked by current score across all repositories.
        </Typography>

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
          {showChart && filteredMiners.length > 0 && (
            <ReactECharts
              option={getChartOption()}
              style={{ height: "100%", width: "100%" }}
            />
          )}
        </Box>
      </Collapse>

      <TableContainer
        sx={{
          maxHeight: "600px",
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
              <TableCell sx={{ ...headerCellStyle, width: "30%" }}>
                Miner
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
              <TableCell
                align="right"
                sx={{ ...headerCellStyle, width: "10%" }}
              >
                PRs
              </TableCell>
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
            </TableRow>
          </TableHead>
          <TableBody key={page}>
            {displayMiners
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((miner) => (
                <TableRow
                  key={`${miner.githubId}-${miner.hotkey}`}
                  hover
                  onClick={() =>
                    onSelectMiner(miner.githubId || miner.author || "")
                  }
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    },
                    transition: "background-color 0.2s",
                  }}
                >
                  <TableCell sx={{ ...bodyCellStyle, width: "80px" }}>
                    {getRankIcon(miner.rank || 0)}
                  </TableCell>
                  <TableCell sx={{ ...bodyCellStyle, width: "30%" }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${miner.author || miner.githubId}`}
                        alt={miner.author || miner.githubId}
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
                            transition: "color 0.2s",
                            "&:hover": {
                              color: "primary.main",
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {miner.author || miner.githubId || ""}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(255, 255, 255, 0.4)",
                            fontSize: "0.7rem",
                            fontFamily: '"JetBrains Mono", monospace',
                          }}
                        >
                          {(miner.hotkey || "").substring(0, 8)}...
                        </Typography>
                      </Box>
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
                      {Number(miner.totalScore || 0).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...bodyCellStyle, width: "10%" }}
                  >
                    {miner.totalPRs || 0}
                  </TableCell>
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
                      +{(miner.linesAdded || 0).toLocaleString()}
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
                      -{(miner.linesDeleted || 0).toLocaleString()}
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
                      {(miner.linesChanged || 0).toLocaleString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={filteredMiners.length}
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
  height: "56px",
  py: 1.5,
  boxSizing: "border-box" as const,
};

const bodyCellStyle = {
  color: "#ffffff",
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  fontSize: "0.85rem",
  py: 1,
  height: "60px",
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

export default TopMinersTable;
