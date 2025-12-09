import React, { useMemo, useState } from "react";
import {
  Card,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TableSortLabel,
} from "@mui/material";
import { useAllMinerData, useAllMinerStats } from "../api";
import { useNavigate } from "react-router-dom";

interface RepositoryDetailsProps {
  repositoryFullName: string;
}

type ContributorSortField =
  | "rank"
  | "contributor"
  | "prs"
  | "score"
  | "minerRank";
type SortOrder = "asc" | "desc";

const RepositoryDetails: React.FC<RepositoryDetailsProps> = ({
  repositoryFullName,
}) => {
  const navigate = useNavigate();
  const { data: allPRs, isLoading } = useAllMinerData();
  const { data: allMinersStats } = useAllMinerStats();
  const [selectedAuthor, setSelectedAuthor] = React.useState<string | null>(
    null,
  );
  const [contributorSortField, setContributorSortField] =
    useState<ContributorSortField>("score");
  const [contributorSortOrder, setContributorSortOrder] =
    useState<SortOrder>("desc");

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

  // Filter PRs for this repository and calculate rankings
  const repoData = useMemo(() => {
    if (!allPRs) return null;

    // First get all PRs for this repo to calculate total stats correctly
    const allRepoPRs = allPRs.filter(
      (pr) => pr.repository === repositoryFullName,
    );

    // Filter PRs for the list if author selected
    const displayedPRs = selectedAuthor
      ? allRepoPRs.filter((pr) => pr.author === selectedAuthor)
      : allRepoPRs;

    // Calculate stats for this repo (based on ALL PRs, not filtered)
    const totalScore = allRepoPRs.reduce(
      (sum, pr) => sum + parseFloat(pr.score || "0"),
      0,
    );
    const totalLines = allRepoPRs.reduce(
      (sum, pr) => sum + (pr.additions + pr.deletions),
      0,
    );
    const totalCommits = allRepoPRs.reduce(
      (sum, pr) => sum + pr.commitCount,
      0,
    );

    // Get unique contributors
    const contributors = new Map<
      string,
      { author: string; githubId: string; prs: number; score: number }
    >();
    allRepoPRs.forEach((pr) => {
      const existing = contributors.get(pr.githubId) || {
        author: pr.author,
        githubId: pr.githubId,
        prs: 0,
        score: 0,
      };
      existing.prs += 1;
      existing.score += parseFloat(pr.score || "0");
      contributors.set(pr.githubId, existing);
    });

    const sortedContributors = Array.from(contributors.values()).sort(
      (a, b) => b.score - a.score,
    );

    // Calculate stats for all repositories to determine rankings
    const repoStats = new Map<
      string,
      {
        totalScore: number;
        totalPRs: number;
        totalLines: number;
        totalCommits: number;
        uniqueContributors: number;
      }
    >();

    allPRs.forEach((pr) => {
      const existing = repoStats.get(pr.repository) || {
        totalScore: 0,
        totalPRs: 0,
        totalLines: 0,
        totalCommits: 0,
        uniqueContributors: 0,
      };
      existing.totalScore += parseFloat(pr.score || "0");
      existing.totalPRs += 1;
      existing.totalLines += pr.additions + pr.deletions;
      existing.totalCommits += pr.commitCount;
      repoStats.set(pr.repository, existing);
    });

    // Count unique contributors per repo
    const repoContributors = new Map<string, Set<string>>();
    allPRs.forEach((pr) => {
      if (!repoContributors.has(pr.repository)) {
        repoContributors.set(pr.repository, new Set());
      }
      repoContributors.get(pr.repository)!.add(pr.githubId);
    });
    repoContributors.forEach((contribs, repo) => {
      const stats = repoStats.get(repo);
      if (stats) stats.uniqueContributors = contribs.size;
    });

    // Calculate rankings
    const allRepos = Array.from(repoStats.entries());

    const scoreRank =
      allRepos
        .sort((a, b) => b[1].totalScore - a[1].totalScore)
        .findIndex(([repo]) => repo === repositoryFullName) + 1;

    const prsRank =
      allRepos
        .sort((a, b) => b[1].totalPRs - a[1].totalPRs)
        .findIndex(([repo]) => repo === repositoryFullName) + 1;

    const contributorsRank =
      allRepos
        .sort((a, b) => b[1].uniqueContributors - a[1].uniqueContributors)
        .findIndex(([repo]) => repo === repositoryFullName) + 1;

    const linesRank =
      allRepos
        .sort((a, b) => b[1].totalLines - a[1].totalLines)
        .findIndex(([repo]) => repo === repositoryFullName) + 1;

    const commitsRank =
      allRepos
        .sort((a, b) => b[1].totalCommits - a[1].totalCommits)
        .findIndex(([repo]) => repo === repositoryFullName) + 1;

    return {
      prs: displayedPRs,
      totalPRCount: allRepoPRs.length,
      totalScore,
      totalLines,
      totalCommits,
      totalPRs: allRepoPRs.length,
      contributors: sortedContributors,
      rankings: {
        score: scoreRank || null,
        prs: prsRank || null,
        contributors: contributorsRank || null,
        lines: linesRank || null,
        commits: commitsRank || null,
      },
    };
  }, [allPRs, repositoryFullName, selectedAuthor]);

  // Sort contributors
  const sortedContributors = useMemo(() => {
    if (!repoData) return [];

    const sorted = [...repoData.contributors];
    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (contributorSortField) {
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
          // Rank is based on score by default (inverted because lower rank is better)
          compareValue = b.score - a.score;
          break;
        case "minerRank":
          const aRank = minerRankMap.get(a.githubId) || 999999;
          const bRank = minerRankMap.get(b.githubId) || 999999;
          compareValue = aRank - bRank;
          break;
      }

      return contributorSortOrder === "asc" ? compareValue : -compareValue;
    });
    return sorted;
  }, [repoData, contributorSortField, contributorSortOrder, minerRankMap]);

  const handleContributorSort = (field: ContributorSortField) => {
    if (contributorSortField === field) {
      setContributorSortOrder(contributorSortOrder === "asc" ? "desc" : "asc");
    } else {
      setContributorSortField(field);
      setContributorSortOrder("desc");
    }
  };

  if (isLoading) {
    return (
      <Card
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          borderRadius: "8px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          p: 4,
          textAlign: "center",
        }}
      >
        <CircularProgress size={40} sx={{ color: "primary.main" }} />
      </Card>
    );
  }

  if (!repoData || repoData.prs.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          borderRadius: "8px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          p: 4,
        }}
      >
        <Typography
          sx={{
            color: "rgba(255, 107, 107, 0.9)",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.9rem",
          }}
        >
          No data found for repository: {repositoryFullName}
        </Typography>
      </Card>
    );
  }

  const [owner, repoName] = repositoryFullName.split("/");

  const statItems = [
    {
      label: "Total Score",
      value: repoData.totalScore.toFixed(4),
      rank: repoData.rankings.score,
    },
    {
      label: "Total PRs",
      value: repoData.totalPRs,
      rank: repoData.rankings.prs,
    },
    {
      label: "Contributors",
      value: repoData.contributors.length,
      rank: repoData.rankings.contributors,
    },
    {
      label: "Total Lines",
      value: repoData.totalLines.toLocaleString(),
      rank: repoData.rankings.lines,
    },
    {
      label: "Total Commits",
      value: repoData.totalCommits,
      rank: repoData.rankings.commits,
    },
  ];

  return (
    <>
      {/* Repository Header Card */}
      <Card
        sx={{
          borderRadius: 3,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backgroundColor: "transparent",
          p: 3,
        }}
        elevation={0}
      >
        <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            src={`https://avatars.githubusercontent.com/${owner}`}
            alt={owner}
            sx={{
              width: 64,
              height: 64,
              border: "2px solid rgba(255, 255, 255, 0.2)",
              backgroundColor:
                owner === "opentensor"
                  ? "#ffffff"
                  : owner === "bitcoin"
                    ? "#F7931A"
                    : "transparent",
            }}
          />
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: "#ffffff",
                fontFamily: '"JetBrains Mono", monospace',
                mb: 0.5,
                fontSize: "1.3rem",
                fontWeight: 500,
              }}
            >
              {repoName}
            </Typography>
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.5)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.85rem",
              }}
            >
              {owner}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {statItems.map((item, index) => (
            <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
              <Box
                sx={{
                  backgroundColor: "transparent",
                  borderRadius: 3,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  p: 2.5,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Typography
                    sx={{
                      color: "rgba(255, 255, 255, 0.5)",
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      fontWeight: 600,
                    }}
                  >
                    {item.label}
                  </Typography>
                  {item.rank && (
                    <Box
                      sx={{
                        backgroundColor: "#000000",
                        borderRadius: "2px",
                        width: "20px",
                        height: "20px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        border: "1px solid",
                        borderColor:
                          item.rank === 1
                            ? "rgba(255, 215, 0, 0.4)"
                            : item.rank === 2
                              ? "rgba(192, 192, 192, 0.4)"
                              : item.rank === 3
                                ? "rgba(205, 127, 50, 0.4)"
                                : "rgba(255, 255, 255, 0.15)",
                        boxShadow:
                          item.rank === 1
                            ? "0 0 12px rgba(255, 215, 0, 0.4), 0 0 4px rgba(255, 215, 0, 0.2)"
                            : item.rank === 2
                              ? "0 0 12px rgba(192, 192, 192, 0.4), 0 0 4px rgba(192, 192, 192, 0.2)"
                              : item.rank === 3
                                ? "0 0 12px rgba(205, 127, 50, 0.4), 0 0 4px rgba(205, 127, 50, 0.2)"
                                : "none",
                      }}
                    >
                      <Typography
                        component="span"
                        sx={{
                          color:
                            item.rank === 1
                              ? "#FFD700"
                              : item.rank === 2
                                ? "#C0C0C0"
                                : item.rank === 3
                                  ? "#CD7F32"
                                  : "rgba(255, 255, 255, 0.6)",
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: "0.6rem",
                          fontWeight: 600,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {item.rank}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Typography
                  sx={{
                    color: "#ffffff",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    wordBreak: "break-all",
                  }}
                >
                  {item.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>

      {/* Top Contributors Table */}
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
                    active={contributorSortField === "rank"}
                    direction={
                      contributorSortField === "rank"
                        ? contributorSortOrder
                        : "asc"
                    }
                    onClick={() => handleContributorSort("rank")}
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
                    active={contributorSortField === "contributor"}
                    direction={
                      contributorSortField === "contributor"
                        ? contributorSortOrder
                        : "asc"
                    }
                    onClick={() => handleContributorSort("contributor")}
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
                    Contributor
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  <TableSortLabel
                    active={contributorSortField === "prs"}
                    direction={
                      contributorSortField === "prs"
                        ? contributorSortOrder
                        : "desc"
                    }
                    onClick={() => handleContributorSort("prs")}
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
                    active={contributorSortField === "score"}
                    direction={
                      contributorSortField === "score"
                        ? contributorSortOrder
                        : "desc"
                    }
                    onClick={() => handleContributorSort("score")}
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
                    active={contributorSortField === "minerRank"}
                    direction={
                      contributorSortField === "minerRank"
                        ? contributorSortOrder
                        : "asc"
                    }
                    onClick={() => handleContributorSort("minerRank")}
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

      {/* Pull Requests / Commits Table */}
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
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
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
                  fontSize: "1.1rem",
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
                ({repoData.prs.length}
                {selectedAuthor ? ` of ${repoData.totalPRCount || 0}` : ""})
              </Typography>
            </Box>
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
          {!selectedAuthor && repoData.contributors.length > 1 && (
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.5)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.7rem",
              }}
            >
              Click on an author to filter PRs
            </Typography>
          )}
        </Box>

        <TableContainer
          sx={{
            maxHeight: "500px",
            overflow: "auto",
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
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
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellStyle}>PR #</TableCell>
                <TableCell sx={headerCellStyle}>Title</TableCell>
                <TableCell sx={headerCellStyle}>Author</TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  Commits
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  +/-
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  Score
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  Merged
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {repoData.prs
                .sort(
                  (a, b) =>
                    parseFloat(b.score || "0") - parseFloat(a.score || "0"),
                )
                .map((pr, index) => (
                  <TableRow
                    key={`${pr.pullRequestNumber}-${index}`}
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
                    <TableCell sx={bodyCellStyle}>
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
                    <TableCell sx={bodyCellStyle}>
                      <Box
                        sx={{
                          maxWidth: "300px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {pr.pullRequestTitle}
                      </Box>
                    </TableCell>
                    <TableCell sx={bodyCellStyle}>
                      <Box
                        onClick={() => setSelectedAuthor(pr.author)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
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
                          src={`https://avatars.githubusercontent.com/${pr.author}`}
                          alt={pr.author}
                          sx={{ width: 20, height: 20 }}
                        />
                        {pr.author}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
                      {pr.commitCount}
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
                      <Box component="span" sx={{ color: "#7ee787", mr: 1 }}>
                        +{pr.additions}
                      </Box>
                      <Box component="span" sx={{ color: "#ff7b72" }}>
                        -{pr.deletions}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={bodyCellStyle}>
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
                    <TableCell align="right" sx={bodyCellStyle}>
                      {new Date(pr.mergedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </>
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

export default RepositoryDetails;
