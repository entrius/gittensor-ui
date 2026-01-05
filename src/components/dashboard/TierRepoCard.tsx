import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, Typography, Tooltip } from "@mui/material";
import { TIER_COLORS } from "../../theme";

interface TierRepoCardProps {
  tier: string;
  repos: Array<{ fullName: string; owner: string }>;
}

const TierRepoCard: React.FC<TierRepoCardProps> = ({ tier, repos }) => {
  const navigate = useNavigate();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [maxItems, setMaxItems] = React.useState(9);

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;

    const updateMaxItems = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      const padding = 24;
      const calculated = Math.floor((width - padding) / 30);
      setMaxItems(Math.max(5, Math.min(20, calculated)));
    };

    const observer = new ResizeObserver(updateMaxItems);
    observer.observe(containerRef.current);
    updateMaxItems();

    return () => observer.disconnect();
  }, []);

  const tierColor = TIER_COLORS[tier.toLowerCase() as keyof typeof TIER_COLORS];
  const showOverflow = repos.length > maxItems;
  const effectiveLimit = showOverflow ? maxItems - 1 : maxItems;
  const displayedRepos = repos.slice(0, effectiveLimit);
  const remainingCount = repos.length - displayedRepos.length;

  return (
    <Card
      sx={{
        flex: 1,
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
      }}
    >
      <Typography
        variant="monoSmall"
        sx={{ color: tierColor, mb: 1, textAlign: "center" }}
      >
        {tier} Tier Repositories
      </Typography>

      <Box
        ref={containerRef}
        sx={{
          display: "flex",
          flexWrap: "nowrap",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          overflow: "visible",
          position: "relative",
          zIndex: 2,
          pl: "12px",
        }}
      >
        {displayedRepos.map((repo) => (
          <Tooltip key={repo.fullName} title={repo.fullName} arrow>
            <Box
              onClick={() =>
                navigate(
                  `/miners/repository?name=${encodeURIComponent(repo.fullName)}`,
                )
              }
              sx={{ textDecoration: "none", cursor: "pointer" }}
            >
              <Box
                component="img"
                src={`https://avatars.githubusercontent.com/${repo.owner}`}
                alt={repo.fullName}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.style.display = "none";
                }}
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  border: `2px solid ${tierColor}40`,
                  marginLeft: "-12px",
                  backgroundColor:
                    repo.owner === "opentensor"
                      ? "#ffffff"
                      : repo.owner === "bitcoin"
                        ? "#F7931A"
                        : "#161b22",
                  transition: "all 0.2s",
                  position: "relative",
                  zIndex: 1,
                  "&:hover": {
                    transform: "scale(1.2)",
                    borderColor: tierColor,
                    boxShadow: `0 0 12px ${tierColor}60`,
                    zIndex: 100,
                  },
                }}
              />
            </Box>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <Tooltip title={`View all ${tier} tier repositories`} arrow>
            <Box
              onClick={() => navigate(`/top-repos?tier=${tier}`)}
              sx={{
                width: 42,
                height: 42,
                minWidth: 42,
                minHeight: 42,
                flexShrink: 0,
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "2px solid #0d1117",
                marginLeft: "-12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s",
                position: "relative",
                zIndex: 1,
                "&:hover": {
                  transform: "scale(1.2)",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  zIndex: 100,
                },
              }}
            >
              <Typography
                variant="monoSmall"
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                  textTransform: "none",
                }}
              >
                +{remainingCount}
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>
    </Card>
  );
};

export default TierRepoCard;
