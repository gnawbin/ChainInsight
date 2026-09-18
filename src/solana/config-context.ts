import { createContext, useContext } from "react";
import type { SolanaConfig } from "./client";
import type { ClusterId } from "./cluster";
import type { DesktopStrategy, SignerMode } from "./signer";

export type SolanaConfigContextValue = Readonly<{
  config: SolanaConfig;
  setCluster: (cluster: ClusterId) => void;
  setMode: (mode: SignerMode) => void;
  setDesktopStrategy: (strategy: DesktopStrategy) => void;
}>;

/**
 * Carries the client *configuration* (cluster + signer mode) down the tree.
 *
 * Kept separate from the Kit client itself: changing any of these values
 * rebuilds the client, because Kit's wallet plugin requires one client per chain.
 */
export const SolanaConfigContext = createContext<SolanaConfigContextValue | null>(null);

export function useSolanaConfig(): SolanaConfigContextValue {
  const value = useContext(SolanaConfigContext);
  if (value === null) {
    throw new Error("useSolanaConfig must be used inside <SolanaProvider>");
  }
  return value;
}
