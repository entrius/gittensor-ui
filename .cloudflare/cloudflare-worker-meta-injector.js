/**
 * Cloudflare Worker - Dynamic Meta Tag Injector for Gittensor
 * FIXED VERSION - Handles multiline HTML tags
 */

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // Only process HTML requests
  const accept = request.headers.get("Accept") || "";
  const isHtmlRequest =
    accept.includes("text/html") ||
    url.pathname === "/" ||
    !url.pathname.includes(".");

  // Fetch the original response
  const response = await fetch(request);

  // Only modify HTML responses
  if (
    !isHtmlRequest ||
    !response.headers.get("content-type")?.includes("text/html")
  ) {
    return response;
  }

  // Get the HTML content
  const html = await response.text();

  // Inject dynamic meta tags
  const modifiedHtml = await injectMetaTags(html, url);

  // Return modified response
  return new Response(modifiedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * Inject dynamic meta tags based on URL
 */
async function injectMetaTags(html, url) {
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  let title = "Gittensor | Autonomous Software Development";
  let description =
    "The workforce for open source. Compete for rewards by contributing quality code to open source repositories.";
  let image = "/gittensor-og.jpg"; // Fallback

  // Miner details page
  if (pathname === "/miners/details") {
    const githubId = searchParams.get("githubId");
    if (githubId) {
      // Fetch username from Gittensor API (uses first PR author)
      let username = githubId;
      try {
        const minerResponse = await fetch(
          `https://api.gittensor.io/miners/${githubId}/prs`,
        );
        if (minerResponse.ok) {
          const prs = await minerResponse.json();
          if (prs && prs.length > 0 && prs[0].author) {
            username = prs[0].author;
          }
        }
      } catch (error) {
        console.error("Failed to fetch miner username:", error);
        // Fall back to githubId if fetch fails
      }

      title = `${username} | Gittensor`;
      description = `View detailed statistics, contributions, and pull requests for ${username} on Gittensor. Track open source contributions and rewards.`;
      image = `https://api.gittensor.io/og-image?type=miner&id=${encodeURIComponent(githubId)}`;
    }
  }

  // Repository details page
  if (pathname === "/miners/repository") {
    const repo = searchParams.get("name");
    if (repo) {
      // Extract just the repo name (e.g., "subtensor" from "opentensor/subtensor")
      const repoName = repo.split("/")[1] || repo;

      title = `${repoName} | Gittensor`;
      description = `View detailed statistics, contributors, and pull requests for ${repo} on Gittensor. Track repository activity and open source contributions.`;
      image = `https://api.gittensor.io/og-image?type=repository&repo=${encodeURIComponent(repo)}`;
    }
  }

  // Home page
  if (pathname === "/") {
    image = "https://api.gittensor.io/og-image?type=home";
  }

  // Replace meta tags - use [\s\S]*? to match across newlines
  let modifiedHtml = html
    // Update title
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    // Update og:title
    .replace(
      /<meta property="og:title"[\s\S]*?\/>/i,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
    )
    // Update twitter:title
    .replace(
      /<meta property="twitter:title"[\s\S]*?\/>/i,
      `<meta property="twitter:title" content="${escapeHtml(title)}" />`,
    )
    // Update og:description
    .replace(
      /<meta property="og:description"[\s\S]*?\/>/i,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
    )
    // Update twitter:description
    .replace(
      /<meta property="twitter:description"[\s\S]*?\/>/i,
      `<meta property="twitter:description" content="${escapeHtml(description)}" />`,
    )
    // Update og:image
    .replace(
      /<meta property="og:image"[\s\S]*?\/>/i,
      `<meta property="og:image" content="${escapeHtml(image)}" />`,
    )
    // Update twitter:image
    .replace(
      /<meta property="twitter:image"[\s\S]*?\/>/i,
      `<meta property="twitter:image" content="${escapeHtml(image)}" />`,
    );

  return modifiedHtml;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
