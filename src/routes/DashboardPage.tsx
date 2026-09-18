import { useClient, useRequest } from "@solana/react";
import { ActivityIcon, CoinsIcon, HashIcon, LayersIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatSol, groupDigits, shortenAddress } from "@/lib/format";
import { useSolBalance } from "@/hooks/useSolBalance";
import type { AppClient } from "@/solana/client";
import { CLUSTERS } from "@/solana/cluster";
import { useSolanaConfig } from "@/solana/config-context";
import { useSignerInfo } from "@/solana/useSignerInfo";

function StatCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{children}</CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const client = useClient<AppClient>();
  const { config } = useSolanaConfig();
  const { address, ready, mode } = useSignerInfo();
  const balance = useSolBalance(address);

  // One-shot reads: these fire on mount and can be refreshed on demand.
  const epoch = useRequest(client.rpc.getEpochInfo());
  const blockHeight = useRequest(client.rpc.getBlockHeight());
  const version = useRequest(client.rpc.getVersion());

  const cluster = CLUSTERS[config.cluster];
  const canSign = ready && address !== null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live data straight from the {cluster.label} cluster via{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">@solana/kit</code>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="SOL Balance" icon={<CoinsIcon className="size-4" />}>
          {!canSign ? (
            <span className="text-base font-normal text-muted-foreground">
              {mode === "wallet" ? "Connect a wallet" : "No local keypair"}
            </span>
          ) : balance.status === "loading" ? (
            <Skeleton className="h-8 w-32" />
          ) : balance.error ? (
            <span className="text-base font-normal text-negative">Unavailable</span>
          ) : balance.data ? (
            <span>
              {groupDigits(formatSol(balance.data.value, 4))}
              <span className="ml-1 text-sm font-normal text-muted-foreground">SOL</span>
            </span>
          ) : null}
        </StatCard>

        <StatCard title="Epoch" icon={<LayersIcon className="size-4" />}>
          {epoch.status === "success" && epoch.data ? (
            <>
              {formatNumber(Number(epoch.data.epoch))}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {/* EpochInfo exposes slotIndex/slotsInEpoch rather than a ratio. */}
                {formatNumber(
                  (Number(epoch.data.slotIndex) / Number(epoch.data.slotsInEpoch)) * 100,
                  1,
                )}
                %
              </span>
            </>
          ) : (
            <Skeleton className="h-8 w-24" />
          )}
        </StatCard>

        <StatCard title="Block Height" icon={<HashIcon className="size-4" />}>
          {blockHeight.status === "success" && blockHeight.data !== undefined ? (
            formatNumber(Number(blockHeight.data))
          ) : (
            <Skeleton className="h-8 w-28" />
          )}
        </StatCard>

        <StatCard title="Cluster Version" icon={<ActivityIcon className="size-4" />}>
          {version.status === "success" && version.data ? (
            <span className="font-mono text-lg">{version.data["solana-core"]}</span>
          ) : (
            <Skeleton className="h-8 w-24" />
          )}
        </StatCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Source</p>
            <p className="font-medium">
              {mode === "wallet" ? "Wallet Standard extension" : "Local Solana CLI keypair"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Address</p>
            <p className="font-mono">
              {address === null ? "—" : shortenAddress(address, 8)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">RPC endpoint</p>
            <p className="truncate font-mono text-xs">{cluster.defaultRpcUrl}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-medium">
              {mode === "desktop" ? "Local keypair ready" : ready ? "Connected" : "Disconnected"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
