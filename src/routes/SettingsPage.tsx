import { Alert, Badge, Card, Code, Group, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { AlertTriangleIcon, CpuIcon, GlobeIcon, KeyRoundIcon } from "lucide-react";

import { CLUSTERS, type ClusterId } from "@/solana/cluster";
import { useSolanaConfig } from "@/solana/config-context";
import { isDesktopShell, type DesktopStrategy, type SignerMode } from "@/solana/signer";

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Group gap="xs" mb="xs">
      {icon}
      <Title order={4}>{children}</Title>
    </Group>
  );
}

/**
 * Lets the user re-point the client at another cluster or signer backend.
 *
 * Every change here rebuilds the Kit client (the wallet plugin is bound to one
 * chain), so the subtree re-subscribes automatically.
 */
export function SettingsPage() {
  const { config, setCluster, setMode, setDesktopStrategy } = useSolanaConfig();
  const desktop = isDesktopShell();

  return (
    <Stack gap="lg" maw={720}>
      <div>
        <Title order={2}>Settings</Title>
        <Text size="sm" c="dimmed">
          Changing any of these rebuilds the Solana client.
        </Text>
      </div>

      <Card withBorder padding="lg" radius="md">
        <SectionTitle icon={<GlobeIcon size={18} />}>Cluster</SectionTitle>
        <Text size="sm" c="dimmed" mb="sm">
          Local expects a validator or Surfpool on <Code>{CLUSTERS.local.defaultRpcUrl}</Code>.
        </Text>

        <SegmentedControl
          fullWidth
          value={config.cluster}
          onChange={(value) => setCluster(value as ClusterId)}
          data={(Object.keys(CLUSTERS) as ClusterId[]).map((id) => ({
            value: id,
            label: CLUSTERS[id].label,
          }))}
        />

        <Text size="xs" c="dimmed" ff="monospace" mt="xs">
          {CLUSTERS[config.cluster].defaultRpcUrl}
        </Text>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <SectionTitle icon={<KeyRoundIcon size={18} />}>Signer</SectionTitle>
        <Text size="sm" c="dimmed" mb="md">
          {desktop
            ? "Tauri's webview does not load browser extensions, so the desktop build signs with a local keypair."
            : "Running in a browser, so Wallet Standard extensions are available."}
        </Text>

        <Stack gap="lg">
          <div>
            <Text size="sm" fw={500} mb={6}>
              Backend
            </Text>
            <SegmentedControl
              fullWidth
              value={config.mode}
              onChange={(value) => setMode(value as SignerMode)}
              data={[
                { value: "wallet", label: "Browser wallet" },
                { value: "desktop", label: "Local keypair" },
              ]}
            />

            {!desktop && config.mode === "desktop" ? (
              <Alert
                color="yellow"
                variant="light"
                mt="sm"
                icon={<AlertTriangleIcon size={16} />}
              >
                Local keypair reads go through Tauri commands, which are unavailable in a plain
                browser tab — open the app with <Code>pnpm tauri dev</Code> instead.
              </Alert>
            ) : null}
          </div>

          <div>
            <Text size="sm" fw={500} mb={6}>
              Desktop signing strategy
            </Text>
            <SegmentedControl
              fullWidth
              value={config.desktopStrategy}
              onChange={(value) => setDesktopStrategy(value as DesktopStrategy)}
              data={[
                { value: "local-bytes", label: "Key in webview" },
                { value: "rust-signer", label: "Sign in Rust" },
              ]}
            />
            <Text size="xs" c="dimmed" mt="xs">
              {config.desktopStrategy === "rust-signer"
                ? "The private key never leaves Rust. Compiled message bytes are sent over IPC and only the 64-byte signature comes back."
                : "The 64 keypair bytes cross the IPC boundary and become an in-memory KeyPairSigner. Simpler, but the private key transits the webview."}
            </Text>
          </div>
        </Stack>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <SectionTitle icon={<CpuIcon size={18} />}>Build</SectionTitle>
        <Group gap="xs">
          <Badge variant="light">{desktop ? "Tauri desktop shell" : "Browser"}</Badge>
          <Badge variant="light">@solana/kit 8</Badge>
          <Badge variant="light">Mantine 9</Badge>
          <Badge variant="light">React 19 · Vite 8</Badge>
        </Group>
      </Card>
    </Stack>
  );
}
