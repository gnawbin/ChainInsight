import { Badge, Group } from "@mantine/core";

/**
 * 链标识。替代已删除的 `NetworkBadge`。
 *
 * 语义变了：原来显示的是**集群**（devnet / local），那是签名面的概念，
 * 已随红线功能删除。现在产品是**双链**的，徽章表达的是「这条数据属于哪条链」。
 *
 * `chain` 用 §4.2 `chain` 表的主键形式：`solana` / `eip155:1` / `eip155:8453`。
 */
export type ChainId = "solana" | `eip155:${number}`;

export type ChainBadgeProps = Readonly<{
  /** 省略时表示「还没有链上下文」——首页与设置页就是这种状态。 */
  chain?: ChainId;
}>;

/** 链的短标签。只覆盖当前启用的链；新增 EVM 链时在这里加一行。 */
const LABELS: Record<string, { label: string; color: string }> = {
  solana: { label: "SOL", color: "violet" },
  "eip155:1": { label: "ETH", color: "blue" },
  "eip155:8453": { label: "Base", color: "cyan" },
  "eip155:42161": { label: "Arbitrum", color: "indigo" },
  "eip155:137": { label: "Polygon", color: "grape" },
};

function describe(chain: string): { label: string; color: string } {
  return LABELS[chain] ?? { label: chain, color: "gray" };
}

export function ChainBadge({ chain }: ChainBadgeProps) {
  if (chain === undefined) {
    // 无线上下文：明确说「双链」，而不是留空 —— 空着会让人以为加载失败。
    return (
      <Group gap={4} wrap="nowrap">
        <Badge size="sm" variant="light" color="violet">
          SOL
        </Badge>
        <Badge size="sm" variant="light" color="blue">
          ETH
        </Badge>
      </Group>
    );
  }

  const { label, color } = describe(chain);
  return (
    <Badge size="sm" variant="light" color={color}>
      {label}
    </Badge>
  );
}

/** 给链徽章补一个可读的全名，供 Tooltip 或标题使用。 */
export function chainDisplayName(chain: ChainId): string {
  if (chain === "solana") return "Solana";
  const { label } = describe(chain);
  return label === chain ? chain : `${label} (${chain})`;
}
