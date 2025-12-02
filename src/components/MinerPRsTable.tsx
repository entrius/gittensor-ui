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
          p: { xs: 2, sm: 3 },
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: "#ffffff",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: { xs: "0.95rem", sm: "1.1rem" },
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
          <Table stickyHeader sx={{ tableLayout: "fixed", minWidth: { xs: "100%", sm: "800px" } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellStyle}>PR #</TableCell>
                <TableCell sx={headerCellStyle}>Title</TableCell>
                <TableCell sx={{ ...headerCellStyle, display: { xs: "none", sm: "table-cell" } }}>Repository</TableCell>
                <TableCell align="right" sx={{ ...headerCellStyle, display: { xs: "none", md: "table-cell" } }}>
                  +/-
                </TableCell>
                <TableCell align="right" sx={headerCellStyle}>
                  Score
                </TableCell>
                <TableCell align="right" sx={{ ...headerCellStyle, display: { xs: "none", sm: "table-cell" } }}>
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
                  <TableCell sx={{ ...bodyCellStyle, width: { xs: "20%", sm: "10%" }, fontSize: { xs: "0.75rem", sm: "0.85rem" } }}>
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
                  <TableCell sx={{ ...bodyCellStyle, width: { xs: "55%", sm: "30%" }, fontSize: { xs: "0.75rem", sm: "0.85rem" } }}>
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
                  <TableCell sx={{ ...bodyCellStyle, width: "20%", display: { xs: "none", sm: "table-cell" } }}>
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
                    sx={{ ...bodyCellStyle, width: "15%", display: { xs: "none", md: "table-cell" } }}
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
                    <Typography
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: { xs: "0.7rem", sm: "0.75rem" },
                        fontWeight: 600,
                      }}
                    >
                      {parseFloat(pr.score).toFixed(4)}
                    </Typography>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...bodyCellStyle, width: "15%", display: { xs: "none", sm: "table-cell" }, fontSize: { xs: "0.75rem", sm: "0.85rem" } }}
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
