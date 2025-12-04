import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
    const url = new URL(request.url);
    const avatarUrl = url.searchParams.get("avatar");
    const owner = url.searchParams.get("owner");

    if (!avatarUrl) {
        return new Response("Missing avatar parameter", { status: 400 });
    }

    // Determine background color based on owner
    let bgColor = "#000000"; // Default black
    if (owner?.toLowerCase() === "opentensor") {
        bgColor = "#FFFFFF"; // White for opentensor
    } else if (owner?.toLowerCase() === "bitcoin") {
        bgColor = "#F7931A"; // Bitcoin orange
    }

    // Create SVG with colored background and avatar
    const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="${bgColor}"/>
      <image 
        href="${avatarUrl}" 
        x="375" 
        y="115" 
        width="450" 
        height="450" 
        style="border-radius: 50%;"
      />
    </svg>
  `;

    return new Response(svg, {
        headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        },
    });
};

export const config = {
    path: "/og-images/generate",
};
