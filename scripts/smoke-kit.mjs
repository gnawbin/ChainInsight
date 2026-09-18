/**
 * In-process smoke test for the Solana layer.
 *
 * Runs against LiteSVM (an in-process SVM) so it needs no validator, no network
 * and no browser — which makes it runnable in CI and in sandboxes whose egress
 * is restricted.
 *
 * What it proves, mirroring `src/solana/client.ts` and `src/solana/desktop-signer.ts`:
 *
 *   1. Kit's async-plugin shape is used correctly (`use()` awaits a plugin's
 *      returned promise) — the bug that first broke `localBytesSignerPlugin`.
 *   2. `signer(...)` followed by the RPC bundle composes in the required order
 *      (the RPC plugin is typed `<T extends ClientWithPayer>`).
 *   3. `client.sendTransaction([instruction])` with a System Program transfer
 *      from `@solana-program/system` plans, signs and lands.
 *   4. A *bare* `TransactionPartialSigner` — exactly the shape the Tauri
 *      `rust-signer` strategy produces — is accepted and signed correctly.
 *
 * Run with: pnpm smoke
 */

import { createClient, generateKeyPairSigner, lamports } from "@solana/kit";
import { litesvm } from "@solana/kit-plugin-litesvm";
import { generatedSigner, signer } from "@solana/kit-plugin-signer";
import { getTransferSolInstruction } from "@solana-program/system";

/** Mirrors `src/solana/desktop-signer.ts` but signs in-process. */
function inProcessPartialSigner(keyPairSigner) {
  return {
    address: keyPairSigner.address,
    async signTransactions(transactions) {
      return Promise.all(
        transactions.map(async (transaction) => {
          // Same contract as the Tauri `sign_message` command: message bytes in,
          // 64-byte Ed25519 signature out.
          const signature = await crypto.subtle.sign(
            "Ed25519",
            keyPairSigner.keyPair.privateKey,
            transaction.messageBytes,
          );
          return { [keyPairSigner.address]: new Uint8Array(signature) };
        }),
      );
    },
  };
}

async function main() {
  console.log("— LiteSVM in-process smoke test —\n");

  // 1 + 2: signer plugin first, then the VM bundle. `generatedSigner()` is an
  // async plugin, so `use()` returns a promise that must be awaited.
  const client = await createClient().use(generatedSigner()).use(litesvm());
  const payer = client.payer.address;
  console.log(`payer            ${payer}`);

  await client.airdrop(payer, lamports(10_000_000_000n));
  const funded = (await client.rpc.getBalance(payer).send()).value;
  console.log(`after airdrop    ${funded} lamports`);
  if (funded !== 10_000_000_000n) throw new Error(`unexpected airdrop balance: ${funded}`);

  // 3: System Program transfer, exactly as `TransferPage` builds it.
  const destination = (await generateKeyPairSigner()).address;
  const transfer = getTransferSolInstruction({
    source: client.payer,
    destination,
    amount: lamports(1_500_000_000n),
  });
  const result = await client.sendTransaction([transfer]);
  // `sendTransaction` resolves to a transaction-plan result envelope rather than
  // a bare signature — this is the field the UI reads.
  console.log(`plan status      ${result.status} (kind: ${result.kind})`);
  console.log(`transfer sig     ${result.context.signature}`);

  const received = (await client.rpc.getBalance(destination).send()).value;
  console.log(`destination      ${received} lamports`);
  if (received !== 1_500_000_000n) throw new Error(`transfer did not land: ${received}`);

  // 4: the hardened desktop path — a bare partial signer, no KeyPairSigner.
  const hardenedKey = await generateKeyPairSigner();
  const hardenedClient = await createClient()
    .use(signer(inProcessPartialSigner(hardenedKey)))
    .use(litesvm());
  const hardenedAddress = hardenedClient.payer.address;
  await hardenedClient.airdrop(hardenedAddress, lamports(5_000_000_000n));

  const hardenedTransfer = getTransferSolInstruction({
    source: hardenedClient.payer,
    destination,
    amount: lamports(1_000_000n),
  });
  const hardenedSignature = await hardenedClient.sendTransaction([hardenedTransfer]);
  console.log(`partial-sig sig  ${hardenedSignature}`);

  const afterPartial = (await hardenedClient.rpc.getBalance(destination).send()).value;
  console.log(`destination      ${afterPartial} lamports`);
  // A second LiteSVM is a fresh ledger, so `destination` starts at zero here.
  if (afterPartial !== 1_000_000n) {
    throw new Error(`partial-signer transfer did not land: ${afterPartial}`);
  }

  // Documents the shape `sendTransaction` resolves to, which the UI reads.
  console.log(`\nenvelope keys    ${Object.keys(result).join(", ")}`);
  console.log(`context keys     ${Object.keys(result.context).join(", ")}`);

  console.log("\n✓ all assertions passed");
}

main().catch((error) => {
  console.error("\n✗ smoke test failed\n");
  console.error(error);
  process.exitCode = 1;
});
