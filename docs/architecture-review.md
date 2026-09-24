# Architecture review

Reviewed against the code as it stands (`src/solana/*`, `src/routes/*`,
`src-tauri/src/keypair.rs`). Every finding cites the file and line that shows the
problem, so the review can be re-checked after a refactor.

> **Verdict.** The skeleton is right: one UI, a pluggable signer backend, a single
> "who can sign?" hook, and an error boundary that keeps a rejected async client from
> blanking the window. What is wrong is that **three orthogonal axes - platform, key
> custody and signing transport - are flattened into one two-value enum**, so each new
> platform lands as `if` branches spread across the UI, and Android ends up on a path
> that cannot work.

---

## 0. The root cause in one snippet

```ts
// src/solana/signer.ts:28, :75-76
export const isDesktopShell = (): boolean => devShellOverride() ?? isTauri();
export const detectSignerMode = (): SignerMode =>
  devModeOverride() ?? (isTauri() ? "desktop" : "wallet");
```

* `isDesktopShell` is named after a **platform** but means **host** - it is `true` on
  Android.
* `detectSignerMode()` returns `"desktop"` for *any* Tauri host, so Android takes the
  local-keypair path, and `keypair.rs:24-31` resolves that path from
  `std::env::var_os("HOME")`, which does not exist for an Android app process. Result:
  `could not determine $HOME`, the client promise rejects, and the user sees
  `ClientErrorScreen`. A missing abstraction, not a missing feature.

---

## 1. P0 - Signer backend registry

The same `mode === "desktop"` decision is made in five places, each carrying its own
platform assumption:

| Where | What leaks |
| --- | --- |
| `client.ts:38-47` | two plugin-composition paths; the wallet *state* plugin is installed only in the desktop branch |
| `useSignerInfo.ts:32-42` | reads `client.payer.address` directly; knows which backend is active |
| `WalletButton.tsx:60-66` | renders a read-only button when the backend is local |
| `SettingsPage.tsx:60-62`, `DashboardPage.tsx:109,188,198` | copy that is wrong on mobile ("Local Solana CLI keypair", "Tauri's webview does not load browser extensions") |
| `ClientErrorScreen.tsx:111-114,144-151` | recovery advice that only exists on desktop (`~/.config/solana/id.json`, `pnpm tauri dev`) |

Target shape:

```ts
export type SignerBackend = Readonly<{
  id: string;
  kind: "extension-wallet" | "mobile-wallet" | "device-keypair";
  label: string;                        // Settings + error screen copy
  custody: "external" | "on-device" | "app-sandbox";
  probe(): Promise<BackendStatus>;      // can this host use it right now?
  plugin(): ClientPlugin;               // installs payer/identity only
}>;
```

Three rules that remove the branches:

1. **Always install the wallet state plugin** (`walletWithoutSigner`), then the
   backend's signer plugin. `useConnectedWallet()` then behaves identically in every
   mode, and the desktop branch in `useSignerInfo` disappears.
2. **Make `AppClient` an explicit interface** instead of
   `Awaited<ReturnType<typeof createAppClient>>` (`client.ts:55`): adding a backend
   currently widens a derived type that every `useClient<AppClient>()` inherits.
3. **Add a platform descriptor** (`src/platform/`): `{ kind, extensionWallets,
   appSandboxKeypair, localRpc, demoKeypair }` drives Settings copy, whether the `local`
   cluster is offered, and which recovery actions exist.

---

## 2. P0 - Rust boundary and error contract

### 2.1 The signing surface is wider than it needs to be

| Evidence | Problem |
| --- | --- |
| `keypair.rs:130-133` - `read_keypair(path)` hands 64 private-key bytes to JS | and it is the *default* strategy: `SolanaProvider.tsx:61` sets `desktopStrategy: "local-bytes"` |
| `keypair.rs:145-148` - `sign_message(message, path)` signs arbitrary bytes | no size cap, no domain separation, no confirmation: any XSS in the webview gets a signing oracle |
| `keypair.rs:77-88` - canonicalise + prefix allowlist | genuinely good code, but it only exists because of the `path` argument |

Direction: drop `path` from the signing commands (one app-owned key); zeroize buffers
(`zeroize` crate); cap the message size and check the payload looks like a compiled
message for the active cluster; default to `rust-signer`; and move to
`tauri-plugin-stronghold` (desktop) / Android Keystore (mobile) instead of a plaintext
`id.json`.

### 2.2 Errors are strings, so the UI guesses

