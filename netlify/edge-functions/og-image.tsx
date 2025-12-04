/** @jsxImportSource https://esm.sh/react@18.2.0 */

import { ImageResponse } from "https://deno.land/x/og_edge/mod.ts";

// ==================== TYPES ====================
interface MinerData {
  username: string;
  rank?: number;
  score: string;
  prs: string;
  additions: string;
  deletions: string;
  avatarUrl: string;
}

interface RepoData {
  repoName: string;
  owner: string;
  totalContributors?: number;
  totalPRs?: number;
  totalCommits?: number;
  totalAdditions?: number;
  totalDeletions?: number;
  weight?: number;
  ownerAvatar: string;
}

// ==================== TEMPLATES ====================

// Miner Template - GitHub-style card with stats
function MinerTemplate({ username, rank, score, prs, additions, deletions, avatarUrl }: MinerData) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        backgroundImage: "linear-gradient(to bottom right, #000 0%, #1a1a1a 100%)",
        padding: "60px",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: "40px",
          left: "60px",
          fontSize: "32px",
          fontWeight: 700,
          color: "#fff",
        }}
      >
        GITTENSOR
      </div>

      {/* Main Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "60px",
        }}
      >
        {/* Avatar */}
        <img
          src={avatarUrl}
          width={200}
          height={200}
          style={{
            borderRadius: "100px",
            border: "4px solid #00ffff",
          }}
        />

        {/* Stats */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Username and Rank */}
          <div
            style={{
              display: "flex",
              fontSize: "48px",
              fontWeight: 700,
              color: "#fff",
              alignItems: "center",
            }}
          >
            {username}
            {rank && (
              <span
                style={{
                  fontSize: "48px",
                  fontWeight: 700,
                  color: "#00ffff",
                  marginLeft: "20px",
                }}
              >
                #{rank}
              </span>
            )}
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "40px",
            }}
          >
            {/* Score */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "14px",
                  color: "#888",
                  textTransform: "uppercase",
                  marginBottom: "5px",
                }}
              >
                SCORE
              </span>
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {score}
              </span>
            </div>

            {/* PRs */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "14px",
                  color: "#888",
                  textTransform: "uppercase",
                  marginBottom: "5px",
                }}
              >
                PULL REQUESTS
              </span>
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {prs}
              </span>
            </div>

            {/* Lines */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "14px",
                  color: "#888",
                  textTransform: "uppercase",
                  marginBottom: "5px",
                }}
              >
                LINES
              </span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "#0f0",
                  }}
                >
                  +{additions}
                </span>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "#f00",
                  }}
                >
                  -{deletions}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Repository Template - GitHub-style repository card
function RepoTemplate({
  repoName,
  owner,
  totalContributors,
  totalPRs,
  totalCommits,
  totalAdditions,
  totalDeletions,
  weight,
  ownerAvatar,
}: RepoData) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0d1117",
        backgroundImage: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
        padding: "60px",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: "40px",
          right: "60px",
          fontSize: "24px",
          fontWeight: 700,
          color: "#888",
        }}
      >
        GITTENSOR
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          marginBottom: "50px",
        }}
      >
        <img
          src={ownerAvatar}
          width={80}
          height={80}
          style={{
            borderRadius: "40px",
            border: "2px solid #30363d",
          }}
        />
        <div
          style={{
            fontSize: "48px",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          {owner}/{repoName}
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "40px",
        }}
      >
        {totalContributors !== undefined && (
          <RepoStat label="Contributors" value={totalContributors.toString()} icon="👥" />
        )}
        {totalPRs !== undefined && (
          <RepoStat label="Pull Requests" value={totalPRs.toString()} icon="🔀" />
        )}
        {totalCommits !== undefined && (
          <RepoStat label="Commits" value={totalCommits.toString()} icon="💾" />
        )}
        {(totalAdditions !== undefined || totalDeletions !== undefined) && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "16px",
                color: "#8b949e",
                textTransform: "uppercase",
                marginBottom: "10px",
              }}
            >
              📊 LINES CHANGED
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              <span style={{ fontSize: "32px", fontWeight: 700, color: "#3fb950" }}>
                +{(totalAdditions || 0).toLocaleString()}
              </span>
              <span style={{ fontSize: "32px", fontWeight: 700, color: "#f85149" }}>
                -{(totalDeletions || 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
        {weight !== undefined && (
          <RepoStat label="Weight" value={weight.toFixed(4)} icon="⚖️" />
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: "40px",
          fontSize: "20px",
          color: "#6e7681",
        }}
      >
        Track open source contributions and rewards
      </div>
    </div>
  );
}

