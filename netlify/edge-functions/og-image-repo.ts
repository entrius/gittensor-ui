// Dynamic OG Image Generator for Repositories
// Generates a custom 1200x630 image with repo stats

export default async (request: Request) => {
    const url = new URL(request.url);
    const repoName = url.searchParams.get("repo");

    if (!repoName) {
        return new Response("Missing repo parameter", { status: 400 });
    }

    try {
        const repoOwner = repoName.split("/")[0];
        const repoShortName = repoName.split("/")[1] || repoName;

        // Generate SVG image
        const avatarUrl = `https://github.com/${repoOwner}.png?size=200`;

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
        
        <!-- Glow effect for avatar -->
        <circle cx="200" cy="315" r="105" fill="none" stroke="#00ffff" stroke-width="2" opacity="0.5"/>
        
        <!-- Stats container -->
        <rect x="350" y="150" width="800" height="330" fill="rgba(26, 26, 26, 0.5)" rx="20"/>
        
        <!-- Repository name -->
        <text x="750" y="240" font-family="'JetBrains Mono', monospace" font-size="56" font-weight="bold" fill="#ffffff" text-anchor="middle">
          ${repoShortName}
        </text>
        
        <!-- Owner -->
        <text x="750" y="300" font-family="'JetBrains Mono', monospace" font-size="36" fill="#00ffff" text-anchor="middle">
          by ${repoOwner}
        </text>
        
        <!-- Description -->
        <text x="750" y="370" font-family="'JetBrains Mono', monospace" font-size="28" fill="#cccccc" text-anchor="middle">
          Repository Statistics
        </text>
        
        <!-- Gittensor branding -->
        <text x="750" y="440" font-family="'JetBrains Mono', monospace" font-size="24" fill="#666666" text-anchor="middle">
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
    path: "/api/og-image/repo",
};