`type CommandResult<T> = Result<T, String>` (`keypair.rs:21`) forces the heuristics in
`ClientErrorScreen.tsx:33-57`. A `thiserror` + `Serialize` enum with stable codes
(`MissingHome`, `NotFound`, `WrongLength`, `MismatchedKeypair`, `RefusedPath`) gives the
frontend an exhaustible union, and `specta`/`tauri-specta` can generate the TS types so
the two sides cannot drift.

### 2.3 Module layout for more backends

`keypair.rs` holds commands + path policy + tests in ~400 lines. Split into
`signer/{mod,device,stronghold}.rs`, `paths.rs`, `errors.rs`, `commands.rs`;
`#[cfg(desktop)]`-gate the CLI-keypair logic so mobile never compiles it; and gate CI on
`cargo clippy -D warnings` plus `cargo deny`.

---

## 3. P1 - Client and state lifecycle

| Current | Issue |
| --- | --- |
| config in `useState` (`SolanaProvider.tsx:58-62`) | not persisted: cluster/mode/strategy reset on reload, no deep link to a cluster, no way to ship a sane mobile default |
| rebuilding the client on any config change (`:73-78`) | correct (Kit's wallet plugin is chain-bound), but the whole subtree re-suspends and every query restarts |
| `queryClient` created and provided (`:26-36`) | the hooks actually used (`useRequest`, `useTrackedData`) do not consume it; the `@solana/react/query` adapter is not wired |
| query specs inline in pages | duplicated keys/mappers as soon as a second feature reads the same account |

Direction: persist config (versioned `localStorage` + migration, with platform defaults);
split *connection* config (new client) from *signer* config (swap a plugin) so switching
backends does not remount everything; either wire the TanStack adapter or drop the
`QueryClientProvider`; collect specs in `src/solana/queries.ts`.

---

## 4. P1 - There is no transaction layer

`TransferPage.tsx:82-93` builds, plans and sends in one closure, and the only state is
`useState<string | null>` for the signature (`:51`). For a **DeFi** app the missing piece
is the layer every flow will share:

```
src/solana/tx/
  plan.ts         # build -> simulate -> estimate fees -> a TxPlan the UI can show
  send.ts         # sign -> send -> confirm (commitment, timeout, retry)
  errors.ts       # RPC error -> typed (InsufficientFunds, BlockhashExpired, ...)
  history.ts      # pending/sent records that survive a reload
  priorityFees.ts
```

plus a `SwapProvider { quote(); swapInstructions() }` interface so the UI never depends
on a specific aggregator (Jupiter becomes one implementation, a mock another).

---
## 5. P2 - Front-end engineering

Single 737 kB chunk (the README already flags it): route-level `React.lazy` +
`<Suspense>`; `@mantine/charts` and its stylesheet are imported (`main.tsx:7`) with no
chart rendered - use it or drop it. Pure functions are untested: `solToLamports` /
`parseSolToLamports` (`TransferPage.tsx:38-44`), `formatSol`, `groupDigits`,
`explorerUrl`, and the signer-mode detection. Amount maths is the most expensive bug
class in a wallet app.

---

## 6. P2 - Security and operations

| Item | Now | Direction |
| --- | --- | --- |
| CSP | `csp: null` (`tauri.conf.json:21`) | strict CSP (keep `style-src 'unsafe-inline'` for Mantine), narrow `connect-src` to the RPC hosts; consider the isolation pattern |
| capabilities | `default.json` has no `platforms` filter and points at the desktop schema; `opener:default` allows any URL | split desktop/mobile; scope `open-url` to the explorer hosts or validate it in a custom command |
| update / logging / telemetry | none; `ErrorBoundary.onError` is never wired | `tauri-plugin-updater`, `tauri-plugin-log` with secret redaction, and a reporting hook on `onError` |
| runtime config | `VITE_*` is build-time only (`env.ts:13-20`) | let RPC/WS endpoints be configured at runtime and persisted; env stays the default |

---

## 7. P2 - Mobile readiness beyond the current bugs

Platform config files (`tauri.android.conf.json`, `bundle.android`), an icon pipeline,
platform-split capabilities, a **MWA seam** (`registerMwa()` registers MWA as a Wallet
Standard wallet, so today's `walletSigner()` and the UI stay unchanged), deep links for
the dApp Store / `solana-wallet://`, and the "demo keypair / recovery advice" concepts
replaced by "import from wallet" on mobile (the platform descriptor again).

---

## 8. Deliberately not changing

Keep the two backends switchable at runtime - that is the point of this demo; it just
needs to be expressed as a registry. Do not add Redux/Zustand (context + Kit plugin
state is enough). Do not wrap Kit's RPC in another client; the thing worth abstracting is
the *transaction flow*. Keep `ed25519-dalek`/`bs58` instead of `solana-sdk`. Keep the
`ErrorBoundary` "never blank the window" policy and the canonicalise-then-prefix-check
idea even after `path` is removed.

---

## 9. Roadmap

| Phase | Content | Why | Size |
| --- | --- | --- | --- |
| P0 | `$HOME` -> `app_data_dir()`; platform descriptor; default `rust-signer`; drop `path` + zeroize + size cap; capabilities split; CSP | makes mobile run and narrows the signing surface | S |
| P1 | backend registry + uniform wallet state plugin; explicit `AppClient`; typed Rust errors; config persistence; `tx/{plan,send,errors,history}` | stops the branch sprawl, unlocks MWA, makes DeFi flows reusable | M |
| P2 | Vitest + backend tests; CI; route splitting; drop unused deps; MWA/deep-link seam; query specs | quality and iteration speed | M |
| P3 | Stronghold / Android Keystore; updater + log + telemetry; `SwapProvider` (Jupiter + mock); multi-wallet UX | production readiness | L |

---

## 10. Test strategy

Stack, with the version compatibility that matters for this repo (Vite 8 + TS 7 +
React 19):

| Layer | Framework | Verified compatibility |
| --- | --- | --- |
| Front-end unit (pure logic) | **Vitest 5.0.1** | peer `vite ^6.4 \|\| ^7 \|\| ^8` covers Vite 8.3; engines `node ^22.12 \|\| ^24 \|\| >=26` covers node 24.18 |
| React components | **@testing-library/react 16.3.3** + `@testing-library/dom ^10` + `jest-dom` + `user-event` | peer `react ^18 \|\| ^19` covers React 19.3 |
| DOM environment | jsdom or happy-dom | optional Vitest peers |
| Tauri IPC | `@tauri-apps/api/mocks` (`mockIPC`, `mockWindows`, `clearMocks`) | official API, already a dependency |
| Solana logic | `@solana/kit-plugin-litesvm` 0.19.0 (already installed) | fold `scripts/smoke-kit.mjs` in as a test file |
| Solana integration | Surfpool (toolchain already present) | for real RPC semantics (blockhash expiry, confirmation) |
| Rust | built-in `cargo test` (wired as `pnpm test:rust`) + `tempfile`, `rstest`, `proptest` | `proptest` for path-traversal and length properties |
| Rust hygiene | `cargo clippy -D warnings`, `cargo deny`, `cargo audit` | keep the small dependency set auditable |
| Desktop E2E | **WebdriverIO + `@wdio/tauri-service`** (+ `tauri-plugin-wdio`, `tauri-plugin-wdio-webdriver`) | official Tauri 2 route; the embedded driver needs no external binary; its browser mode mocks `invoke()` for renderer-only tests |
| Mobile E2E | **Maestro** (simplest on Android) or Appium 2 + UiAutomator2; `chrome://inspect` for the WebView | Tauri's WebDriver is desktop-only; MWA flows also need Mock MWA Wallet and a real device |
| Coverage | `@vitest/coverage-v8` 5.0.1 | matches the Vitest version |
| Lint / format | Biome (or ESLint 9 flat + Prettier) | there is no linter at all today |

First tests to write, by ROI:

1. `solToLamports` / `parseSolToLamports` / `formatSol` - BigInt precision and boundaries
   (`1e-9`, `toFixed(9)`, above 21M SOL).
2. `detectSignerMode()`, `devModeOverride()`, `devShellOverride()` - including
   `?mode=desktop&shell=tauri` and the `import.meta.env.DEV` gate.
3. `createAppClient()` per branch, asserting plugin composition and `client.payer`, with
   `mockIPC` providing both a successful `read_keypair` and a rejection - that is the
   regression covering "no `HOME` on Android".
4. Rust: `resolve_allowed` under `proptest` (traversal, symlinks, relative paths) and
   `load_keypair_bytes` error codes once section 2.2 lands.
5. `ClientErrorScreen` for the three inputs (missing keypair / no Tauri runtime / mobile)
   - today this is a manual `?mode=desktop` check.

CI (`.github/workflows` does not exist): `pnpm typecheck` -> `pnpm test` (vitest run
--coverage) -> `pnpm test:rust` -> `pnpm smoke`, plus an android job that caches
`~/.gradle` (this machine died on the Gradle distribution download) and
`CARGO_TARGET_DIR`, injects the keystore from secrets, and uploads the APK/AAB.
