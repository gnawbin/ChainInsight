import { invoke } from "@tauri-apps/api/core";
import type { Address, SignatureBytes, SignatureDictionary, TransactionPartialSigner } from "@solana/kit";

/**
 * Desktop signing without ever handing the private key to the webview.
 *
 * A `TransactionPartialSigner` only ever sees the *compiled* message bytes, which
 * is exactly the payload that has to be signed — so those bytes can be shipped to
 * Rust, signed there, and only the 64-byte signature returns. The key never
 * touches JS.
 *
 * @param address - The public address backing the Rust-side keypair.
 *
 * @see `src-tauri/src/keypair.rs` for the `sign_message` command.
 */
export function createRustSigner(address: Address): TransactionPartialSigner {
  return {
    address,
    async signTransactions(transactions) {
      return Promise.all(
        transactions.map(async (transaction) => {
          const signature = await invoke<number[]>("sign_message", {
            // `messageBytes` is the wire-format compiled message.
            message: Array.from(transaction.messageBytes),
          });
          const dictionary: SignatureDictionary = {
            [address]: new Uint8Array(signature) as SignatureBytes,
          };
          return dictionary;
        }),
      );
    },
  };
}
