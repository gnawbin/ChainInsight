import { Badge } from "@mantine/core";

import { CLUSTERS } from "@/solana/cluster";
import { useSolanaConfig } from "@/solana/config-context";

/** Shows which cluster the client is bound to. */
export function NetworkBadge() {
  const { config } = useSolanaConfig();

  return (
    <Badge variant="light" color="teal" visibleFrom="xs">
      {CLUSTERS[config.cluster].label}
    </Badge>
  );
}
