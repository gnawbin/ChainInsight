import { Divider, Text } from "@mantine/core";

import { DISCLAIMER_TEXT } from "@/lib/disclaimer";

/**
 * 全局免责声明页脚。
 *
 * PRD §8.4 要求「前端页面底部永久显示」，因此：
 * - 挂在 `AppShell` 里 → **每一页**都有
 * - **没有关闭/折叠按钮** —— 「不可删除」不是靠自觉，是靠没有那个按钮
 * - 文案来自 `lib/disclaimer.ts` 的冻结常量，改一个字就会让 hash 测试失败
 *
 * 关于页（`/settings/about`）另有一份更完整的合规说明，但**本文案本身**在
 * 三处出现：这里、关于页、以及 AI 报告尾部（由 Rust 侧追加，§9.6）。
 */
export function DisclaimerFooter() {
  return (
    <>
      <Divider my="md" />
      <Text size="xs" c="dimmed" lh={1.6}>
        {DISCLAIMER_TEXT}
      </Text>
    </>
  );
}
