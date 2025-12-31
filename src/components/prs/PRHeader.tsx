import React from "react";
import { Box, Typography, Avatar, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";

interface PRHeaderProps {
    repository: string;
    pullRequestNumber: number;
    prDetails: any; // Using any for now to avoid duplicating the full type definition, or import it if available
}

const PRHeader: React.FC<PRHeaderProps> = ({
    repository,
    pullRequestNumber,
    prDetails,
}) => {
    const navigate = useNavigate();
    const [owner] = repository.split("/");

    const getTierColor = (tier: string) => {
        switch (tier) {
            case "Gold":
                return "#FFD700";
            case "Silver":
                return "#C0C0C0";
            case "Bronze":
                return "#CD7F32";
            default:
                return "#8b949e";
        }
    };

    return (
        <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
            <Box
                onClick={() =>
                    navigate(
                        `/miners/repository?name=${encodeURIComponent(repository)}`,
                    )
                }
                sx={{
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    "&:hover": {
                        transform: "scale(1.05)",
                    },
                }}
            >
                <Avatar
                    src={`https://avatars.githubusercontent.com/${owner}`}
                    alt={owner}
                    sx={{
                        width: 64,
                        height: 64,
                        border: "2px solid rgba(255, 255, 255, 0.2)",
                        backgroundColor:
                            owner === "opentensor"
                                ? "#ffffff"
                                : owner === "bitcoin"
                                    ? "#F7931A"
                                    : "transparent",
                    }}
                />
            </Box>
            <Box sx={{ flex: 1 }}>
                <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            color: "#ffffff",
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "1.3rem",
                            fontWeight: 500,
                        }}
                    >
                        #{pullRequestNumber}
                    </Typography>
                    <Box
                        sx={{
                            display: "inline-block",
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            backgroundColor:
                                prDetails.prState === "CLOSED"
                                    ? "rgba(255, 123, 114, 0.2)"
                                    : prDetails.prState === "MERGED"
                                        ? "rgba(163, 113, 247, 0.2)"
                                        : "rgba(45, 125, 70, 0.2)",
                            border: "1px solid",
                            borderColor:
                                prDetails.prState === "CLOSED"
                                    ? "rgba(255, 123, 114, 0.4)"
                                    : prDetails.prState === "MERGED"
                                        ? "rgba(163, 113, 247, 0.4)"
                                        : "rgba(45, 125, 70, 0.4)",
                        }}
                    >
                        <Typography
                            sx={{
                                color:
                                    prDetails.prState === "CLOSED"
                                        ? "#ff7b72"
                                        : prDetails.prState === "MERGED"
                                            ? "#a371f7"
                                            : "#3fb950",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                textTransform: "capitalize",
                            }}
                        >
                            {prDetails.prState}
                        </Typography>
                    </Box>
                </Box>
                <Typography
                    sx={{
                        color: "#ffffff",
                        fontSize: "1rem",
                        fontWeight: 400,
                        mb: 0.5,
                    }}
                >
                    {prDetails.title}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                        onClick={() =>
                            navigate(
                                `/miners/repository?name=${encodeURIComponent(repository)}`,
                            )
                        }
                        sx={{
                            color: "rgba(255, 255, 255, 0.5)",
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            transition: "color 0.2s",
                            "&:hover": {
                                color: "primary.main",
                                textDecoration: "underline",
                            },
                        }}
                    >
                        {repository}
                    </Typography>
                    {prDetails.tier && (
                        <Chip
                            label={prDetails.tier}
                            size="small"
                            sx={{
                                height: "20px",
                                fontSize: "0.65rem",
                                fontFamily: '"JetBrains Mono", monospace',
                                backgroundColor: "transparent",
                                border: `1px solid ${getTierColor(prDetails.tier)}`,
                                color: getTierColor(prDetails.tier),
                                fontWeight: 600,
                                borderRadius: "4px",
                                "& .MuiChip-label": {
                                    px: 1,
                                },
                            }}
                        />
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default PRHeader;
