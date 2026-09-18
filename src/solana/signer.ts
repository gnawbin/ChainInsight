import { invoke, isTauri } from "@tauri-apps/api/core";
import { createKeyPairSignerFromBytes, type Address } from "@solana/kit";
import { signer as signerPlugin } from "@solana/kit-plugin-signer";
import { walletSigner, walletWithoutSigner } from "@solana/kit-plugin-wallet";
import { CLUSTERS, type ClusterId } from "./cluster";
import { createRustSigner } from "./desktop-signer";

/**
 * Where the `payer` / `identity` signer comes from.
 *
 * - `wallet`  — a Wallet Standard browser extension. Only viable in a real browser,
 *               because Tauri's webview does not load browser extensions.
 * - `desktop` — a local Solana CLI keypair, read through the Rust bridge.
 */
export type SignerMode = "wallet" | "desktop";

/** How the desktop build signs. */
export type DesktopStrategy =
  /** Read the 64 keypair bytes in Rust, build a `KeyPairSigner` in JS. Simpler. */
  | "local-bytes"
  /** Sign inside Rust; the private key never enters the webview. Hardened. */
  | "rust-signer";

/** Persisted wallet identity key. Namespaced so it cannot collide with other apps. */
export const WALLET_STORAGE_KEY = "solana-defi-demo:wallet";

/** `true` when running inside the Tauri shell rather than a browser tab. */
export const isDesktopShell = (): boolean => devShellOverride() ?? isTauri();

/**
 * Dev-only override for the shell, mirroring {@link devModeOverride}.
 *
 *   pnpm dev  →  http://localhost:1420/?shell=tauri
 *
 * Lets Tauri-only UI (the keypair recovery button, the Settings hints) be
 * rendered and asserted in a plain browser.
 */
function devShellOverride(): boolean | null {
  if (!import.meta.env.DEV) return null;
  if (typeof window === "undefined") return null;

  const fromQuery = new URLSearchParams(window.location.search).get("shell");
  if (fromQuery === "tauri") return true;
  if (fromQuery === "browser") return false;
  return null;
}

/**
 * Dev-only override that forces a signer mode.
 *
 *   pnpm dev  →  http://localhost:1420/?mode=desktop
 *
 * This exists so the desktop signing path can be exercised without building the
 * Tauri app. In a plain browser `invoke` rejects because
 * `window.__TAURI_INTERNALS__` is missing, which reproduces the desktop failure
 * mode (client promise rejects) exactly — useful as a regression test.
 *
 * Compiled out of production builds by the `import.meta.env.DEV` guard.
 */
function devModeOverride(): SignerMode | null {
  if (!import.meta.env.DEV) return null;

  const fromEnv = import.meta.env.VITE_FORCE_SIGNER_MODE;
  if (fromEnv === "desktop" || fromEnv === "wallet") return fromEnv;

  if (typeof window !== "undefined") {
    const fromQuery = new URLSearchParams(window.location.search).get("mode");
    if (fromQuery === "desktop" || fromQuery === "wallet") return fromQuery;
  }

  return null;
}

/** Picks the only viable mode for the current host, honouring the dev override. */
export const detectSignerMode = (): SignerMode =>
  devModeOverride() ?? (isTauri() ? "desktop" : "wallet");

/** Reads the Solana CLI keypair (64 bytes) through the Rust allowlist. */
export async function readLocalKeypair(path?: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>("read_keypair", { path: path ?? null });
  return new Uint8Array(bytes);
}

/**
 * Generates a demo keypair at `~/.solana-defi-demo/id.json`.
 *
 * Written inside the existing allowlist, so creating a keypair does not widen
 * the read scope `read_keypair` enforces. Returns the new address.
 */
export async function createDemoKeypair(): Promise<Address> {
  return (await invoke<string>("create_keypair")) as Address;
}

/** Public address of the Rust-side keypair, without exposing its bytes. */
export async function fetchLocalAddress(): Promise<Address> {
  return (await invoke<string>("local_address")) as Address;
}

/**
 * Installs `client.wallet` **without** touching `payer` / `identity`.
 *
 * Used in both modes so the UI has a single code path: wallet discovery state is
 * always readable, and only the payer/identity source varies. In a desktop shell
 * discovery legitimately finds nothing, which the UI surfaces as "local keypair".
 */
export function walletStatePlugin(cluster: ClusterId) {
  return walletWithoutSigner({ chain: CLUSTERS[cluster].chain, storageKey: WALLET_STORAGE_KEY });
}

/** Installs the connected wallet's signer as both `payer` and `identity`. */
export function walletSignerPlugin(cluster: ClusterId) {
  return walletSigner({ chain: CLUSTERS[cluster].chain, storageKey: WALLET_STORAGE_KEY });
}

/**
 * Desktop: keypair bytes become an in-memory `KeyPairSigner` (payer + identity).
 *
 * Note the shape: Kit's asynchronous plugins are *functions that return a
 * promise of a client*, not promises of plugin functions — `client.use()` awaits
 * the returned promise itself.
 */
export function localBytesSignerPlugin() {
  return async <T extends object>(client: T) => {
    const keyPairSigner = await createKeyPairSignerFromBytes(await readLocalKeypair());
    return signerPlugin(keyPairSigner)(client);
  };
}

/** Desktop (hardened): only a partial signer is exposed; signing happens in Rust. */
export function rustSignerPlugin() {
  return async <T extends object>(client: T) => {
    return signerPlugin(createRustSigner(await fetchLocalAddress()))(client);
  };
}
