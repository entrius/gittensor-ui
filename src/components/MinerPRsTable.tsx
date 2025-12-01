import React from "react";
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
} from "@mui/material";
import { useMinerPRs } from "../api";

interface MinerPRsTableProps {
  githubId: string;
}

const MinerPRsTable: React.FC<MinerPRsTableProps> = ({ githubId }) => {
  const { data: prs, isLoading } = useMinerPRs(githubId);

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
          Scored Pull Requests
        </Typography>
      </Box>

      {/* Table */}
      {isLoading ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <CircularProgress size={40} sx={{ color: "primary.main" }} />
        </Box>
      ) : !prs || prs.length === 0 ? (
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
      ) : (
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
          <Table stickyHeader sx={{ tableLayout: "fixed", minWidth: "800px" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellStyle}>PR #</TableCell>
                <TableCell sx={headerCellStyle}>Title</TableCell>
                <TableCell sx={headerCellStyle}>Repository</TableCell>
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
              {prs.map((pr, index) => (
                <TableRow
                  key={`${pr.repository}-${pr.pullRequestNumber}-${index}`}
                  sx={{
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    },
                    transition: "background-color 0.2s",
                  }}
                >
                  <TableCell sx={{ ...bodyCellStyle, width: "10%" }}>
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
                  <TableCell sx={{ ...bodyCellStyle, width: "30%" }}>
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
                  <TableCell sx={{ ...bodyCellStyle, width: "20%" }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Avatar
                        src={`https://avatars.githubusercontent.com/${pr.repository.split('/')[0]}`}
                        alt={pr.repository.split('/')[0]}
                        sx={{
                          width: 20,
                          height: 20,
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          backgroundColor: pr.repository.split('/')[0] === 'opentensor' ? '#ffffff' : pr.repository.split('/')[0] === 'bitcoin' ? '#F7931A' : 'transparent',
                        }}
                      />
                      {pr.repository}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...bodyCellStyle, width: "15%" }}
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
                    sx={{ ...bodyCellStyle, width: "10%" }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {parseFloat(pr.score).toFixed(4)}
                    </Typography>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...bodyCellStyle, width: "15%" }}
                  >
                    {new Date(pr.mergedAt).toLocaleDateString()}
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
  fontSize: "0.75rem",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  height: "56px",
  py: 1.5,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const bodyCellStyle = {
  color: "#ffffff",
  fontFamily: '"JetBrains Mono", monospace',
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  fontSize: "0.85rem",
  py: 1,
  height: "60px",
};

export default MinerPRsTable;
