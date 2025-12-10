import React, { useState, useMemo } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Chip,
  Typography,
  CircularProgress,
  Link,
  Grid,
  Card,
  CardContent,
  Button,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { Search, CheckCircle, Schedule, ViewList, ViewModule, GitHub } from "@mui/icons-material";
import { useIssues } from "../../api/IssuesApi";
import { IssueListItem } from "../../api/models/Issues";
import type { CurrencyDisplay } from "../../pages/IssuesPage";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type SortField = "bountyUsd" | "registrationTimestamp" | "title";
type SortOrder = "asc" | "desc";
type ViewMode = "table" | "card";

interface IssuesTableProps {
  onIssueClick?: (issueId: string) => void;
  currencyDisplay?: CurrencyDisplay;
}

export const IssuesTable: React.FC<IssuesTableProps> = ({ onIssueClick, currencyDisplay = "usd" }) => {
  const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0 = Open, 1 = Solved
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>("bountyUsd");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const status = activeTab === 0 ? "OPEN" : "SOLVED";
  const { data: issues, isLoading, isError } = useIssues(status);

  // Filter and sort logic
  const filteredAndSortedIssues = useMemo(() => {
    if (!issues) return [];

    // Create a copy to avoid mutating original array
    let filtered = [...issues];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.title.toLowerCase().includes(query) ||
          issue.repositoryName.toLowerCase().includes(query) ||
          issue.repositoryOwner.toLowerCase().includes(query)
      );
    }

    // Sort (on the copy)
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "bountyUsd":
          aValue = a.bountyUsd ?? 0;
          bValue = b.bountyUsd ?? 0;
          break;
        case "registrationTimestamp":
          aValue = a.registrationTimestamp ?? 0;
          bValue = b.registrationTimestamp ?? 0;
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [issues, searchQuery, sortField, sortOrder]);

  const paginatedIssues = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredAndSortedIssues.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedIssues, page, rowsPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue as 0 | 1);
    setPage(0);
    setSearchQuery("");
  };

  const formatBounty = (issue: IssueListItem) => {
    if (currencyDisplay === "alpha") {
      const val = issue.bountyAlpha || 0;
      if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M ل`;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K ل`;
      return `${val.toLocaleString(undefined, { maximumFractionDigits: 0 })} ل`;
    }
    return issue.bountyUsd.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatTimeAgo = (timestamp: number) => {
    return dayjs(timestamp).fromNow();
  };

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h`;
    }
    return `${Math.floor(seconds / 60)}m`;
  };

  const getStatusChip = (issue: IssueListItem) => {
    if (issue.status === "SOLVED") {
      return (
        <Chip
          icon={<CheckCircle sx={{ fontSize: 16 }} />}
          label="Solved"
          size="small"
          sx={{
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            color: "success.main",
            fontWeight: 600,
          }}
        />
      );
    }
    return (
      <Chip
        icon={<Schedule sx={{ fontSize: 16 }} />}
        label="Open"
        size="small"
        sx={{
          backgroundColor: "rgba(255, 243, 13, 0.1)",
          color: "secondary.main",
          fontWeight: 600,
        }}
      />
    );
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 8,
        }}
      >
        <Typography color="error">Failed to load issues</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 3,
        backgroundColor: "transparent",
      }}
    >
      {/* Tabs */}
      <Box
        sx={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          px: 3,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              fontSize: "1rem",
            },
          }}
        >
          <Tab label="Open Issues" />
          <Tab label="Solved Issues" />
        </Tabs>
      </Box>

      {/* Search Bar and View Toggle */}
      <Box sx={{ p: 3, pb: 2, display: "flex", gap: 2, alignItems: "center" }}>
        <TextField
          fullWidth
          placeholder="Search by title or repository..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              "& fieldset": {
                borderColor: "rgba(255, 255, 255, 0.1)",
              },
              "&:hover fieldset": {
                borderColor: "rgba(255, 255, 255, 0.2)",
              },
            },
          }}
        />
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          size="small"
          sx={{
            flexShrink: 0,
            "& .MuiToggleButton-root": {
              borderColor: "rgba(255, 255, 255, 0.2)",
              color: "text.secondary",
              "&.Mui-selected": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "primary.main",
              },
            },
          }}
        >
          <ToggleButton value="table">
            <ViewList />
          </ToggleButton>
          <ToggleButton value="card">
            <ViewModule />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Card View */}
      {viewMode === "card" && (
        <Box sx={{ px: 3, pb: 3 }}>
          {/* Sort controls for card view */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Sort by:
            </Typography>
            <ToggleButtonGroup
              value={sortField}
              exclusive
              onChange={(_, value) => {
                if (value) {
                  if (value === sortField) {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortField(value);
                    setSortOrder("desc");
                  }
                }
              }}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  px: 2,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  color: "text.secondary",
                  fontSize: "0.8rem",
                  "&.Mui-selected": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "text.primary",
                  },
                },
              }}
            >
              <ToggleButton value="bountyUsd">
                Bounty {sortField === "bountyUsd" && (sortOrder === "desc" ? "↓" : "↑")}
              </ToggleButton>
              <ToggleButton value="registrationTimestamp">
                Date {sortField === "registrationTimestamp" && (sortOrder === "desc" ? "↓" : "↑")}
              </ToggleButton>
              <ToggleButton value="title">
                Title {sortField === "title" && (sortOrder === "desc" ? "↓" : "↑")}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {paginatedIssues.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={8}>
              {searchQuery
                ? "No issues found matching your search"
                : `No ${status.toLowerCase()} issues yet`}
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {paginatedIssues.map((issue) => (
                <Grid item xs={12} sm={6} md={3} key={issue.id}>
                  <Card
                    onClick={() => onIssueClick?.(issue.id)}
                    sx={{
                      cursor: "pointer",
                      height: "100%",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: "primary.main",
                        backgroundColor: "rgba(29, 55, 252, 0.05)",
                      },
                    }}
                  >
                    <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%", p: 2 }}>
                      {/* Bounty */}
                      <Typography
                        variant="h5"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          color: "primary.main",
                          fontWeight: 700,
                          mb: 1,
                        }}
                      >
                        {formatBounty(issue)}
                      </Typography>
                      {/* Title */}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          mb: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          lineHeight: 1.4,
                          minHeight: "2.8em",
                        }}
                      >
                        {issue.title}
                      </Typography>
                      {/* Repository */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                        <GitHub sx={{ fontSize: 14, color: "text.secondary" }} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {issue.repositoryOwner}/{issue.repositoryName}
                        </Typography>
                      </Box>
                      {/* Labels */}
                      {(issue.labels || []).length > 0 && (
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 1 }}>
                          {(issue.labels || []).slice(0, 2).map((label) => (
                            <Chip
                              key={label}
                              label={label}
                              size="small"
                              sx={{
                                height: "18px",
                                fontSize: "0.65rem",
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                color: "text.secondary",
                              }}
                            />
                          ))}
                        </Box>
                      )}
                      {/* Status and Time */}
                      <Box sx={{ mt: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        {getStatusChip(issue)}
                        <Typography variant="caption" color="text.secondary">
                          {formatTimeAgo(issue.registrationTimestamp)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Table View */}
      {viewMode === "table" && (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                "& th": {
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                },
              }}
            >
              <TableCell>
                <TableSortLabel
                  active={sortField === "title"}
                  direction={sortField === "title" ? sortOrder : "asc"}
                  onClick={() => handleSort("title")}
                  sx={{
                    "& .MuiTableSortLabel-icon": {
                      color: "text.secondary !important",
                    },
                  }}
                >
                  Issue
                </TableSortLabel>
              </TableCell>
              <TableCell>Repository</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === "bountyUsd"}
                  direction={sortField === "bountyUsd" ? sortOrder : "asc"}
                  onClick={() => handleSort("bountyUsd")}
                  sx={{
                    "& .MuiTableSortLabel-icon": {
                      color: "text.secondary !important",
                    },
                  }}
                >
                  Bounty*
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Status</TableCell>
              {activeTab === 1 && <TableCell align="center">Solution</TableCell>}
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === "registrationTimestamp"}
                  direction={
                    sortField === "registrationTimestamp" ? sortOrder : "asc"
                  }
                  onClick={() => handleSort("registrationTimestamp")}
                  sx={{
                    "& .MuiTableSortLabel-icon": {
                      color: "text.secondary !important",
                    },
                  }}
                >
                  {activeTab === 0 ? "Posted" : "Solved"}
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedIssues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeTab === 1 ? 6 : 5} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    {searchQuery
                      ? "No issues found matching your search"
                      : `No ${status.toLowerCase()} issues yet`}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedIssues.map((issue) => (
                <TableRow
                  key={issue.id}
                  onClick={() => onIssueClick?.(issue.id)}
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      "& .issue-title": {
                        color: "primary.main",
                      },
                    },
                    "& td": {
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    },
                  }}
                >
                  <TableCell>
                    <Link
                      href={issue.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="issue-title"
                      sx={{
                        textDecoration: "none",
                        color: "inherit",
                        display: "block",
                        transition: "color 0.2s ease",
                        "&:hover": {
                          color: "primary.main",
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          maxWidth: "400px",
                        }}
                      >
                        {issue.title}
                      </Typography>
                    </Link>
                    {(issue.labels || []).length > 0 && (
                      <Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
                        {(issue.labels || []).slice(0, 3).map((label) => (
                          <Chip
                            key={label}
                            label={label}
                            size="small"
                            sx={{
                              height: "20px",
                              fontSize: "0.7rem",
                              backgroundColor: "rgba(255, 255, 255, 0.05)",
                              color: "text.secondary",
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`https://github.com/${issue.repositoryOwner}/${issue.repositoryName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        textDecoration: "none",
                        color: "text.secondary",
                        "&:hover": {
                          color: "primary.main",
                          textDecoration: "underline",
                        },
                      }}
                    >
                      <Typography variant="body2">
                        {issue.repositoryOwner}/{issue.repositoryName}
                      </Typography>
                    </Link>
                    {issue.language && (
                      <Chip
                        label={issue.language}
                        size="small"
                        sx={{
                          height: "20px",
                          fontSize: "0.7rem",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          color: "text.secondary",
                          mt: 0.5,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body1"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 700,
                        color: "primary.main",
                      }}
                    >
                      {formatBounty(issue)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {getStatusChip(issue)}
                  </TableCell>
                  {activeTab === 1 && (
                    <TableCell align="center">
                      {issue.solutionPrUrl && issue.solutionPrNumber ? (
                        <Link
                          href={issue.solutionPrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            textDecoration: "none",
                            color: "primary.main",
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          PR-{issue.solutionPrNumber}
                        </Link>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  )}
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {activeTab === 0
                        ? formatTimeAgo(issue.registrationTimestamp)
                        : issue.resolutionTimestamp
                          ? formatTimeAgo(issue.resolutionTimestamp)
                          : "N/A"}
                    </Typography>
                    {activeTab === 1 && issue.timeToSolve && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        in {formatDuration(issue.timeToSolve)}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* Pagination */}
      {filteredAndSortedIssues.length > 0 && (
        <TablePagination
          component="div"
          count={filteredAndSortedIssues.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
              {
                color: "text.secondary",
              },
          }}
        />
      )}
    </Box>
  );
};
