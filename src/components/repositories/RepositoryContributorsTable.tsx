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
import { useAllMinerData, useAllMinerStats } from "../../api";
import { useNavigate } from "react-router-dom";

interface RepositoryContributorsTableProps {
  repositoryFullName: string;
}

type ContributorSortField =
  | "rank"
  | "contributor"
  | "prs"
  | "score"
  | "minerRank";
type SortOrder = "asc" | "desc";

const RepositoryContributorsTable: React.FC<
  RepositoryContributorsTableProps
> = ({ repositoryFullName }) => {
  const navigate = useNavigate();
  const { data: allPRs, isLoading } = useAllMinerData();
  const { data: allMinersStats } = useAllMinerStats();
  const [sortField, setSortField] = useState<ContributorSortField>("score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Build githubId -> miner rank map
  const minerRankMap = useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(allMinersStats)) {
      const sorted = [...allMinersStats].sort(
        (a, b) => Number(b.totalScore) - Number(a.totalScore),
      );
      sorted.forEach((miner, index) => {
        map.set(miner.githubId, index + 1);
      });
    }
    return map;
  }, [allMinersStats]);

  // Get contributors for this repository
  const contributors = useMemo(() => {
    if (!allPRs) return [];

    const allRepoPRs = allPRs.filter(
      (pr) => pr.repository === repositoryFullName,
    );

    const contributorsMap = new Map<
      string,
      { author: string; githubId: string; prs: number; score: number }
    >();

    allRepoPRs.forEach((pr) => {
      const existing = contributorsMap.get(pr.githubId) || {
        author: pr.author,
        githubId: pr.githubId,
        prs: 0,
        score: 0,
      };
      existing.prs += 1;
      existing.score += parseFloat(pr.score || "0");
      contributorsMap.set(pr.githubId, existing);
    });

    return Array.from(contributorsMap.values());
  }, [allPRs, repositoryFullName]);

  // Sort contributors
  const sortedContributors = useMemo(() => {
    const sorted = [...contributors];
    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case "contributor":
          compareValue = a.author.localeCompare(b.author);
          break;
        case "prs":
          compareValue = a.prs - b.prs;
          break;
        case "score":
          compareValue = a.score - b.score;
          break;
        case "rank":
          compareValue = b.score - a.score;
          break;
        case "minerRank":
          const aRank = minerRankMap.get(a.githubId) || 999999;
          const bRank = minerRankMap.get(b.githubId) || 999999;
          compareValue = aRank - bRank;
          break;
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });
    return sorted;
  }, [contributors, sortField, sortOrder, minerRankMap]);

  const handleSort = (field: ContributorSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

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

  if (contributors.length === 0) {
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
          No contributors found
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
          Top Contributors
        </Typography>
      </Box>

      <TableContainer sx={{ maxHeight: "400px", overflow: "auto" }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === "rank"}
                  direction={sortField === "rank" ? sortOrder : "asc"}
                  onClick={() => handleSort("rank")}
                  sx={sortLabelStyle}
                >
                  Rank
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === "contributor"}
                  direction={sortField === "contributor" ? sortOrder : "asc"}
                  onClick={() => handleSort("contributor")}
                  sx={sortLabelStyle}
                >
                  Contributor
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === "prs"}
                  direction={sortField === "prs" ? sortOrder : "desc"}
                  onClick={() => handleSort("prs")}
                  sx={sortLabelStyle}
                >
                  PRs
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === "score"}
                  direction={sortField === "score" ? sortOrder : "desc"}
                  onClick={() => handleSort("score")}
                  sx={sortLabelStyle}
                >
                  Score
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={headerCellStyle}>
                <TableSortLabel
                  active={sortField === "minerRank"}
                  direction={sortField === "minerRank" ? sortOrder : "asc"}
                  onClick={() => handleSort("minerRank")}
                  sx={sortLabelStyle}
                >
                  Miner Rank
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedContributors.map((contributor, index) => (
              <TableRow
                key={contributor.githubId}
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
                        `/miners/details?githubId=${contributor.githubId}`,
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
                      src={`https://avatars.githubusercontent.com/${contributor.author}`}
                      alt={contributor.author}
                      sx={{ width: 24, height: 24 }}
                    />
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.85rem",
                        transition: "color 0.2s",
                      }}
                    >
                      {contributor.author}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right" sx={bodyCellStyle}>
                  {contributor.prs}
                </TableCell>
                <TableCell align="right" sx={bodyCellStyle}>
                  {contributor.score.toFixed(4)}
                </TableCell>
                <TableCell align="right" sx={bodyCellStyle}>
                  {minerRankMap.get(contributor.githubId) || "-"}
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

const sortLabelStyle = {
  color: "inherit",
  "&:hover": { color: "rgba(255, 255, 255, 0.9)" },
  "&.Mui-active": {
    color: "rgba(255, 255, 255, 0.9)",
    "& .MuiTableSortLabel-icon": {
      color: "rgba(255, 255, 255, 0.9) !important",
    },
  },
};

export default RepositoryContributorsTable;
