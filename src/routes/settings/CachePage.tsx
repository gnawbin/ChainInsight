import { Stack } from "@mantine/core";

import { SpecPlaceholder } from "@/components/common/SpecPlaceholder";

/**
 * 缓存页（§8.10 / §4.5 / §4.7）。
 *
 * 关键约束：**「清除缓存」写死表白名单**（`cache` / `query_log` / `ai_report` /
 * `usage_log`），**永不触碰** `secret` / `label` / `chain` / `protocol` /
 * `selector` / `token` / `addr_vec`。清掉 `secret` 等于用户三把密钥永久丢失
 * —— 我们不留任何副本，所以这条不是偏好而是硬约束（由 Rust 单测强制）。
 */
export function CachePage() {
  return (
    <Stack gap="md">
      <SpecPlaceholder
        spec="4.5 / 4.7 / 8.10"
        items={[
          "缓存总开关",
          "TTL 分级：余额 / 交易列表 / 资产 / 合约与程序 / 代币元数据，各一个输入",
          "缓存命中率（来自 cache.hit_count）与当前条目数",
          "「清除缓存」—— 明确标注「不含密钥与基础数据」，并在确认框里复述一遍",
          "当前库文件大小（PRAGMA page_count × page_size，含 WAL 附属文件）",
        ]}
      />
    </Stack>
  );
}
