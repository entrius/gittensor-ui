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
        <Stack gap={0}>
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
