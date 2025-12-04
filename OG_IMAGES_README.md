# Dynamic OG Image Implementation - GitHub Style

This document explains the GitHub-style dynamic Open Graph (OG) image system implemented for Gittensor.

## 🎯 Overview

We've implemented a unified, dynamic OG image generation system inspired by GitHub's approach:
- **No browser required** - Uses Satori (HTML/CSS to SVG) instead of Puppeteer
- **Edge-native** - Runs on Netlify Edge Functions (Deno runtime)
- **Template-based** - Multiple templates for different content types
- **Fast** - <1s generation time with edge caching
- **GitHub-inspired design** - Professional cards with real-time data

## 🏗️ Architecture

```
Social Crawler Request
        ↓
Netlify Edge Function (/og-image)
        ↓
Parse type parameter → [miner|repository|home]
        ↓
Fetch data from Gittensor API
        ↓
Render JSX template with data
        ↓
Satori: JSX → SVG conversion
        ↓
og_edge: SVG → PNG conversion
        ↓
Cache (2-24hrs) + Return PNG
```

## 📁 File Structure

```
netlify/
└── edge-functions/
    ├── og-image.tsx          # Unified OG image handler (NEW)
    ├── og-image-miner.ts     # Legacy miner handler (can be removed)
    └── og-meta-tags.ts       # Meta tag injection (UPDATED)

netlify.toml                  # Edge function routing (UPDATED)
```

## 🎨 Templates

### 1. Miner Template
**URL Format:** `/og-image?type=miner&id={githubId}`

**Example:**
- `/og-image?type=miner&id=bdoolittle`
- `/og-image?type=miner&id=123456` (numeric GitHub ID)

