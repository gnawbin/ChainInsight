/// <reference types="vite/client" />

/**
 * Environment variables exposed to the frontend bundle.
 *
 * Only `VITE_`-prefixed variables are inlined by Vite. Anything defined here
 * ends up inside the shipped JS, so **never put secrets in `.env`**.
 * See `.env.example` for documentation of each value.
 */
interface ImportMetaEnv {
  /** Which cluster to boot into: `devnet` | `local`. Defaults to `devnet`. */
  readonly VITE_SOLANA_CLUSTER?: string;
  /** Optional RPC endpoint override; falls back to the cluster default. */
  readonly VITE_SOLANA_RPC_URL?: string;
  /** Optional websocket endpoint override; falls back to `VITE_SOLANA_RPC_URL`. */
  readonly VITE_SOLANA_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
