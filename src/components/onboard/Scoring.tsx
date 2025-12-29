import React from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link,
  Grid,
} from "@mui/material";

const CodeBlock: React.FC<{ code: string }> = ({ code }) => (
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

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Typography
    variant="h5"
    sx={{
      mb: 2,
      mt: 4,
      fontWeight: "bold",
      color: "text.primary",
      fontFamily: '"JetBrains Mono", monospace',
    }}
  >
    {children}
  </Typography>
);

const SubHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="h6"
    sx={{ mb: 1.5, mt: 3, fontWeight: "bold", color: "#fff" }}
  >
    {children}
  </Typography>
);

export const Scoring: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", p: { xs: 2, md: 0 } }}>
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", mb: 4, display: "block" }}
      >
        Last updated 12/22/25
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 5,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
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
          TL;DR: HOW TO MAXIMIZE REWARDS
        </Typography>

        <Grid container spacing={3}>
          {[
            {
              title: "Merge PRs",
              desc: "Focus on merging code changes to high weighted repositories. Your score's main factor is determined by the weight of the repository.",
            },
            {
              title: "Solve Issues",
              desc: "Link your PR to the issue it resolves (e.g. 'Closes #123'). Resolving older issues applies a higher bonus multiplier.",
            },
            {
              title: "Tag Code",
              desc: "Include the mandatory Gittensor tagline in your PR description. Without this tag, your work will not be rewarded.",
            },
            {
              title: "Credibility",
              desc: "Keep your merge rate high. A strong ratio of merged vs. closed PRs increases your credibility and unlocks tier multipliers.",
            },
          ].map((item, index) => (
            <Grid item xs={12} md={3} key={index}>
              <Box
                sx={{
                  height: "100%",
                  position: "relative",
                  p: 3,
                  borderRadius: 4,
                  bgcolor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ position: "relative", zIndex: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", color: "#fff", mb: 1 }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      lineHeight: 1.5,
                      display: "block",
                    }}
                  >
                    {item.desc}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Stack spacing={4}>
        <Paper
          sx={{
            p: 4,
            backgroundColor: "rgba(255,255,255,0.02)",
            borderRadius: 3,
          }}
        >
          <SectionHeading>
            1. Miner Query & Credential Validation
          </SectionHeading>

          <SubHeading>Query Process</SubHeading>
          <Typography variant="body1">
            Validator queries each miner UID for their GitHub PAT via the
            GitPatSynapse protocol. Miners must respond with a valid GitHub
            access token.
          </Typography>

          <SubHeading>Validation Checks</SubHeading>
          <Typography variant="body1" sx={{ mb: 1 }}>
            PRs are loaded from the GitHub API and filtered through several
            validation checks:
          </Typography>
          <ul
            style={{
              paddingLeft: "1.2rem",
              lineHeight: "1.8",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            <li>
              <strong>GitHub Account Validation:</strong> PAT must be valid and
              account must be at least 180 days old to prevent spam.
            </li>
            <li>
              <strong>Response Validation:</strong> Special recycle UID (0) is
              skipped. Miners with no response or invalid PAT are marked as
              failed. GitHub ID is extracted for duplicate detection.
            </li>
          </ul>
        </Paper>

        <Paper
          sx={{
            p: 4,
            backgroundColor: "rgba(255,255,255,0.02)",
            borderRadius: 3,
          }}
        >
          <SectionHeading>2. PR Loading & Filtering</SectionHeading>

          <SubHeading>PR Types Loaded</SubHeading>
          <ul
            style={{
              paddingLeft: "1.2rem",
              lineHeight: "1.8",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            <li>
              <strong>Merged PRs:</strong> Count toward earned score
            </li>
            <li>
              <strong>Open PRs:</strong> Subject to collateral deduction
            </li>
            <li>
              <strong>Closed PRs:</strong> Count toward credibility calculation
              only
            </li>
          </ul>

          <SubHeading>Lookback Period</SubHeading>
          <Typography variant="body1">
            PRs are loaded within a 90-day lookback window from merge date. Only
            PRs to incentivized repositories are considered.
          </Typography>

          <SubHeading>PR Filtering Criteria</SubHeading>
          <ul
            style={{
              paddingLeft: "1.2rem",
              lineHeight: "1.8",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            <li>
              <strong>Author Association:</strong> PRs from OWNER, MEMBER, or
              COLLABORATOR are ignored to prevent gaming.
            </li>
            <li>
              <strong>Repository Validation:</strong> PR must be to an
              incentivized repository in the master list with a valid tier
              configuration.
            </li>
            <li>
              <strong>Gittensor Tagging (MANDATORY):</strong> PRs must include
              the Gittensor tagline in the last 150 chars of the description.
              Format:
            </li>
          </ul>
          <CodeBlock code="Contribution by Gittensor, see my contribution statistics at https://gittensor.io/miners/details?githubId={github_id}" />
          <Typography variant="body2" color="error.main">
            PRs without proper tagging receive a 0x multiplier.
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 4,
            backgroundColor: "rgba(255,255,255,0.02)",
            borderRadius: 3,
          }}
        >
          <SectionHeading>3. Repository Tiers</SectionHeading>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Repositories are organized into three tiers. Higher tiers offer
            stronger credibility multipliers.
          </Typography>
          <TableContainer
            component={Paper}
            sx={{ backgroundColor: "rgba(255,255,255,0.05)", mb: 3 }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "text.primary", fontWeight: "bold" }}>
                    Tier
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    Required Merges
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    Required Credibility
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    Credibility Scalar
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    Base Score
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    Max Bonus
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", color: "#cd7f32" }}>
                    Bronze
                  </TableCell>
                  <TableCell>None</TableCell>
                  <TableCell>None</TableCell>
                  <TableCell>1 (Linear)</TableCell>
                  <TableCell>50</TableCell>
                  <TableCell>20</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", color: "#c0c0c0" }}>
                    Silver
                  </TableCell>
                  <TableCell>3 merged PRs</TableCell>
                  <TableCell>0.50 (50%)</TableCell>
                  <TableCell>2 (Squared)</TableCell>
                  <TableCell>50</TableCell>
                  <TableCell>20</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", color: "#ffd700" }}>
                    Gold
                  </TableCell>
                  <TableCell>5 merged PRs</TableCell>
                  <TableCell>0.70 (70%)</TableCell>
                  <TableCell>3 (Cubed)</TableCell>
                  <TableCell>50</TableCell>
                  <TableCell>20</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <SubHeading>Tier Unlocking</SubHeading>
          <ul
            style={{
              paddingLeft: "1.2rem",
              lineHeight: "1.8",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            <li>
              <strong>Bronze:</strong> Always unlocked.
            </li>
            <li>
              <strong>Silver:</strong> Requires 3+ merged PRs to Bronze repos
              with ≥50% credibility.
            </li>
            <li>
              <strong>Gold:</strong> Requires 5+ merged PRs to Silver repos with
              ≥70% credibility AND Silver tier requirements met.
            </li>
          </ul>
        </Paper>

        <Paper
          sx={{
            p: 4,
            backgroundColor: "rgba(255,255,255,0.02)",
            borderRadius: 3,
          }}
        >
          <SectionHeading>4. Base Score Calculation</SectionHeading>

          <SubHeading>Score Formula</SubHeading>
          <CodeBlock code="base_score = tier_base_score + contribution_bonus" />
          <ul
            style={{
              paddingLeft: "1.2rem",
              lineHeight: "1.8",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            <li>
              <strong>Tier Base Score:</strong> 50 points (uniform).
            </li>
            <li>
              <strong>Contribution Bonus:</strong> Up to 20 points based on code
              volume.{" "}
              <code>bonus = min(1.0, contribution_score / 2000) * 20</code>
            </li>
          </ul>

          <SubHeading>File Change Scoring</SubHeading>
          <Typography variant="body1">
            Each file extension has a weight (default 0.12). Lines are scored if
            they are code changes (added/deleted).
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, fontWeight: "bold" }}>
            NOT Counted:
          </Typography>
          <ul
            style={{
              paddingLeft: "1.2rem",
              lineHeight: "1.8",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            <li>Blank lines, Comment-only lines</li>
            <li>Typo corrections (Levenshtein distance &lt; 2)</li>
            <li>Test files (receive 0.05x weight)</li>
            <li>Mitigated files (md, txt, json) beyond first 300 lines</li>
          </ul>
        </Paper>

        <Paper
          sx={{
            p: 4,
            backgroundColor: "rgba(255,255,255,0.02)",
            borderRadius: 3,
          }}
        >
          <SectionHeading>5. Multipliers</SectionHeading>
          <Typography variant="body1">
            For merged PRs, the final score formula is:
          </Typography>
          <CodeBlock
            code={`earned_score = base_score
               × repo_weight_multiplier
               × issue_multiplier
               × gittensor_tag_multiplier
               × open_pr_spam_multiplier
               × time_decay_multiplier
               × repository_uniqueness_multiplier
               × credibility_multiplier`}
          />

          <Stack spacing={3} sx={{ mt: 2 }}>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", color: "text.primary" }}
              >
                5.1 Repository Weight
              </Typography>
              <Typography variant="body2">
                Assigned by subnet (0.01 - 1.0). Higher weight = more valuable
                contributions.
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", color: "text.primary" }}
              >
                5.2 Issue Multiplier (1.0x - 1.9x)
              </Typography>
              <Typography variant="body2">
                Bonus for closing issues. Older issues yield higher bonuses (max
                at 45+ days). Issue must be linked via "Closes #X".
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", color: "text.primary" }}
              >
                5.3 Gittensor Tag
              </Typography>
              <Typography variant="body2">
                1.0 if tag present, 0.0 if missing. MANDATORY.
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", color: "text.primary" }}
              >
                5.4 Open PR Spam Penalty
              </Typography>
              <Typography variant="body2">
                Penalizes miners with &gt;10 open PRs. 0.5x penalty per excess
                PR. &gt;12 open PRs = 0 score.
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", color: "text.primary" }}
              >
                5.5 Time Decay
              </Typography>
              <Typography variant="body2">
                Scores decay over time (Sigmoid). ~4 day halflife. 4h grace
                period.
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", color: "text.primary" }}
              >
                5.6 Repository Uniqueness
              </Typography>
              <Typography variant="body2">
                Rewards contributing to less-popular repos (1.0x - 1.4x).
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", color: "text.primary" }}
              >
                5.7 Credibility
              </Typography>
              <Typography variant="body2">
                Rewards high merge rates.{" "}
                <code>multiplier = credibility ^ tier_scalar</code>.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: 4,
            backgroundColor: "rgba(255,255,255,0.02)",
            borderRadius: 3,
          }}
        >
          <SectionHeading>6. Duplicate Account Detection</SectionHeading>
          <Typography variant="body1">
            Miners sharing the same GitHub account (detected via ID) are
            strictly penalized. Both UIDs receive a score of 0.0.
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 4,
            backgroundColor: "rgba(255,255,255,0.02)",
            borderRadius: 3,
          }}
        >
          <SectionHeading>7. Score Finalization</SectionHeading>
          <ul
            style={{
              paddingLeft: "1.2rem",
              lineHeight: "1.8",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            <li>Calculate Repository Contributor Counts (for uniqueness)</li>
            <li>Calculate Tier Credibility (merged / total attempts)</li>
            <li>Process Merged PRs (apply all multipliers)</li>
            <li>Calculate Open PR Collateral</li>
            <li>
              Deduct Collateral:{" "}
              <code>final_score = max(0, earned - collateral)</code>
            </li>
          </ul>
        </Paper>

        <Paper
          sx={{
            p: 4,
            backgroundColor: "rgba(255,255,255,0.02)",
            borderRadius: 3,
          }}
        >
          <SectionHeading>8. Open PR Collateral System</SectionHeading>
          <Typography variant="body1" sx={{ mb: 2 }}>
            To discourage spam, miners "pay" collateral for Open PRs created
            after Dec 25, 2025.
          </Typography>
          <CodeBlock code="collateral = potential_score × 0.20" />
          <Typography variant="body2" sx={{ mt: 1 }}>
            This 20% is deducted from your total Earned Score. It incentivizes
            quality over quantity and aligns miners with maintainers.
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 4,
            backgroundColor: "rgba(255,255,255,0.02)",
            borderRadius: 3,
          }}
        >
          <SectionHeading>9. Reward Normalization</SectionHeading>
          <Typography variant="body1">
            Scores are normalized linearly to sum to 1.0 across the subnet.
          </Typography>
          <CodeBlock code="normalized_score = score / sum(all_scores)" />
        </Paper>

        <Paper
          sx={{
            p: 4,
            backgroundColor: "rgba(255,255,255,0.02)",
            borderRadius: 3,
          }}
        >
          <SectionHeading>10. Dynamic Emissions</SectionHeading>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Rewards are scaled based on network-wide contribution metrics (Lines
            Changed, Merged PRs, Unique Repos). Unused emissions are recycled to
            UID 0.
          </Typography>
          <CodeBlock
            code={`scalar = (lines_scalar + merged_prs_scalar + unique_repos_scalar) / 3.0
scaled_reward = normalized_reward × scalar`}
          />
          <Typography variant="body2" sx={{ mt: 1 }}>
            This incentivizes network growth until metrics are high enough to
            unlock full emissions.
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 4,
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 3,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
            Complete Scoring Flow Summary
          </Typography>
          <Box
            component="ol"
            sx={{ pl: 2, color: "rgba(255,255,255,0.9)", lineHeight: 1.8 }}
          >
            <li>Query miner → Get GitHub PAT</li>
            <li>Validate PAT → Check account age (≥180 days)</li>
            <li>Load PRs → Merged, Open, Closed within 90-day lookback</li>
            <li>Filter PRs → Author association, repo tier, Gittensor tag</li>
            <li>
              Score file changes → Language weights, test detection, typo
              filtering
            </li>
            <li>Calculate base score → 50 + up to 20 bonus</li>
            <li>Apply multipliers (repo weight, issue, tag, spam, decay)</li>
            <li>Detect duplicate accounts → Zero score if shared</li>
            <li>Finalization (uniqueness, credibility)</li>
            <li>Calculate & Deduct Colateral (20% for open PRs)</li>
            <li>Normalize → Sum to 1.0</li>
            <li>Dynamic emissions → Scale by network metrics</li>
          </Box>
        </Paper>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Key Files Reference
          </Typography>
          <Typography variant="body2" component="div">
            <ul
              style={{
                paddingLeft: "1.2rem",
                lineHeight: "1.8",
                color: "text.secondary",
              }}
            >
              <li>
                <code>gittensor/validator/evaluation/scoring.py</code> - PR
                scoring logic
              </li>
              <li>
                <code>gittensor/validator/evaluation/credibility.py</code> -
                Tier credibility
              </li>
              <li>
                <code>gittensor/validator/evaluation/inspections.py</code> -
                Duplicate detection
              </li>
              <li>
                <code>gittensor/validator/configurations/tier_config.py</code> -
                Tier config
              </li>
              <li>
                <code>gittensor/constants.py</code> - All tunable constants
              </li>
            </ul>
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};
