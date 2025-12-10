// Bittensor Substrate Network Configuration

// Substrate RPC endpoints
export const BITTENSOR_NETWORK = {
  // Mainnet
  mainnet: {
    name: 'Bittensor Finney',
    wsEndpoint: 'wss://entrypoint-finney.opentensor.ai:443',
    ss58Format: 42,
    nativeCurrency: {
      name: 'TAO',
      symbol: 'TAO',
      decimals: 9,
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

  // Localnet (for development)
  localnet: {
    name: 'Bittensor Localnet',
    wsEndpoint: 'ws://127.0.0.1:9944',
    ss58Format: 42,
    nativeCurrency: {
      name: 'TAO',
      symbol: 'TAO',
      decimals: 9,
    },
  },
};

// Current active network - can be 'mainnet', 'testnet', or 'localnet'
// Set via VITE_NETWORK env var or defaults to 'testnet'
export const ACTIVE_NETWORK: 'mainnet' | 'testnet' | 'localnet' =
  (import.meta.env.VITE_NETWORK as 'mainnet' | 'testnet' | 'localnet') || 'testnet';

// Check if running in localnet dev mode
export const IS_LOCALNET = ACTIVE_NETWORK === 'localnet';

// DEV MODE CONFIGURATION
// SECURITY: Dev mode ONLY works on localnet - production builds ignore this
// When DEV_MODE is enabled, the UI uses a local Keyring signer instead of Talisman
// This bypasses browser extension restrictions for localhost websocket connections
export const DEV_MODE_ENABLED = IS_LOCALNET && import.meta.env.VITE_DEV_MODE === 'true';

// Dev wallet seed - ONLY used when DEV_MODE_ENABLED is true
// Default is //Alice (standard Substrate dev account)
// Can be overridden via VITE_DEV_SEED env var for custom dev accounts
export const DEV_WALLET_SEED = DEV_MODE_ENABLED
  ? (import.meta.env.VITE_DEV_SEED || '//Alice')
  : null;

// Safety check - log warning if dev mode detected in non-local environment
if (import.meta.env.VITE_DEV_MODE === 'true' && !IS_LOCALNET) {
  console.error('SECURITY WARNING: VITE_DEV_MODE=true is ignored on non-localnet networks');
}

// Get current network config
export const getCurrentNetwork = () => BITTENSOR_NETWORK[ACTIVE_NETWORK];

// Subnet ID - varies by network
// localnet=2 (created by up.sh), testnet=422, mainnet=74
export const GITTENSOR_NETUID = IS_LOCALNET ? 2 : (ACTIVE_NETWORK === 'mainnet' ? 74 : 422);

// ALPHA Token Configuration (Native Substrate Asset via pallet-assets)
export const ALPHA_TOKEN = {
  // Asset ID in pallet-assets
  assetId: 6, // ALPHA asset ID on testnet subnet 422
  symbol: 'ALPHA',
  decimals: 9, // ALPHA uses 9 decimals (matching TAO)
  name: 'Gittensor Subnet ALPHA',
};

// Contract Addresses - WASM contracts deployed via pallet-contracts
export const BOUNTY_CONTRACT = {
  // Contract address will be in Substrate SS58 format
  // For localnet, this gets set after deployment via env var
  address: import.meta.env.VITE_CONTRACT_ADDRESS || '5DuwpFQqQjFByA4aKyFXf48khKoFr3jjroigm1WEnFi4K1j8',
  metadata: null as any,
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
    explorerUrl: IS_LOCALNET
      ? 'https://polkadot.js.org/apps/?rpc=' + encodeURIComponent(network.wsEndpoint)
      : 'https://polkadot.js.org/apps/?rpc=' + encodeURIComponent(network.wsEndpoint),
  };
};

export const NETWORK_INFO = getNetworkInfo();
