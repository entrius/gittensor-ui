import React from "react";
import { Helmet } from "react-helmet-async";

export interface SEOProps {
    title: string;
    description: string;
    image?: string;
    type?: "website" | "article";
    url?: string;
    siteName?: string;
    twitterHandle?: string;
}

const DEFAULT_IMAGE = "/og-images/autonomous-software-development.jpg";
const SITE_NAME = "Gittensor | Autonomous Software Development";

export const SEO: React.FC<SEOProps> = ({
    title,
    description,
    image = DEFAULT_IMAGE,
    type = "website",
    url,
    siteName = SITE_NAME,
    twitterHandle,
}) => {
    // Get the current URL if not provided
    const currentUrl = url || (typeof window !== "undefined" ? window.location.href : "");

    // Ensure the image URL is absolute
    const absoluteImageUrl = image.startsWith("http")
        ? image
        : `${typeof window !== "undefined" ? window.location.origin : ""}${image}`;

    // Full title with site name
    const fullTitle = `${title} | ${siteName}`;

    return (
        <Helmet>
            {/* Essential Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={currentUrl} />

            {/* Open Graph Tags (Facebook, LinkedIn, WhatsApp, Discord, etc.) */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={absoluteImageUrl} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={`${title} - ${siteName}`} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={siteName} />
            <meta property="og:locale" content="en_US" />
            <meta property="og:image:secure_url" content={absoluteImageUrl} />

            {/* Twitter Card Tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={absoluteImageUrl} />
            <meta name="twitter:image:alt" content={`${title} - ${siteName}`} />
            {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}
            {twitterHandle && <meta name="twitter:creator" content={twitterHandle} />}

            {/* Favicons */}
            <link rel="icon" href="/favicon.ico" sizes="any" />
            <link rel="apple-touch-icon" href="/gt-logo-white.png" />
        </Helmet>
    );
};
