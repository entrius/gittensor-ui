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
            style={{ height: "64px", width: "auto" }}
          />
          <Typography fontWeight={550} variant="h4">
            Gittensor
          </Typography>
        </Stack>
      </ButtonBase>
      <Menu />
    </Stack>
  );
};

export default LeftPanel;
