import { Stack } from "@mantine/core";

import { SpecPlaceholder } from "@/components/common/SpecPlaceholder";
import { PageHeader } from "@/components/layout/PageHeader";
import { APP_TAGLINE } from "@/lib/strings";

/**
 * 首页（§8.3）。
 *
 * ⚠️ 这是批次 1 的临时形态 —— 批次 2 会把它换成真的超级搜索框
 * （链识别 + 歧义二选一 + 回退检索）。
 */
export function HomePage() {
  return (
    <Stack gap="lg" maw={860}>
      <PageHeader title="首页" subtitle={APP_TAGLINE} />
      <SpecPlaceholder
        spec="8.3"
        items={[
          "超级搜索框：自动识别 EVM 地址 / Solana 地址 / EVM 交易 / Solana 签名",
          "歧义输入（无 0x 的 40/64 位 hex）在原地展开二选一，不跳转、不发请求",
          "无法识别时回退为 FTS 检索，而不是生硬报错",
          "最近查询（本地 query_log，可点击回访、可单条删除）",
          "我关注的地址（本地 label 表 —— 不需要登录，因为存在本机）",
          "快捷示例；演示模式下指向内置样本",
          "数据源额度（拿不到就不显示，不显示假数字）",
        ]}
      />
    </Stack>
  );
}
