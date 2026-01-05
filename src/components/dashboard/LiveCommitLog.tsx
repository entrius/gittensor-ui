import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  CircularProgress,
  useMediaQuery,
  alpha,
  Avatar,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import theme from "../../theme";
import { useInfiniteCommitLog } from "../../api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

interface CommitLogEntry {
  pullRequestNumber: number;
  hotkey: string;
  pullRequestTitle: string;
  additions: number;
  deletions: number;
  commitCount: number;
  repository: string;
  mergedAt: string | null;
  prState?: string;
  author: string;
  score: string;
  isNew?: boolean;
}

const LiveCommitLog: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  // Using infinite query for pagination
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteCommitLog({ refetchInterval: 10000 }); // Poll every 10 seconds

  const [logEntries, setLogEntries] = useState<CommitLogEntry[]>([]);
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());
  const logContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const previousDataRef = useRef<CommitLogEntry[] | undefined>(undefined);

  // Flatten all pages into a single array
  const commits: CommitLogEntry[] = data?.pages.flat() ?? [];

  useEffect(() => {
    if (commits.length === 0) return;

    // Check for new commits (use PR number + merge time as unique ID)
    const newEntries: CommitLogEntry[] = [];
    const getCommitId = (c: CommitLogEntry) =>
      `${c.pullRequestNumber}-${c.mergedAt}`;

    commits.forEach((commit: CommitLogEntry) => {
      const commitId = getCommitId(commit);
      const previousCommit = previousDataRef.current?.find(
        (c: CommitLogEntry) => getCommitId(c) === commitId,
      );

      // Only add if this is a new commit
      if (!previousCommit) {
        newEntries.push({
          ...commit,
          isNew: true,
        });
      }
    });

    if (newEntries.length > 0 || logEntries.length === 0) {
      // On first load or when new commits arrive
      const allCommits = commits.map((c: CommitLogEntry) => ({
        ...c,
        isNew: newEntries.some((ne) => getCommitId(ne) === getCommitId(c)),
      }));

      setLogEntries(allCommits);

      // Mark new entries for animation
      const newIds = new Set(newEntries.map((e) => getCommitId(e)));
      setNewEntryIds(newIds);

      // Remove "new" status after animation
      setTimeout(() => {
        setNewEntryIds(new Set());
      }, 2000);
    }

    previousDataRef.current = commits;
  }, [commits, logEntries.length]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, logEntries.length]);

  const getScoreColor = (score: string) => {
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum)) return theme.palette.grey[500];
    if (scoreNum >= 10) return "#ffffff"; // Bright white for high
    if (scoreNum >= 5) return "#b0b0b0"; // Medium gray for medium
    return "#7d7d7d"; // Dim gray for low
  };

  const getScoreLabel = (score: string) => {
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum)) return "N/A";
    if (scoreNum >= 10) return "High";
    if (scoreNum >= 5) return "Medium";
    return "Low";
  };

  const getPRStatusChip = (entry: CommitLogEntry) => {
    const state = entry.prState?.toLowerCase();

    if (entry.mergedAt || state === "merged") {
      return {
        label: "Merged",
        color: "#7ee787" as const, // GitHub green
      };
    } else if (state === "closed") {
      return {
        label: "Closed",
        color: "#ff7b72" as const, // GitHub red
      };
    } else {
      return {
        label: "Open",
        color: "#fb923c" as const, // Orange
      };
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "transparent",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      elevation={0}
    >
      <CardContent
        sx={{
          flex: 1,
          p: isMobile ? 1.5 : isTablet ? 1.75 : 2,
          "&:last-child": { pb: isMobile ? 1.5 : isTablet ? 1.75 : 2 },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <Stack spacing={0.5} sx={{ mb: isMobile ? 1 : 1.5, flexShrink: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: isMobile ? "0.9rem" : isTablet ? "0.95rem" : "1rem",
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 500,
              }}
            >
              Live Activity
            </Typography>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: theme.palette.success.main,
                animation: "pulse 2s infinite",
                "@keyframes pulse": {
                  "0%, 100%": {
                    opacity: 1,
                  },
                  "50%": {
                    opacity: 0.5,
                  },
                },
              }}
            />
          </Stack>
        </Stack>

        {isLoading ? (
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
        ) : logEntries.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 8,
              color: "text.secondary",
            }}
          >
            <Typography variant="body2">
              Waiting for commit activity...
            </Typography>
          </Box>
        ) : (
          <Box
            ref={logContainerRef}
            sx={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              pr: 1,
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "3px",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                },
              },
            }}
          >
            <Stack spacing={isMobile ? 1 : isTablet ? 1.25 : 1}>
              {logEntries.map((entry, index) => {
                const entryId = `${entry.pullRequestNumber}-${entry.mergedAt}`;
                const isLastItem = index === logEntries.length - 1;

                return (
                  <Box
                    key={entryId}
                    ref={isLastItem ? loadMoreRef : null}
                    onClick={() =>
                      navigate(
                        `/miners/pr?repo=${entry.repository}&number=${entry.pullRequestNumber}`,
                      )
                    }
                    sx={{
                      p: isMobile ? 0.75 : isTablet ? 1.25 : 1,
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: newEntryIds.has(entryId)
                        ? theme.palette.secondary.main
                        : "rgba(255, 255, 255, 0.1)",
                      backgroundColor: "transparent",
                      backdropFilter: "blur(8px)",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      animation: newEntryIds.has(entryId)
                        ? "slideIn 0.5s ease-out"
                        : undefined,
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
                        opacity: 0,
                        transition: "opacity 0.2s ease",
                      },
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                        transform: "translateX(4px)",
                        boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.15)}`,
                        "&::before": {
                          opacity: 1,
                        },
                      },
                      "@keyframes slideIn": {
                        from: {
                          opacity: 0,
                          transform: "translateX(-20px)",
                        },
                        to: {
                          opacity: 1,
                          transform: "translateX(0)",
                        },
                      },
                    }}
                  >
                    <Stack
                      spacing={isMobile ? 0.5 : isTablet ? 1 : 0.5}
                      sx={{ position: "relative", zIndex: 1 }}
                    >
                      {/* Header with repo name and PR number */}
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.75}
                          flex={1}
                        >
                          <Avatar
                            src={`https://avatars.githubusercontent.com/${entry.repository.split("/")[0]}`}
                            alt={entry.repository.split("/")[0]}
                            sx={{
                              width: isMobile ? 14 : isTablet ? 18 : 16,
                              height: isMobile ? 14 : isTablet ? 18 : 16,
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              backgroundColor:
                                entry.repository.split("/")[0] === "opentensor"
                                  ? "#ffffff"
                                  : entry.repository.split("/")[0] === "bitcoin"
                                    ? "#F7931A"
                                    : "transparent",
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="dataLabel"
                            sx={{
                              fontSize: isMobile
                                ? "0.65rem"
                                : isTablet
                                  ? "0.75rem"
                                  : "0.7rem",
                              color: "text.secondary",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {entry.repository}
                          </Typography>
                        </Stack>
                        <Typography
                          variant="dataLabel"
                          sx={{
                            fontSize: isMobile
                              ? "0.6rem"
                              : isTablet
                                ? "0.7rem"
                                : "0.65rem",
                            color: "text.secondary",
                          }}
                        >
                          PR #{entry.pullRequestNumber}
                        </Typography>
                      </Stack>

                      {/* PR title */}
                      <Typography
                        sx={{
                          fontSize: isMobile
                            ? "0.8rem"
                            : isTablet
                              ? "1rem"
                              : "0.9rem",
                          color: "text.primary",
                          fontWeight: 600,
                          lineHeight: 1.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: isTablet ? 2 : 1,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {entry.pullRequestTitle}
                      </Typography>

                      {/* Metadata row */}
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{
                          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: isMobile
                              ? "0.65rem"
                              : isTablet
                                ? "0.75rem"
                                : "0.7rem",
                            color: "text.secondary",
                            fontFamily: '"Inter", sans-serif',
                          }}
                        >
                          {entry.author}
                        </Typography>
                        <Box
                          sx={{
                            width: 3,
                            height: 3,
                            borderRadius: "50%",
                            backgroundColor: "text.secondary",
                            opacity: 0.5,
                          }}
                        />
                        {entry.mergedAt ? (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: isMobile
                                ? "0.65rem"
                                : isTablet
                                  ? "0.75rem"
                                  : "0.7rem",
                              color: "text.secondary",
                              fontFamily: '"JetBrains Mono", monospace',
                            }}
                          >
                            {dayjs(entry.mergedAt)
                              .utc()
                              .format("MMM D, h:mm A")}{" "}
                            UTC
                          </Typography>
                        ) : (
                          <Chip
                            variant="status"
                            label={getPRStatusChip(entry).label}
                            sx={{
                              height: isMobile ? 16 : isTablet ? 18 : 16,
                              fontSize: isMobile ? "0.55rem" : "0.6rem",
                              color: getPRStatusChip(entry).color,
                              borderColor: alpha(
                                getPRStatusChip(entry).color,
                                0.3,
                              ),
                            }}
                          />
                        )}
                      </Stack>

                      {/* Stats Row */}
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        {/* Lines changed */}
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography
                            variant="dataLabel"
                            sx={{
                              fontSize: isMobile
                                ? "0.6rem"
                                : isTablet
                                  ? "0.7rem"
                                  : "0.65rem",
                              color: "text.secondary",
                            }}
                          >
                            CHANGES
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                          >
                            <Typography
                              variant="dataValue"
                              sx={{
                                fontSize: isMobile
                                  ? "0.75rem"
                                  : isTablet
                                    ? "0.9rem"
                                    : "0.8rem",
                                color: theme.palette.success.main,
                                fontWeight: 600,
                              }}
                            >
                              +{entry.additions}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: isMobile
                                  ? "0.65rem"
                                  : isTablet
                                    ? "0.8rem"
                                    : "0.7rem",
                                color: "text.secondary",
                                fontWeight: 400,
                              }}
                            >
                              /
                            </Typography>
                            <Typography
                              variant="dataValue"
                              sx={{
                                fontSize: isMobile
                                  ? "0.75rem"
                                  : isTablet
                                    ? "0.9rem"
                                    : "0.8rem",
                                color: theme.palette.error.main,
                                fontWeight: 600,
                              }}
                            >
                              -{entry.deletions}
                            </Typography>
                          </Stack>
                        </Stack>

                        {/* Score */}
                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                        >
                          <Typography
                            variant="dataLabel"
                            sx={{
                              fontSize: isMobile
                                ? "0.6rem"
                                : isTablet
                                  ? "0.7rem"
                                  : "0.65rem",
                              color: "text.secondary",
                            }}
                          >
                            SCORE
                          </Typography>
                          <Typography
                            variant="dataValue"
                            sx={{
                              fontSize: isMobile
                                ? "0.85rem"
                                : isTablet
                                  ? "1.05rem"
                                  : "0.95rem",
                              color: getScoreColor(entry.score),
                              fontWeight: 700,
                            }}
                          >
                            {parseFloat(entry.score).toFixed(1)}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}

              {/* Loading indicator for next page */}
              {isFetchingNextPage && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    py: 2,
                  }}
                >
                  <CircularProgress size={24} />
                </Box>
              )}

              {/* End of list indicator */}
              {!hasNextPage && logEntries.length > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    py: 2,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontSize: isMobile ? "0.65rem" : "0.7rem",
                    }}
                  >
                    No more commits to load
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveCommitLog;
