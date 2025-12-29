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
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "merged">(
    "all",
  );

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
                  Merged
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
                            color: "#fb923c",
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
                            color: "rgba(255,255,255,0.5)",
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
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    {pr.mergedAt
                      ? new Date(pr.mergedAt).toLocaleDateString()
                      : pr.prState === "CLOSED"
                        ? "Closed"
                        : "Open"}
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
