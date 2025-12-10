import { useState, useCallback, useEffect } from 'react';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { KeyringPair } from '@polkadot/keyring/types';
import { getCurrentNetwork, ALPHA_TOKEN, DEV_MODE_ENABLED, DEV_WALLET_SEED, GITTENSOR_NETUID } from '../config/bittensorConfig';

// Stake position for a specific hotkey
export interface StakePosition {
  hotkey: string;
  netuid: number;
  stake: bigint;
  stakeFormatted: string;
}

export interface UsePolkadotWalletReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  account: InjectedAccountWithMeta | null;
  accounts: InjectedAccountWithMeta[];
  api: ApiPromise | null;
  error: string | null;

  // Dev mode (localnet)
  isDevMode: boolean;
  devKeyringPair: KeyringPair | null;

  // Stake positions
  stakePositions: StakePosition[];
  isLoadingStakes: boolean;
  refreshStakes: () => Promise<void>;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  selectAccount: (account: InjectedAccountWithMeta) => void;

  // Utilities
  formatAddress: (address: string) => string;
}

const APP_NAME = 'Gittensor UI';

// GITTENSOR_NETUID is imported from config (localnet=2, testnet=422, mainnet=74)

export const usePolkadotWallet = (): UsePolkadotWalletReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stakePositions, setStakePositions] = useState<StakePosition[]>([]);
  const [isLoadingStakes, setIsLoadingStakes] = useState(false);
  const [devKeyringPair, setDevKeyringPair] = useState<KeyringPair | null>(null);

  // Initialize API connection
  const initializeApi = useCallback(async () => {
    try {
      const network = getCurrentNetwork();
      console.log(`Connecting to ${network.name} at ${network.wsEndpoint}`);
      const wsProvider = new WsProvider(network.wsEndpoint);
      const apiInstance = await ApiPromise.create({ provider: wsProvider });

      setApi(apiInstance);
      return apiInstance;
    } catch (err) {
      console.error('Failed to initialize API:', err);
      throw new Error('Failed to connect to Bittensor network');
    }
  }, []);

  // Connect to wallet (dev mode or extension)
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Initialize API first
      let apiInstance = api;
      if (!apiInstance) {
        apiInstance = await initializeApi();
      }

      // DEV MODE: Use keyring directly (bypasses browser extension)
      // SECURITY: Only enabled when VITE_DEV_MODE=true AND VITE_NETWORK=localnet
      if (DEV_MODE_ENABLED && DEV_WALLET_SEED) {
        console.warn('⚠️  DEV MODE ACTIVE - Using local keyring signer (localnet only)');
        const keyring = new Keyring({ type: 'sr25519' });
        const pair = keyring.addFromUri(DEV_WALLET_SEED);
        setDevKeyringPair(pair);

        // Determine display name based on seed
        const isAlice = DEV_WALLET_SEED === '//Alice';
        const devAccount: InjectedAccountWithMeta = {
          address: pair.address,
          meta: {
            name: isAlice ? 'Alice (Dev)' : 'Dev Account',
            source: 'dev-keyring',
          },
        };

        setAccounts([devAccount]);
        setAccount(devAccount);
        setIsConnected(true);
        setIsConnecting(false);
        console.log(`✅ Dev mode connected as ${pair.address}`);
        return;
      }

      // PRODUCTION MODE: Use browser extension (Talisman/Polkadot.js)
      const extensions = await web3Enable(APP_NAME);

      if (extensions.length === 0) {
        throw new Error(
          'No Polkadot wallet extension found. Please install Talisman or Polkadot.js extension.'
        );
      }

      const allAccounts = await web3Accounts();

      if (allAccounts.length === 0) {
        throw new Error(
          'No accounts found in your wallet. Please create an account in Talisman.'
        );
      }

      setAccounts(allAccounts);
      setAccount(allAccounts[0]);
      setIsConnected(true);
      setIsConnecting(false);
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [api, initializeApi]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setAccount(null);
    setAccounts([]);
    setIsConnected(false);
    setError(null);
    setDevKeyringPair(null);
  }, []);

  // Select a different account
  const selectAccount = useCallback((selectedAccount: InjectedAccountWithMeta) => {
    setAccount(selectedAccount);
  }, []);

  // Format address for display (truncate)
  const formatAddress = useCallback((address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  // Query stake positions for the current account on Gittensor subnet
  const refreshStakes = useCallback(async () => {
    if (!api || !account) {
      setStakePositions([]);
      return;
    }

    setIsLoadingStakes(true);
    try {
      const positions: StakePosition[] = [];
      const coldkey = account.address;

      // Query SubtensorModule.Alpha storage: Alpha(hotkey, coldkey, netuid) -> stake
      const stakingHotkeysQuery = (api.query as any).subtensorModule?.stakingHotkeys;

      if (stakingHotkeysQuery) {
        const hotkeys = await stakingHotkeysQuery(coldkey);
        const hotkeyList = hotkeys.toJSON() as string[];

        if (hotkeyList && hotkeyList.length > 0) {
          for (const hotkey of hotkeyList) {
            try {
              const alphaQuery = (api.query as any).subtensorModule?.alpha;
              if (alphaQuery) {
                const stakeResult = await alphaQuery(hotkey, coldkey, GITTENSOR_NETUID);
                const stake = BigInt(stakeResult.toString() || '0');

                if (stake > 0n) {
                  positions.push({
                    hotkey,
                    netuid: GITTENSOR_NETUID,
                    stake,
                    stakeFormatted: (Number(stake) / 10 ** ALPHA_TOKEN.decimals).toFixed(4),
                  });
                }
              }
            } catch (err) {
              console.warn(`Failed to query stake for hotkey ${hotkey}:`, err);
            }
          }
        }
      } else {
        console.warn('StakingHotkeys storage not found, trying alternative queries');
      }

      setStakePositions(positions);
    } catch (err) {
      console.error('Failed to query stake positions:', err);
      setStakePositions([]);
    } finally {
      setIsLoadingStakes(false);
    }
  }, [api, account]);

  // Auto-refresh stakes when account changes
  useEffect(() => {
    if (isConnected && account && api) {
      refreshStakes();
    }
  }, [isConnected, account, api, refreshStakes]);

  // Cleanup API on unmount
  useEffect(() => {
    return () => {
      if (api) {
        api.disconnect();
      }
    };
  }, [api]);

  return {
    isConnected,
    isConnecting,
    account,
    accounts,
    api,
    error,
    isDevMode: DEV_MODE_ENABLED,
    devKeyringPair,
    stakePositions,
    isLoadingStakes,
    refreshStakes,
    connect,
    disconnect,
    selectAccount,
    formatAddress,
  };
};

// Hook specifically for contract interactions
export interface UseContractReturn {
  api: ApiPromise | null;
  account: InjectedAccountWithMeta | null;
  getSigner: () => Promise<any>;
  isReady: boolean;
  isDevMode: boolean;
}

export const useContract = (wallet: UsePolkadotWalletReturn): UseContractReturn => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(!!(wallet.api && wallet.account));
  }, [wallet.api, wallet.account]);

  const getSigner = useCallback(async () => {
    if (!wallet.account) {
      throw new Error('No account selected');
    }

    // DEV MODE: Return the keyring pair directly as signer
    if (wallet.isDevMode && wallet.devKeyringPair) {
      console.log('🔧 Using dev keyring signer');
      return wallet.devKeyringPair;
    }

    // PRODUCTION MODE: Get the injector for the account
    const injector = await web3FromAddress(wallet.account.address);
    return injector.signer;
  }, [wallet.account, wallet.isDevMode, wallet.devKeyringPair]);

  return {
    api: wallet.api,
    account: wallet.account,
    getSigner,
    isReady,
    isDevMode: wallet.isDevMode,
  };
};
