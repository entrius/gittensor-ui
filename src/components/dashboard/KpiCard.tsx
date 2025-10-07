import React from "react";
import { Card, CardContent, Typography, SxProps, Theme } from "@mui/material";

interface KpiCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  variant?: "large" | "medium";
  sx?: SxProps<Theme>;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  variant = "medium",
  sx,
}) => {
  const isLarge = variant === "large";
  const padding = isLarge ? { py: 4 } : { py: 3 };
  const valueVariant = isLarge ? "h2" : "h3";

  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Card
      sx={{
        flex: 1,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        ...sx,
      }}
      elevation={0}
    >
      <CardContent sx={{ textAlign: "center", ...padding }}>
        <Typography
          variant="dataLabel"
          fontSize={16}
          color="text.secondary"
          gutterBottom
        >
          {title}
        </Typography>
        <Typography
          variant={valueVariant}
          color="primary"
          fontWeight="bold"
          sx={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          {formattedValue ?? "-"}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default KpiCard;
