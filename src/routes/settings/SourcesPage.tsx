import { Stack } from "@mantine/core";

import { SpecPlaceholder } from "@/components/common/SpecPlaceholder";

/**
 * 数据源密钥页（§8.10 / §11.1）。
 *
 * 实现要点（批次 5）：
 * - 三个 Key 各自带「申请链接」与**免费额度说明**，并写明「那是 Helius / Etherscan 的账号，与本软件无关」
 * - 输入框**接受粘贴完整 URL 并自动提取 key** —— Helius 官方示例就是把 key 拼在 URL 里，用户大概率整段粘贴
 * - 保存前必须能「测试连接」，否则填错了用户无从判断
 * - 只回显掩码 `…ab12`，**永不回显明文**
 * - 必须标注：Helius 免费套餐**不含**实体名与首次资金来源（那两个端点返回 403）
 */
export function SourcesPage() {
  return (
    <Stack gap="md">
      <SpecPlaceholder
        spec="11.1"
        items={[
          "Helius Key：申请链接 + 100 万积分/月 + 「免费套餐不含实体名与资金来源」的提示",
          "Etherscan Key：申请链接 + 10 万次/天",
          "输入框接受完整 URL 并自动提取 key（Helius 官方示例就是整段 URL）",
          "每项一个「测试连接」按钮：成功 / 延迟 ms / 错误原文（脱敏）",
          "掩码回显：只显示 `…ab12`，永不回显明文",
          "说明文案：Key 不等于登录，不需要注册本软件",
        ]}
      />
    </Stack>
  );
}
