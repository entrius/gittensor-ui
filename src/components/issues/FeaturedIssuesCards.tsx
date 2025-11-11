import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  CircularProgress,
} from "@mui/material";
import { OpenInNew, GitHub } from "@mui/icons-material";
import { useFeaturedIssues } from "../../api/IssuesApi";

export const FeaturedIssuesCards: React.FC = () => {
  const { data: issues, isLoading, isError } = useFeaturedIssues(3);

  if (isLoading) {
    return (
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
    );
  }

  if (isError || !issues || issues.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatAge = (days: number) => {
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"CY Grotesk Grand", "Inter", sans-serif',
          }}
        >
          Featured High-Value Issues
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
        {issues.map((issue) => (
          <Grid item xs={12} md={4} key={issue.id}>
            <Card
              sx={{
                backgroundColor: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  transform: "translateY(-2px)",
                },
              }}
              elevation={0}
            >
              <CardContent
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  p: 3,
                }}
              >
                {/* Bounty Amount - Prominent */}
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: "primary.main",
                    mb: 2,
                    fontWeight: 700,
                  }}
                >
                  {formatCurrency(issue.bountyUsd)}
                </Typography>

                {/* Issue Title */}
                <Typography
                  variant="body1"
                  sx={{
                    mb: 2,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.4,
                    minHeight: "2.8em",
                  }}
                >
                  {issue.title}
                </Typography>

                {/* Repository */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <GitHub sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {issue.repositoryOwner}/{issue.repositoryName}
                  </Typography>
                </Box>

                {/* Labels */}
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: 2,
                    minHeight: "32px",
                  }}
                >
                  {issue.language && (
                    <Chip
                      label={issue.language}
                      size="small"
                      sx={{
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        color: "text.secondary",
                        fontSize: "0.75rem",
                        height: "24px",
                      }}
                    />
                  )}
                  {issue.labels.slice(0, 2).map((label) => (
                    <Chip
                      key={label}
                      label={label}
                      size="small"
                      sx={{
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        color: "text.secondary",
                        fontSize: "0.75rem",
                        height: "24px",
                      }}
                    />
                  ))}
                </Box>

                {/* Age */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Posted {formatAge(issue.ageInDays)}
                </Typography>

                {/* Action Button */}
                <Button
                  variant="outlined"
                  endIcon={<OpenInNew />}
                  href={issue.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    mt: "auto",
                    textTransform: "none",
                    borderRadius: 2,
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    "&:hover": {
                      borderColor: "primary.main",
                      backgroundColor: "rgba(29, 55, 252, 0.05)",
                    },
                  }}
                >
                  View Issue
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
