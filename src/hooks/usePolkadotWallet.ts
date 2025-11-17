import { useState, useCallback, useEffect } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { getCurrentNetwork } from '../config/bittensorConfig';

export interface UsePolkadotWalletReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  account: InjectedAccountWithMeta | null;
  accounts: InjectedAccountWithMeta[];
  api: ApiPromise | null;
  error: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  selectAccount: (account: InjectedAccountWithMeta) => void;

  // Utilities
  formatAddress: (address: string) => string;
}

const APP_NAME = 'Gittensor UI';

export const usePolkadotWallet = (): UsePolkadotWalletReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize API connection
  const initializeApi = useCallback(async () => {
    try {
      const network = getCurrentNetwork();
      const wsProvider = new WsProvider(network.wsEndpoint);
      const apiInstance = await ApiPromise.create({ provider: wsProvider });

      setApi(apiInstance);
      return apiInstance;
    } catch (err) {
      console.error('Failed to initialize API:', err);
      throw new Error('Failed to connect to Bittensor network');
    }
  }, []);

  // Connect to wallet
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Request permission to access accounts from Talisman/Polkadot.js extension
      const extensions = await web3Enable(APP_NAME);

      if (extensions.length === 0) {
        throw new Error(
          'No Polkadot wallet extension found. Please install Talisman or Polkadot.js extension.'
        );
      }

      // Get all accounts from all extensions
      const allAccounts = await web3Accounts();

      if (allAccounts.length === 0) {
        throw new Error(
          'No accounts found in your wallet. Please create an account in Talisman.'
        );
      }

      // Initialize API if not already initialized
      let apiInstance = api;
      if (!apiInstance) {
        apiInstance = await initializeApi();
      }

      setAccounts(allAccounts);
      setAccount(allAccounts[0]); // Select first account by default
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

    // Get the injector for the account
    const injector = await web3FromAddress(wallet.account.address);
    return injector.signer;
  }, [wallet.account]);

  return {
    api: wallet.api,
    account: wallet.account,
    getSigner,
    isReady,
  };
};
