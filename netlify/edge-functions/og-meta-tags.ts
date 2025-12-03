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
    const origin = url.origin; // e.g. https://magical-crostata-b02d38.netlify.app

    // Default meta tags
    let title = "Gittensor | Autonomous Software Development";
    let description = "The workforce for open source. Compete for rewards by contributing quality code to open source repositories.";
    let image = `${origin}/og-images/gittensor-og.jpg`;

    // Miner details page
    if (pathname === "/miners/details") {
        const githubId = searchParams.get("githubId");
        if (githubId) {
            let username = githubId;
            let rank: number | null = null;
            let stats: MinerStats | null = null;

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
                    stats = await statsResponse.json();

                    // Get rank if available
                    if (stats && stats.rank) {
                        rank = stats.rank;
                    }

                    // Create rich description with rank and key stats
                    const statParts = [];

                    if (rank !== null) {
                        statParts.push(`Rank #${rank}`);
                    }

                    if (stats && stats.totalScore !== undefined) {
                        statParts.push(`Score: ${stats.totalScore.toFixed(2)}`);
                    }

                    if (stats && stats.totalPRs !== undefined) {
                        statParts.push(`${stats.totalPRs} PRs`);
                    }

                    if (stats && (stats.totalAdditions !== undefined || stats.totalDeletions !== undefined)) {
                        const additions = stats.totalAdditions || 0;
                        const deletions = stats.totalDeletions || 0;
                        statParts.push(`${additions.toLocaleString()}+ / ${deletions.toLocaleString()}- lines`);
                    }

                    if (stats && stats.totalOpenPrs !== undefined && stats.totalOpenPrs > 0) {
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

            // Construct Dynamic Image URL
            const imgParams = new URLSearchParams();
            imgParams.set("title", username);
            imgParams.set("subtitle", "Gittensor Miner");
            imgParams.set("type", "miner");

            // Avatar URL
            const avatarUrl = /^\d+$/.test(githubId)
                ? `https://avatars.githubusercontent.com/u/${githubId}?s=400`
                : `https://github.com/${githubId}.png?size=400`;
            imgParams.set("avatar", avatarUrl);

            if (rank) imgParams.set("rank", rank.toString());
            if (stats) {
                if (stats.totalScore) imgParams.set("score", stats.totalScore.toFixed(2));
                if (stats.totalPRs) imgParams.set("prs", stats.totalPRs.toString());
                if (stats.totalAdditions) imgParams.set("additions", stats.totalAdditions.toString());
                if (stats.totalDeletions) imgParams.set("deletions", stats.totalDeletions.toString());
            }

            image = `${origin}/og-image?${imgParams.toString()}`;
        }
    }

    // Repository details page
    if (pathname === "/miners/repository") {
        const repo = searchParams.get("name");
        if (repo) {
            const repoOwner = repo.split("/")[0];
            const repoName = repo.split("/")[1] || repo;
            let repoStats: any = null;

            try {
                // Fetch repository stats from Gittensor API
                const repoStatsResponse = await fetch(`https://api.gittensor.io/miners/repository/${encodeURIComponent(repo)}/stats`);

                if (repoStatsResponse.ok) {
                    repoStats = await repoStatsResponse.json();

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

            // Construct Dynamic Image URL
            const imgParams = new URLSearchParams();
            imgParams.set("title", repoName);
            imgParams.set("subtitle", repoOwner); // Use owner as subtitle
            imgParams.set("type", "repo");
            imgParams.set("avatar", `https://github.com/${repoOwner}.png?size=400`);

            if (repoStats) {
                if (repoStats.weight) imgParams.set("weight", repoStats.weight.toFixed(4));
                if (repoStats.totalPRs) imgParams.set("prs", repoStats.totalPRs.toString());
                if (repoStats.totalCommits) imgParams.set("commits", repoStats.totalCommits.toString());
                if (repoStats.totalAdditions) imgParams.set("additions", repoStats.totalAdditions.toString());
                if (repoStats.totalDeletions) imgParams.set("deletions", repoStats.totalDeletions.toString());
            }

            image = `${origin}/og-image?${imgParams.toString()}`;
        }
    }

    // Fetch the original HTML
    const response = await context.next();

    // Use HTMLRewriter to modify meta tags
    const rewriter = new HTMLRewriter()
        .on("title", {
            element(element) {
                element.setInnerContent(title);
            },
        })
        .on('meta[name="title"]', {
            element(element) {
                element.setAttribute("content", title);
            },
        })
        .on('meta[name="description"]', {
            element(element) {
                element.setAttribute("content", description);
            },
        })
        .on('meta[property="og:title"]', {
            element(element) {
                element.setAttribute("content", title);
            },
        })
        .on('meta[property="og:description"]', {
            element(element) {
                element.setAttribute("content", description);
            },
        })
        .on('meta[property="og:image"]', {
            element(element) {
                element.setAttribute("content", image);
            },
        })
        .on('meta[property="twitter:title"]', {
            element(element) {
                element.setAttribute("content", title);
            },
        })
        .on('meta[property="twitter:description"]', {
            element(element) {
                element.setAttribute("content", description);
            },
        })
        .on('meta[property="twitter:image"]', {
            element(element) {
                element.setAttribute("content", image);
            },
        });

    return rewriter.transform(response);
};

export const config = {
    path: ["/miners/details", "/miners/repository"],
};
