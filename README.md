# Gittensor UI

Dashboard, analytics, miner evaluations for Gittensor, Subnet 74

## Technologies

Node 20, React, Typescript, Docker

## Local setup

_Minimum Node version 20 required_

Install packages

```bash
npm install
```

### Set up .env file

This project reads variables from a .env file, set yours up by doing:

```bash
cp .env.example .env

# then edit the new .env file as you see fit
vim .env
```

## Running the app

```bash
# development
npm run dev
```

## Linting & Formatting

```bash
# Format all files
npm run format
# ESLint with auto-fix
npm run lint:fix
# Ensure the project builds cleanly
npm run build
```
