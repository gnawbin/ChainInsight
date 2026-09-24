import { Badge, Group, Text, Tooltip } from "@mantine/core";

/** 三个数据源。与 `secret` 表的 `id` 一一对应（§4.2）。 */
export type ProviderKey = "helius" | "etherscan" | "ai";

/**
 * 配置状态。
 *
 * `unknown` 是必要的第三态：还没问过后端时不能假定「未配置」，否则首帧会
 * 闪一下「未配置」再变成「已配置」—— 那个闪烁会让用户以为配置丢了。
 */
export type ProviderState = "configured" | "missing" | "unknown";

export const ALL_PROVIDERS: readonly ProviderKey[] = ["helius", "etherscan", "ai"];

export type ProviderStatusProps = Readonly<{
  states: Readonly<Record<ProviderKey, ProviderState>>;
  /** 紧凑模式给顶栏用；非紧凑模式给首页的状态条用。 */
  compact?: boolean;
}>;

const NAMES: Record<ProviderKey, string> = {
  helius: "Helius",
  etherscan: "Etherscan",
  ai: "AI",
};

const COLORS: Record<ProviderState, string> = {
  configured: "teal",
  missing: "gray",
  unknown: "yellow",
};

const HINTS: Record<ProviderState, string> = {
  configured: "已配置",
  missing: "未配置 —— 去「设置 → 数据源」填入 Key",
  unknown: "检查中",
};

/**
 * 数据源状态指示灯（§8.1）。
 *
 * 存在的意义不是装饰，而是**把「为什么没有数据」变成一眼可见的答案**：
 * 本产品无密钥时功能是空的（§11.4 的空壳状态），如果不把状态摆出来，用户会
 * 以为软件坏了，而不是以为该去填 Key。
 */
export function ProviderStatus({ states, compact = false }: ProviderStatusProps) {
  return (
    <Group gap={compact ? 4 : "xs"} wrap="nowrap">
      {ALL_PROVIDERS.map((key) => {
        const state = states[key];
        return (
          <Tooltip key={key} label={`${NAMES[key]}：${HINTS[state]}`} withArrow>
            <Badge
              size={compact ? "xs" : "sm"}
              variant="dot"
              color={COLORS[state]}
              style={{ cursor: "help", textTransform: "none" }}
            >
              {NAMES[key]}
            </Badge>
          </Tooltip>
        );
      })}
      {compact ? null : (
        <Text size="xs" c="dimmed">
          灰色 = 未配置，功能会退化为演示数据
        </Text>
      )}
    </Group>
  );
}
