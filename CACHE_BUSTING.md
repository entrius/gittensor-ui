# Cache Busting Guide for OG Images

## The Problem

Your OG images are cached at **multiple levels**:

1. **Edge Cache (Netlify)** - 2 hours (`s-maxage=7200`)
2. **Browser Cache** - 2 hours (`max-age=7200`)
3. **Social Platform Cache** - Can be days or weeks (Facebook, Twitter, LinkedIn, Discord)

## Current Cache Headers

```
cache-control: public, immutable, s-maxage=7200, max-age=7200
```

This means:
- Edge cache: 2 hours
- Browser cache: 2 hours
- `immutable` = won't revalidate even if you refresh

## Solutions

### Option 1: Add Cache Buster to URL (Immediate)

Add a version parameter to force a fresh fetch:

```
https://magical-crostata-b02d38.netlify.app/og-image?type=miner&id=hsparks-codes&v=2
https://magical-crostata-b02d38.netlify.app/og-image?type=miner&id=hsparks-codes&v=3
https://magical-crostata-b02d38.netlify.app/og-image?type=miner&id=hsparks-codes&v=4
```

Increment `v=X` each time you need a fresh image.

### Option 2: Use Social Platform Debuggers

Force social platforms to re-fetch:

**Facebook Sharing Debugger:**
```
https://developers.facebook.com/tools/debug/
```
1. Paste your page URL
2. Click "Scrape Again"
3. Repeat 2-3 times if needed

**Twitter Card Validator:**
```
https://cards-dev.twitter.com/validator
```
1. Paste your page URL
2. Click "Preview card"
3. Will fetch fresh

**LinkedIn Post Inspector:**
```
https://www.linkedin.com/post-inspector/
```

**Discord:**
Discord caches very aggressively. You may need to:
1. Add `?v=1` to the end of your page URL
2. Post that URL in Discord
3. For next update, use `?v=2`, etc.

### Option 3: Reduce Cache Time (Recommended)

Update the cache headers to be shorter during development:

In `/netlify/edge-functions/og-image.tsx`, change:

**Current (2 hours):**
```typescript
headers: {
  "cache-control": "public, immutable, s-maxage=7200, max-age=7200",
  "content-type": "image/png",
}
```

**Development (5 minutes):**
```typescript
headers: {
  "cache-control": "public, s-maxage=300, max-age=300",
  "content-type": "image/png",
}
```

**Production (1 hour):**
```typescript
headers: {
  "cache-control": "public, immutable, s-maxage=3600, max-age=3600",
  "content-type": "image/png",
}
```

### Option 4: Test Direct Image URL

Test the image endpoint directly to verify the fix deployed:

```bash
# Add timestamp to bust cache
curl "https://magical-crostata-b02d38.netlify.app/og-image?type=miner&id=hsparks-codes&t=$(date +%s)" -o test.png

# Open to view
open test.png
```

## Verification Commands

```bash
# Check what's actually cached
curl -I "https://magical-crostata-b02d38.netlify.app/og-image?type=miner&id=hsparks-codes"

# Force fresh fetch with cache buster
curl -I "https://magical-crostata-b02d38.netlify.app/og-image?type=miner&id=hsparks-codes&v=999"

# Check API data is correct
curl -s "https://api.gittensor.io/miners/stats/all" | jq '.[] | select(.githubId == "32576329")'
```

## Current Status

✅ **API Data:** Correct (totalAdditions: 13090, totalDeletions: 83)  
✅ **Code:** Fixed (using /miners/stats/all endpoint)  
✅ **Deployment:** Live (timestamp: 02:55:30 GMT)  
⏰ **Cache:** Active (2 hour cache, may show old version)

## Quick Fix Right Now

1. **Test with cache buster:**
   ```
   https://magical-crostata-b02d38.netlify.app/og-image?type=miner&id=hsparks-codes&bust=123
   ```

2. **If that works**, the fix is deployed but cached. Use one of these:
   - Wait 2 hours for cache to expire
   - Use social debuggers to force refresh
   - Deploy with shorter cache times
   - Add version param to your meta tags

3. **If still shows 0s**, there may be another issue. Check Netlify function logs.

## Checking Netlify Logs

1. Go to: https://app.netlify.com
2. Select your site
3. Click "Functions" in sidebar
4. Click "Edge Functions"
5. Select "og-image"
6. Look for any errors or console.log output

---

**Remember:** After the fix is verified working, you can increase cache time back to 2 hours or even 24 hours for better performance.
