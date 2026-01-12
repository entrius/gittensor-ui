import React from "react";
import { Card, Box, Typography, CardContent } from "@mui/material";

export const SectionCard: React.FC<{
    children: React.ReactNode;
    sx?: any;
    title?: string;
    action?: React.ReactNode;
    centerContent?: React.ReactNode;
}> = ({ children, sx, title, action, centerContent }) => (
    <Card
        sx={{
            borderRadius: 3,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backgroundColor: "#000000",
            display: "flex",
            flexDirection: "column",
            ...sx,
        }}
        elevation={0}
    >
        {/* Optional Header */}
        {(title || action || centerContent) && (
            <Box
                sx={{
                    p: 2,
                    pb: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    position: "relative",
                }}
            >
                {title && (
                    <Typography
                        variant="h6"
                        sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "1.25rem",
                            fontWeight: 600,
                        }}
                    >
                        {title}
                    </Typography>
                )}

                {/* Centered Content (Absolute Position) */}
                {centerContent && (
                    <Box
                        sx={{
                            position: "absolute",
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                        }}
                    >
                        {centerContent}
                    </Box>
                )}

                {action && <Box>{action}</Box>}
            </Box>
        )}

        <CardContent
            sx={{
                p: 0,
                "&:last-child": { pb: 0 },
                flex: 1,
                display: "flex",
                flexDirection: "column",
            }}
        >
            {children}
        </CardContent>
    </Card>
);
