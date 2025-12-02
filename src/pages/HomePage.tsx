import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Page } from "../components/layout";
import { useStats } from "../api";

const HomePage: React.FC = () => {
  const { data: stats } = useStats();

  // Calculate monthly rewards: TAO price × Alpha price × 2952 × days in current month
  const monthlyRewards = React.useMemo(() => {
    if (
      !stats?.prices?.tao?.data?.price ||
      !stats?.prices?.alpha?.data?.price
    ) {
      return undefined;
    }
    const taoPrice = stats.prices.tao.data.price;
    const alphaPrice = stats.prices.alpha.data.price;
    const dailyAlphaEmissions = 2952;
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    return taoPrice * alphaPrice * dailyAlphaEmissions * daysInMonth;
  }, [stats?.prices]);

  return (
    <Page title="Home">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: { xs: "calc(100vh - 64px)", md: "100vh" },
          width: "100%",
          px: { xs: 2, sm: 3 },
        }}
      >
        <Stack
          alignItems="center"
          justifyContent="center"
          gap={{ xs: 2, sm: 3 }}
        >
          <img
            src="/gt-logo.svg"
            alt="Gittensor"
            style={{
              height: window.innerWidth < 600 ? "96px" : "128px",
              width: "auto",
              filter:
                "grayscale(100%) invert(1) drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))",
            }}
          />
          <Typography
            variant="h1"
            color="#ffffff"
            fontWeight="bold"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: "2rem", sm: "3rem", md: "4rem" },
              textAlign: "center",
            }}
          >
            GITTENSOR
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            fontWeight="bold"
            sx={{
              fontSize: { xs: "0.9rem", sm: "1rem" },
              textAlign: "center",
            }}
          >
            The workforce for open source.
          </Typography>

          {/* Monthly Rewards Banner */}
          {monthlyRewards && (
            <Box
              sx={{
                mt: { xs: 4, sm: 5 },
                px: { xs: 3, sm: 5, md: 7 },
                py: { xs: 2.5, sm: 3.5 },
                borderRadius: 2,
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  boxShadow: "0 12px 48px rgba(0, 0, 0, 0.4)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Stack alignItems="center" gap={{ xs: 1, sm: 1.5 }}>
                <Typography
                  variant="body2"
                  color="rgba(255, 255, 255, 0.5)"
                  sx={{
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    fontWeight: 500,
                  }}
                >
                  Monthly Reward Pool
                </Typography>
                <Typography
                  variant="h2"
                  color="#ffffff"
                  fontWeight="600"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" },
                    letterSpacing: "-0.02em",
                  }}
                >
                  $
                  {monthlyRewards.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
                <Typography
                  variant="body2"
                  color="rgba(255, 255, 255, 0.4)"
                  sx={{
                    fontSize: { xs: "0.75rem", sm: "0.85rem" },
                    textAlign: "center",
                    maxWidth: "400px",
                    lineHeight: 1.6,
                  }}
                >
                  Compete for rewards by contributing quality code to open
                  source
                </Typography>
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>
    </Page>
  );
};

export default HomePage;
