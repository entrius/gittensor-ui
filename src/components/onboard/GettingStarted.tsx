import React from "react";
import { Box, Typography, Stack, Paper, Link, Divider, Alert, AlertTitle } from "@mui/material";

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code }) => (
    <Box
        component="pre"
        sx={{
            backgroundColor: "rgba(0,0,0,0.5)",
            p: 2,
            borderRadius: 2,
            overflowX: "auto",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.85rem",
            border: "1px solid rgba(255,255,255,0.1)",
            my: 2,
        }}
    >
        <code>{code}</code>
    </Box>
);

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography
        variant="h5"
        sx={{
            mb: 2,
            mt: 4,
            fontWeight: "bold",
            fontWeight: "bold",
            color: "text.primary",
            fontFamily: '"JetBrains Mono", monospace',
        }}
    >
        {children}
    </Typography>
);

export const GettingStarted: React.FC = () => {
    return (
        <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 2, md: 0 } }}>


            <Alert severity="info" sx={{ mb: 4, backgroundColor: "rgba(2, 136, 209, 0.1)", color: "#90caf9" }}>
                <AlertTitle>Minimum Requirements</AlertTitle>
                Python 3.11+, 2 CPUs, 4GB RAM
            </Alert>

            <Typography variant="body1" sx={{ mb: 4, lineHeight: 1.7 }}>
                Running a miner requires deployment on a server with reliable, continuous availability.
                Validators regularly query miners to verify their GitHub PAT, and miners must remain
                responsive to these requests.
            </Typography>

            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    mb: 5,
                    background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(20px)",
                }}
            >
                <Typography
                    variant="overline"
                    sx={{
                        display: "block",
                        mb: 4,
                        fontWeight: 700,
                        textAlign: "center",
                        letterSpacing: "0.2em",
                        color: "rgba(255,255,255,0.4)",
                    }}
                >
                    MINER ONBOARDING PROCESS
                </Typography>

                <Box sx={{ position: "relative", px: { md: 4 } }}>
                    {/* Connecting Line (Desktop) */}
                    <Box
                        sx={{
                            position: "absolute",
                            top: 24,
                            left: 50,
                            right: 50,
                            height: 2,
                            background: "linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)",
                            display: { xs: "none", md: "block" },
                            zIndex: 0,
                        }}
                    />

                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={{ xs: 4, md: 0 }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "flex-start" }} // Align top to handle variable text height
                        sx={{ position: "relative", zIndex: 1 }}
                    >
                        {[
                            { step: 1, title: "Get Keys", subtitle: "Coldkey & Hotkey" },
                            { step: 2, title: "Register", subtitle: "To Subnet" },
                            { step: 3, title: "Authorize", subtitle: "Create GitHub PAT" },
                            { step: 4, title: "Deploy", subtitle: "Setup Miner" },
                            { step: 5, title: "Earn", subtitle: "Tag Code & Get Paid", active: true },
                        ].map((item, index) => (
                            <Box
                                key={index}
                                sx={{
                                    display: "flex",
                                    flexDirection: { xs: "row", md: "column" },
                                    alignItems: "center",
                                    gap: 2,
                                    width: { xs: "100%", md: "auto" }
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: "50%",
                                        bgcolor: "#000",
                                        border: "2px solid",
                                        borderColor: item.active ? "secondary.main" : "rgba(255,255,255,0.15)",
                                        color: item.active ? "secondary.main" : "text.secondary",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: "bold",
                                        fontSize: "1.25rem",
                                        boxShadow: item.active ? "0 0 20px rgba(255, 215, 0, 0.2)" : "none",
                                        transition: "all 0.3s ease",
                                        flexShrink: 0,
                                    }}
                                >
                                    {item.step}
                                </Box>
                                <Box sx={{ textAlign: { xs: "left", md: "center" } }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: item.active ? "secondary.main" : "text.primary" }}>
                                        {item.title}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.2, display: "block", maxWidth: { md: 100 } }}>
                                        {item.subtitle}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            </Paper>

            <Stack spacing={4}>
                <Paper sx={{ p: 4, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 3 }}>
                    <SectionHeading>1. Ensure Permissions</SectionHeading>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Ensure that you have an accessible coldkey and hotkey. Please refer to the
                        <Link href="https://docs.bittensor.com/" target="_blank" sx={{ color: "primary.main", ml: 1 }}>
                            official Bittensor documentation
                        </Link>{" "}
                        for creating or importing a Bittensor wallet.
                    </Typography>
                </Paper>

                <Paper sx={{ p: 4, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 3 }}>
                    <SectionHeading>2. Register to the Subnet</SectionHeading>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        To register a miner:
                    </Typography>

                    <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 1 }}>Testnet (Netuid 422)</Typography>
                    <CodeBlock code={`btcli subnet register --netuid 422 \\
--wallet-name WALLET_NAME \\
--hotkey WALLET_HOTKEY \\
--network test`} />

                    <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 1, mt: 3 }}>Mainnet (Netuid 74)</Typography>
                    <CodeBlock code={`btcli subnet register --netuid 74 \\
--wallet-name WALLET_NAME \\
--hotkey WALLET_HOTKEY`} />
                </Paper>

                <Paper sx={{ p: 4, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 3 }}>
                    <SectionHeading>3. Create a Github Fine-grained PAT</SectionHeading>
                    <Typography variant="body1" component="div" sx={{ mb: 2 }}>
                        <ol style={{ paddingLeft: "1.2rem", lineHeight: "1.8" }}>
                            <li>In Github go to your <strong>Settings</strong> → <strong>Developer settings</strong>.</li>
                            <li>Go to <strong>Personal access tokens</strong> → <strong>Fine-grained tokens</strong>.</li>
                            <li>Click <strong>Generate new token</strong>.</li>
                            <li>Token name: <code>gittensor</code></li>
                            <li>Expiration: <strong>No Expiration</strong> (recommended)</li>
                            <li>Repository access: <strong>Public repositories</strong> (read-only)</li>
                            <li>Permissions: <strong>Events</strong> → Access: <strong>Read only</strong></li>
                        </ol>
                    </Typography>
                    <Alert severity="warning" sx={{ mt: 2, backgroundColor: "rgba(255, 152, 0, 0.1)", color: "#ffb74d" }}>
                        Some Github organizations forbid access via fine-grained PAT if the token's lifetime is indefinite.
                    </Alert>
                </Paper>

                <Paper sx={{ p: 4, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 3 }}>
                    <SectionHeading>4. Setup Your Miner</SectionHeading>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                        Use the Autoupdater Setup (Recommended) to ensure your miner stays up to date.
                    </Typography>

                    <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>A. Clone the repository</Typography>
                    <CodeBlock code={`git clone git@github.com:entrius/gittensor.git
cd gittensor
# Ensure you are on main branch
git checkout main`} />

                    <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold", mt: 3 }}>B. Setup environment</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>Create a .env file and fill in your details:</Typography>
                    <CodeBlock code={`cp gittensor/miner/.env.example gittensor/miner/.env

# Edit .env manually or use sed commands (replace placeholders first)
mypat="<your_github_pat_here>"
netuid=422                # 74 for mainnet
network="test"            # finney for mainnet
coldkey="<your_coldkey_wallet_name>"
hotkey="<your_hotkey_name>"

sed -i \\
  -e "s|^GITTENSOR_MINER_PAT=.*|GITTENSOR_MINER_PAT=$mypat|" \\
  -e "s|^NETUID=.*|NETUID=$netuid|" \\
  -e "s|^SUBTENSOR_NETWORK=.*|SUBTENSOR_NETWORK=$network|" \\
  -e "s|^WALLET_NAME=.*|WALLET_NAME=$coldkey|" \\
  -e "s|^HOTKEY_NAME=.*|HOTKEY_NAME=$hotkey|" \\
  gittensor/miner/.env`} />

                    <Typography variant="body2" sx={{ mb: 1, mt: 2 }}>Run the setup script:</Typography>
                    <CodeBlock code={`sudo chmod +x scripts/*
./scripts/setup_env.sh`} />


                    <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold", mt: 3 }}>C. Run miner & Autoupdater</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>Start the processes with PM2:</Typography>
                    <CodeBlock code={`# Start Miner
./scripts/run_miner.sh

# Start Autoupdater
./scripts/run_autoupdater.sh --processes miner --check-interval 900`} />
                </Paper>

                <Paper sx={{ p: 4, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 3 }}>
                    <SectionHeading>5. Get Paid: Tag Your Code</SectionHeading>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        For Gittensor to track your contributions and reward you, every Pull Request MUST include the following tagline
                        at the end of the PR description (last 150 characters).
                    </Typography>

                    <Alert severity="warning" sx={{ mb: 2, backgroundColor: "rgba(255, 152, 0, 0.1)", color: "#ffb74d" }}>
                        Without this tag, your contributions will NOT be tracked and you will receive NO rewards.
                    </Alert>

                    <CodeBlock code='Contribution by Gittensor, see my contribution statistics at https://gittensor.io/miners/details?githubId={github_id}' />

                    <Typography variant="body2" color="text.secondary">
                        Replace <code>{`{github_id}`}</code> with your actual GitHub username.
                    </Typography>
                </Paper>

                <Paper sx={{ p: 4, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 3 }}>
                    <SectionHeading>Process Management</SectionHeading>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Useful PM2 commands for monitoring:
                    </Typography>
                    <CodeBlock code={`# Status
pm2 status
pm2 list

# Logs
pm2 logs gt-miner
pm2 logs gt-autoupdater

# Restart
pm2 restart gt-miner`} />
                </Paper>
            </Stack>
        </Box >
    );
};