// Helper component for repo stats
function RepoStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span
        style={{
          fontSize: "16px",
          color: "#8b949e",
          textTransform: "uppercase",
          marginBottom: "10px",
        }}
      >
        {icon} {label}
      </span>
      <span
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#fff",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// Home/Default Template
function HomeTemplate() {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        backgroundImage: "linear-gradient(135deg, #000 0%, #1a1a1a 50%, #000 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "30px",
        }}
      >
        <div
          style={{
            fontSize: "72px",
            fontWeight: 900,
            color: "#00ffff",
            letterSpacing: "-2px",
          }}
        >
          GITTENSOR
        </div>
        <div
          style={{
            fontSize: "36px",
            color: "#fff",
            fontWeight: 500,
          }}
        >
          Autonomous Software Development
        </div>
        <div
          style={{
            fontSize: "24px",
            color: "#888",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          The workforce for open source. Compete for rewards by contributing quality code.
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN HANDLER ====================

export default async (req: Request) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "home";

  try {
    // Route to appropriate template based on type
    if (type === "miner") {
      const githubId = url.searchParams.get("id");
      if (!githubId) {
        return new Response("Missing id parameter", { status: 400 });
      }

      let username = githubId;
      let rank: number | undefined;
      let score = "N/A";
      let prs = "0";
      let additions = "0";
      let deletions = "0";
      let avatarUrl = "";

      try {
        let numericGithubId = githubId;
        
        // If username provided, fetch numeric ID from GitHub API
        if (!/^\d+$/.test(githubId)) {
          const githubUserResponse = await fetch(`https://api.github.com/users/${githubId}`);
          if (githubUserResponse.ok) {
            const githubUserData = await githubUserResponse.json();
            numericGithubId = githubUserData.id.toString();
            username = githubUserData.login;
            avatarUrl = githubUserData.avatar_url || `https://github.com/${githubId}.png?size=400`;
          } else {
            avatarUrl = `https://github.com/${githubId}.png?size=400`;
          }
        } else {
          // Numeric ID provided, fetch username
          const githubResponse = await fetch(`https://api.github.com/user/${githubId}`);
          if (githubResponse.ok) {
            const githubData = await githubResponse.json();
            username = githubData.login || githubId;
            avatarUrl = `https://avatars.githubusercontent.com/u/${githubId}?s=400`;
          }
        }

        // Fetch all miners stats (has additions/deletions that single endpoint lacks)
        const allStatsResponse = await fetch("https://api.gittensor.io/miners/stats/all");
        if (allStatsResponse.ok) {
          const allStats = await allStatsResponse.json();
          
          // Find this miner's data
          const minerData = allStats.find((m: any) => m.githubId === numericGithubId);
          
          if (minerData) {
            // Calculate rank
            const sortedByScore = allStats
              .filter((m: any) => m.totalScore)
              .sort((a: any, b: any) => parseFloat(b.totalScore) - parseFloat(a.totalScore));
            const minerRank = sortedByScore.findIndex((m: any) => m.githubId === numericGithubId);
            if (minerRank !== -1) rank = minerRank + 1;
            
            // Get stats from all miners endpoint (has additions/deletions)
            if (minerData.totalScore) score = parseFloat(minerData.totalScore).toFixed(2);
            if (minerData.totalPrs !== undefined) prs = minerData.totalPrs.toString();
            if (minerData.totalAdditions !== undefined) additions = minerData.totalAdditions.toLocaleString();
            if (minerData.totalDeletions !== undefined) deletions = minerData.totalDeletions.toLocaleString();
          }
        } else {
          console.error("All stats API failed:", allStatsResponse.status, await allStatsResponse.text());
        }
      } catch (error) {
        console.error("Failed to fetch miner data:", error);
      }

      return new ImageResponse(
        <MinerTemplate
          username={username}
          rank={rank}
          score={score}
          prs={prs}
          additions={additions}
          deletions={deletions}
          avatarUrl={avatarUrl}
        />,
        {
          width: 1200,
          height: 630,
          headers: {
            "cache-control": "public, s-maxage=300, max-age=300",
            "content-type": "image/png",
          },
        }
      );
    } else if (type === "repository") {
      const repo = url.searchParams.get("repo");
      if (!repo) {
        return new Response("Missing repo parameter", { status: 400 });
      }

      const repoOwner = repo.split("/")[0];
      const repoName = repo.split("/")[1] || repo;
      let ownerAvatar = `https://github.com/${repoOwner}.png?size=400`;
      
      let repoData: Partial<RepoData> = {
        repoName,
        owner: repoOwner,
        ownerAvatar,
      };

      try {
        // Fetch repository stats from Gittensor API
        const repoStatsResponse = await fetch(
          `https://api.gittensor.io/miners/repository/${encodeURIComponent(repo)}/stats`
        );

        if (repoStatsResponse.ok) {
          const repoStats = await repoStatsResponse.json();
          repoData = {
            ...repoData,
            totalContributors: repoStats.totalContributors,
            totalPRs: repoStats.totalPRs,
            totalCommits: repoStats.totalCommits,
            totalAdditions: repoStats.totalAdditions,
            totalDeletions: repoStats.totalDeletions,
            weight: repoStats.weight,
          };
        }
      } catch (error) {
        console.error("Failed to fetch repository stats:", error);
      }

      return new ImageResponse(
        <RepoTemplate {...(repoData as RepoData)} />,
        {
          width: 1200,
          height: 630,
          headers: {
            "cache-control": "public, s-maxage=300, max-age=300",
            "content-type": "image/png",
          },
        }
      );
    } else {
      // Default home template
      return new ImageResponse(<HomeTemplate />, {
        width: 1200,
        height: 630,
        headers: {
          "cache-control": "public, s-maxage=3600, max-age=3600",
          "content-type": "image/png",
        },
      });
    }
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new Response("Error generating image", { status: 500 });
  }
};

export const config = {
  path: "/og-image",
};
