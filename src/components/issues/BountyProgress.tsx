import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { formatTokenAmount } from "../../utils/format";

interface BountyProgressProps {
  bountyAmount: string;
  targetBounty: string;
}

const BountyProgress: React.FC<BountyProgressProps> = ({
  bountyAmount,
  targetBounty,
}) => {
  const current = parseFloat(bountyAmount) || 0;
  const target = parseFloat(targetBounty) || 0;
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isFunded = percentage >= 100;

  return (
    <Box sx={{ minWidth: 80 }}>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          "& .MuiLinearProgress-bar": {
            borderRadius: 3,
            backgroundColor: isFunded ? "#3fb950" : "#58a6ff",
          },
        }}
      />
      <Typography
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: "0.65rem",
          color: "rgba(255, 255, 255, 0.5)",
          mt: 0.5,
          textAlign: "center",
        }}
      >
        {formatTokenAmount(bountyAmount)} / {formatTokenAmount(targetBounty)} ل
      </Typography>
    </Box>
  );
};

export default BountyProgress;
