import { Stack } from "@mantine/core";

import { SpecPlaceholder } from "@/components/common/SpecPlaceholder";

/**
 * 数据管理页（§8.10 / §9.5）。
 *
 * 三个动作的风险等级完全不同，UI 也要区别对待：
 * - **导出**：默认**排除** `secret` 表（要包含需显式勾选 + 警告）
 * - **清除缓存**：安全，白名单见 §4.5
 * - **清除密钥**：危险且**不可恢复**（我们不留副本），必须二次确认
 */
export function DataPage() {
  return (
    <Stack gap="md">
      <SpecPlaceholder
        spec="9.5 / 8.10"
        items={[
          "导出数据为 JSON，默认排除 secret 表（要包含需显式勾选并二次确认）",
          "清除缓存（白名单，同缓存页）",
          "清除密钥（二次确认，文案写明「不可恢复，我们不留副本」）",
          "打开数据目录（tauri-plugin-opener），让用户能自己看、自己删",
          "显示数据目录路径（app_data_dir()/chaininsight.db —— 注意不是 $HOME）",
        ]}
      />
    </Stack>
  );
}
