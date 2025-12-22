# Cloudflare Worker Deployment

## Setup

Install Wrangler CLI:

```bash
npm install -g wrangler
```

## Deploy

```bash
wrangler deploy cloudflare-worker-meta-injector.js
```

## Remarks

- the cloudflare worker injection script is hardcoded to use PROD api when retrieving generated images, perhaps this can be updated to be dynamic for test/prod api one day
