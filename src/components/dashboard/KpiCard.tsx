import React from "react";
import { Card, CardContent, Typography, SxProps, Theme, useMediaQuery } from "@mui/material";
import theme from "../../theme";

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
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isLarge = variant === "large";
  const padding = isLarge ? { py: isMobile ? 2 : 2.5 } : { py: isMobile ? 1.5 : 2 };
  const valueVariant = isLarge ? "h2" : "h4";
  const titleSize = isLarge ? (isMobile ? 14 : 16) : (isMobile ? 12 : 14);

  const formattedValue = value !== undefined && value !== null
    ? (typeof value === "string" && value.startsWith("$")
      ? value // Already formatted with currency
      : typeof value === "number" || typeof value === "string"
        ? Number(value).toLocaleString()
        : value)
    : undefined;

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
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            my: isLarge ? (isMobile ? 0.5 : 1) : 0.5,
            fontSize: isMobile ? (isLarge ? "2rem" : "1.5rem") : undefined,
          }}
        >
          {formattedValue ?? "-"}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            color="rgba(255, 255, 255, 0.5)"
            sx={{
              mt: isLarge ? 0.5 : 0.25,
              fontSize: isLarge ? (isMobile ? 12 : 14) : (isMobile ? 11 : 12)
            }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default KpiCard;
