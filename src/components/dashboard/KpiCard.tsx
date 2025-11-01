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
  const padding = isLarge ? { py: 2.5 } : { py: 2 };
  const valueVariant = isLarge ? "h2" : "h4";
  const titleSize = isLarge ? 16 : 14;

  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "transparent",
        height: "100%",
        ...sx,
      }}
      elevation={0}
    >
      <CardContent sx={{ textAlign: "center", ...padding, "&:last-child": { pb: padding.py } }}>
        <Typography
          variant="dataLabel"
          fontSize={titleSize}
          color="#ffffff"
          gutterBottom
          sx={{ mb: isLarge ? 1 : 0.5 }}
        >
          {title}
        </Typography>
        <Typography
          variant={valueVariant}
          color="text.primary"
          fontWeight="bold"
          sx={{ fontFamily: '"JetBrains Mono", monospace', my: isLarge ? 1 : 0.5 }}
        >
          {formattedValue ?? "-"}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="#ffffff" sx={{ mt: isLarge ? 0.5 : 0.25, fontSize: isLarge ? 14 : 12 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default KpiCard;
