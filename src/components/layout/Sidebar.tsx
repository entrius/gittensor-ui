import React from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  ButtonBase,
  Divider,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

interface SidebarProps {
  onNavigate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.(); // Call onNavigate if provided (for mobile drawer closing)
  };

  const navItems = [
    { label: "dashboard", path: "/dashboard" },
    { label: "leaderboard", path: "/top-miners", badge: "new" },
    { label: "pull requests", path: "/top-prs" },
    { label: "top repositories", path: "/top-repos" },
    { label: "repositories", path: "/repositories" },
    { label: "roadmap", path: "/roadmap" },
    { label: "about", path: "/about" },
    { label: "faq", path: "/faq" },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        px: 3,
        py: 4,
      }}
    >
      {/* Logo */}
      <ButtonBase
        disableRipple
        onClick={() => handleNavigate("/")}
        sx={{
          mb: 3,
          justifyContent: "center",
          width: "100%",
          py: 1,
        }}
      >
        <img
          src="/gt-logo.svg"
          alt="Gittensor"
          style={{
            height: "60px",
            width: "auto",
            filter:
              "brightness(0) invert(1) drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))",
          }}
        />
      </ButtonBase>

      {/* Navigation */}
      <Stack direction="column" spacing={2}>
        {navItems.map((item) => (
          <Button
            key={item.path}
            onClick={() => handleNavigate(item.path)}
            sx={{
              justifyContent: "flex-start",
              py: 1.5,
              px: 2,
              color: "#ffffff",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.95rem",
              textTransform: "none",
              backgroundColor:
                location.pathname === item.path
                  ? "rgba(255, 255, 255, 0.1)"
                  : "transparent",
              borderLeft:
                location.pathname === item.path
                  ? "2px solid #ffffff"
                  : "2px solid transparent",
              borderRadius: 0,
              textAlign: "left",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                color: "primary.main",
              },
            }}
          >
            {item.label}
            {item.badge && (
              <Typography
                component="span"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.65rem",
                  color: "secondary.main",
                  fontStyle: "italic",
                  ml: 1,
                }}
              >
                {item.badge}
              </Typography>
            )}
          </Button>
        ))}
      </Stack>

      {/* Spacer to push footer to bottom */}
      <Box sx={{ flexGrow: 1 }} />

      {/* Footer */}
      <Box sx={{ mt: 2 }}>
        <Divider sx={{ borderColor: "#3d3d3d", mb: 2 }} />
        <Stack direction="column" spacing={1} alignItems="center">
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            flexWrap="wrap"
            justifyContent="center"
          >
            <Typography
              color="#ffffff"
              variant="caption"
              component="a"
              href="https://docs.learnbittensor.org/resources/community-links"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: "0.65rem",
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Community
            </Typography>
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor: "#3d3d3d",
                mx: 0.5,
                height: "12px",
                alignSelf: "center",
              }}
            />
            <Typography
              color="#ffffff"
              variant="caption"
              component="a"
              href="https://github.com/entrius/gittensor"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: "0.65rem",
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Github
            </Typography>
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor: "#3d3d3d",
                mx: 0.5,
                height: "12px",
                alignSelf: "center",
              }}
            />
            <Typography
              color="#ffffff"
              variant="caption"
              component="a"
              href="https://x.com/gittensor_io"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: "0.65rem",
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              X
            </Typography>
          </Stack>
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.6rem",
              color: "#888888",
            }}
          >
            © Gittensor 2025
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default Sidebar;
