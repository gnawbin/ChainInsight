import {
  Alert,
  Anchor,
  Button,
  Card,
  Group,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { address as toAddress, type Address } from "@solana/kit";
import { useAction, useClient } from "@solana/react";
import { getTransferSolInstruction } from "@solana-program/system";
import { ExternalLinkIcon, Loader2Icon, SendIcon } from "lucide-react";
import { useState } from "react";

import { useSolBalance } from "@/hooks/useSolBalance";
import { formatSol, groupDigits, parseSolToLamports, shortenAddress } from "@/lib/format";
import type { AppClient } from "@/solana/client";
import { explorerUrl } from "@/solana/cluster";
import { useSolanaConfig } from "@/solana/config-context";
import { useSignerInfo } from "@/solana/useSignerInfo";

type TransferValues = { destination: string; amount: number | string };

/**
 * Converts the amount input into lamports.
 *
 * The value can be a number (NumberInput's default) or a string; numbers are
 * expanded with `toFixed(9)` first so that small values never arrive in exponent
 * notation (`1e-7`), which the string parser rejects. All arithmetic stays in
 * BigInt — floats would silently round a transfer amount.
 */
function solToLamports(value: number | string): bigint | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return parseSolToLamports(value.toFixed(9));
  }
  return parseSolToLamports(value);
}

export function TransferPage() {
  const client = useClient<AppClient>();
  const { config } = useSolanaConfig();
  const { address, ready } = useSignerInfo();
  const balance = useSolBalance(address);
  const [signature, setSignature] = useState<string | null>(null);

  const available = balance.data?.value ?? null;

  const form = useForm<TransferValues>({
    initialValues: { destination: "", amount: "" },
    validate: {
      destination: (value) => {
        if (value.trim() === "") return "Enter a destination address";
        try {
          toAddress(value.trim());
          return null;
        } catch {
          return "Not a valid base58 address";
        }
      },
      amount: (value) => {
        const lamports = solToLamports(value);
        if (lamports === null || lamports <= 0n) return "Enter an amount greater than 0";
        if (available !== null && lamports > available) {
          return "Amount exceeds the available balance";
        }
        return null;
      },
    },
  });

  /**
   * `useAction` tracks the dispatch through React state and supplies a fresh
   * `AbortSignal` per call, so a double click cannot fire two transfers.
   */
  const send = useAction(async (_signal, destination: Address, lamports: bigint) => {
    const instruction = getTransferSolInstruction({
      source: client.payer,
      destination,
      amount: lamports,
    });
    const result = await client.sendTransaction([instruction]);
    // `sendTransaction` resolves to a transaction-plan result envelope, not a
    // bare signature — for a single-instruction plan the base58 signature lives
    // at `context.signature`.
    return result.context.signature;
  });

  async function handleSubmit(values: TransferValues) {
    const lamports = solToLamports(values.amount);
    if (lamports === null) return;

    const destination = values.destination.trim();
    try {
      const base58 = await send.dispatchAsync(toAddress(destination), lamports);
      setSignature(base58);
      form.setFieldValue("amount", "");
      notifications.show({
        color: "teal",
        title: "Transfer confirmed",
        message: `${formatSol(lamports, 9)} SOL → ${shortenAddress(destination)}`,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Transfer failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Stack gap="lg" maw={620}>
      <div>
        <Title order={2}>Transfer SOL</Title>
        <Text size="sm" c="dimmed">
          A System Program transfer, planned and signed by the Kit client.
        </Text>
      </div>

      <Card withBorder padding="lg" radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
          <Stack gap="md">
            <TextInput
              label="Destination address"
              placeholder="9xQe…7fRt"
              autoComplete="off"
              spellCheck={false}
              styles={{ input: { fontFamily: "monospace" } }}
              {...form.getInputProps("destination")}
            />

            <NumberInput
              label="Amount (SOL)"
              placeholder="0.1"
              decimalScale={9}
              allowNegative={false}
              thousandSeparator=","
              description={
                available === null
                  ? undefined
                  : `Available: ${groupDigits(formatSol(available, 4))} SOL`
              }
              {...form.getInputProps("amount")}
            />

            {ready ? null : (
              <Alert color="yellow" variant="light">
                Connect a wallet or provide a local keypair to send.
              </Alert>
            )}

            <Button
              type="submit"
              disabled={!ready || send.isRunning}
              leftSection={send.isRunning ? <Loader2Icon size={16} /> : <SendIcon size={16} />}
            >
              {send.isRunning ? "Sending…" : "Send"}
            </Button>
          </Stack>
        </form>
      </Card>

      {signature === null ? null : (
        <Card withBorder padding="md" radius="md">
          <Text size="xs" c="dimmed" mb={4}>
            Last transaction
          </Text>
          <Anchor
            href={explorerUrl(config.cluster, `/tx/${signature}`)}
            target="_blank"
            rel="noreferrer"
            size="xs"
            ff="monospace"
          >
            <Group gap={6} wrap="nowrap">
              <Text size="xs" truncate>
                {signature}
              </Text>
              <ExternalLinkIcon size={12} />
            </Group>
          </Anchor>
        </Card>
      )}
    </Stack>
  );
}
