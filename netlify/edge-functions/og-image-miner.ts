// Dynamic OG Image Generator for Miners
// Generates a custom 1200x630 image with miner stats

export default async (request: Request) => {
    const url = new URL(request.url);
    const githubId = url.searchParams.get("githubId");

    if (!githubId) {
        return new Response("Missing githubId parameter", { status: 400 });
    }

    try {
        // Fetch miner stats
        const statsResponse = await fetch(`https://api.gittensor.io/miners/${githubId}/stats`);

        let stats = {
            totalScore: 0,
            totalPRs: 0,
            totalAdditions: 0,
            totalDeletions: 0,
            totalOpenPrs: 0,
        };

        let rank = "N/A";
        let username = githubId;

        if (statsResponse.ok) {
            stats = await statsResponse.json();

            // Get rank
            const allMinersResponse = await fetch(`https://api.gittensor.io/miners/all/stats`);
            if (allMinersResponse.ok) {
                const allMiners = await allMinersResponse.json();
                const sortedMiners = allMiners.sort((a: any, b: any) => (b.totalScore || 0) - (a.totalScore || 0));
                const minerIndex = sortedMiners.findIndex((m: any) => m.githubId === githubId);
                if (minerIndex !== -1) {
                    rank = `#${minerIndex + 1}`;
                }
            }

            // Get GitHub username
            if (/^\d+$/.test(githubId)) {
                try {
                    const githubResponse = await fetch(`https://api.github.com/user/${githubId}`);
                    if (githubResponse.ok) {
                        const githubData = await githubResponse.json();
                        username = githubData.login || githubId;
                    }
                } catch (e) {
                    console.error("Failed to fetch GitHub username:", e);
                }
            }
        }

        // Generate SVG image
        const avatarUrl = /^\d+$/.test(githubId)
            ? `https://avatars.githubusercontent.com/u/${githubId}?s=200`
            : `https://github.com/${githubId}.png?size=200`;

        const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="1200" height="630" fill="#000000"/>
        
        <!-- Subtle grid pattern -->
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a1a1a" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="1200" height="630" fill="url(#grid)" opacity="0.3"/>
        
        <!-- Avatar circle background -->
        <circle cx="200" cy="315" r="110" fill="#1a1a1a"/>
        
        <!-- Avatar (this will be a placeholder - browsers will need to fetch it) -->
        <clipPath id="avatarClip">
          <circle cx="200" cy="315" r="100"/>
        </clipPath>
        
        <!-- Glow effect for avatar -->
        <circle cx="200" cy="315" r="105" fill="none" stroke="#00ffff" stroke-width="2" opacity="0.5"/>
        
        <!-- Stats container -->
        <rect x="350" y="100" width="800" height="430" fill="rgba(26, 26, 26, 0.5)" rx="20"/>
        
        <!-- Username -->
        <text x="750" y="180" font-family="'JetBrains Mono', monospace" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle">
          ${username}
        </text>
        
        <!-- Rank -->
        <text x="750" y="250" font-family="'JetBrains Mono', monospace" font-size="48" fill="#00ffff" text-anchor="middle">
          Rank ${rank}
        </text>
        
        <!-- Stats -->
        <text x="750" y="330" font-family="'JetBrains Mono', monospace" font-size="32" fill="#ffffff" text-anchor="middle">
          Score: ${stats.totalScore?.toFixed(2) || 'N/A'}
        </text>
        
        <text x="750" y="380" font-family="'JetBrains Mono', monospace" font-size="28" fill="#cccccc" text-anchor="middle">
          PRs: ${stats.totalPRs || 0} | Lines: +${stats.totalAdditions || 0}/-${stats.totalDeletions || 0}
        </text>
        
        <text x="750" y="420" font-family="'JetBrains Mono', monospace" font-size="28" fill="#cccccc" text-anchor="middle">
          Open PRs: ${stats.totalOpenPrs || 0}
        </text>
        
        <!-- Gittensor branding -->
        <text x="750" y="490" font-family="'JetBrains Mono', monospace" font-size="24" fill="#666666" text-anchor="middle">
          Gittensor
        </text>
      </svg>
    `;

        return new Response(svg, {
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "public, max-age=300",
            },
        });
    } catch (error) {
        console.error("Error generating OG image:", error);
        return new Response("Error generating image", { status: 500 });
    }
};

export const config = {
    path: "/api/og-image/miner",
};
