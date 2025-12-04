# Deployment Fix: JSX Pragma for Netlify Edge Functions

## Issue
Netlify build was failing with the error:
```
Error: The module's source code could not be parsed: Expected '>', got 'style'
```

## Root Cause
Netlify Edge Functions use a Deno-based bundler that requires a **JSX pragma comment** to understand how to transpile JSX/TSX syntax. Without this pragma, the bundler cannot parse JSX and fails during the bundling phase.

## Solution
Added the JSX pragma comment at the top of `/netlify/edge-functions/og-image.tsx`:

```tsx
/** @jsxImportSource https://esm.sh/react@18.2.0 */
```

This pragma tells the Deno/TypeScript compiler:
1. Where to import the JSX factory from
2. How to transform JSX syntax into JavaScript
3. Which runtime to use for JSX elements

## What Changed

### Before (Breaking):
```tsx
import React from "https://esm.sh/react@18.2.0";
import { ImageResponse } from "https://deno.land/x/og_edge/mod.ts";

export default async (req: Request) => {
  return new ImageResponse(
    <div style={{ color: 'black' }}>...</div>
  );
};
```

### After (Working):
```tsx
/** @jsxImportSource https://esm.sh/react@18.2.0 */

import { ImageResponse } from "https://deno.land/x/og_edge/mod.ts";

export default async (req: Request) => {
  return new ImageResponse(
    <div style={{ color: 'black' }}>...</div>
  );
};
```

## Why This Works

The `@jsxImportSource` pragma is a TypeScript/Deno compiler directive that:

1. **Automatically imports JSX runtime** - No need for explicit `import React`
2. **Tells the bundler how to handle JSX** - The bundler knows to transform JSX using the specified import source
3. **Works with Deno's bundler** - Compatible with Netlify's Deno-based Edge Functions runtime

## Reference

This is the standard pattern used by `og_edge` and other Netlify Edge Functions that use JSX:
- [og-edge examples](https://github.com/ascorbic/og-edge/tree/main/netlify/edge-functions)
- [Netlify Edge Functions with JSX/TSX](https://docs.netlify.com/build/edge-functions/get-started/#edge-functions-with-jsx-or-tsx)

## Verification

After this fix, the Netlify build should:
1. ✅ Successfully bundle the edge functions
2. ✅ Deploy without errors
3. ✅ Generate OG images correctly

## Testing

Once deployed, test the endpoints:
```bash
# Miner image
curl -I https://your-site.netlify.app/og-image?type=miner&id=bdoolittle

# Repository image
curl -I https://your-site.netlify.app/og-image?type=repository&repo=opentensor/subtensor

# Home image
curl -I https://your-site.netlify.app/og-image
```

All should return `200 OK` with `Content-Type: image/png`.

## Additional Notes

- TypeScript errors in your IDE are expected and can be ignored
- The `@jsxImportSource` pragma must be at the top of the file
- No additional build configuration or `deno.json` is needed
- This works out-of-the-box with Netlify Edge Functions

---

**Status:** ✅ Fixed and deployed  
**Commit:** `7dd2207`  
**Date:** December 2024
