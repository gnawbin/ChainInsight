import { AlertTriangleIcon, KeyRoundIcon, Loader2Icon, RefreshCwIcon, WalletIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5 text-negative" />
            Could not start the Solana client
          </CardTitle>
          <CardDescription>
            {unavailableOutsideShell
              ? "Desktop signing runs through Tauri commands, which do not exist in a browser tab."
              : isMissingKeypair
                ? "The desktop build signs with a local Solana CLI keypair, and reading it failed."
                : "The wallet-backed client failed to initialise."}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {unavailableOutsideShell ? (
            <p className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                The signer backend is set to <strong>local keypair</strong>, but this host has no
                Tauri runtime — so no keypair can be read, and creating one would not help. Switch
                the backend below, or run <code className="text-xs">pnpm tauri dev</code>.
              </span>
            </p>
          ) : null}

          <div className="rounded-md border bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Error
            </p>
            <code className="block whitespace-pre-wrap break-all font-mono text-xs">
              {describe(error)}
            </code>
          </div>

          {isMissingKeypair && !unavailableOutsideShell ? (
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <KeyRoundIcon className="size-4" />
                Options
              </p>
              <ol className="ml-6 list-decimal space-y-1">
                <li>
                  Generate a keypair with{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    solana-keygen new --no-bip39-passphrase
                  </code>{" "}
                  (writes <code className="text-xs">~/.config/solana/id.json</code>), or
                </li>
                <li>
                  place an existing keypair at{" "}
                  <code className="text-xs">~/.solana-defi-demo/id.json</code>, or
                </li>
                <li>create a throwaway one below, or</li>
                <li>switch to the browser-wallet backend and reload.</li>
              </ol>
            </div>
          ) : null}

          {createError === null ? null : (
            <p className="text-xs text-negative">Could not create a keypair: {createError}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={onRetry} className="gap-2">
              <RefreshCwIcon className="size-4" />
              Retry
            </Button>

            {onCreateKeypair === undefined ? null : (
              <Button
                variant="secondary"
                className="gap-2"
                disabled={creating}
                onClick={() => void handleCreateKeypair()}
              >
                {creating ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <KeyRoundIcon className="size-4" />
                )}
                Create a demo keypair
              </Button>
            )}

            {onUseWallet === undefined ? null : (
              <Button variant="outline" className="gap-2" onClick={onUseWallet}>
                <WalletIcon className="size-4" />
                Use browser wallet instead
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
