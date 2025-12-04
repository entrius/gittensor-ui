import type { Context } from "https://edge.netlify.com";
import { HTMLRewriter } from "https://ghuc.cc/worker-tools/html-rewriter/index.ts";

// Types for API responses
interface MinerStats {
    totalScore: number;
    totalPRs: number;
    totalAdditions: number;
    totalDeletions: number;
    totalOpenPrs: number;
    rank?: number;
}

export default async (request: Request, context: Context) => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // Default meta tags
    let title = "Gittensor | Autonomous Software Development";
    let description = "The workforce for open source. Compete for rewards by contributing quality code to open source repositories.";
    let image = "https://magical-crostata-b02d38.netlify.app/og-images/gittensor-og.jpg";

    // Miner details page
    if (pathname === "/miners/details") {
        const githubId = searchParams.get("githubId");
        if (githubId) {
            let username = githubId;
            let rank: number | null = null;

            try {
                // If it's a numeric ID, fetch the GitHub username
                if (/^\d+$/.test(githubId)) {
                    const githubResponse = await fetch(`https://api.github.com/user/${githubId}`);
                    if (githubResponse.ok) {
                        const githubData = await githubResponse.json();
                        username = githubData.login || githubId;
                    }
                }

                // Fetch miner stats from API
                const statsResponse = await fetch(`https://api.gittensor.io/miners/${githubId}/stats`);
                if (statsResponse.ok) {
                    const stats: MinerStats = await statsResponse.json();

                    // Get rank if available
                    if (stats.rank) {
                        rank = stats.rank;
                    }

                    // Create rich description with rank and key stats
                    const statParts = [];

                    if (rank !== null) {
                        statParts.push(`Rank #${rank}`);
                    }

                    if (stats.totalScore !== undefined) {
                        statParts.push(`Score: ${stats.totalScore.toFixed(2)}`);
                    }

                    if (stats.totalPRs !== undefined) {
                        statParts.push(`${stats.totalPRs} PRs`);
                    }

                    if (stats.totalAdditions !== undefined || stats.totalDeletions !== undefined) {
                        const additions = stats.totalAdditions || 0;
                        const deletions = stats.totalDeletions || 0;
                        statParts.push(`${additions.toLocaleString()}+ / ${deletions.toLocaleString()}- lines`);
                    }

                    if (stats.totalOpenPrs !== undefined && stats.totalOpenPrs > 0) {
                        statParts.push(`${stats.totalOpenPrs} open`);
                    }

                    description = statParts.join(' • ');
                }
            } catch (error) {
                console.error("Failed to fetch miner data:", error);
                // Fallback to generic description
                description = `View detailed statistics, contributions, and pull requests for ${username} on Gittensor.`;
            }

            // Build title with username and rank
            if (rank !== null) {
                title = `${username} | Rank #${rank} | Gittensor`;
            } else {
                title = `${username} | Gittensor`;
            }

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
            const repoOwner = repo.split("/")[0];
            const repoName = repo.split("/")[1] || repo;

            try {
                // Fetch repository stats from Gittensor API
                const repoStatsResponse = await fetch(`https://api.gittensor.io/miners/repository/${encodeURIComponent(repo)}/stats`);

                if (repoStatsResponse.ok) {
                    const repoStats = await repoStatsResponse.json();

                    // Build description with repository stats
                    const statParts = [];

                    if (repoStats.totalContributors !== undefined) {
                        statParts.push(`${repoStats.totalContributors} contributors`);
                    }

                    if (repoStats.totalPRs !== undefined) {
                        statParts.push(`${repoStats.totalPRs} PRs`);
                    }

                    if (repoStats.totalCommits !== undefined) {
                        statParts.push(`${repoStats.totalCommits} commits`);
                    }

                    if (repoStats.totalAdditions !== undefined || repoStats.totalDeletions !== undefined) {
                        const additions = repoStats.totalAdditions || 0;
                        const deletions = repoStats.totalDeletions || 0;
                        statParts.push(`${additions.toLocaleString()}+ / ${deletions.toLocaleString()}- lines`);
                    }

                    if (repoStats.weight !== undefined) {
                        statParts.push(`Weight: ${repoStats.weight.toFixed(4)}`);
                    }

                    description = statParts.length > 0
                        ? statParts.join(' • ')
                        : `View detailed statistics, contributors, and pull requests for ${repo} on Gittensor.`;
                } else {
                    // Fallback if API fails
                    description = `Open source repository on Gittensor. Track activity, contributions, and rewards for ${repo}.`;
                }
            } catch (error) {
                console.error("Failed to fetch repository stats:", error);
                description = `View detailed statistics, contributors, and pull requests for ${repo} on Gittensor.`;
            }

            title = `${repoName} | Gittensor`;

            // Use dynamic image generator for special orgs (opentensor, bitcoin)
            const avatarUrl = `https://github.com/${repoOwner}.png?size=1200`;
            const ownerLower = repoOwner.toLowerCase();

            if (ownerLower === "opentensor" || ownerLower === "bitcoin") {
                // Use the dynamic image generator with colored background
                image = `https://magical-crostata-b02d38.netlify.app/og-images/generate?avatar=${encodeURIComponent(avatarUrl)}&owner=${encodeURIComponent(repoOwner)}`;
            } else {
                // Use GitHub avatar directly
                image = avatarUrl;
            }
        }
    }

    // Fetch the original HTML
    const response = await context.next();

    // Use HTMLRewriter to modify meta tags
    const rewriter = new HTMLRewriter()
        .on("title", {
            element(element: any) {
                element.setInnerContent(title);
            },
        })
        .on('meta[name="title"]', {
            element(element: any) {
                element.setAttribute("content", title);
            },
        })
        .on('meta[name="description"]', {
            element(element: any) {
                element.setAttribute("content", description);
            },
        })
        .on('meta[property="og:title"]', {
            element(element: any) {
                element.setAttribute("content", title);
            },
        })
        .on('meta[property="og:description"]', {
            element(element: any) {
                element.setAttribute("content", description);
            },
        })
        .on('meta[property="og:image"]', {
            element(element: any) {
                element.setAttribute("content", image);
            },
        })
        .on('meta[property="twitter:title"]', {
            element(element: any) {
                element.setAttribute("content", title);
            },
        })
        .on('meta[property="twitter:description"]', {
            element(element: any) {
                element.setAttribute("content", description);
            },
        })
        .on('meta[property="twitter:image"]', {
            element(element: any) {
                element.setAttribute("content", image);
            },
        });

    return rewriter.transform(response);
};

export const config = {
    path: ["/miners/details", "/miners/repository"],
};
