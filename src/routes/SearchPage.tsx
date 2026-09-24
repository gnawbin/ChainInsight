import { Stack } from "@mantine/core";
import { useSearchParams } from "react-router-dom";

import { SpecPlaceholder } from "@/components/common/SpecPlaceholder";
import { PageHeader } from "@/components/layout/PageHeader";

/**
 * 检索结果页（§8.9）。
 *
 * 它是首页搜索框 `Unknown` 分支的落点，也是「这个 `0x3df02124` 是什么」的答案页。
 * 数据来自 SQLite 的 FTS5（`search_fts`，`tokenize='trigram'`，§4.6）——
 * 中文子串与英文前缀都能命中，这是选 trigram 而不是默认 unicode61 的原因。
 *
 * ⚠️ 这一页是 `search_fts` 表的**唯一消费者**：没有它，那套 FTS 基础数据就没有出口。
 */
export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  return (
    <Stack gap="lg">
      <PageHeader
        title={query === "" ? "检索" : `检索：${query}`}
        subtitle="协议 · 事件与指令（selector）· 本地标签"
      />

      <SpecPlaceholder
        spec="8.9"
        items={[
          "协议组：名称 · 分类 · 所在链 · 合约地址 → 跳合约页",
          "selector 组：hex · 事件名 · 签名 · 人类描述（回答「这个 0x3df02124 是什么」）",
          "本地标签组：用户自己填的名称与备注 → 跳地址页",
          "空结果：提示可尝试的输入形态，并给出「识别为地址/交易」的跳转",
        ]}
      />
    </Stack>
  );
}
