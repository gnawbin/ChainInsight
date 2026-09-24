import { Badge, Group, Stack } from "@mantine/core";
import { useParams } from "react-router-dom";

import { SpecPlaceholder } from "@/components/common/SpecPlaceholder";
import { PageHeader } from "@/components/layout/PageHeader";

/**
 * 区块详情页（§8.8）。
 *
 * **PRD 的页面清单里没有这一页**，是本设计补的（D25）。理由很实际：
 * §8.6 的交易详情页要展示「区块」字段，那就必须是可点的 —— 没有区块页就会
 * 留下一个死链接。
 */
export function BlockPage() {
  const { chain = "", ref = "" } = useParams();

  return (
    <Stack gap="lg">
      <PageHeader
        title={
          <Group gap="xs">
            <span>{ref}</span>
            <Badge variant="light" size="sm">
              {chain}
            </Badge>
          </Group>
        }
        subtitle="区块详情"
      />

      <SpecPlaceholder
        spec="8.8"
        items={[
          "基础信息：高度 / slot · 时间 · 出块者 / 验证者 · 交易数 · 大小",
          "交易列表：复用地址页 Tab2 的表格组件",
        ]}
      />
    </Stack>
  );
}
