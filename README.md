# Solana DeFi Demo

A Tauri 2 desktop app with a React 19 frontend wired to Solana through
[`@solana/kit`](https://www.solanakit.com) v8 plugin clients.

The interesting part of this project is **the signer abstraction**: the same UI
runs in a browser (signing with a Wallet Standard extension) and inside the Tauri
webview (signing with a local Solana CLI keypair), chosen at runtime.

---

## Stack

| Layer | Choice | Version |
| --- | --- | --- |
| Shell | Tauri | 2 |
| UI framework | React + Vite | 19.3 · 8.3 |
| Language | TypeScript | 7.0 |
| Styling | Tailwind CSS + shadcn/ui primitives | 4.3 · `radix-ui` 1.6 |
| Solana SDK | `@solana/kit` + plugins | 8.3 · 0.19/0.20 |
| React bindings | `@solana/react` | 8.3 |
| Routing | `react-router-dom` (`HashRouter`) | 7.18 |
| Data cache | `@tanstack/react-query` | 5.103 |
| Toasts / charts | `sonner` · `recharts` | 2.0 · 3.10 |

Web3.js v1 is deliberately **not** used: Kit is browser-native and needs no
`Buffer`/`process` polyfills in a Vite build.

---

## Architecture

### The dual-mode signer

Kit's wallet plugin is bound to one chain and one wallet backend, so the client is
rebuilt whenever the cluster or signer mode changes. Both modes install the wallet
**state** plugin, which means the UI always has a `client.wallet` to read and never
has to branch on hooks — only the `payer` / `identity` source differs.

```
                     ┌──────────────────────────────┐
browser  ──────────► │ walletSigner()  (Wallet Std) │
                     └──────────────────────────────┘
                                 │
                     ┌───────────▼──────────────────┐
                     │ createAppClient(config)      │──► ClientProvider ──► UI
                     └───────────▲──────────────────┘
                                 │
                     ┌───────────┴──────────────────┐
Tauri    ──────────► │ walletWithoutSigner()        │  (state only)
  shell              │ + signer(local keypair)      │  ← Rust bridge
                     └──────────────────────────────┘
```

`src/solana/useSignerInfo.ts` is the single place the UI asks "who can sign?".
Components consume that hook, because reading `client.payer` directly throws while
a wallet is disconnected.

### Two desktop signing strategies

`src-tauri/src/keypair.rs` exposes three commands, and the Settings page switches
between the two strategies:

| Strategy | Commands used | Private key reaches webview? |
| --- | --- | --- |
| `local-bytes` (default) | `read_keypair` → `createKeyPairSignerFromBytes()` | **Yes** — convenient, simpler |
| `rust-signer` (hardened) | `local_address` + `sign_message` | **No** — only the 64-byte signature comes back |

`rust-signer` works because a `TransactionPartialSigner` is handed the compiled
message bytes, which is exactly the payload that must be signed — so those bytes
can be shipped to Rust. `src/solana/desktop-signer.ts` implements that interface.

> **Security note.** `read_keypair` accepts a path from the webview, so it
> canonicalises the path and requires it to live under `~/.config/solana` or
> `~/.solana-defi-demo`. Without that allowlist the command would be an
> arbitrary-file-read primitive reachable from any XSS in the webview. Unit tests
> cover this (`pnpm test:rust`).

---

## Getting started

```sh
pnpm install

# Browser (wallet extensions work here) — http://localhost:1420
pnpm dev

# Desktop shell (local keypair; no wallet extensions)
pnpm tauri dev

# Production build
pnpm build
```

### Running against a local cluster

`.env` / `.env.local` (see `.env.example`):

```sh
VITE_SOLANA_CLUSTER=local          # devnet | local
# VITE_SOLANA_RPC_URL=http://127.0.0.1:8899
# VITE_SOLANA_WS_URL=ws://127.0.0.1:8900
```

Then start a validator:

```sh
solana-test-validator --reset      # or: surfpool start
```

Only `VITE_`-prefixed values are inlined into the bundle — **never put secrets in
`.env`**, they ship to the client.

---

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server on port 1420 |
| `pnpm tauri dev` | Desktop shell with hot reload |
| `pnpm build` | `tsc` then production bundle into `dist/` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm smoke` | In-process Solana smoke test against LiteSVM — no network needed |
| `pnpm test:rust` | Rust unit tests for the keypair commands |

`pnpm smoke` (see `scripts/smoke-kit.mjs`) is the fastest way to confirm the Solana
layer still works. It builds a client with the same plugin ordering as
`src/solana/client.ts`, airdrops, sends a System Program transfer, asserts the
balance moved, then repeats the send with a bare `TransactionPartialSigner` to
cover the hardened desktop path.

> Note: `client.sendTransaction(...)` resolves to a **transaction-plan result
> envelope**, not a bare signature. For a single-instruction plan the base58
> signature is at `result.context.signature`.

---

## Layout

```
src/
├── solana/
│   ├── client.ts           # createAppClient() + AppClient type
│   ├── cluster.ts          # cluster config, chain ids, explorer links
│   ├── signer.ts           # signer mode detection + plugin factories
│   ├── desktop-signer.ts   # TransactionPartialSigner backed by Rust
│   ├── config-context.ts   # cluster/mode context
│   ├── SolanaProvider.tsx  # ClientProvider + QueryClientProvider + Suspense
│   └── useSignerInfo.ts    # single source of truth for "who signs?"
├── components/{ui,layout,wallet}/
├── routes/                 # Dashboard, Transfer, Settings
├── hooks/                  # useSolBalance, useTheme
└── lib/                    # env, format (BigInt-safe), cn
scripts/smoke-kit.mjs
src-tauri/src/keypair.rs
```

---

## Known gaps / next steps

- The repo demonstrates **read paths plus a System Program transfer**. A swap or
  lending flow is the natural next feature. Jupiter's quote API is the
  smallest-dependency option; an Anchor program under `programs/` is the other
  (the toolchain — `anchor-cli 1.1.2`, `solana-cli 3.1.10`, Surfpool — is present).
- The JS bundle is a single ~556 kB chunk. Split routes with `React.lazy` before
  adding larger feature pages.
- `tauri.conf.json` still has `"csp": null`. Tighten `connect-src` to the chosen
  RPC endpoints.
- Wallet persistence uses a namespaced `localStorage` key
  (`solana-defi-demo:wallet`) through the wallet plugin's `storageKey` option.
- Tailwind/shadcn components were **hand-written** rather than generated: the
  `shadcn` CLI currently crashes in this environment
  (`@modelcontextprotocol/sdk` → `zod/v3` resolution error). `components.json` is
  in place, so `pnpm dlx shadcn@latest add <component>` should work wherever the
  CLI runs.

