import { ButtonBase, Stack, Typography } from "@mui/material";
import React from "react";
import Menu from "./Menu";

const LeftPanel: React.FC = () => {
  return (
    <Stack
      gap={2}
      alignItems="center"
      sx={{
        pr: 2,
      }}
    >
      <ButtonBase disableRipple onClick={() => (window.location.href = "/")}>
        <Stack gap={0} alignItems="center" sx={{ gap: 0 }}>
          <img
            src="/gt-logo.svg"
            alt="Gittensor"
            style={{ 
              height: "64px", 
              width: "auto", 
              filter: "brightness(0) invert(1) drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))" 
            }}
          />
          <Typography fontWeight={550} variant="h4" color="#ffffff">
            Gittensor
          </Typography>
        </Stack>
      </ButtonBase>
      <Menu />
    </Stack>
  );
};

export default LeftPanel;
