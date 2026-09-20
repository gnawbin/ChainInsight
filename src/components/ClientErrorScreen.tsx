import {
  Alert,
  Button,
  Card,
  Code,
  Group,
  List,
  Loader,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { AlertTriangleIcon, KeyRoundIcon, RefreshCwIcon, WalletIcon } from "lucide-react";
import { useState } from "react";

import type { SignerMode } from "@/solana/signer";

export type ClientErrorScreenProps = Readonly<{
  error: unknown;
  mode: SignerMode;
  /** Whether the Tauri commands exist at all in this host. */
  desktopShell: boolean;
  /** Rebuild the client and try again. */
  onRetry: () => void;
  /** Switching to the browser-wallet backend, when that is possible. */
  onUseWallet?: () => void;
  /** Desktop shell only: generate a keypair, then retry. */
  onCreateKeypair?: () => Promise<void>;
}>;

/** `invoke` rejects with a plain string from the Rust commands; be liberal. */
function primaryMessage(error: unknown): string {
  if (typeof error === "string" && error.trim() !== "") return error;
  if (error instanceof Error && error.message !== "") return error.message;
  try {
    const json = JSON.stringify(error);
    if (json !== undefined) return json;
  } catch {
    // fall through
  }
  return String(error);
}

/**
 * Renders the error, following `cause` when present.
 *
 * Frameworks sometimes wrap the original failure (a rejected promise may be
 * re-thrown as an unrelated internal error), and the cause is the part the user
 * can act on.
 */
function describe(error: unknown): string {
  const primary = primaryMessage(error);
  const cause = (error as { cause?: unknown } | null | undefined)?.cause;
  if (cause === undefined || cause === null) return primary;
  return `${primary}\nCaused by: ${primaryMessage(cause)}`;
}

/**
 * Shown when the Kit client could not be built.
 *
 * Rendering this instead of letting the error unmount the tree is the whole
 * point: the most common trigger is a missing local keypair in the desktop
 * shell, which the user can fix — but only if they are told what broke.
 */
export function ClientErrorScreen({
  error,
  mode,
  desktopShell,
  onRetry,
  onUseWallet,
  onCreateKeypair,
}: ClientErrorScreenProps) {
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isMissingKeypair = mode === "desktop";
  /**
   * Desktop signing talks to Tauri commands, so it cannot work outside the Tauri
   * shell. Worth saying explicitly: otherwise the user sees a cryptic error and
   * has no idea that the *mode* is the problem, not their keypair.
   */
  const unavailableOutsideShell = isMissingKeypair && !desktopShell;

  async function handleCreateKeypair() {
    if (onCreateKeypair === undefined) return;
    setCreating(true);
    setCreateError(null);
    try {
      await onCreateKeypair();
    } catch (cause) {
      setCreateError(describe(cause));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Stack align="center" justify="center" mih="100svh" p="md">
      <Card w="100%" maw={720} withBorder shadow="md" padding="lg">
        <Group gap="sm" mb="xs">
          <ThemeIcon color="red" variant="light" size="lg">
            <AlertTriangleIcon size={18} />
          </ThemeIcon>
          <Title order={4}>Could not start the Solana client</Title>
        </Group>

        <Text c="dimmed" size="sm" mb="md">
          {unavailableOutsideShell
            ? "Desktop signing runs through Tauri commands, which do not exist in a browser tab."
            : isMissingKeypair
              ? "The desktop build signs with a local Solana CLI keypair, and reading it failed."
              : "The wallet-backed client failed to initialise."}
        </Text>

        <Stack gap="md">
          {unavailableOutsideShell ? (
            <Alert color="yellow" variant="light" icon={<AlertTriangleIcon size={16} />}>
              The signer backend is set to <strong>local keypair</strong>, but this host has no Tauri
              runtime — so no keypair can be read, and creating one would not help. Switch the
              backend below, or run <Code>pnpm tauri dev</Code>.
            </Alert>
          ) : null}

          <Card withBorder bg="var(--mantine-color-default-hover)" padding="sm">
            <Text size="xs" tt="uppercase" fw={500} c="dimmed" mb={4}>
              Error
            </Text>
            <Code block style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {describe(error)}
            </Code>
          </Card>

          {isMissingKeypair && !unavailableOutsideShell ? (
            <Stack gap="xs">
              <Group gap="xs">
                <KeyRoundIcon size={16} />
                <Text fw={500} size="sm">
                  Options
                </Text>
              </Group>
              <List size="sm" c="dimmed" spacing={4}>
                <List.Item>
                  Generate a keypair with <Code>solana-keygen new --no-bip39-passphrase</Code> (writes{" "}
                  <Code>~/.config/solana/id.json</Code>), or
                </List.Item>
                <List.Item>
                  place an existing keypair at <Code>~/.solana-defi-demo/id.json</Code>, or
                </List.Item>
                <List.Item>create a throwaway one below, or</List.Item>
                <List.Item>switch to the browser-wallet backend and reload.</List.Item>
              </List>
            </Stack>
          ) : null}

          {createError === null ? null : (
            <Text size="xs" c="red">
              Could not create a keypair: {createError}
            </Text>
          )}

          <Group gap="sm">
            <Button leftSection={<RefreshCwIcon size={16} />} onClick={onRetry}>
              Retry
            </Button>

            {onCreateKeypair === undefined ? null : (
              <Button
                variant="light"
                disabled={creating}
                leftSection={
                  creating ? <Loader size={16} /> : <KeyRoundIcon size={16} />
                }
                onClick={() => void handleCreateKeypair()}
              >
                Create a demo keypair
              </Button>
            )}

            {onUseWallet === undefined ? null : (
              <Button
                variant="default"
                leftSection={<WalletIcon size={16} />}
                onClick={onUseWallet}
              >
                Use browser wallet instead
              </Button>
            )}
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
