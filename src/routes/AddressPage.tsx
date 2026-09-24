import { Badge, Group, Stack, Tabs } from "@mantine/core";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";

import { SpecPlaceholder } from "@/components/common/SpecPlaceholder";
import { PageHeader } from "@/components/layout/PageHeader";
import { shortenAddress } from "@/lib/format";

/** 地址页的 5 个 Tab（PRD §3 的核心页面）。 */
const TABS = [
  { value: "overview", label: "概览" },
  { value: "txs", label: "交易" },
  { value: "assets", label: "资产" },
  { value: "defi", label: "DeFi" },
  { value: "contracts", label: "合约交互" },
] as const;

/**
 * 地址详情页（§8.5）。
 *
 * 路由参数 `:chain` 用 §4.2 `chain` 表的主键形式（`solana` / `eip155:1`），
 * `:id` 是地址。
 *
 * Tab 用 **query 参数**（`?tab=txs`）而不是子路由：这样「同一地址的 5 个 Tab」
 * 只对应一条路由，切 Tab 不会让地址页整页重挂 —— 否则每次切 Tab 都要重新
 * 取一次余额与估值。代价是必须用 `useSearchParams` 读当前 Tab。
 */
export function AddressPage() {
  const { chain = "", id = "" } = useParams();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const active = searchParams.get("tab") ?? "overview";

  return (
    <Stack gap="lg">
      <PageHeader
        title={
          <Group gap="xs">
            <span>{shortenAddress(id, 10)}</span>
            <Badge variant="light" size="sm">
              {chain}
            </Badge>
          </Group>
        }
        subtitle="地址详情"
      />

      <Tabs value={active} keepMounted={false}>
        <Tabs.List>
          {TABS.map(({ value, label }) => (
            <Tabs.Tab
              key={value}
              value={value}
              // Mantine 9 的多态写法：`TabsTabProps` 不透传 `to`，要让标签成为
              // 真正的链接就得换根元素（renderRoot），而不是传 `component`。
              // 用真链接的好处：右键新开、可被冒烟测试按 href 找到。
              renderRoot={(props) => <Link {...props} to={`${pathname}?tab=${value}`} />}
            >
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <SpecPlaceholder
        spec="8.5"
        items={[
          "8.5.0 常驻头部：完整地址 · 链徽章与地址类型 · 本地标签 · 余额 · 总估值 USD · 外部浏览器链接 · AI 深度画像按钮",
          "8.5.1 Tab1 概览：账户属性卡 + 六模块 AI 画像 + 活跃度/资金流图表 + 风险行为标记（可展开看依据）",
          "8.5.2 Tab2 交易：时间 / 类型 / 方向 / 对手方 / 金额 / 估值 / 手续费 / 状态 / AI 解读",
          "8.5.3 Tab3 资产：原生币 / 同质化代币 / NFT 与 cNFT 三段，含单价与估值",
          "8.5.4 Tab4 DeFi：协议 · 行为类型 · 投入/产出资产 · 估值 · 风险标记 · AI 专项解读",
          "8.5.5 Tab5 合约交互：已识别协议与未识别合约分组，交互次数降序",
        ]}
      />
    </Stack>
  );
}

