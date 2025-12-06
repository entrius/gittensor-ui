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
  baseUrl: string;
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
  baseUrl: string;
}

// ==================== TEMPLATES ====================

// Miner Template - GitHub-style card with stats
function MinerTemplate({ username, rank, score, prs, additions, deletions, avatarUrl, baseUrl }: MinerData) {
  // Calculate percentage for contribution bar
  const additionsNum = parseInt(additions.replace(/,/g, "")) || 0;
  const deletionsNum = parseInt(deletions.replace(/,/g, "")) || 0;
  const total = additionsNum + deletionsNum;
  const additionsPercent = total > 0 ? (additionsNum / total) * 100 : 50;

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
        padding: "60px 60px 0 60px",
        position: "relative",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: "40px",
          left: "60px",
          fontSize: "40px",
          fontWeight: 700,
          color: "#fff",
        }}
      >
        GITTENSOR
      </div>

      {/* Logo Image - Top Right */}
      <img
        src={`${baseUrl}/gittensor__1_-removebg-preview.png`}
        width={80}
        height={80}
        style={{
          position: "absolute",
          top: "40px",
          right: "60px",
        }}
      />

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
          width={240}
          height={240}
          style={{
            borderRadius: "120px",
            border: "6px solid #00ffff",
          }}
        />

        {/* Stats */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "30px",
          }}
        >
          {/* Username and Rank */}
          <div
            style={{
              display: "flex",
              fontSize: "64px",
              fontWeight: 700,
              color: "#fff",
              alignItems: "center",
            }}
          >
            {username}
            {rank && (
              <span
                style={{
                  fontSize: "64px",
                  fontWeight: 700,
                  color: "#00ffff",
                  marginLeft: "24px",
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
              gap: "80px",
            }}
          >
            {/* Score */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "28px",
                  color: "#c9d1d9",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                  letterSpacing: "2px",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#8b949e">
                  <path d="M12 .25a.75.75 0 0 1 .673.418l3.058 6.197 6.839.994a.75.75 0 0 1 .415 1.279l-4.948 4.823 1.168 6.811a.751.751 0 0 1-1.088.791L12 18.347l-6.117 3.216a.75.75 0 0 1-1.088-.79l1.168-6.812-4.948-4.823a.75.75 0 0 1 .416-1.28l6.838-.993L11.328.668A.75.75 0 0 1 12 .25Zm0 2.445L9.44 7.882a.75.75 0 0 1-.565.41l-5.725.832 4.143 4.038a.748.748 0 0 1 .215.664l-.978 5.702 5.121-2.692a.75.75 0 0 1 .698 0l5.12 2.692-.977-5.702a.748.748 0 0 1 .215-.664l4.143-4.038-5.725-.831a.75.75 0 0 1-.565-.41L12 2.694Z"></path>
                </svg>
                SCORE
              </span>
              <span
                style={{
                  fontSize: "44px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {score}
              </span>
            </div>

            {/* Divider */}
            <div
              style={{
                width: "2px",
                height: "80px",
                backgroundColor: "#30363d",
              }}
            />

            {/* PRs */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "28px",
                  color: "#c9d1d9",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                  letterSpacing: "2px",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#8b949e">
                  <path d="M15 13.25a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm-12.5 6a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm0-14.5a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0ZM5.75 6.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 6.5Zm0 14.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 21Zm12.5-6a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 18.25 15Z"></path>
                  <path d="M6.5 7.25c0 2.9 2.35 5.25 5.25 5.25h4.5V14h-4.5A6.75 6.75 0 0 1 5 7.25Z"></path>
                  <path d="M5.75 16.75A.75.75 0 0 1 5 16V8a.75.75 0 0 1 1.5 0v8a.75.75 0 0 1-.75.75Z"></path>
                </svg>
                PULL REQUESTS
              </span>
              <span
                style={{
                  fontSize: "44px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {prs}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lines positioned bottom right above bar */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: "24px",
          right: "60px",
          gap: "20px",
          fontSize: "44px",
          fontWeight: 700,
        }}
      >
        <span style={{ color: "#3fb950" }}>+{additions}</span>
        <span style={{ color: "#f85149" }}>-{deletions}</span>
      </div>

      {/* GitHub-style contribution bar at bottom */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: "0",
          left: "0",
          width: "100%",
          height: "8px",
          overflow: "hidden",
          backgroundColor: "#f85149",
        }}
      >
        <div
          style={{
            width: `${additionsPercent}%`,
            height: "100%",
            backgroundColor: "#3fb950",
          }}
        />
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
  baseUrl,
}: RepoData) {
  // Calculate percentage for contribution bar
  const additionsNum = totalAdditions || 0;
  const deletionsNum = totalDeletions || 0;
  const total = additionsNum + deletionsNum;
  const additionsPercent = total > 0 ? (additionsNum / total) * 100 : 50;

  // Format numbers
  const weightDisplay = weight !== undefined ? weight.toFixed(2) : "N/A";
  const prsDisplay = totalPRs !== undefined ? totalPRs.toLocaleString() : "0";
  const additionsDisplay = additionsNum.toLocaleString();
  const deletionsDisplay = deletionsNum.toLocaleString();

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
        padding: "60px 60px 0 60px",
        position: "relative",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: "40px",
          left: "60px",
          fontSize: "40px",
          fontWeight: 700,
          color: "#fff",
        }}
      >
        GITTENSOR
      </div>

      {/* Logo Image - Top Right */}
      <img
        src={`${baseUrl}/gittensor__1_-removebg-preview.png`}
        width={80}
        height={80}
        style={{
          position: "absolute",
          top: "40px",
          right: "60px",
        }}
      />

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
          src={ownerAvatar}
          width={240}
          height={240}
          style={{
            borderRadius: "120px",
            border: "6px solid #00ffff",
            backgroundColor: owner === "opentensor" ? "#ffffff" : owner === "bitcoin" ? "#F7931A" : "transparent",
          }}
        />

        {/* Stats */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "30px",
          }}
        >
          {/* Repo Name */}
          <div
            style={{
              display: "flex",
              fontSize: "56px",
              fontWeight: 700,
              color: "#fff",
              alignItems: "center",
            }}
          >
            {owner}/{repoName}
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "80px",
            }}
          >
            {/* Weight */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "28px",
                  color: "#c9d1d9",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                  letterSpacing: "2px",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#8b949e">
                  <path d="M12.75 2.75V4.5h1.975c.351 0 .694.106.984.303l1.697 1.154c.041.028.09.043.14.043h4.102a.75.75 0 0 1 0 1.5H20.07l3.366 7.68a.749.749 0 0 1-.23.896c-.1.074-.203.143-.31.206a6.296 6.296 0 0 1-.79.399 7.349 7.349 0 0 1-2.856.569 7.343 7.343 0 0 1-2.855-.568 6.205 6.205 0 0 1-.79-.4 3.205 3.205 0 0 1-.307-.202l-.005-.004a.749.749 0 0 1-.23-.896l3.368-7.68h-.886c-.351 0-.694-.106-.984-.303l-1.697-1.154a.246.246 0 0 0-.14-.043H12.75v14.5h4.487a.75.75 0 0 1 0 1.5H6.763a.75.75 0 0 1 0-1.5h4.487V6H9.275a.249.249 0 0 0-.14.043L7.439 7.197c-.29.197-.633.303-.984.303h-.886l3.368 7.68a.75.75 0 0 1-.209.878c-.08.065-.16.126-.31.223a6.077 6.077 0 0 1-.792.433 6.924 6.924 0 0 1-2.876.62 6.913 6.913 0 0 1-2.876-.62 6.077 6.077 0 0 1-.792-.433 3.483 3.483 0 0 1-.309-.221.762.762 0 0 1-.21-.88L3.93 7.5H2.353a.75.75 0 0 1 0-1.5h4.102c.05 0 .099-.015.141-.043l1.695-1.154c.29-.198.634-.303.985-.303h1.974V2.75a.75.75 0 0 1 1.5 0ZM2.193 15.198a5.414 5.414 0 0 0 2.557.635 5.414 5.414 0 0 0 2.557-.635L4.75 9.368Zm14.51-.024c.082.04.174.083.275.126.53.223 1.305.45 2.272.45a5.847 5.847 0 0 0 2.547-.576L19.25 9.367Z"></path>
                </svg>
                WEIGHT
              </span>
              <span
                style={{
                  fontSize: "44px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {weightDisplay}
              </span>
            </div>

            {/* Divider */}
            <div
              style={{
                width: "2px",
                height: "80px",
                backgroundColor: "#30363d",
              }}
            />

            {/* PRs */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "28px",
                  color: "#c9d1d9",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                  letterSpacing: "2px",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#8b949e">
                  <path d="M15 13.25a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm-12.5 6a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm0-14.5a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0ZM5.75 6.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 6.5Zm0 14.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 21Zm12.5-6a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 18.25 15Z"></path>
                  <path d="M6.5 7.25c0 2.9 2.35 5.25 5.25 5.25h4.5V14h-4.5A6.75 6.75 0 0 1 5 7.25Z"></path>
                  <path d="M5.75 16.75A.75.75 0 0 1 5 16V8a.75.75 0 0 1 1.5 0v8a.75.75 0 0 1-.75.75Z"></path>
                </svg>
                PULL REQUESTS
              </span>
              <span
                style={{
                  fontSize: "44px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {prsDisplay}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lines positioned bottom right above bar */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: "24px",
          right: "60px",
          gap: "20px",
          fontSize: "44px",
          fontWeight: 700,
        }}
      >
        <span style={{ color: "#3fb950" }}>+{additionsDisplay}</span>
        <span style={{ color: "#f85149" }}>-{deletionsDisplay}</span>
      </div>

      {/* GitHub-style contribution bar at bottom */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: "0",
          left: "0",
          width: "100%",
          height: "8px",
          overflow: "hidden",
          backgroundColor: "#f85149",
        }}
      >
        <div
          style={{
            width: `${additionsPercent}%`,
            height: "100%",
            backgroundColor: "#3fb950",
          }}
        />
      </div>
    </div>
  );
}

// Home/Default Template
function HomeTemplate({ baseUrl }: { baseUrl: string }) {
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
          gap: "40px",
        }}
      >
        <img
          src={`${baseUrl}/gittensor__1_-removebg-preview.png`}
          width={200}
          height={200}
        />
        <div
          style={{
            fontSize: "88px",
            fontWeight: 900,
            color: "#00ffff",
            letterSpacing: "-2px",
            marginTop: "20px",
          }}
        >
          GITTENSOR
        </div>
        <div
          style={{
            fontSize: "44px",
            color: "#fff",
            fontWeight: 500,
          }}
        >
          Autonomous Software Development
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "#888",
            textAlign: "center",
            maxWidth: "900px",
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
            if (minerData.totalScore) score = Math.round(parseFloat(minerData.totalScore)).toLocaleString();
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
          baseUrl={url.origin}
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
        baseUrl: url.origin,
      };

      try {
        // Fetch repository stats from Gittensor API
        // We need to fetch from two endpoints to get all data:
        // 1. /dash/repos for weight
        // 2. /miners/all/prs for contributions stats

        const [reposResponse, prsResponse] = await Promise.all([
          fetch("https://api.gittensor.io/dash/repos"),
          fetch("https://api.gittensor.io/miners/all/prs")
        ]);

        if (reposResponse.ok && prsResponse.ok) {
          const repos = await reposResponse.json();
          const prs = await prsResponse.json();

          // 1. Find repo weight
          const repoInfo = Array.isArray(repos) ? repos.find((r: any) => r.fullName === repo) : null;
          const weight = repoInfo ? parseFloat(repoInfo.weight) : 0;

          // 2. Calculate stats from PRs
          const prsList = Array.isArray(prs) ? prs : [];
          const repoPrs = prsList.filter((pr: any) => pr.repository === repo);

          const totalPRs = repoPrs.length;
          const totalCommits = repoPrs.reduce((sum: number, pr: any) => sum + (pr.commitCount || 0), 0);
          const totalAdditions = repoPrs.reduce((sum: number, pr: any) => sum + (pr.additions || 0), 0);
          const totalDeletions = repoPrs.reduce((sum: number, pr: any) => sum + (pr.deletions || 0), 0);
          const totalContributors = new Set(repoPrs.map((pr: any) => pr.githubId)).size;

          repoData = {
            ...repoData,
            totalContributors,
            totalPRs,
            totalCommits,
            totalAdditions,
            totalDeletions,
            weight,
          };
        } else {
          console.error("Failed to fetch data:", {
            reposStatus: reposResponse.status,
            prsStatus: prsResponse.status
          });
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
      return new ImageResponse(<HomeTemplate baseUrl={url.origin} />, {
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
