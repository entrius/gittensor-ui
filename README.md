# Gittensor UI

The official UI for Gittensor

## Technologies

Node 18, React, Typescript, Docker, Github Actions

## Local setup

_Minimum Node version 18 required_

- Install yarn if not yet installed

```bash
npm install --g yarn
```

- install packages

```bash
yarn install
```

### Set up .env file

This project reads variables from a .env file, set yours up to look like this

```bash
VITE_REACT_APP_BASE_URL=http://localhost:<DAS_SERVICE_PORT>
```

## Running the app

The app runs on port 8080 by default

```bash
# development
yarn dev

# prod
yarn build
yarn preview
```
