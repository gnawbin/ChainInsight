import { getTransferSolInstruction } from "@solana-program/system";
import { address as toAddress, type Address } from "@solana/kit";
import { useAction, useClient } from "@solana/react";
import { ExternalLinkIcon, Loader2Icon, SendIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSolBalance } from "@/hooks/useSolBalance";
import { formatSol, groupDigits, parseSolToLamports, shortenAddress } from "@/lib/format";
import type { AppClient } from "@/solana/client";
import { explorerUrl } from "@/solana/cluster";
import { useSolanaConfig } from "@/solana/config-context";
import { useSignerInfo } from "@/solana/useSignerInfo";

export function TransferPage() {
  const client = useClient<AppClient>();
  const { config } = useSolanaConfig();
  const { address, ready } = useSignerInfo();
  const balance = useSolBalance(address);

  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  const lamports = parseSolToLamports(amount);
  const destinationIsValid = (() => {
    if (destination.trim() === "") return false;
    try {
      toAddress(destination.trim());
      return true;
    } catch {
      return false;
    }
  })();

  const insufficientFunds =
    balance.data !== undefined && lamports !== null && lamports > balance.data.value;

  const canSubmit =
    ready &&
    address !== null &&
    destinationIsValid &&
    lamports !== null &&
    lamports > 0n &&
    !insufficientFunds;

  /**
   * `useAction` tracks the dispatch through React state and supplies a fresh
   * `AbortSignal` per call, so a double click cannot fire two transfers.
   */
  const send = useAction(async (_signal, to: Address, value: bigint) => {
    const instruction = getTransferSolInstruction({
      source: client.payer,
      destination: to,
      amount: value,
    });
    const result = await client.sendTransaction([instruction]);
    // `sendTransaction` resolves to a transaction-plan result envelope, not a
    // bare signature — for a single-instruction plan the base58 signature lives
    // at `context.signature`.
    return result.context.signature;
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (lamports === null || !destinationIsValid) return;

    try {
      const base58 = await send.dispatchAsync(toAddress(destination.trim()), lamports);
      setSignature(base58);
      setAmount("");
      toast.success("Transfer confirmed", {
        description: `${formatSol(lamports, 9)} SOL → ${shortenAddress(destination.trim())}`,
      });
    } catch (error) {
      toast.error("Transfer failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transfer SOL</h1>
        <p className="text-sm text-muted-foreground">
          A System Program transfer, planned and signed by the Kit client.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recipient</CardTitle>
          <CardDescription>
            {address === null
              ? "Connect a wallet or provide a local keypair to send."
              : `Available: ${groupDigits(formatSol(balance.data?.value ?? 0n, 4))} SOL`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="destination">Destination address</Label>
              <Input
                id="destination"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="9xQe…7fRt"
                className="font-mono text-sm"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={destination !== "" && !destinationIsValid}
              />
              {destination !== "" && !destinationIsValid ? (
                <p className="text-xs text-destructive">Not a valid base58 address.</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Amount (SOL)</Label>
              <Input
                id="amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.1"
                inputMode="decimal"
                autoComplete="off"
                aria-invalid={insufficientFunds}
              />
              {amount !== "" && lamports === null ? (
                <p className="text-xs text-destructive">
                  Enter a decimal amount with at most 9 fraction digits.
                </p>
              ) : null}
              {insufficientFunds ? (
                <p className="text-xs text-destructive">Amount exceeds the available balance.</p>
              ) : null}
            </div>

            <Button type="submit" disabled={!canSubmit || send.isRunning} className="gap-2">
              {send.isRunning ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <SendIcon />
                  Send {lamports !== null && lamports > 0n ? formatSol(lamports, 4) : ""} SOL
                </>
              )}
            </Button>

          </form>
        </CardContent>
      </Card>
      {signature === null ? null : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Last transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={explorerUrl(config.cluster, `/tx/${signature}`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 break-all font-mono text-xs text-primary hover:underline"
            >
              {signature}
              <ExternalLinkIcon className="size-3 shrink-0" />
            </a>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
