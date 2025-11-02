import React from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const GittensorHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        py: 4,
      }}
    >
      <ButtonBase disableRipple onClick={() => navigate("/")}>
        <Stack alignItems="center" gap={1}>
          <img
            src="/gt-logo.svg"
            alt="Gittensor"
            style={{ 
              height: "80px", 
              width: "auto", 
              filter: "brightness(0) invert(1) drop-shadow(0 0 10px rgba(255, 255, 255, 0.8))" 
            }}
          />
          <Typography
            variant="h3"
            color="#ffffff"
            fontWeight="bold"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            GITTENSOR
          </Typography>
        </Stack>
      </ButtonBase>
    </Box>
  );
};

export default GittensorHeader;
