# Gittensor UI

The official UI for Gittensor - a dashboard and bounty system for the Gittensor subnet on Bittensor.

## Features

### Dashboard
- Real-time subnet statistics and analytics
- Contributor rankings and activity tracking
- Repository metrics and commit activity
- Interactive charts and visualizations

### Issue Bounty System
- Place **ALPHA token** bounties on GitHub issues
- Automatic weekly bounty enhancements (5%/week, max 3x)
- Validator voting system for solution approval
- Pure ALPHA economy: users pay in ALPHA, solvers receive ALPHA
- ALPHA emissions from subnet fund enhancement pool
- First-merged-wins payout mechanism

## Quick Start

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build
```

## Smart Contract

The issue bounty smart contract has been moved to a separate repository:

**Location:** `/home/landyn/dev/issues-smart-contract/`

See the contract repo for deployment instructions and technical documentation.

## Technology Stack

### Frontend
- **React 18** + TypeScript
- **Material-UI** - Component library
- **ECharts** - Data visualization
- **Polkadot.js** - Substrate blockchain interaction
- **Vite** - Build tool

### Blockchain
- **Bittensor Subtensor** - Layer 1 blockchain
- **ink!** - Smart contract language (Rust/WASM)
- **pallet-contracts** - WASM contract runtime
- **Talisman Wallet** - User wallet

## Network Configuration

### Testnet (Current)
- Endpoint: `wss://test.finney.opentensor.ai:443`
- Subnet: 422 (Gittensor)

### Mainnet
- Endpoint: `wss://entrypoint-finney.opentensor.ai:443`
- Subnet: 74 (Gittensor)

## Running the App

```bash
# Development
yarn dev

# Production build
yarn build

# Preview production build
yarn preview
```

## Environment Setup

This project reads variables from a `.env` file (optional):

```bash
VITE_REACT_APP_BASE_URL=http://localhost:<DAS_SERVICE_PORT>
```

## Development

### Prerequisites

- Node.js 18+
- Yarn package manager
- Talisman wallet extension
- Testnet TAO tokens (for testing)

### Available Scripts

```bash
yarn dev           # Start dev server
yarn build         # Production build
yarn lint          # Run ESLint
yarn preview       # Preview production build
yarn find-alpha    # Find ALPHA token information
```

## Smart Contract

The bounty system uses a WASM smart contract deployed via ink! on Substrate.

**Contract Location:** `contracts/solidity/IssueBountyManager.sol`

**Deployment Process:**
1. Write in Solidity (for familiarity)
2. Convert to ink! using `sol2ink`
3. Deploy to Substrate via `cargo-contract`

See `contracts/README.md` for details.

## Project Structure

```
gittensor-ui/
├── src/
│   ├── api/              # API clients and mock data
│   ├── components/       # React components
│   ├── config/           # Network and contract configuration
│   ├── hooks/            # Custom React hooks (wallet, etc.)
│   ├── pages/            # Page components
│   └── types/            # TypeScript types
├── contracts/
│   ├── solidity/         # Solidity contracts (for testing)
│   └── ink/              # ink! WASM contracts (for deployment)
├── scripts/              # Utility scripts
└── docs/                 # Documentation
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

[Add your license here]

## Links

- **Discord:** [Bittensor](https://discord.gg/bittensor)
- **GitHub:** [Subtensor](https://github.com/opentensor/subtensor)

---

**For complete implementation details, see:** `docs/IMPLEMENTATION_GUIDE.md`
