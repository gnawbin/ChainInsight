import { Alert, Avatar, Button, Group, Loader, Menu, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { WalletIcon } from "lucide-react";
import { useClient } from "@solana/react";
import { useConnect, useDisconnect, useWallets } from "@solana/kit-plugin-wallet/react";

import { shortenAddress } from "@/lib/format";
import type { AppClient } from "@/solana/client";
import { useSignerInfo } from "@/solana/useSignerInfo";

/**
 * Derived from the hook's return type so the app does not need a direct
 * dependency on `@wallet-standard/ui` just for `UiWallet`.
 */
type DiscoveredWallet = ReturnType<typeof useWallets>[number];

function reportError(title: string, error: unknown) {
  notifications.show({
    color: "red",
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}

/**
 * One control for both signer modes.
 *
 * In a browser it opens wallet discovery and connects via Wallet Standard. In the
 * Tauri shell there is nothing to discover (extensions are not loaded into the
 * webview), so it shows the local keypair address instead — the UI does not need
 * to branch, because `useSignerInfo` already resolved which backend is live.
 */
export function WalletButton() {
  const client = useClient<AppClient>();
  const { mode, address, ready } = useSignerInfo();
  const wallets = useWallets(client);
  const connect = useConnect(client);
  const disconnect = useDisconnect(client);
  const [opened, { open, close }] = useDisclosure(false);

  async function handleConnect(wallet: DiscoveredWallet) {
    try {
      // `dispatchAsync` propagates failures, unlike fire-and-forget `dispatch`.
      await connect.dispatchAsync(wallet);
      close();
    } catch (error) {
      reportError("Could not connect", error);
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect.dispatchAsync();
    } catch (error) {
      reportError("Could not disconnect", error);
    }
  }

  if (mode === "desktop") {
    return (
      <Button variant="default" size="sm" leftSection={<WalletIcon size={16} />}>
        {address === null ? "Loading keypair…" : shortenAddress(address, 4)}
      </Button>
    );
  }

  if (ready && address !== null) {
    return (
      <Menu position="bottom-end" withArrow>
        <Menu.Target>
          <Button variant="default" size="sm" leftSection={<WalletIcon size={16} />}>
            {shortenAddress(address, 4)}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Connected</Menu.Label>
          <Menu.Item disabled leftSection={<WalletIcon size={14} />}>
            {shortenAddress(address, 8)}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item color="red" onClick={() => void handleDisconnect()}>
            Disconnect
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <>
      <Button size="sm" leftSection={<WalletIcon size={16} />} onClick={open}>
        Connect Wallet
      </Button>

      <Modal opened={opened} onClose={close} title="Connect a wallet" centered>
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Wallets are discovered through the Wallet Standard, so no adapter package is needed.
          </Text>

          {wallets.length === 0 ? (
            <Alert color="gray" variant="light">
              No wallets detected. Install a Solana browser extension (Phantom, Solflare, Backpack)
              and reload the page.
            </Alert>
          ) : (
            wallets.map((wallet) => (
              <Button
                key={wallet.name}
                variant="default"
                justify="flex-start"
                disabled={connect.isRunning}
                leftSection={
                  wallet.icon ? (
                    <Avatar src={wallet.icon} size={20} radius="sm" alt="" />
                  ) : (
                    <WalletIcon size={20} />
                  )
                }
                onClick={() => void handleConnect(wallet)}
              >
                {wallet.name}
              </Button>
            ))
          )}

          {connect.isRunning ? (
            <Group gap="xs">
              <Loader size={16} />
              <Text size="sm" c="dimmed">
                Waiting for the wallet…
              </Text>
            </Group>
          ) : null}
        </Stack>
      </Modal>
    </>
  );
}
