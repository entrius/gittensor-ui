import React, { useState, useMemo } from "react";
import {
  Card,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Avatar,
  Chip,
} from "@mui/material";
import { useMinerPRs } from "../../api";
import { useNavigate } from "react-router-dom";

interface MinerPRsTableProps {
  githubId: string;
}

const MinerPRsTable: React.FC<MinerPRsTableProps> = ({ githubId }) => {
  const navigate = useNavigate();
  const { data: prs, isLoading } = useMinerPRs(githubId);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "merged">("all");

  // Filter PRs by selected repository, author, and status
  const filteredPRs = useMemo(() => {
    if (!prs) return [];
    let filtered = prs;
    if (selectedRepo) {
      filtered = filtered.filter((pr) => pr.repository === selectedRepo);
    }
    if (selectedAuthor) {
      filtered = filtered.filter((pr) => pr.author === selectedAuthor);
    }
    if (statusFilter === "open") {
      filtered = filtered.filter((pr) => !pr.mergedAt);
    } else if (statusFilter === "merged") {
      filtered = filtered.filter((pr) => pr.mergedAt);
    }
    return filtered;
  }, [prs, selectedRepo, selectedAuthor, statusFilter]);

  // Get unique repositories for quick filters
  const uniqueRepos = useMemo(() => {
    if (!prs) return [];
    const repos = new Set(prs.map((pr) => pr.repository));
    return Array.from(repos).sort();
  }, [prs]);

  // Get unique authors for quick filters
  const uniqueAuthors = useMemo(() => {
    if (!prs) return [];
    const authors = new Set(prs.map((pr) => pr.author));
    return Array.from(authors).sort();
  }, [prs]);

  if (isLoading) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backgroundColor: "transparent",
          p: 4,
          textAlign: "center",
        }}
        elevation={0}
      >
        <CircularProgress size={40} sx={{ color: "primary.main" }} />
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "transparent",
        p: 0, // Remove padding to let table fill the card
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", // Ensure rounded corners clip content
      }}
      elevation={0}
    >
      {/* Header */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
            <Typography
              variant="h6"
              sx={{
                color: "#ffffff",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: { xs: "0.95rem", sm: "1.1rem" },
                fontWeight: 500,
              }}
            >
              Pull Requests
            </Typography>
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.5)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.75rem",
              }}
            >
              ({filteredPRs.length}
              {selectedRepo || selectedAuthor || statusFilter !== "all"
                ? ` of ${prs?.length || 0}`
                : ""}
              )
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", gap: 0.5, mr: 1 }}>
              <Chip
                label="All"
                onClick={() => setStatusFilter("all")}
                sx={{
                  backgroundColor:
                    statusFilter === "all"
                      ? "rgba(255, 255, 255, 0.2)"
                      : "transparent",
                  color: statusFilter === "all" ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
                  border: "1px solid",
                  borderColor:
                    statusFilter === "all"
                      ? "rgba(255, 255, 255, 0.3)"
                      : "rgba(255, 255, 255, 0.1)",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.75rem",
                  height: "24px",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              />
              <Chip
                label="Open"
                onClick={() => setStatusFilter("open")}
                sx={{
                  backgroundColor:
                    statusFilter === "open"
                      ? "rgba(46, 160, 67, 0.2)"
                      : "transparent",
                  color: statusFilter === "open" ? "#3fb950" : "rgba(255, 255, 255, 0.5)",
                  border: "1px solid",
                  borderColor:
                    statusFilter === "open"
                      ? "rgba(46, 160, 67, 0.3)"
                      : "rgba(255, 255, 255, 0.1)",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.75rem",
                  height: "24px",
                  "&:hover": {
                    backgroundColor: "rgba(46, 160, 67, 0.1)",
                  },
                }}
              />
              <Chip
                label="Merged"
                onClick={() => setStatusFilter("merged")}
                sx={{
                  backgroundColor:
                    statusFilter === "merged"
                      ? "rgba(163, 113, 247, 0.2)"
                      : "transparent",
                  color: statusFilter === "merged" ? "#a371f7" : "rgba(255, 255, 255, 0.5)",
                  border: "1px solid",
                  borderColor:
                    statusFilter === "merged"
                      ? "rgba(163, 113, 247, 0.3)"
                      : "rgba(255, 255, 255, 0.1)",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.75rem",
                  height: "24px",
                  "&:hover": {
                    backgroundColor: "rgba(163, 113, 247, 0.1)",
                  },
                }}
              />
            </Box>
            {selectedRepo && (
              <Chip
                label={`Repo: ${selectedRepo}`}
                onDelete={() => setSelectedRepo(null)}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.75rem",
                  "& .MuiChip-deleteIcon": {
                    color: "rgba(255, 255, 255, 0.7)",
                    "&:hover": {
                      color: "#ffffff",
                    },
                  },
                }}
              />
            )}
            {selectedAuthor && (
              <Chip
                label={`Author: ${selectedAuthor}`}
                onDelete={() => setSelectedAuthor(null)}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.75rem",
                  "& .MuiChip-deleteIcon": {
                    color: "rgba(255, 255, 255, 0.7)",
                    "&:hover": {
                      color: "#ffffff",
                    },
                  },
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Table */}
      {!prs || prs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography
            sx={{
              color: "rgba(255, 255, 255, 0.5)",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.9rem",
            }}
          >
            No PRs found
          </Typography>
        </Box>
      ) : filteredPRs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography
            sx={{
              color: "rgba(255, 255, 255, 0.5)",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.9rem",
            }}
          >
            No PRs found for the selected filters
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{
            maxHeight: { xs: "400px", sm: "500px" },
            overflowY: "auto",
            overflowX: { xs: "hidden", sm: "auto" },
            "&::-webkit-scrollbar": {
              width: { xs: "6px", sm: "8px" },
              height: { xs: "6px", sm: "8px" },
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
            sx={{ tableLayout: "fixed", minWidth: { xs: "100%", sm: "800px" } }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headerCellStyle, width: "50px" }}>
                  Status
                </TableCell>
                <TableCell sx={headerCellStyle}>PR #</TableCell>
                <TableCell sx={headerCellStyle}>Title</TableCell>
                <TableCell
                  sx={{
                    ...headerCellStyle,
                    display: { xs: "none", sm: "table-cell" },
                  }}
                >
                  Repository
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    ...headerCellStyle,
                    display: { xs: "none", md: "table-cell" },
                  }}
                >
                  +/-
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  Score
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    ...headerCellStyle,
                    display: { xs: "none", sm: "table-cell" },
                  }}
                >
                  Date
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPRs.map((pr, index) => (
                <TableRow
                  key={`${pr.repository}-${pr.pullRequestNumber}-${index}`}
                  onClick={() => {
                    navigate(
                      `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
                    );
                  }}
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    },
                    transition: "background-color 0.2s",
                  }}
                >
                  <TableCell
                    sx={{
                      ...bodyCellStyle,
                      width: "50px",
                    }}
                  >
                    <Box
                      sx={{
                        color: !pr.mergedAt ? "#3fb950" : "#a371f7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {!pr.mergedAt ? (
                        // Open PR Icon
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"></path>
                        </svg>
                      ) : (
                        // Merged PR Icon
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M5.45 5.11L2 1.66V4h1.5l1.95 3.35L3.5 10.7H2v2.34L5.45 9.59l4.49 7.77V18h1.86V1.11H9.94l-4.49 4zm.8 4.48L4.65 6.89 6.25 4.13l1.6 2.76-1.6 2.7z"></path>
                          <path d="M5.45 5.11L2 1.66V4h1.5l1.95 3.35L3.5 10.7H2v2.34L5.45 9.59l4.49 7.77V18h1.86V1.11H9.94l-4.49 4zm.8 4.48L4.65 6.89 6.25 4.13l1.6 2.76-1.6 2.7z" fill-rule="evenodd"></path>
                          <path d="M5 3.254V3.25v.005a.75.75 0 1 1 0-.005v.004zm.75.75a.75.75 0 1 0-.005-.005l.005.005zm0 9a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm10.25-7.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z"></path>
                          <path d="M10.293 1.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414-1.414L11.586 4H10a1 1 0 00-1 1v8.379l-1.06-1.06a1.003 1.003 0 00-1.42 1.42l3 3a1 1 0 001.42 0l3-3a1 1 0 00-1.42-1.42l-1.29 1.29V5a3 3 0 013-3h1.586l-1.293-1.293a1 1 0 010-1.414z"></path>
                        </svg>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{
                      ...bodyCellStyle,
                      width: { xs: "20%", sm: "10%" },
                      fontSize: { xs: "0.75rem", sm: "0.85rem" },
                    }}
                  >
                    <a
                      href={`https://github.com/${pr.repository}/pull/${pr.pullRequestNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#ffffff",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                    >
                      #{pr.pullRequestNumber}
                    </a>
                  </TableCell>
                  <TableCell
                    sx={{
                      ...bodyCellStyle,
                      width: { xs: "55%", sm: "30%" },
                      fontSize: { xs: "0.75rem", sm: "0.85rem" },
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pr.pullRequestTitle}
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{
                      ...bodyCellStyle,
                      width: "20%",
                      display: { xs: "none", sm: "table-cell" },
                    }}
                  >
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRepo(pr.repository);
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        cursor: "pointer",
                        "&:hover": {
                          color: "primary.main",
                        },
                        transition: "color 0.2s",
                      }}
                    >
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${pr.repository.split("/")[0]}`}
                        alt={pr.repository.split("/")[0]}
                        sx={{
                          width: 20,
                          height: 20,
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          backgroundColor:
                            pr.repository.split("/")[0] === "opentensor"
                              ? "#ffffff"
                              : pr.repository.split("/")[0] === "bitcoin"
                                ? "#F7931A"
                                : "transparent",
                        }}
                      />
                      {pr.repository}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      ...bodyCellStyle,
                      width: "15%",
                      display: { xs: "none", md: "table-cell" },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        color: "#7ee787",
                        mr: 1,
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    >
                      +{pr.additions}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        color: "#ff7b72",
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    >
                      -{pr.deletions}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...bodyCellStyle, width: { xs: "25%", sm: "10%" } }}
                  >
                    <Box>
                      {!pr.mergedAt && pr.collateralScore ? (
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: { xs: "0.7rem", sm: "0.75rem" },
                            fontWeight: 600,
                            color: "#fb923c"
                          }}
                        >
                          {parseFloat(pr.collateralScore).toFixed(4)}
                        </Typography>
                      ) : (
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: { xs: "0.7rem", sm: "0.75rem" },
                            fontWeight: 600,
                          }}
                        >
                          {parseFloat(pr.score).toFixed(4)}
                        </Typography>
                      )}
                      {!pr.mergedAt && pr.collateralScore && (
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.6rem",
                            color: "rgba(255,255,255,0.5)"
                          }}
                        >
                          Collateral
                        </Typography>
                      )}
                    </Box>

                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      ...bodyCellStyle,
                      width: "15%",
                      display: { xs: "none", sm: "table-cell" },
                      fontSize: { xs: "0.75rem", sm: "0.85rem" },
                      color: "rgba(255,255,255,0.7)"
                    }}
                  >
                    {pr.mergedAt ? new Date(pr.mergedAt).toLocaleDateString() : "Open"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
};

const headerCellStyle = {
  backgroundColor: "rgba(18, 18, 20, 0.95)",
  backdropFilter: "blur(8px)",
  color: "rgba(255, 255, 255, 0.7)",
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: { xs: "0.65rem", sm: "0.75rem" },
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  height: { xs: "48px", sm: "56px" },
  py: { xs: 1, sm: 1.5 },
  px: { xs: 0.5, sm: 2 },
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const bodyCellStyle = {
  color: "#ffffff",
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  fontSize: "0.85rem",
  py: { xs: 0.75, sm: 1 },
  px: { xs: 0.5, sm: 2 },
  height: { xs: "52px", sm: "60px" },
};

export default MinerPRsTable;
