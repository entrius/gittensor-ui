/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_REACT_APP_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// MetaMask/Ethereum provider types
interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on?: (event: string, handler: (...args: any[]) => void) => void;
    removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  };
}
