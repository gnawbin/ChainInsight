import { createClient } from "@solana/kit";
import { solanaDevnetRpc, solanaLocalRpc } from "@solana/kit-plugin-rpc";
import { rpcOverrides, type ClusterId } from "./cluster";
import {
  localBytesSignerPlugin,
  rustSignerPlugin,
  walletSignerPlugin,
  walletStatePlugin,
  type DesktopStrategy,
  type SignerMode,
} from "./signer";

export type SolanaConfig = Readonly<{
  cluster: ClusterId;
  mode: SignerMode;
  desktopStrategy: DesktopStrategy;
}>;

function rpcBundle(config: SolanaConfig) {
  const overrides = rpcOverrides(config.cluster);
  // Both bundles include `rpc`, `rpcSubscriptions`, a planner, a sending
  // executor and an airdrop capability.
  return config.cluster === "local" ? solanaLocalRpc(overrides) : solanaDevnetRpc(overrides);
}

/**
 * Builds the Kit client for a configuration.
 *
 * Plugin order is load-bearing: the signer must be installed **before** the RPC
 * bundle, because the bundle wires the client's `payer` into transaction
 * planning (the RPC plugins are typed `<T extends ClientWithPayer>`).
 *
 * Every branch returns a promise (the signer plugins are async), so the result
 * is handed straight to `<ClientProvider>`, which suspends on the nearest
 * `<Suspense>` boundary until it resolves.
 */
export function createAppClient(config: SolanaConfig) {
  if (config.mode === "desktop") {
    const signerPlugin =
      config.desktopStrategy === "rust-signer" ? rustSignerPlugin() : localBytesSignerPlugin();
    return createClient()
      .use(walletStatePlugin(config.cluster))
      .use(signerPlugin)
      .use(rpcBundle(config));
  }

  return createClient().use(walletSignerPlugin(config.cluster)).use(rpcBundle(config));
}

/**
 * The app's client type. `Awaited` matters: the plugins above are async, so
 * `createAppClient` returns a promise and `useClient<AppClient>()` would
 * otherwise be typed as the promise rather than the resolved client.
 */
export type AppClient = Awaited<ReturnType<typeof createAppClient>>;
