// Bittensor Network Configuration
export const BITTENSOR_NETWORK = {
  chainId: '0x3c4', // 964 in decimal
  chainName: 'Subtensor EVM',
  rpcUrls: ['https://evm.chain.opentensor.ai'],
  nativeCurrency: {
    name: 'TAO',
    symbol: 'TAO',
    decimals: 18
  },
  blockExplorerUrls: ['https://explorer.chain.opentensor.ai']
};

// Contract Addresses - UPDATE THESE WITH ACTUAL ADDRESSES FROM BACKEND
export const ALPHA_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'; // PLACEHOLDER - Replace with actual Alpha token contract address
export const BOUNTY_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // PLACEHOLDER - Replace with actual Bounty contract address

// Contract ABIs
export const ALPHA_TOKEN_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

export const BOUNTY_ABI = [
  'function registerIssue(string githubUrl, uint256 amount)'
];
