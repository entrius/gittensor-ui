import React, { useState, useLayoutEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

interface Repo {
  fullName: string;
  owner: string;
}

interface MinerRepoListProps {
  repos: Repo[];
  tierBorderColor: string; // To match the card border/tier color
}

export const MinerRepoList: React.FC<MinerRepoListProps> = ({
  repos,
  tierBorderColor,
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxItems, setMaxItems] = useState(5);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const updateMaxItems = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      // Avatar is 36px, overlap is -10px, so effective width is 26px per item
      // except the first one which is full 36px.
      // +N bubble is ~36px width.

      const itemSize = 36;
      const overlap = 10;
      const effectiveWidthPerItem = itemSize - overlap;

      // Fill full width - only reserve space for +X badge if needed (same as one avatar)
      // This ensures +X only appears when we're at the right edge
      const calculatedCurrent =
        Math.floor((width - itemSize) / effectiveWidthPerItem) + 1;

      // Ensure at least 3 items if possible
      setMaxItems(Math.max(3, calculatedCurrent));
    };

    const observer = new ResizeObserver(updateMaxItems);
    observer.observe(containerRef.current);
    updateMaxItems();

    return () => observer.disconnect();
  }, [repos.length]);

  if (!repos || repos.length === 0) {
    return (
      <Typography
        sx={{ fontSize: "0.7rem", color: "#8b949e", fontStyle: "italic" }}
      >
        No repos
      </Typography>
    );
  }

  const showOverflow = repos.length > maxItems;
  const effectiveLimit = showOverflow ? maxItems - 1 : maxItems;
  const displayedRepos = repos.slice(0, effectiveLimit);
  const remainingCount = repos.length - displayedRepos.length;

  return (
    <Box
      ref={containerRef}
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "nowrap",
        flex: 1,
        minWidth: 0,
        overflow: "visible", // Allow hover scaling to pop out
        // No padding left to ensure first item aligns with edge
      }}
    >
      {displayedRepos.map((repo, idx) => (
        <Box
          key={repo.fullName}
          component="img"
          src={`https://avatars.githubusercontent.com/${repo.owner}`}
          alt={repo.fullName}
          title={repo.fullName}
          onClick={(e) => {
            e.stopPropagation();
            navigate(
              `/miners/repository?name=${encodeURIComponent(repo.fullName)}`,
            );
          }}
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: `2px solid ${tierBorderColor}40`,
            marginLeft: idx === 0 ? 0 : "-10px",
            backgroundColor: "#161b22",
            transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)", // Bouncy pop effect
            position: "relative",
            zIndex: displayedRepos.length - idx, // Stack: First on top
            cursor: "pointer",
            "&:hover": {
              transform: "scale(1.35) translateY(-2px)",
              borderColor: tierBorderColor,
              zIndex: 100,
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            },
          }}
        />
      ))}

      {remainingCount > 0 && (
        <Box
          title={`+${remainingCount} more repositories`}
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            marginLeft: "-10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            position: "relative",
            zIndex: 0,
            color: "rgba(255, 255, 255, 0.5)",
            "&:hover": {
              transform: "scale(1.15)",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              zIndex: 100,
              color: "#fff",
              borderColor: "rgba(255,255,255,0.3)",
            },
          }}
        >
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.7rem",
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            +{remainingCount}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
