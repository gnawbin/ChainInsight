import { Badge, Group, Stack } from "@mantine/core";
import { useParams, useSearchParams } from "react-router-dom";

import { SpecPlaceholder } from "@/components/common/SpecPlaceholder";
import { PageHeader } from "@/components/layout/PageHeader";
import { shortenAddress } from "@/lib/format";

/**
 * 交易详情页（§8.6）。
 *
 * ⚠️ `?from=<address>` 这个 query 参数不是装饰：Helius 的 `/history` 返回的是
 * **某个地址视角**的交易，`balanceChanges` 只覆盖那一个地址。所以单笔交易页
 * 必须知道「从哪个地址点进来的」，否则「资产变动」那一栏就是残缺的。
 * 从地址页跳入时会带上它。
 */
export function TxPage() {
  const { chain = "", hash = "" } = useParams();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from");

  return (
    <Stack gap="lg">
      <PageHeader
        title={
          <Group gap="xs">
            <span>{shortenAddress(hash, 10)}</span>
            <Badge variant="light" size="sm">
              {chain}
            </Badge>
          </Group>
        }
        subtitle={from === null ? "交易详情" : `交易详情 · 视角地址 ${shortenAddress(from, 6)}`}
      />

      <SpecPlaceholder
        spec="8.6"
        items={[
          "AI 一句话解释：页面顶部最醒目位置，一条自然语言",
          "基础信息：状态 / 区块（可点）/ 时间 / 手续费 / 实际手续费 / 签名者 / 交易版本",
          "类型识别徽章：普通转账 / NFT / DeFi 兑换 / 借贷 / 清算 / unknown",
          "资产变动（balance diff）：Solana 直接用 /history 的 balanceChanges，不必自己解指令",
          "解析结果：Solana 走 Instruction 列表，EVM 走 Event 日志（topic0 查表 + 参数解码）",
          "原始数据折叠面板（JSON，等宽字体，可复制）",
          "相关链接：所在区块 · 涉及的地址 · 涉及的合约",
        ]}
      />
    </Stack>
  );
}
