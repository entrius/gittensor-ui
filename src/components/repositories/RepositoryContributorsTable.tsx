import React, { useMemo, useState } from "react";
import { Box, Typography, CircularProgress, Avatar } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useAllPrs, useAllMiners } from "../../api";
import { useNavigate } from "react-router-dom";

interface RepositoryContributorsTableProps {
  repositoryFullName: string;
}

const RepositoryContributorsTable: React.FC<
  RepositoryContributorsTableProps
> = ({ repositoryFullName }) => {
  const navigate = useNavigate();
  const { data: allPRs, isLoading } = useAllPrs();
  const { data: allMinersStats } = useAllMiners();

  // State for how many items to show. Minimum 7.
  const [visibleCount, setVisibleCount] = useState(7);

  // Build githubId -> miner rank/tier map
  const minerDataMap = useMemo(() => {
    const map = new Map<string, { rank: number; tier?: string }>();
    if (Array.isArray(allMinersStats)) {
      const sorted = [...allMinersStats].sort(
        (a, b) => Number(b.totalScore) - Number(a.totalScore),
      );
      sorted.forEach((miner, index) => {
        map.set(miner.githubId, {
          rank: index + 1,
          tier: miner.currentTier,
        });
      });
    }
    return map;
  }, [allMinersStats]);

  // Get contributors for this repository - only count merged PRs
  const contributors = useMemo(() => {
    if (!allPRs) return [];

    const allRepoPRs = allPRs.filter(
      (pr) =>
        pr.repository.toLowerCase() === repositoryFullName.toLowerCase() &&
        pr.githubId &&
        pr.prState === "MERGED",
    );

    const contributorsMap = new Map<
      string,
      { author: string; githubId: string; prs: number; score: number }
    >();

    allRepoPRs.forEach((pr) => {
      if (!pr.githubId) return; // Skip PRs without githubId
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

    // Default sort by score descending
    return Array.from(contributorsMap.values()).sort(
      (a, b) => b.score - a.score,
    );
  }, [allPRs, repositoryFullName]);

  const displayedContributors = contributors.slice(0, visibleCount);
  const totalContributors = contributors.length;
  const hasMore = visibleCount < totalContributors;

  const handleShowMore = () => {
    // Expand fully
    setVisibleCount(totalContributors);
  };

  const handleShowLess = () => {
    // Reset to 7
    setVisibleCount(7);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (contributors.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: "text.secondary",
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          Top Miner Contributors{" "}
          <Typography
            component="span"
            sx={{ color: "#8b949e", fontSize: "0.8em" }}
          >
            ({contributors.length})
          </Typography>
        </Typography>
      </Box>

      {/* Header Row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "32px 1fr 48px 75px",
          gap: 1,
          px: 1.5,
          py: 1,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Typography sx={{ fontSize: "11px", color: "text.secondary" }}>
          #
        </Typography>
        <Typography sx={{ fontSize: "11px", color: "text.secondary" }}>
          MINER
        </Typography>
        <Typography
          sx={{
            fontSize: "11px",
            color: "text.secondary",
            textAlign: "right",
          }}
        >
          PRS
        </Typography>
        <Typography
          sx={{
            fontSize: "11px",
            color: "text.secondary",
            textAlign: "right",
          }}
        >
          SCORE
        </Typography>
      </Box>

      {/* Rows */}
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {displayedContributors.map((contributor, index) => {
          const minerData = minerDataMap.get(contributor.githubId);
          const minerRank = minerData?.rank;
          const isInactive = !minerData?.tier;

          return (
            <Box
              key={contributor.githubId}
              sx={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 48px 75px",
                gap: 1,
                px: 1.5,
                py: 1,
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                alignItems: "center",
                opacity: isInactive ? 0.5 : 1,
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.04)",
                  opacity: 1,
                },
                transition: "all 0.1s",
              }}
            >
              {/* Rank */}
              <Box
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "12px",
                  color: index < 3 ? "#fff" : "#8b949e",
                  fontWeight: index < 3 ? 600 : 400,
                }}
              >
                {index + 1}
              </Box>

              {/* Contributor */}
              <Box
                onClick={() =>
                  navigate(`/miners/details?githubId=${contributor.githubId}`)
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  overflow: "hidden",
                  cursor: "pointer",
                  "&:hover .contributor-name": {
                    color: "#58a6ff",
                    textDecoration: "underline",
                  },
                }}
              >
                <Avatar
                  src={`https://avatars.githubusercontent.com/${contributor.author}`}
                  sx={{
                    width: 20,
                    height: 20,
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                  }}
                >
                  <Typography
                    className="contributor-name"
                    sx={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#c9d1d9",
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      transition: "color 0.1s",
                    }}
                  >
                    {contributor.author}
                  </Typography>
                  {/* Miner Rank Subtext */}
                  {minerRank && (
                    <Typography
                      sx={{
                        fontSize: "10px",
                        color: "#8b949e",
                        whiteSpace: "nowrap", // Force single line
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      Global Rank #{minerRank}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* PRs */}
              <Box
                sx={{
                  textAlign: "right",
                  fontSize: "12px",
                  color: "#c9d1d9",
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {contributor.prs}
              </Box>

              {/* Score */}
              <Box
                sx={{
                  textAlign: "right",
                  fontSize: "12px",
                  color: "#c9d1d9",
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {contributor.score.toFixed(2)}
              </Box>
            </Box>
          );
        })}

        {/* Show More / Show Less Row */}
        {contributors.length > 7 && (
          <Box
            onClick={hasMore ? handleShowMore : handleShowLess}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start", // Left align to match flow
              px: 1.5,
              py: 1.5,
              cursor: "pointer",
              color: "#8b949e",
              fontSize: "12px",
              "&:hover": {
                color: "#fff",
                backgroundColor: "rgba(255,255,255,0.02)",
              },
              transition: "all 0.1s",
            }}
          >
            {hasMore ? (
              <>
                Show more{" "}
                <KeyboardArrowDownIcon sx={{ fontSize: 16, ml: 0.5 }} />
              </>
            ) : (
              <>
                Show less <KeyboardArrowUpIcon sx={{ fontSize: 16, ml: 0.5 }} />
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default RepositoryContributorsTable;
