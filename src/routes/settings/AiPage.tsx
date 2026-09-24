import { Stack } from "@mantine/core";

import { SpecPlaceholder } from "@/components/common/SpecPlaceholder";

/**
 * AI 模型选择页（§8.11 定义了 6 个区块）。
 *
 * 这一页值得单独存在（而不是设置页里的一张卡）的原因：它包含供应商配置、
 * 两档模型路由、参数、用量台账、合规说明 —— 内容量远超一张卡片。
 *
 * 关键简化：**只做一个「OpenAI 兼容」表单 + 一组预设**。DeepSeek / OpenAI /
 * ollama / llama.cpp server 都提供 OpenAI 兼容接口，一套表单全覆盖。
 */
export function AiPage() {
  return (
    <Stack gap="md">
      <SpecPlaceholder
        spec="8.11"
        items={[
          "区块 1 顶部摘要：AI 总开关（可完全关闭）+ 两档当前模型 + Key 状态 + 本月用量",
          "区块 2 供应商：预设（DeepSeek / OpenAI / ollama / llama.cpp / 自定义）+ Base URL + Key + 测试连接",
          "区块 3 模型路由：轻任务（单条解读）与重任务（六模块画像）两个独立槽位",
          "区块 4 参数：temperature 0.2 / 单次最大条数 50 / 输出上限 / 超时 / 输出语言",
          "区块 5 用量与成本：按槽位分列的 token 统计、用户自填单价、预算提醒、最近 10 次调用",
          "区块 6 合规说明：幻觉提示 + 不提供投资建议 + 费用由用户自己的 Key 承担",
        ]}
      />
    </Stack>
  );
}
