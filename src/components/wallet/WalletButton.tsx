import { useState } from "react";
import { WalletIcon } from "lucide-react";
import { useClient } from "@solana/react";
import { useConnect, useDisconnect, useWallets } from "@solana/kit-plugin-wallet/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { shortenAddress } from "@/lib/format";
import type { AppClient } from "@/solana/client";
import { useSignerInfo } from "@/solana/useSignerInfo";

/**
 * Derived from the hook's return type so the app does not need a direct
 * dependency on `@wallet-standard/ui` just for `UiWallet`.
 */
type DiscoveredWallet = ReturnType<typeof useWallets>[number];

/**
 * One button for both signer modes.
 *
 * In a browser it opens wallet discovery and connects via Wallet Standard. In the
 * Tauri shell there is nothing to discover (extensions are not loaded into the
 * webview), so it renders the local keypair address instead — the UI does not
 * need to branch, because `useSignerInfo` already resolved which backend is live.
 */
export function WalletButton() {
  const client = useClient<AppClient>();
  const { mode, address, ready } = useSignerInfo();
  const wallets = useWallets(client);
  const connect = useConnect(client);
  const disconnect = useDisconnect(client);
  const [open, setOpen] = useState(false);

  async function handleConnect(wallet: DiscoveredWallet) {
    try {
      // `dispatchAsync` propagates failures, unlike fire-and-forget `dispatch`.
      await connect.dispatchAsync(wallet);
      setOpen(false);
    } catch (error) {
      toast.error("Could not connect", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect.dispatchAsync();
    } catch (error) {
      toast.error("Could not disconnect", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (mode === "desktop") {
    return (
      <Button variant="outline" size="sm" className="gap-2 font-mono text-xs">
        <WalletIcon />
        {address === null ? "Loading keypair…" : shortenAddress(address, 4)}
      </Button>
    );
  }

  if (ready && address !== null) {
    return (
      <Button variant="outline" size="sm" onClick={handleDisconnect} className="gap-2 font-mono text-xs">
        <WalletIcon />
        {shortenAddress(address, 4)}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <WalletIcon />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            Wallets are discovered through the Wallet Standard, so no adapter package is needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {wallets.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No wallets detected. Install a Solana browser extension (Phantom, Solflare, Backpack)
              and reload the page.
            </p>
          ) : (
            wallets.map((wallet) => (
              <Button
                key={wallet.name}
                variant="outline"
                className="justify-start gap-3"
                disabled={connect.isRunning}
                onClick={() => void handleConnect(wallet)}
              >
                {wallet.icon ? (
                  <img src={wallet.icon} alt="" className="size-5 rounded-sm" />
                ) : (
                  <WalletIcon className="size-5" />
                )}
                {wallet.name}
              </Button>
            ))
          )}
        </div>

        {connect.isRunning ? <Skeleton className="h-4 w-40" /> : null}
      </DialogContent>
    </Dialog>
  );
}
