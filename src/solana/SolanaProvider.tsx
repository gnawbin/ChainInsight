import { Loader, Stack, Text } from "@mantine/core";
import { ClientProvider } from "@solana/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useCallback, useMemo, useState, type PropsWithChildren } from "react";

import { ClientErrorScreen } from "@/components/ClientErrorScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createAppClient, type SolanaConfig } from "./client";
import { initialCluster, type ClusterId } from "./cluster";
import { SolanaConfigContext, type SolanaConfigContextValue } from "./config-context";
import {
  createDemoKeypair,
  detectSignerMode,
  isDesktopShell,
  type DesktopStrategy,
  type SignerMode,
} from "./signer";

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
    <Stack align="center" justify="center" mih="100svh" gap="sm">
      <Loader />
      <Text size="sm" c="dimmed">
        Connecting to Solana…
      </Text>
    </Stack>
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

  /**
   * Bumping this rebuilds the client.
   *
   * That is how "Retry" works after a failed initialisation: a new `useMemo`
   * identity produces a new client promise, and the error boundary re-arms
   * because its `resetKey` includes this value.
   */
  const [reloadKey, setReloadKey] = useState(0);

  const client = useMemo(
    // `reloadKey` is intentionally a dependency even though it is unused inside:
    // it is the signal to rebuild the client from scratch.
    () => createAppClient(config),
    [config, reloadKey],
  );

  const setCluster = useCallback((cluster: ClusterId) => {
    setConfig((previous) => ({ ...previous, cluster }));
  }, []);

  const setMode = useCallback((mode: SignerMode) => {
    setConfig((previous) => ({ ...previous, mode }));
  }, []);

  const setDesktopStrategy = useCallback((desktopStrategy: DesktopStrategy) => {
    setConfig((previous) => ({ ...previous, desktopStrategy }));
  }, []);

  const retry = useCallback(() => {
    setReloadKey((previous) => previous + 1);
  }, []);

  const value = useMemo<SolanaConfigContextValue>(
    () => ({ config, setCluster, setMode, setDesktopStrategy }),
    [config, setCluster, setMode, setDesktopStrategy],
  );

  const desktop = isDesktopShell();

  return (
    <QueryClientProvider client={queryClient}>
      {/*
        The boundary sits *outside* the config provider, so its fallback receives
        the configuration as props rather than reading it from context. It must
        also wrap `ClientProvider`, because a rejected async client surfaces as a
        render error from there — and without a boundary React unmounts the whole
        root, leaving a blank window.
      */}
      <ErrorBoundary
        resetKey={`${reloadKey}|${config.cluster}|${config.mode}|${config.desktopStrategy}`}
        fallback={(error) => (
          <ClientErrorScreen
            error={error}
            mode={config.mode}
            onRetry={retry}
            onUseWallet={config.mode === "wallet" ? undefined : () => setMode("wallet")}
            onCreateKeypair={
              desktop
                ? async () => {
                    await createDemoKeypair();
                    retry();
                  }
                : undefined
            }
            desktopShell={desktop}
          />
        )}
      >
        <Suspense fallback={<ClientBootFallback />}>
          <ClientProvider client={client}>
            <SolanaConfigContext.Provider value={value}>{children}</SolanaConfigContext.Provider>
          </ClientProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
