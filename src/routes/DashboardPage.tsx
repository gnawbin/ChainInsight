import { Button, Card, Group, SimpleGrid, Skeleton, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { useClient, useRequest } from "@solana/react";
import { ActivityIcon, CoinsIcon, HashIcon, LayersIcon, RefreshCwIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useSolBalance } from "@/hooks/useSolBalance";
import { formatNumber, formatSol, groupDigits, shortenAddress } from "@/lib/format";
import type { AppClient } from "@/solana/client";
import { CLUSTERS } from "@/solana/cluster";
import { useSolanaConfig } from "@/solana/config-context";
import { useSignerInfo } from "@/solana/useSignerInfo";

function StatCard({
  title,
  icon,
  error,
  onRetry,
  children,
}: {
  title: string;
  icon: ReactNode;
  /** Truthy when the underlying read failed; renders the error affordance. */
  error?: unknown;
  onRetry?: () => void;
  children: ReactNode;
}) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Group gap="xs" mb="sm" wrap="nowrap">
        <ThemeIcon variant="light" size="sm" radius="sm">
          {icon}
        </ThemeIcon>
        <Text size="sm" fw={500} c="dimmed">
          {title}
        </Text>
      </Group>

      {error ? (
        // Without this branch a failed request would pulse a skeleton forever.
        <Group gap="xs">
          <Text c="red" size="sm">
            Unavailable
          </Text>
          {onRetry === undefined ? null : (
            <Button
              variant="subtle"
              size="compact-xs"
              leftSection={<RefreshCwIcon size={14} />}
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </Group>
      ) : (
        children
      )}
    </Card>
  );
}

function Field({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500} ff={mono ? "monospace" : undefined}>
        {value}
      </Text>
    </div>
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
    <Stack gap="lg">
      <div>
        <Title order={2}>Dashboard</Title>
        <Text size="sm" c="dimmed">
          Live data straight from the {cluster.label} cluster via <code>@solana/kit</code>.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
        <StatCard
          title="SOL Balance"
          icon={<CoinsIcon size={14} />}
          // Only surface an error once a signer exists; otherwise the card's job
          // is to prompt for a connection.
          error={canSign ? balance.error : undefined}
          onRetry={() => balance.refresh()}
        >
          {!canSign ? (
            <Text size="sm" c="dimmed">
              {mode === "wallet" ? "Connect a wallet" : "No local keypair"}
            </Text>
          ) : balance.status === "loading" ? (
            <Skeleton height={28} width={"60%"} />
          ) : balance.data ? (
            <Group gap={6} align="baseline">
              <Text fz="xl" fw={600}>
                {groupDigits(formatSol(balance.data.value, 4))}
              </Text>
              <Text size="sm" c="dimmed">
                SOL
              </Text>
            </Group>
          ) : null}
        </StatCard>

        <StatCard
          title="Epoch"
          icon={<LayersIcon size={14} />}
          error={epoch.error}
          onRetry={() => epoch.refresh()}
        >
          {epoch.status === "success" && epoch.data ? (
            <Group gap={6} align="baseline">
              <Text fz="xl" fw={600}>
                {formatNumber(Number(epoch.data.epoch))}
              </Text>
              <Text size="sm" c="dimmed">
                {/* EpochInfo exposes slotIndex/slotsInEpoch rather than a ratio. */}
                {formatNumber(
                  (Number(epoch.data.slotIndex) / Number(epoch.data.slotsInEpoch)) * 100,
                  1,
                )}
                %
              </Text>
            </Group>
          ) : (
            <Skeleton height={28} width={"45%"} />
          )}
        </StatCard>

        <StatCard
          title="Block Height"
          icon={<HashIcon size={14} />}
          error={blockHeight.error}
          onRetry={() => blockHeight.refresh()}
        >
          {blockHeight.status === "success" && blockHeight.data !== undefined ? (
            <Text fz="xl" fw={600}>
              {formatNumber(Number(blockHeight.data))}
            </Text>
          ) : (
            <Skeleton height={28} width={"50%"} />
          )}
        </StatCard>

        <StatCard
          title="Cluster Version"
          icon={<ActivityIcon size={14} />}
          error={version.error}
          onRetry={() => version.refresh()}
        >
          {version.status === "success" && version.data ? (
            <Text fz="lg" fw={600} ff="monospace">
              {version.data["solana-core"]}
            </Text>
          ) : (
            <Skeleton height={28} width={"45%"} />
          )}
        </StatCard>
      </SimpleGrid>

      <Card withBorder padding="lg" radius="md">
        <Title order={4} mb="md">
          Signer
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Field
            label="Source"
            value={mode === "wallet" ? "Wallet Standard extension" : "Local Solana CLI keypair"}
          />
          <Field
            label="Address"
            mono
            value={address === null ? "—" : shortenAddress(address, 8)}
          />
          <Field label="RPC endpoint" value={cluster.defaultRpcUrl} mono />
          <Field
            label="Status"
            value={mode === "desktop" ? "Local keypair ready" : ready ? "Connected" : "Disconnected"}
          />
        </SimpleGrid>
      </Card>
    </Stack>
  );
}
