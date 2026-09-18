import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Placeholder block shown while a Solana read is in flight. Balances, pool
 * rows and account details all use it so the layout does not shift on load.
 */
function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  );
}

export { Skeleton };
