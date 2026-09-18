import { env } from "@/lib/env";

/**
 * Wallet Standard chain identifiers.
 *
 * Declared as literals rather than imported from `@solana/wallet-standard-chains`
 * so the app does not depend on a transitive package. Both values are assignable
 * to `SolanaChain` and to wallet-standard's `IdentifierString`.
 */
export const CHAIN_DEVNET = "solana:devnet";
export const CHAIN_LOCALNET = "solana:localnet";

export type ClusterId = "devnet" | "local";

export type ClusterConfig = Readonly<{
  id: ClusterId;
  label: string;
  /** Wallet Standard chain id handed to the wallet plugins. */
  chain: typeof CHAIN_DEVNET | typeof CHAIN_LOCALNET;
  defaultRpcUrl: string;
  defaultRpcSubscriptionsUrl: string;
  /** `false` where no faucet exists (mainnet); both demo clusters support it. */
  supportsAirdrop: boolean;
}>;

export const CLUSTERS: Record<ClusterId, ClusterConfig> = {
  devnet: {
    id: "devnet",
    label: "Devnet",
    chain: CHAIN_DEVNET,
    defaultRpcUrl: "https://api.devnet.solana.com",
    defaultRpcSubscriptionsUrl: "wss://api.devnet.solana.com",
    supportsAirdrop: true,
  },
  local: {
    id: "local",
    label: "Local",
    chain: CHAIN_LOCALNET,
    defaultRpcUrl: "http://127.0.0.1:8899",
    defaultRpcSubscriptionsUrl: "ws://127.0.0.1:8900",
    supportsAirdrop: true,
  },
};

export const DEFAULT_CLUSTER: ClusterId = "devnet";

/** Normalises an arbitrary string to a known cluster id. */
export function toClusterId(value: string | undefined): ClusterId {
  return value === "local" ? "local" : DEFAULT_CLUSTER;
}

/** Cluster the app boots into, honouring `VITE_SOLANA_CLUSTER`. */
export const initialCluster: ClusterId = toClusterId(env.cluster);

/**
 * Endpoint overrides handed to the kit RPC bundle. Falls back to the cluster
 * defaults, which is what the bundle would use anyway — passing them explicitly
 * keeps the URL consistent with what the UI displays.
 */
export function rpcOverrides(cluster: ClusterId) {
  const config = CLUSTERS[cluster];
  return {
    rpcUrl: env.rpcUrl ?? config.defaultRpcUrl,
    rpcSubscriptionsUrl: env.rpcSubscriptionsUrl ?? config.defaultRpcSubscriptionsUrl,
  };
}

/** Builds an explorer.solana.com link for the active cluster. */
export function explorerUrl(cluster: ClusterId, path: string): string {
  const query =
    cluster === "devnet"
      ? "?cluster=devnet"
      : `?cluster=custom&customUrl=${encodeURIComponent(CLUSTERS.local.defaultRpcUrl)}`;
  return `https://explorer.solana.com/${path.replace(/^\//, "")}${query}`;
}
