import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { GitHub, ChevronLeft, ChevronRight } from "@mui/icons-material";
import { useFeaturedIssues } from "../../api/IssuesApi";
import type { CurrencyDisplay } from "../../pages/IssuesPage";

interface FeaturedIssuesCardsProps {
  onIssueClick?: (issueId: string) => void;
  currencyDisplay?: CurrencyDisplay;
}

export const FeaturedIssuesCards: React.FC<FeaturedIssuesCardsProps> = ({
  onIssueClick,
  currencyDisplay = "usd",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsToShow = 3;
  const { data: allIssues, isLoading, isError } = useFeaturedIssues(10);

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

  if (isError || !allIssues || allIssues.length === 0) {
    return null;
  }

  const formatBounty = (issue: { bountyUsd: number; bountyAlpha: number }) => {
    if (currencyDisplay === "alpha") {
      const val = issue.bountyAlpha || 0;
      if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M ل`;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K ل`;
      return `${val.toLocaleString(undefined, { maximumFractionDigits: 0 })} ل`;
    }
    return issue.bountyUsd.toLocaleString("en-US", {
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

  // Sliding carousel logic - slides respecting full card boundaries
  const maxIndex = allIssues.length - itemsToShow;

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < maxIndex;

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
        {allIssues.length > itemsToShow && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", mr: 1 }}>
              {currentIndex + 1} - {currentIndex + itemsToShow} of {allIssues.length}
            </Typography>
            <IconButton
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              size="small"
              sx={{
                border: "1px solid rgba(255, 255, 255, 0.1)",
                "&:hover": {
                  borderColor: "primary.main",
                  backgroundColor: "rgba(29, 55, 252, 0.05)",
                },
                "&.Mui-disabled": {
                  opacity: 0.3,
                },
              }}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              onClick={handleNext}
              disabled={!canGoNext}
              size="small"
              sx={{
                border: "1px solid rgba(255, 255, 255, 0.1)",
                "&:hover": {
                  borderColor: "primary.main",
                  backgroundColor: "rgba(29, 55, 252, 0.05)",
                },
                "&.Mui-disabled": {
                  opacity: 0.3,
                },
              }}
            >
              <ChevronRight />
            </IconButton>
          </Box>
        )}
      </Box>

      <Grid container spacing={{ xs: 2, sm: 2, md: 3 }} sx={{ overflow: "hidden" }}>
        <Grid item xs={12}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${allIssues.length}, calc(${100 / itemsToShow}%))`,
              gap: { xs: 2, sm: 2, md: 3 },
              transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: `translateX(calc(-${currentIndex * (100 / itemsToShow)}% - ${currentIndex} * var(--gap)))`,
              "--gap": { xs: "16px", sm: "16px", md: "24px" },
            }}
          >
            {allIssues.map((issue, index) => (
              <Box key={issue.id}>
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
                  {formatBounty(issue)}
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
                  {(issue.labels || []).slice(0, 2).map((label) => (
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
                  onClick={() => onIssueClick?.(issue.id)}
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
                  View Details
                </Button>
              </CardContent>
            </Card>
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
