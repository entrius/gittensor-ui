import type { Context } from "https://edge.netlify.com";

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
            title = `Miner Stats - ${githubId} | Gittensor`;
            description = `View detailed statistics, contributions, and pull requests for ${githubId} on Gittensor. Track open source contributions and rewards.`;

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
            title = `Repository Stats - ${repo} | Gittensor`;
            description = `View detailed statistics, contributors, and pull requests for ${repo} on Gittensor. Track repository activity and open source contributions.`;

            // Extract owner from repo name (format: owner/repo)
            const repoOwner = repo.split("/")[0];
            image = `https://github.com/${repoOwner}.png?size=1200`;
        }
    }

    // Replace meta tags in the HTML
    let modifiedHtml = html
        // Update title
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        // Update og:title
        .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title}" />`)
        // Update twitter:title
        .replace(/<meta property="twitter:title" content=".*?" \/>/, `<meta property="twitter:title" content="${title}" />`)
        // Update og:description
        .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description}" />`)
        // Update twitter:description
        .replace(/<meta property="twitter:description" content=".*?" \/>/, `<meta property="twitter:description" content="${description}" />`)
        // Update og:image
        .replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${image}" />`)
        // Update twitter:image
        .replace(/<meta property="twitter:image" content=".*?" \/>/, `<meta property="twitter:image" content="${image}" />`);

    return new Response(modifiedHtml, {
        headers: {
            "content-type": "text/html",
        },
    });
};

export const config = {
    path: ["/miners/details", "/miners/repository"],
};
