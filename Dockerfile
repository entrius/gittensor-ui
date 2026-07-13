FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

EXPOSE 8080

# Ephemeral CI token for scripts/fetch-repo-websites.mjs (prebuild); without
# it the shared runner IP usually hits GitHub's unauthenticated rate limit
# and the build falls back to the committed website snapshot.
ARG GITHUB_TOKEN
RUN GITHUB_TOKEN=$GITHUB_TOKEN npm run build

CMD [ "npm", "run", "preview" ]
