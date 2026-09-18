import { Badge } from "@/components/ui/badge";
import { CLUSTERS } from "@/solana/cluster";
import { useSolanaConfig } from "@/solana/config-context";

/** Shows which cluster the client is bound to, and where it points. */
export function NetworkBadge() {
  const { config } = useSolanaConfig();
  const cluster = CLUSTERS[config.cluster];

  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-positive data-[offline=true]:bg-muted-foreground"
      />
      {cluster.label}
    </Badge>
  );
}
