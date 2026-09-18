import { AlertTriangleIcon, CpuIcon, GlobeIcon, KeyRoundIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CLUSTERS, type ClusterId } from "@/solana/cluster";
import { useSolanaConfig } from "@/solana/config-context";
import { isDesktopShell, type DesktopStrategy, type SignerMode } from "@/solana/signer";

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
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Changing any of these rebuilds the Solana client.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeIcon className="size-4" />
            Cluster
          </CardTitle>
          <CardDescription>
            Local expects a validator or Surfpool on {CLUSTERS.local.defaultRpcUrl}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Tabs value={config.cluster} onValueChange={(value) => setCluster(value as ClusterId)}>
            <TabsList>
              {(Object.keys(CLUSTERS) as ClusterId[]).map((id) => (
                <TabsTrigger key={id} value={id}>
                  {CLUSTERS[id].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="font-mono text-xs text-muted-foreground">
            {CLUSTERS[config.cluster].defaultRpcUrl}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4" />
            Signer
          </CardTitle>
          <CardDescription>
            {desktop
              ? "Tauri's webview does not load browser extensions, so the desktop build signs with a local keypair."
              : "Running in a browser, so Wallet Standard extensions are available."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Backend</Label>
            <Tabs value={config.mode} onValueChange={(value) => setMode(value as SignerMode)}>
              <TabsList>
                <TabsTrigger value="wallet">Browser wallet</TabsTrigger>
                <TabsTrigger value="desktop">Local keypair</TabsTrigger>
              </TabsList>
            </Tabs>
            {!desktop && config.mode === "desktop" ? (
              <p className="flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                Local keypair reads go through Tauri commands, which are unavailable in a plain
                browser tab — open the app with <code>pnpm tauri dev</code> instead.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Desktop signing strategy</Label>
            <Tabs
              value={config.desktopStrategy}
              onValueChange={(value) => setDesktopStrategy(value as DesktopStrategy)}
            >
              <TabsList>
                <TabsTrigger value="local-bytes">Key in webview</TabsTrigger>
                <TabsTrigger value="rust-signer">Sign in Rust</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {config.desktopStrategy === "rust-signer" ? (
                <>
                  The private key never leaves Rust. Compiled message bytes are sent over IPC and
                  only the 64-byte signature comes back.
                </>
              ) : (
                <>
                  The 64 keypair bytes cross the IPC boundary and become an in-memory{" "}
                  <code>KeyPairSigner</code>. Simpler, but the private key transits the webview.
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CpuIcon className="size-4" />
            Build
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">
            {desktop ? "Tauri desktop shell" : "Browser"}
          </Badge>
          <Badge variant="outline">
            <code>@solana/kit</code> 8
          </Badge>
          <Badge variant="outline">React 19 · Vite 8</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
