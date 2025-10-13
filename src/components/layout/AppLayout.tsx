import React, { Suspense, useRef } from "react";
import { Box, Divider, Stack, useMediaQuery } from "@mui/material";
import { Outlet } from "react-router-dom";
import { LoadingPage } from "../../pages";
import useOnNavigate from "../../hooks/useOnNavigate";
import { Footer, LeftPanel } from "..";
import theme from "../../theme";

const AppLayout: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  useOnNavigate(() => mainRef.current?.scrollTo(0, 0));
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <>
      <Box
        sx={{
          width: "100vw",
          minHeight: "100dvh",
          height: isMobile ? "100dvh" : undefined,
          overflowY: "auto", // scroll happens on the full-width box
          overflowX: "hidden",
          display: "flex", // make it a flex container
          justifyContent: "center", // center the child horizontally
          position: "relative",
        }}
      >
        {/* Right panel (scrollable content) */}
        <Box
          ref={mainRef}
          component="main"
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            px: 2,
            alignItems: "center",
          }}
        >
          <Suspense fallback={<LoadingPage />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
    </>
  );
};

export default AppLayout;
