import React, { useMemo } from "react";
import {
  Card,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Avatar,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import {
  Language as WebsiteIcon,
  Twitter as TwitterIcon,
  LocationOn as LocationIcon,
  Business as CompanyIcon,
  CheckCircle as HireableIcon,
  GitHub as GitHubIcon,
  People as FollowersIcon,
  VerifiedUser as CredibilityIcon,
  Score as ScoreIcon,
  Commit as CommitIcon,
  Code as CodeIcon,
  AccountTree as RepoIcon,
  PendingActions as PendingIcon,
  Warning as CollateralIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import {
  useMinerStats,
  useMinerPRs,
  useAllMinerStats,
  useAllMinerData,
  useMinerGithubData,
} from "../../api";

interface MinerScoreCardProps {
  githubId: string;
}

const MinerScoreCard: React.FC<MinerScoreCardProps> = ({ githubId }) => {
  // Use pre-computed stats from MinerEvaluations table - much faster!
  const { data: minerStats, isLoading, error } = useMinerStats(githubId);
  // Fetch PRs to get username for avatar (only fetches first PR)
  const { data: prs } = useMinerPRs(githubId);
  // Fetch Rich Github Data
  const { data: githubData } = useMinerGithubData(githubId);

  const username = githubData?.login || prs?.[0]?.author || githubId;

  // Fetch all miners' stats to calculate rankings
  const { data: allMinersStats } = useAllMinerStats();

  // Fetch all PRs to calculate top PR ranking
  const { data: allPRs } = useAllMinerData();

  // Calculate rankings for each metric
  const rankings = useMemo(() => {
    if (!allMinersStats || !minerStats) return null;

    // Sort miners by each metric and find the current miner's rank
    const prRanking =
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.totalPrs) - Number(a.totalPrs))
        .findIndex((m) => m.githubId === githubId) + 1;

    const linesRanking =
      allMinersStats
        .slice()
        .sort(
          (a, b) => Number(b.totalLinesChanged) - Number(a.totalLinesChanged),
        )
        .findIndex((m) => m.githubId === githubId) + 1;

    const reposRanking =
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.uniqueReposCount) - Number(a.uniqueReposCount))
        .findIndex((m) => m.githubId === githubId) + 1;

    const scoreRanking =
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.totalScore) - Number(a.totalScore))
        .findIndex((m) => m.githubId === githubId) + 1;

    const credibilityRanking =
      allMinersStats
        .slice()
        .sort((a, b) => Number(b.credibility || 0) - Number(a.credibility || 0))
        .findIndex((m) => m.githubId === githubId) + 1;

    return {
      totalPrs: prRanking || null,
      linesChanged: linesRanking || null,
      uniqueRepos: reposRanking || null,
      score: scoreRanking || null,
      credibility: credibilityRanking || null,
    };
  }, [allMinersStats, minerStats, githubId]);

  // Find top PR by score - MUST be before conditional returns
  const topPR = useMemo(() => {
    if (!prs || prs.length === 0) return null;
    return prs.reduce((max, pr) => {
      const prScore = parseFloat(pr.score || "0");
      const maxScore = parseFloat(max.score || "0");
      return prScore > maxScore ? pr : max;
    }, prs[0]);
  }, [prs]);

  // Calculate top PR ranking among all PRs - MUST be before conditional returns
  const topPRRank = useMemo(() => {
    if (!topPR || !allPRs || allPRs.length === 0) return null;

    // Sort all PRs by score descending
    const sortedPRs = allPRs
      .slice()
      .sort((a, b) => parseFloat(b.score || "0") - parseFloat(a.score || "0"));

    // Find the rank of this specific PR
    const rank =
      sortedPRs.findIndex(
        (pr) =>
          pr.repository === topPR.repository &&
          pr.pullRequestNumber === topPR.pullRequestNumber,
      ) + 1;

    return rank || null;
  }, [topPR, allPRs]);

  if (isLoading) {
    return (
      <Card
        sx={{
          backgroundColor: "transparent",
          borderRadius: "8px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          p: 4,
          textAlign: "center",
        }}
        elevation={0}
      >
        <CircularProgress size={40} sx={{ color: "primary.main" }} />
      </Card>
    );
  }

  if (error || !minerStats) {
    return (
      <Card
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          borderRadius: "8px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
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
          No data found for GitHub user: {githubId}
        </Typography>
      </Card>
    );
  }

  // Use pre-computed stats directly from the evaluation
  const statItems: Array<{
    label: string;
    value: string | number;
    rank: number | null | undefined;
    link?: string | null;
    color?: string;
    subValue?: string;
    icon: React.ReactNode;
    bgGradient: string;
  }> = [
      {
        label: "Credibility",
        value: `${(Number(minerStats.credibility || 0) * 100).toFixed(1)}%`,
        rank: null,
        color:
          (minerStats.credibility || 0) >= 0.9
            ? "#4ade80" // High green
            : (minerStats.credibility || 0) >= 0.7
              ? "#a3e635" // Light green
              : (minerStats.credibility || 0) >= 0.5
                ? "#facc15" // Yellow
                : (minerStats.credibility || 0) >= 0.3
                  ? "#fb923c" // Orange
                  : "#f87171", // Red
        subValue: `${minerStats.totalMergedPrs || 0} Merged / ${minerStats.totalClosedPrs || 0} Closed`,
        icon: <CredibilityIcon sx={{ opacity: 0.8 }} />,
        bgGradient: "linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(74, 222, 128, 0.05) 100%)",
      },
      {
        label: "Current Score",
        value: Number(minerStats.totalScore).toFixed(4),
        rank: rankings?.score,
        icon: <ScoreIcon sx={{ opacity: 0.8 }} />,
        bgGradient: "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
      },
      {
        label: "Total PRs",
        value: Number(minerStats.totalPrs || 0),
        rank: rankings?.totalPrs,
        icon: <CommitIcon sx={{ opacity: 0.8 }} />,
        bgGradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
      },
      {
        label: "Scored Lines",
        value: Number(minerStats.totalLinesChanged || 0).toLocaleString(),
        rank: rankings?.linesChanged,
        icon: <CodeIcon sx={{ opacity: 0.8 }} />,
        bgGradient: "linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%)",
      },
      {
        label: "Unique Repos",
        value: Number(minerStats.uniqueReposCount || 0),
        rank: rankings?.uniqueRepos,
        icon: <RepoIcon sx={{ opacity: 0.8 }} />,
        bgGradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)",
      },
      {
        label: "Open PRs",
        value: Number(minerStats.totalOpenPrs || 0),
        rank: null,
        icon: <PendingIcon sx={{ opacity: 0.8, color: "#facc15" }} />,
        bgGradient: "linear-gradient(135deg, rgba(250, 204, 21, 0.1) 0%, rgba(250, 204, 21, 0.05) 100%)",
      },
      {
        label: "Open Collateral",
        value: Number(minerStats.totalCollateralScore || 0).toFixed(4),
        rank: null,
        color: "#fb923c", // Orange for pending/open
        icon: <CollateralIcon sx={{ opacity: 0.8, color: "#fb923c" }} />,
        bgGradient: "linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(251, 146, 60, 0.05) 100%)",
      },
      {
        label: "Top PR",
        value: topPR ? parseFloat(topPR.score || "0").toFixed(4) : "N/A",
        rank: topPRRank,
        link: topPR
          ? `https://github.com/${topPR.repository}/pull/${topPR.pullRequestNumber}`
          : null,
        icon: <StarIcon sx={{ opacity: 0.8, color: "#fbbf24" }} />,
        bgGradient: "linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%)",
      },
    ];

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "transparent",
        p: 3,
        mb: 3,
      }}
      elevation={0}
    >
      <Box sx={{ mb: 4, display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
        {/* Identity Column */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2.5 }}>
          <Avatar
            src={`https://avatars.githubusercontent.com/${username}`}
            alt={username}
            sx={{
              width: 80,
              height: 80,
              border: "2px solid rgba(255, 255, 255, 0.1)",
            }}
          />
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: "#ffffff",
                fontFamily: '"JetBrains Mono", monospace',
                mb: 0.5,
                fontSize: "1.5rem",
                fontWeight: 600,
              }}
            >
              {githubData?.name || username}
            </Typography>
            <Typography
              component="a"
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: "primary.main",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "1rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                "&:hover": { textDecoration: "underline" },
                mb: 1
              }}
            >
              <GitHubIcon fontSize="small" />
              @{username}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
              <Typography
                sx={{
                  color: "rgba(255, 255, 255, 0.4)",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}
              >
                Hotkey:
              </Typography>
              <Typography
                sx={{
                  color: "rgba(255, 255, 255, 0.6)",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.75rem",
                }}
              >
                {minerStats.hotkey || "N/A"}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Divider for mobile */}
        <Divider sx={{ display: { xs: "block", md: "none" }, borderColor: "rgba(255, 255, 255, 0.1)" }} />

        {/* Extended Details Column */}
        {githubData && (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {/* Bio */}
            {githubData.bio && (
              <Typography
                sx={{
                  color: "rgba(255, 255, 255, 0.8)",
                  fontStyle: "italic",
                  mb: 2,
                  fontSize: "0.95rem",
                  maxWidth: "600px"
                }}
              >
                {githubData.bio}
              </Typography>
            )}

            {/* Badges/Tags */}
            <Stack direction="row" gap={1.5} flexWrap="wrap">
              {githubData.company && (
                <Chip
                  icon={<CompanyIcon style={{ fontSize: 16, color: "rgba(255, 255, 255, 0.7)" }} />}
                  label={githubData.company}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    color: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.1)"
                  }}
                />
              )}
              {githubData.location && (
                <Chip
                  icon={<LocationIcon style={{ fontSize: 16, color: "rgba(255, 255, 255, 0.7)" }} />}
                  label={githubData.location}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    color: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.1)"
                  }}
                />
              )}
              {githubData.blog && (
                <Chip
                  component="a"
                  href={githubData.blog.startsWith('http') ? githubData.blog : `https://${githubData.blog}`}
                  target="_blank"
                  icon={<WebsiteIcon style={{ fontSize: 16, color: "#58a6ff" }} />}
                  label="Website"
                  clickable
                  size="small"
                  sx={{
                    backgroundColor: "rgba(88, 166, 255, 0.1)",
                    color: "#58a6ff",
                    border: "1px solid rgba(88, 166, 255, 0.2)"
                  }}
                />
              )}
              {githubData.twitterUsername && (
                <Chip
                  component="a"
                  href={`https://twitter.com/${githubData.twitterUsername}`}
                  target="_blank"
                  icon={<TwitterIcon style={{ fontSize: 16, color: "#1DA1F2" }} />}
                  label={`@${githubData.twitterUsername}`}
                  clickable
                  size="small"
                  sx={{
                    backgroundColor: "rgba(29, 161, 242, 0.1)",
                    color: "#1DA1F2",
                    border: "1px solid rgba(29, 161, 242, 0.2)"
                  }}
                />
              )}
              {githubData.hireable && (
                <Chip
                  icon={<HireableIcon style={{ fontSize: 16 }} />}
                  label="Open to Work"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
              <Chip
                icon={<FollowersIcon style={{ fontSize: 16, color: "rgba(255, 255, 255, 0.7)" }} />}
                label={`${githubData.followers} followers`}
                size="small"
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  color: "rgba(255, 255, 255, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
              />
            </Stack>
          </Box>
        )}
      </Box>

      <Grid container spacing={2}>
        {statItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <Box
              sx={{
                background: item.bgGradient,
                borderRadius: 3,
                border: "1px solid rgba(255, 255, 255, 0.08)",
                p: 2.5,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                },
                position: "relative",
                overflow: "hidden"
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Typography
                  sx={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </Typography>
                <Box sx={{ color: "rgba(255,255,255,0.2)" }}>
                  {item.icon}
                </Box>
              </Box>

              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#ffffff",
                        textDecoration: "none",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "#ffffff",
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: "1.25rem",
                          fontWeight: 700,
                          wordBreak: "break-all",
                          "&:hover": {
                            color: "primary.main",
                          },
                          transition: "color 0.2s",
                        }}
                      >
                        {String(item.value)}
                      </Typography>
                    </a>
                  ) : (
                    <Typography
                      sx={{
                        color: item.color || "#ffffff",
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        wordBreak: "break-all",
                      }}
                    >
                      {String(item.value)}
                    </Typography>
                  )}

                  {item.rank && (
                    <Box
                      sx={{
                        backgroundColor: "#000000",
                        borderRadius: "4px",
                        minWidth: "24px",
                        height: "24px",
                        px: 0.5,
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
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        #{item.rank}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {item.subValue && (
                  <Typography
                    sx={{
                      color: "rgba(255, 255, 255, 0.4)",
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "0.7rem",
                      mt: 0.5,
                    }}
                  >
                    {item.subValue}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Card>
  );
};

export default MinerScoreCard;
