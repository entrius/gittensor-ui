import React, { useMemo } from "react";
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
import { useAllMinerData } from "../api";
import { useNavigate } from "react-router-dom";

interface RepositoryPRsTableProps {
  repositoryFullName: string;
}

const RepositoryPRsTable: React.FC<RepositoryPRsTableProps> = ({
  repositoryFullName,
}) => {
  const navigate = useNavigate();
  const { data: allPRs, isLoading } = useAllMinerData();

  const repoPRs = useMemo(() => {
    if (!allPRs) return [];

    return allPRs
      .filter((pr) => pr.repository === repositoryFullName)
      .sort((a, b) => parseFloat(b.score || "0") - parseFloat(a.score || "0"));
  }, [allPRs, repositoryFullName]);

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

  if (repoPRs.length === 0) {
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
          No pull requests found
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
          Pull Requests ({repoPRs.length})
        </Typography>
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
            {repoPRs.map((pr, index) => (
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
                    onClick={(e) => e.stopPropagation()}
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
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
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

export default RepositoryPRsTable;
