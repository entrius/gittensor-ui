// Bittensor Substrate Network Configuration

// Substrate RPC endpoints
export const BITTENSOR_NETWORK = {
  // Mainnet
  mainnet: {
    name: 'Bittensor Finney',
    wsEndpoint: 'wss://entrypoint-finney.opentensor.ai:443',
    ss58Format: 42, // Substrate default, update if Bittensor uses custom
    nativeCurrency: {
      name: 'TAO',
      symbol: 'TAO',
      decimals: 9, // Bittensor uses 9 decimals for TAO
    },
  },

  // Testnet
  testnet: {
    name: 'Bittensor Testnet',
    wsEndpoint: 'wss://test.finney.opentensor.ai:443',
    ss58Format: 42,
    nativeCurrency: {
      name: 'TAO',
      symbol: 'TAO',
      decimals: 9,
    },
  },
};

// Current active network (switch between 'mainnet' and 'testnet')
export const ACTIVE_NETWORK: 'mainnet' | 'testnet' = 'testnet'; // Start with testnet for development

// Get current network config
export const getCurrentNetwork = () => BITTENSOR_NETWORK[ACTIVE_NETWORK];

// ALPHA Token Configuration (Native Substrate Asset via pallet-assets)
export const ALPHA_TOKEN = {
  // Asset ID in pallet-assets - UPDATE THIS WITH ACTUAL ASSET ID
  assetId: 0, // PLACEHOLDER - Replace with actual ALPHA asset ID from pallet-assets
  symbol: 'ALPHA',
  decimals: 18, // Standard 18 decimals for ALPHA
  name: 'Gittensor Subnet ALPHA',
};

// Contract Addresses - WASM contracts deployed via pallet-contracts
export const BOUNTY_CONTRACT = {
  // Contract address will be in Substrate SS58 format
  address: '', // PLACEHOLDER - Replace with actual deployed WASM contract address

  // Metadata will be generated when we deploy the ink! contract
  // This will contain the contract ABI
  metadata: null as any, // Will be imported from compiled contract artifacts
};

// Helper to check if contracts are configured
export const areContractsConfigured = (): boolean => {
  return ALPHA_TOKEN.assetId !== 0 && BOUNTY_CONTRACT.address !== '';
};

// Export network info for display purposes
const getNetworkInfo = () => {
  const network = getCurrentNetwork();
  return {
    name: network.name,
    endpoint: network.wsEndpoint,
    explorerUrl: 'https://polkadot.js.org/apps/?rpc=' + encodeURIComponent(network.wsEndpoint),
  };
};

export const NETWORK_INFO = getNetworkInfo();
