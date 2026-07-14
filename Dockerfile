# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

EXPOSE 8080

# Ephemeral CI token for scripts/fetch-repo-websites.mjs (prebuild); without
# it the shared runner IP usually hits GitHub's unauthenticated rate limit
# and the build falls back to the committed website snapshot. Mounted as a
# BuildKit secret rather than an ARG: build args are recorded in the pushed
# image's config (`docker history`), a secret mount never leaves this RUN.
# Absent secret (local builds) resolves to empty — same fallback as before.
RUN --mount=type=secret,id=github_token \
    GITHUB_TOKEN="$(cat /run/secrets/github_token 2>/dev/null || true)" npm run build

CMD [ "npm", "run", "preview" ]
