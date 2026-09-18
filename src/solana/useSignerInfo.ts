import type { Address, TransactionSigner } from "@solana/kit";
import { useClient } from "@solana/react";
import { useConnectedWallet, useWalletStatus } from "@solana/kit-plugin-wallet/react";
import type { AppClient } from "./client";
import { useSolanaConfig } from "./config-context";

export type SignerInfo = Readonly<{
  mode: "wallet" | "desktop";
  /** Base58 address of the active signer, or `null` when nothing can sign yet. */
  address: Address | null;
  /** Signer usable right now? Drives the "connect wallet" gate on actions. */
  ready: boolean;
  /** Wallet plugin status, or `'local'` in the desktop build. */
  status: string;
  /** `true` while an auto-reconnect is still resolving. */
  reconnecting: boolean;
}>;

/**
 * The single source of truth the UI uses to answer "who can sign?".
 *
 * Both signer modes install the wallet *state* plugin, so `useConnectedWallet`
 * is always callable — no conditional hooks, and no component needs to know which
 * backend is active. Selecting the answer is a plain branch on the mode.
 */
export function useSignerInfo(): SignerInfo {
  const client = useClient<AppClient>();
  const { config } = useSolanaConfig();
  const connected = useConnectedWallet(client);
  const status = useWalletStatus(client);

  if (config.mode === "desktop") {
    // In desktop mode `payer` is always installed from the local keypair, so
    // reading it is safe (unlike in wallet mode, where it throws while disconnected).
    return {
      mode: "desktop",
      address: client.payer.address,
      ready: true,
      status: "local",
      reconnecting: false,
    };
  }

  return {
    mode: "wallet",
    // `UiWalletAccount.address` is a plain string from wallet-standard; Kit
    // brands its own addresses, so this cast is where the two meet.
    address: (connected?.account.address ?? null) as Address | null,
    ready: status === "connected",
    status,
    reconnecting: status === "reconnecting",
  };
}

/**
 * The `payer` signer, or `null` when none is available.
 *
 * Prefer this over reading `client.payer` directly: in wallet mode that getter
 * throws while disconnected, which would turn a normal "not connected" render
 * into a crash.
 */
export function usePayerSigner(): TransactionSigner | null {
  const client = useClient<AppClient>();
  const { ready } = useSignerInfo();
  return ready ? client.payer : null;
}
