import { ClientProvider } from "@solana/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useCallback, useMemo, useState, type PropsWithChildren } from "react";

import { createAppClient, type SolanaConfig } from "./client";
import { initialCluster, type ClusterId } from "./cluster";
import { SolanaConfigContext, type SolanaConfigContextValue } from "./config-context";
import { detectSignerMode, type DesktopStrategy, type SignerMode } from "./signer";

/**
 * TanStack Query cache shared by the Solana read hooks.
 *
 * `@solana/react` ships a TanStack adapter (`@solana/react/query`) that routes
 * reads through this cache for de-duplication; the plain hooks use it for the
 * same reason once several widgets read the same account.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // RPC data is stale quickly, but the kit hooks subscribe for live updates,
      // so a short window is enough to avoid duplicate round-trips.
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ClientBootFallback() {
  return (
    <div className="flex h-svh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Connecting to Solana…</p>
      </div>
    </div>
  );
}

/**
 * Owns the Kit client and its configuration.
 *
 * The client is rebuilt whenever the cluster or signer mode changes, because
 * Kit's wallet plugin is bound to a single chain. `useMemo` keeps the promise
 * identity stable across renders, which `ClientProvider` requires — it suspends
 * the subtree until an async client resolves.
 */
export function SolanaProvider({ children }: PropsWithChildren) {
  const [config, setConfig] = useState<SolanaConfig>(() => ({
    cluster: initialCluster,
    mode: detectSignerMode(),
    desktopStrategy: "local-bytes",
  }));

  const client = useMemo(() => createAppClient(config), [config]);

  const setCluster = useCallback((cluster: ClusterId) => {
    setConfig((previous) => ({ ...previous, cluster }));
  }, []);

  const setMode = useCallback((mode: SignerMode) => {
    setConfig((previous) => ({ ...previous, mode }));
  }, []);

  const setDesktopStrategy = useCallback((desktopStrategy: DesktopStrategy) => {
    setConfig((previous) => ({ ...previous, desktopStrategy }));
  }, []);

  const value = useMemo<SolanaConfigContextValue>(
    () => ({ config, setCluster, setMode, setDesktopStrategy }),
    [config, setCluster, setMode, setDesktopStrategy],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<ClientBootFallback />}>
        <ClientProvider client={client}>
          <SolanaConfigContext.Provider value={value}>{children}</SolanaConfigContext.Provider>
        </ClientProvider>
      </Suspense>
    </QueryClientProvider>
  );
}
