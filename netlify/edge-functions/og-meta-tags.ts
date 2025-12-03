import type { Context } from "https://edge.netlify.com";

// Types for API responses
interface MinerStats {
    totalScore: number;
    totalPRs: number;
    totalAdditions: number;
    totalDeletions: number;
    totalOpenPrs: number;
}

export default async (request: Request, context: Context) => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // Fetch the original HTML
    const response = await context.next();
    const html = await response.text();

    // Default meta tags
    let title = "Gittensor | Autonomous Software Development";
    let description = "The workforce for open source. Compete for rewards by contributing quality code to open source repositories.";
    let image = "https://magical-crostata-b02d38.netlify.app/og-images/gittensor-og.jpg";

    // Miner details page
    if (pathname === "/miners/details") {
        const githubId = searchParams.get("githubId");
        if (githubId) {
            try {
                // Fetch miner stats from API
                const statsResponse = await fetch(`https://api.gittensor.io/miners/${githubId}/stats`);
                if (statsResponse.ok) {
                    const stats: MinerStats = await statsResponse.json();

                    // Create rich description with actual stats
                    description = `Score: ${stats.totalScore?.toFixed(2) || 'N/A'} | PRs: ${stats.totalPRs || 0} | Lines: +${stats.totalAdditions || 0}/-${stats.totalDeletions || 0} | Open PRs: ${stats.totalOpenPrs || 0}`;
                    title = `${githubId} - Gittensor Miner`;
                }
            } catch (error) {
                console.error("Failed to fetch miner stats:", error);
                // Fallback to generic description
                description = `View detailed statistics, contributions, and pull requests for ${githubId} on Gittensor.`;
            }

            title = `${githubId} | Gittensor`;

            // Use correct avatar URL format
            image = /^\d+$/.test(githubId)
                ? `https://avatars.githubusercontent.com/u/${githubId}?s=1200`
                : `https://github.com/${githubId}.png?size=1200`;
        }
    }

    // Repository details page
    if (pathname === "/miners/repository") {
        const repo = searchParams.get("name");
        if (repo) {
            title = `${repo} | Gittensor`;
            description = `View detailed statistics, contributors, and pull requests for ${repo} on Gittensor. Track repository activity and open source contributions.`;

            // Extract owner from repo name (format: owner/repo)
            const repoOwner = repo.split("/")[0];
            image = `https://github.com/${repoOwner}.png?size=1200`;
        }
    }

    // Escape special characters for HTML attributes
    const escapeHtml = (str: string) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);

    // Replace meta tags in the HTML
    let modifiedHtml = html
        // Update title
        .replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`)
        // Update og:title
        .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${safeTitle}" />`)
        // Update twitter:title
        .replace(/<meta property="twitter:title" content=".*?" \/>/, `<meta property="twitter:title" content="${safeTitle}" />`)
        // Update og:description
        .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${safeDescription}" />`)
        // Update twitter:description
        .replace(/<meta property="twitter:description" content=".*?" \/>/, `<meta property="twitter:description" content="${safeDescription}" />`)
        // Update meta description
        .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${safeDescription}" />`)
        // Update og:image
        .replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${image}" />`)
        // Update twitter:image
        .replace(/<meta property="twitter:image" content=".*?" \/>/, `<meta property="twitter:image" content="${image}" />`);

    return new Response(modifiedHtml, {
        headers: {
            "content-type": "text/html",
            "cache-control": "public, max-age=300", // Cache for 5 minutes
        },
    });
};

export const config = {
    path: ["/miners/details", "/miners/repository"],
};
