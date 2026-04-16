/**
 * Gittensor product subnet netuids (Bittensor `netuid`) for onboarding copy,
 * FAQ, and external links. Update here when mainnet/testnet assignments change.
 */
export const PRODUCT_SUBNET = {
  MAINNET: 74,
  TESTNET: 422,
} as const;

export function taostatsSubnetChartUrl(netuid: number) {
  return `https://taostats.io/subnets/${netuid}/chart`;
}
