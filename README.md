# Gittensor UI

Dashboard, stats, miner evaluations for Gittensor, Subnet 74

## Technologies

Node 18, React, Typescript, Docker

## Local setup

_Minimum Node version 18 required_

install yarn

```bash
npm install yarn -g
```

install packages

```bash
yarn install
```

### Set up .env file

This project reads variables from a .env file, set yours up to look like this

```bash
VITE_REACT_APP_BASE_URL=http://localhost:<DAS_SERVICE_PORT>
```

## Running the app

```bash
# development
yarn dev
```

## Code formatting details

```bash
# Format all files
yarn format
# Check without changing (useful locally)
yarn format:check
# ESLint with auto-fix
yarn lint:fix
```