**Features:**
- GitHub avatar (200x200)
- Username + Rank badge
- Score, PRs, Lines changed (+/-)
- Dark gradient background
- Cyan accent color (#00ffff)

**Data Source:** `https://api.gittensor.io/miners/{id}/stats`

### 2. Repository Template
**URL Format:** `/og-image?type=repository&repo={owner/repo}`

**Example:**
- `/og-image?type=repository&repo=opentensor/subtensor`

**Features:**
- Owner avatar (80x80)
- Repository name with owner
- Stats: Contributors, PRs, Commits, Lines, Weight
- GitHub-dark theme (#0d1117)
- Stats with emoji indicators

**Data Source:** `https://api.gittensor.io/miners/repository/{repo}/stats`

### 3. Home Template (Default)
**URL Format:** `/og-image` or `/og-image?type=home`

**Features:**
- Centered branding
- "GITTENSOR" in cyan (#00ffff)
- Tagline and description
- Simple, elegant design

## 🔧 Technical Implementation

### Technology Stack
- **og_edge** (v0.0.6+) - Deno port of @vercel/og
- **Satori** - HTML/CSS to SVG renderer
- **React** (v18.2.0) - JSX template syntax
- **Netlify Edge Functions** - Deno runtime

### Key Code Snippets

**Basic Usage:**
```tsx
import React from "https://esm.sh/react@18.2.0";
import { ImageResponse } from "https://deno.land/x/og_edge/mod.ts";

export default async (req: Request) => {
  return new ImageResponse(
    <div style={{ /* styles */ }}>Content</div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "cache-control": "public, immutable, s-maxage=7200",
        "content-type": "image/png",
      }
    }
  );
};
```

**Fetching External Data:**
```tsx
const response = await fetch(`https://api.gittensor.io/miners/${id}/stats`);
const data = await response.json();
```

## 🚀 Deployment

### Prerequisites
1. Netlify account
2. Netlify CLI: `npm install -g netlify-cli`

### Local Testing
```bash
# Start Netlify dev server
netlify dev

# Test endpoints
open http://localhost:8888/og-image?type=miner&id=bdoolittle
open http://localhost:8888/og-image?type=repository&repo=opentensor/subtensor
open http://localhost:8888/og-image
```

### Production Deployment
```bash
# Deploy to production
netlify deploy --prod

# Or via Git push (recommended)
git push origin main
```

## 🎭 How Meta Tags Work

When a page loads:
1. **HTML** serves with default meta tags (from `index.html`)
2. **Edge Function** (`og-meta-tags.ts`) intercepts the request
3. **HTMLRewriter** modifies meta tags based on URL
4. **Dynamic OG image URL** is injected: `{origin}/og-image?type=...`
5. **Social crawler** requests the OG image
6. **og-image.tsx** generates the image on-demand
7. **Image is cached** at the edge for 2-24 hours

## 🔍 Testing Your Images

### Social Media Debuggers
- **Facebook:** https://developers.facebook.com/tools/debug/
- **Twitter/X:** https://cards-dev.twitter.com/validator
- **LinkedIn:** https://www.linkedin.com/post-inspector/
- **Generic:** https://www.opengraph.xyz/

### Test Process
1. Deploy your changes
2. Visit the page URL (e.g., `/miners/details?githubId=bdoolittle`)
3. View page source - verify OG image URL
4. Test the OG image directly (e.g., `/og-image?type=miner&id=bdoolittle`)
5. Use social debuggers to see how it renders

### Common Issues

**Issue: Image not updating on social media**
- **Cause:** Social platforms cache OG images aggressively
- **Solution:** Use the debug tools to force a refresh

**Issue: TypeScript errors in IDE**
- **Cause:** Deno imports don't resolve in Node.js environment
- **Solution:** This is normal - they work at runtime

**Issue: Image generation fails**
- **Cause:** API fetch timeout or error
- **Solution:** Check API endpoint, add better error handling

## 📊 Caching Strategy

```typescript
// Miner & Repository images (change frequently)
"cache-control": "public, immutable, s-maxage=7200, max-age=7200" // 2 hours

// Home template (static)
"cache-control": "public, immutable, s-maxage=86400, max-age=86400" // 24 hours
```

**Why these durations?**
- Miner stats change frequently → 2 hour cache
- Repository stats change less → 2 hour cache (same for consistency)
- Home page is static → 24 hour cache
- `immutable` flag prevents revalidation

## 🎨 Design Guidelines

### Image Dimensions
- **Size:** 1200 x 630 pixels (1.91:1 ratio)
- **Format:** PNG
- **Max file size:** 8MB (our images ~50-200KB)

### Colors
```css
/* Dark backgrounds */
#000000, #1a1a1a (gradients)
#0d1117, #161b22 (GitHub dark)

/* Accent colors */
#00ffff - Cyan (primary)
#3fb950 - Green (additions)
#f85149 - Red (deletions)
#888888, #8b949e, #6e7681 - Grays (labels)
```

### Typography
- **Font:** Noto Sans (default from og_edge)
- **Sizes:** 14px (labels), 24-36px (stats), 48-72px (titles)
- **Weights:** 400 (normal), 700 (bold), 900 (extra bold)

### Best Practices
1. Keep text readable at small sizes
2. Use high contrast (white text on dark bg)
3. Limit text - images should be scannable
4. Include visual hierarchy (size, weight, color)
5. Test on mobile (how it looks in feeds)

## 🔄 Migration from Old System

### Before (Legacy)
- Single miner template only
- Hardcoded image URLs
- No repository support
- GitHub avatars as OG images

### After (Current)
- Multiple templates (miner, repo, home)
- Dynamic generation with live data
- Unified handler with routing
- Professional, branded cards

### Cleanup
You can safely delete:
- `/netlify/edge-functions/og-image-miner.ts` (replaced by og-image.tsx)

## 📈 Performance Metrics

**Target Performance:**
- Initial generation: <1s
- Cached response: <100ms
- P99 TTFB: <1s
- Image size: 50-200KB

**Monitoring:**
```bash
# Check function logs
netlify functions:log og-image

# Or via Netlify dashboard
# Functions → Edge Functions → og-image → Logs
```

## 🛠️ Extending the System

### Adding a New Template

1. **Create template component:**
```tsx
function NewTemplate({ data }: NewData) {
  return (
    <div style={{ /* styles */ }}>
      {/* Your design */}
    </div>
  );
}
```

2. **Add to handler:**
```tsx
export default async (req: Request) => {
  const type = url.searchParams.get("type");
  
  if (type === "newtype") {
    // Fetch data
    // Return new ImageResponse with NewTemplate
  }
}
```

3. **Update og-meta-tags.ts:**
```tsx
if (pathname === "/your/route") {
  image = `${baseUrl}/og-image?type=newtype&param=value`;
}
```

### Custom Fonts
```tsx
// Fetch font file
const fontData = await fetch(
  "https://fonts.gstatic.com/s/inter/v12/..."
).then((res) => res.arrayBuffer());

return new ImageResponse(<Template />, {
  width: 1200,
  height: 630,
  fonts: [{
    name: "Inter",
    data: fontData,
    weight: 700,
    style: "normal"
  }]
});
```

## 📚 Resources

- **og_edge GitHub:** https://github.com/ascorbic/og-edge
- **Satori Docs:** https://github.com/vercel/satori
- **Netlify Edge Functions:** https://docs.netlify.com/edge-functions/overview/
- **Open Graph Protocol:** https://ogp.me/
- **GitHub's Blog Post:** https://github.blog/open-source/git/framework-building-open-graph-images/

## 🎓 Key Learnings from GitHub

1. **HTML templates over screenshots** - Faster, lighter, more maintainable
2. **Route-based templates** - Different templates for different content
3. **Real-time data** - Fetch fresh stats for each generation
4. **Edge caching** - Balance freshness with performance
5. **Fallbacks** - Always have a default image if API fails

## ✅ Checklist for Production

- [ ] Test all templates locally
- [ ] Verify API endpoints are working
- [ ] Check caching headers
- [ ] Test with social media debuggers
- [ ] Monitor function logs for errors
- [ ] Set up error tracking/alerting
- [ ] Document any custom templates
- [ ] Update deployment documentation

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Author:** Gittensor Team
