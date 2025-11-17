/// <reference types="vite/client" />

// Polkadot extension injection types
interface InjectedWindow {
  injectedWeb3?: Record<string, any>;
}

declare global {
  interface Window extends InjectedWindow {
    // Legacy - no longer used after switching to Polkadot.js
    // Kept for reference only
    ethereum?: any;
    talismanEth?: any;
  }
}

export {};
