import React, { useMemo, useState } from "react";
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
  TableSortLabel,
} from "@mui/material";
import { useMinerPRs, useReposAndWeights } from "../api";
import { useNavigate } from "react-router-dom";

interface MinerRepositoriesTableProps {
  githubId: string;
}

interface RepoStats {
  repository: string;
  prs: number;
  score: number;
  weight: number;
}

type SortField = "rank" | "repository" | "prs" | "score" | "weight";
type SortOrder = "asc" | "desc";

const MinerRepositoriesTable: React.FC<MinerRepositoriesTableProps> = ({
  githubId,
}) => {
  const navigate = useNavigate();
  const { data: prs, isLoading: isLoadingPRs } = useMinerPRs(githubId);
  const { data: repos, isLoading: isLoadingRepos } = useReposAndWeights();
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Build repository weights map
  const repoWeights = useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(repos)) {
      repos.forEach((repo) => {
        if (repo && repo.fullName) {
          map.set(repo.fullName, parseFloat(repo.weight || "0"));
        }
      });
    }
    return map;
  }, [repos]);

  // Aggregate PRs by repository
  const repoStats = useMemo(() => {
    if (!prs || prs.length === 0) return [];

    const statsMap = new Map<string, RepoStats>();

    prs.forEach((pr) => {
      const existing = statsMap.get(pr.repository) || {
        repository: pr.repository,
        prs: 0,
        score: 0,
        weight: repoWeights.get(pr.repository) || 0,
      };
      existing.prs += 1;
      existing.score += parseFloat(pr.score || "0");
      statsMap.set(pr.repository, existing);
    });

    return Array.from(statsMap.values());
  }, [prs, repoWeights]);

  // Sort repository stats
  const sortedRepoStats = useMemo(() => {
    const sorted = [...repoStats];
    sorted.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortField) {
        case "repository":
          compareValue = a.repository.localeCompare(b.repository);
          break;
        case "prs":
          compareValue = a.prs - b.prs;
          break;
        case "score":
          compareValue = a.score - b.score;
          break;
        case "weight":
          compareValue = a.weight - b.weight;
          break;
        case "rank":
          // Rank is based on score by default
          compareValue = a.score - b.score;
          break;
      }
      
      return sortOrder === "asc" ? compareValue : -compareValue;
    });
    return sorted;
  }, [repoStats, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const isLoading = isLoadingPRs || isLoadingRepos;

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

  if (!prs || prs.length === 0 || repoStats.length === 0) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backgroundColor: "transparent",
          p: 4,
        }}
        elevation={0}
      >
        <Typography
          sx={{
            color: "rgba(255, 255, 255, 0.5)",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.9rem",
            textAlign: "center",
          }}
        >
          No repository contributions found
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "transparent",
        p: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      elevation={0}
    >
      <Box
        sx={{
          p: 3,
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
          Top Repositories
        </Typography>
      </Box>

      <TableContainer sx={{ maxHeight: "400px", overflow: "auto" }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === "rank"}
                  direction={sortField === "rank" ? sortOrder : "desc"}
                  onClick={() => handleSort("rank")}
                  sx={{
                    color: "inherit",
                    "&:hover": { color: "rgba(255, 255, 255, 0.9)" },
                    "&.Mui-active": {
                      color: "rgba(255, 255, 255, 0.9)",
                      "& .MuiTableSortLabel-icon": {
                        color: "rgba(255, 255, 255, 0.9) !important",
                      },
                    },
                  }}
                >
                  Rank
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === "repository"}
                  direction={sortField === "repository" ? sortOrder : "asc"}
                  onClick={() => handleSort("repository")}
                  sx={{
                    color: "inherit",
                    "&:hover": { color: "rgba(255, 255, 255, 0.9)" },
                    "&.Mui-active": {
                      color: "rgba(255, 255, 255, 0.9)",
                      "& .MuiTableSortLabel-icon": {
                        color: "rgba(255, 255, 255, 0.9) !important",
                      },
                    },
                  }}
                >
                  Repository
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === "prs"}
                  direction={sortField === "prs" ? sortOrder : "desc"}
                  onClick={() => handleSort("prs")}
                  sx={{
                    color: "inherit",
                    "&:hover": { color: "rgba(255, 255, 255, 0.9)" },
                    "&.Mui-active": {
                      color: "rgba(255, 255, 255, 0.9)",
                      "& .MuiTableSortLabel-icon": {
                        color: "rgba(255, 255, 255, 0.9) !important",
                      },
                    },
                  }}
                >
                  PRs
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === "score"}
                  direction={sortField === "score" ? sortOrder : "desc"}
                  onClick={() => handleSort("score")}
                  sx={{
                    color: "inherit",
                    "&:hover": { color: "rgba(255, 255, 255, 0.9)" },
                    "&.Mui-active": {
                      color: "rgba(255, 255, 255, 0.9)",
                      "& .MuiTableSortLabel-icon": {
                        color: "rgba(255, 255, 255, 0.9) !important",
                      },
                    },
                  }}
                >
                  Score
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === "weight"}
                  direction={sortField === "weight" ? sortOrder : "desc"}
                  onClick={() => handleSort("weight")}
                  sx={{
                    color: "inherit",
                    "&:hover": { color: "rgba(255, 255, 255, 0.9)" },
                    "&.Mui-active": {
                      color: "rgba(255, 255, 255, 0.9)",
                      "& .MuiTableSortLabel-icon": {
                        color: "rgba(255, 255, 255, 0.9) !important",
                      },
                    },
                  }}
                >
                  Weight
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRepoStats.map((repo, index) => (
              <TableRow
                key={repo.repository}
                sx={{
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                  },
                  transition: "background-color 0.2s",
                }}
              >
                <TableCell sx={bodyCellStyle}>
                  <Box
                    sx={{
                      backgroundColor: "#000000",
                      borderRadius: "2px",
                      width: "28px",
                      height: "28px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: "1px solid",
                      borderColor:
                        index === 0
                          ? "rgba(255, 215, 0, 0.4)"
                          : index === 1
                            ? "rgba(192, 192, 192, 0.4)"
                            : index === 2
                              ? "rgba(205, 127, 50, 0.4)"
                              : "rgba(255, 255, 255, 0.15)",
                      boxShadow:
                        index === 0
                          ? "0 0 12px rgba(255, 215, 0, 0.4), 0 0 4px rgba(255, 215, 0, 0.2)"
                          : index === 1
                            ? "0 0 12px rgba(192, 192, 192, 0.4), 0 0 4px rgba(192, 192, 192, 0.2)"
                            : index === 2
                              ? "0 0 12px rgba(205, 127, 50, 0.4), 0 0 4px rgba(205, 127, 50, 0.2)"
                              : "none",
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        color:
                          index === 0
                            ? "#FFD700"
                            : index === 1
                              ? "#C0C0C0"
                              : index === 2
                                ? "#CD7F32"
                                : "rgba(255, 255, 255, 0.6)",
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {index + 1}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={bodyCellStyle}>
                  <Box
                    onClick={() =>
                      navigate(
                        `/miners/repository?name=${encodeURIComponent(repo.repository)}`,
                      )
                    }
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      cursor: "pointer",
                      "&:hover": {
                        color: "primary.main",
                        "& .MuiTypography-root": {
                          textDecoration: "underline",
                        },
                      },
                      transition: "color 0.2s",
                    }}
                  >
                    <Avatar
                      src={`https://avatars.githubusercontent.com/${repo.repository.split("/")[0]}`}
                      alt={repo.repository.split("/")[0]}
                      sx={{
                        width: 24,
                        height: 24,
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        backgroundColor:
                          repo.repository.split("/")[0] === "opentensor"
                            ? "#ffffff"
                            : repo.repository.split("/")[0] === "bitcoin"
                              ? "#F7931A"
                              : "transparent",
                      }}
                    />
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.85rem",
                        transition: "color 0.2s",
                      }}
                    >
                      {repo.repository}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right" sx={bodyCellStyle}>
                  {repo.prs}
                </TableCell>
                <TableCell align="right" sx={bodyCellStyle}>
                  {repo.score.toFixed(4)}
                </TableCell>
                <TableCell align="right" sx={bodyCellStyle}>
                  {repo.weight.toFixed(4)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

const headerCellStyle = {
  backgroundColor: "rgba(18, 18, 20, 0.95)",
  backdropFilter: "blur(8px)",
  color: "rgba(255, 255, 255, 0.7)",
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: "0.75rem",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const bodyCellStyle = {
  color: "#ffffff",
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  fontSize: "0.85rem",
};

export default MinerRepositoriesTable;
