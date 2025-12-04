import { ImageResponse } from "https://deno.land/x/og_edge/mod.ts";

export default async (req: Request) => {
    const url = new URL(req.url);
    const githubId = url.searchParams.get("githubId");

    if (!githubId) {
        return new Response("Missing githubId parameter", { status: 400 });
    }

    let username = githubId;
    let rank = "";
    let score = "N/A";
    let prs = "0";
    let additions = "0";
    let deletions = "0";
    let avatarUrl = "";

    try {
        // Fetch GitHub username if numeric ID
        if (/^\d+$/.test(githubId)) {
            const githubResponse = await fetch(`https://api.github.com/user/${githubId}`);
            if (githubResponse.ok) {
                const githubData = await githubResponse.json();
                username = githubData.login || githubId;
                avatarUrl = `https://avatars.githubusercontent.com/u/${githubId}?s=400`;
            }
        } else {
            avatarUrl = `https://github.com/${githubId}.png?size=400`;
        }

        // Fetch miner stats
        const statsResponse = await fetch(`https://api.gittensor.io/miners/${githubId}/stats`);
        if (statsResponse.ok) {
            const stats = await statsResponse.json();

            if (stats.rank) rank = `#${stats.rank}`;
            if (stats.totalScore) score = stats.totalScore.toFixed(2);
            if (stats.totalPRs) prs = stats.totalPRs.toString();
            if (stats.totalAdditions) additions = stats.totalAdditions.toLocaleString();
            if (stats.totalDeletions) deletions = stats.totalDeletions.toLocaleString();
        }
    } catch (error) {
        console.error("Failed to fetch miner data:", error);
    }

    return new ImageResponse(
        (
            <div
        style= {{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        backgroundImage: "linear-gradient(to bottom right, #000 0%, #1a1a1a 100%)",
    }}
      >
    {/* Gittensor Logo/Title */ }
    < div
style = {{
    display: "flex",
        position: "absolute",
            top: 40,
                left: 60,
                    fontSize: 32,
                        fontWeight: 700,
                            color: "#fff",
                                fontFamily: "JetBrains Mono, monospace",
          }}
        >
    GITTENSOR
    </div>

{/* Main Content */ }
<div
          style={
    {
        display: "flex",
            flexDirection: "row",
                alignItems: "center",
                    gap: 60,
          }
}
        >
    {/* GitHub Avatar */ }
    < img
src = { avatarUrl }
width = { 200}
height = { 200}
style = {{
    borderRadius: 100,
        border: "4px solid #00ffff",
            }}
          />

{/* Stats Section */ }
<div
            style={
    {
        display: "flex",
            flexDirection: "column",
                gap: 20,
            }
}
          >
    {/* Username and Rank */ }
    < div
style = {{
    display: "flex",
        fontSize: 48,
            fontWeight: 700,
                color: "#fff",
                    fontFamily: "JetBrains Mono, monospace",
              }}
            >
    { username }
{
    rank && (
        <span
                  style={
        {
            fontSize: 48,
                fontWeight: 700,
                    color: "#00ffff",
                        marginLeft: 20,
                  }
    }
                >
        { rank }
        </span>
              )
}
</div>

{/* Stats Grid */ }
<div
              style={
    {
        display: "flex",
            flexDirection: "row",
                gap: 40,
              }
}
            >
    <div
                style={
    {
        display: "flex",
            flexDirection: "column",
                }
}
              >
    <span
                  style={
    {
        fontSize: 14,
            color: "#888",
                fontFamily: "JetBrains Mono, monospace",
                    textTransform: "uppercase",
                  }
}
                >
    SCORE
    </span>
    < span
style = {{
    fontSize: 32,
        fontWeight: 700,
            color: "#fff",
                fontFamily: "JetBrains Mono, monospace",
                  }}
                >
    { score }
    </span>
    </div>

    < div
style = {{
    display: "flex",
        flexDirection: "column",
                }}
              >
    <span
                  style={
    {
        fontSize: 14,
            color: "#888",
                fontFamily: "JetBrains Mono, monospace",
                    textTransform: "uppercase",
                  }
}
                >
    PULL REQUESTS
        </span>
        < span
style = {{
    fontSize: 32,
        fontWeight: 700,
            color: "#fff",
                fontFamily: "JetBrains Mono, monospace",
                  }}
                >
    { prs }
    </span>
    </div>

    < div
style = {{
    display: "flex",
        flexDirection: "column",
                }}
              >
    <span
                  style={
    {
        fontSize: 14,
            color: "#888",
                fontFamily: "JetBrains Mono, monospace",
                    textTransform: "uppercase",
                  }
}
                >
    LINES
    </span>
    < span
style = {{
    fontSize: 28,
        fontWeight: 700,
            color: "#0f0",
                fontFamily: "JetBrains Mono, monospace",
                  }}
                >
    +{ additions }
    </span>
    < span
style = {{
    fontSize: 28,
        fontWeight: 700,
            color: "#f00",
                fontFamily: "JetBrains Mono, monospace",
                  }}
                >
    -{ deletions }
    </span>
    </div>
    </div>
    </div>
    </div>
    </div>
    ),
{
    width: 1200,
        height: 630,
    }
  );
};

export const config = {
    path: "/og-image/miner",
};
