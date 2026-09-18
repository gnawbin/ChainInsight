import { useClient, useTrackedData } from "@solana/react";
import type { Address } from "@solana/kit";
import { useMemo } from "react";

import type { AppClient } from "@/solana/client";

/**
 * Live SOL balance.
 *
 * Uses `useTrackedData` rather than a one-shot read: an initial `getBalance`
 * seeds the value so something paints immediately, then an account
 * subscription keeps it current. The underlying store de-duplicates between the
 * two sources and orders by slot, so an out-of-order notification cannot make
 * the balance jump backwards.
 *
 * Passing `null` as the address disables the hook (`status === "disabled"`),
 * which keeps the call site free of conditionals.
 */
export function useSolBalance(address: Address | null) {
  const client = useClient<AppClient>();

  const spec = useMemo(
    () =>
      address === null
        ? null
        : {
            initialValueSource: client.rpc.getBalance(address),
            initialValueMapper: (lamports: bigint) => lamports,
            streamSource: client.rpcSubscriptions.accountNotifications(address),
            streamValueMapper: (account: { lamports: bigint }) => account.lamports,
          },
    [client, address],
  );

  return useTrackedData(spec);
}
