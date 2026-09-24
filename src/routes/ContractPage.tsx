import { Badge, Group, Stack } from "@mantine/core";
import { useParams } from "react-router-dom";

import { SpecPlaceholder } from "@/components/common/SpecPlaceholder";
import { PageHeader } from "@/components/layout/PageHeader";
import { shortenAddress } from "@/lib/format";

/**
 * 合约 / Program 详情页（§8.7）。
 *
 * 两条链的形态差别很大，所以内容分两套：
 * - **EVM**：源码 / ABI / 是否已验证 / 创建者 → 靠 Etherscan
 * - **Solana**：Program ID / 是否可升级 / Upgrade Authority / IDL
 *
 * ⚠️ AI 解读这一栏受 §10.3 约束：只能做**用途与风险的行为描述**，
 * 不能给「这是骗局合约」这类定性结论 —— `ai/guard.ts` 会拦。
 */
export function ContractPage() {
  const { chain = "", addr = "" } = useParams();

  return (
    <Stack gap="lg">
      <PageHeader
        title={
          <Group gap="xs">
            <span>{shortenAddress(addr, 10)}</span>
            <Badge variant="light" size="sm">
              {chain}
            </Badge>
          </Group>
        }
        subtitle="合约 / 程序详情"
      />

      <SpecPlaceholder
        spec="8.7"
        items={[
          "EVM 概览：地址 · 余额 · 是否已验证源码 · 创建者 · 创建交易 · 创建时间",
          "EVM 源码：语法高亮；未验证时明确显示「未验证」而不是空白",
          "EVM ABI：JSON 展示 + 折叠",
          "Solana 概览：Program ID · 是否可执行 · 是否可升级 · Upgrade Authority",
          "Solana IDL：有则展示；无则明确说明「该 Program 未公开 IDL」",
          "AI 解读：用途与风险的**行为描述**（受 §10.3 约束，不下定性）",
          "最近交互：最近 N 笔涉及该合约的交易",
        ]}
      />
    </Stack>
  );
}
