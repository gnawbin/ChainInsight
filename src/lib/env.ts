/**
 * Typed access to Vite environment variables.
 *
 * Only `VITE_`-prefixed values reach the frontend bundle, so never put secrets
 * here. Empty or unknown values resolve to `undefined` and are defaulted by the
 * caller (see `src/solana/cluster.ts`).
 */

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export const env = {
  /** Raw `VITE_SOLANA_CLUSTER`; normalised by `toClusterId()` in `src/solana/cluster.ts`. */
  cluster: readString(import.meta.env.VITE_SOLANA_CLUSTER),
  /** Optional RPC endpoint override. */
  rpcUrl: readString(import.meta.env.VITE_SOLANA_RPC_URL),
  /** Optional RPC subscriptions endpoint override. */
  rpcSubscriptionsUrl: readString(import.meta.env.VITE_SOLANA_WS_URL),
} as const;
