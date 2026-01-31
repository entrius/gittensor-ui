import React from "react";
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
  Chip,
  Skeleton,
  Link,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { IssueBounty } from "../../api/models/Issues";
import { formatTokenAmount } from "../../utils/format";
import BountyProgress from "./BountyProgress";

interface IssuesListProps {
  issues: IssueBounty[];
  isLoading?: boolean;
  showCompleted?: boolean;
  showAllStatuses?: boolean;
  onSelectIssue?: (id: number) => void;
}

/**
 * Get status badge color and text (v0 - no in_competition status)
 */
const getStatusBadge = (
  status: IssueBounty["status"],
): { color: string; bgColor: string; text: string } => {
  switch (status) {
    case "registered":
      return {
        color: "#8b949e",
        bgColor: "rgba(139, 148, 158, 0.15)",
        text: "Registered",
      };
    case "active":
      return {
        color: "#58a6ff",
        bgColor: "rgba(88, 166, 255, 0.15)",
        text: "Available",
      };
    case "completed":
      return {
        color: "#3fb950",
        bgColor: "rgba(63, 185, 80, 0.15)",
        text: "Completed",
      };
    case "cancelled":
      return {
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.15)",
        text: "Cancelled",
      };
    default:
      return {
        color: "#8b949e",
        bgColor: "rgba(139, 148, 158, 0.15)",
        text: status,
      };
  }
};

const IssuesList: React.FC<IssuesListProps> = ({
  issues,
  isLoading = false,
  showCompleted = false,
  showAllStatuses = false,
  onSelectIssue,
}) => {
  const headerCellSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "0.7rem",
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
    color: "rgba(255, 255, 255, 0.3)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    py: 1.5,
  };

  const bodyCellSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "0.85rem",
    color: "#ffffff",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    py: 1.5,
  };

  if (isLoading) {
    return (
      <Card
        sx={{
          backgroundColor: "#000000",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 3,
        }}
        elevation={0}
      >
        <Box sx={{ p: 2 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={48}
              sx={{ mb: 1, borderRadius: 1 }}
            />
          ))}
        </Box>
      </Card>
    );
  }

  if (issues.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor: "#000000",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 3,
          p: 4,
          textAlign: "center",
        }}
        elevation={0}
      >
        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)" }}>
          {showAllStatuses
            ? "No issues registered yet"
            : showCompleted
              ? "No completed issues yet"
              : "No active issues available"}
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: "#000000",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 3,
        overflow: "hidden",
      }}
      elevation={0}
    >
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellSx, width: "60px" }}>ID</TableCell>
              <TableCell sx={headerCellSx}>Repository</TableCell>
              <TableCell sx={{ ...headerCellSx, width: "100px" }}>
                Issue
              </TableCell>
              <TableCell sx={{ ...headerCellSx, textAlign: "right" }}>
                Bounty
              </TableCell>
              <TableCell sx={{ ...headerCellSx, textAlign: "center", width: "120px" }}>
                Funding
              </TableCell>
              <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
                Status
              </TableCell>
              {showCompleted && (
                <TableCell sx={{ ...headerCellSx, textAlign: "center" }}>
                  Winner PR
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {issues.map((issue) => {
              const statusBadge = getStatusBadge(issue.status);

              return (
                <TableRow
                  key={issue.id}
                  onClick={() => onSelectIssue?.(issue.id)}
                  sx={{
                    cursor: onSelectIssue ? "pointer" : "default",
                    transition: "background-color 0.2s",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                    },
                  }}
                >
                  <TableCell sx={bodyCellSx}>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.8rem",
                        color: "rgba(255, 255, 255, 0.6)",
                      }}
                    >
                      #{issue.id}
                    </Typography>
                  </TableCell>
                  <TableCell sx={bodyCellSx}>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.85rem",
                        color: "#58a6ff",
                      }}
                    >
                      {issue.repositoryFullName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={bodyCellSx}>
                    <Link
                      href={issue.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.85rem",
                        color: "#ffffff",
                        textDecoration: "none",
                        "&:hover": {
                          textDecoration: "underline",
                        },
                      }}
                    >
                      #{issue.issueNumber}
                      <OpenInNewIcon sx={{ fontSize: 14, opacity: 0.5 }} />
                    </Link>
                  </TableCell>
                  <TableCell sx={{ ...bodyCellSx, textAlign: "right" }}>
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#3fb950",
                      }}
                    >
                      {formatTokenAmount(issue.bountyAmount)} α
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                    <BountyProgress
                      bountyAmount={issue.bountyAmount}
                      targetBounty={issue.targetBounty}
                    />
                  </TableCell>
                  <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                    <Chip
                      label={statusBadge.text}
                      size="small"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        backgroundColor: statusBadge.bgColor,
                        color: statusBadge.color,
                        border: `1px solid ${statusBadge.color}40`,
                      }}
                    />
                  </TableCell>
                  {showCompleted && (
                    <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                      {issue.winningPrUrl ? (
                        <Link
                          href={issue.winningPrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.8rem",
                            color: "#3fb950",
                            textDecoration: "none",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          View PR
                          <OpenInNewIcon sx={{ fontSize: 14, opacity: 0.5 }} />
                        </Link>
                      ) : (
                        <Typography
                          sx={{
                            fontSize: "0.8rem",
                            color: "rgba(255, 255, 255, 0.3)",
                          }}
                        >
                          -
                        </Typography>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

export default IssuesList;
