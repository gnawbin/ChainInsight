import { Alert, Card, Code, List, Stack, Text, Title } from "@mantine/core";
import { ShieldCheckIcon } from "lucide-react";

import { DisclaimerFooter } from "@/components/compliance/DisclaimerFooter";
import { PageHeader } from "@/components/layout/PageHeader";
import { APP_NAME, APP_TAGLINE, COPY } from "@/lib/strings";

/**
 * 关于页 —— **唯一一页在本批次里就写实了的**。
 *
 * 理由：PRD §8 把合规当作「产品永久规范」而不是装饰文案，所以：
 * - 免责声明原文必须在这里完整出现（不是摘要），且与全局页脚、AI 报告尾部同源
 * - 隐私与数据边界的说明要能被用户直接读到，而不是只在设计文档里
 * - 「不需要注册」这件事要反复讲 —— 它是本产品与 Arkham 一类产品的分野
 *
 * AI 报告尾部那份免责声明由 **Rust 侧**追加（§9.6），不在前端做 ——
 * 否则模型或前端任一处出问题，报告就可能不带声明。
 */
export function AboutPage() {
  return (
    <Stack gap="lg" maw={760}>
      <PageHeader title="关于" subtitle={`${APP_NAME} · ${APP_TAGLINE}`} />

      <Card withBorder padding="lg" radius="md">
        <Title order={4} mb="xs">
          你不需要注册任何东西
        </Title>
        <List size="sm" spacing={6}>
          {COPY.welcome.bullets.map((item) => (
            <List.Item key={item}>{item}</List.Item>
          ))}
        </List>
        <Text size="sm" c="dimmed" mt="sm">
          {COPY.keyVsLogin.body}
        </Text>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Title order={4} mb="xs">
          这个软件做什么、不做什么
        </Title>
        <Text size="sm" mb="xs">
          <strong>做</strong>：查询与分析**公开的**链上历史数据 —— 交易、代币、NFT、
          DeFi 行为，以及对这些数据的 AI 自然语言解读。
        </Text>
        <Text size="sm" c="red">
          <strong>永久不做</strong>：私钥与助记词导入、钱包连接、交易签名、转账、
          合约交互、投资与价格预测建议、把地址与现实身份绑定。这些不是「暂未实现」，
          而是架构上不存在对应的代码路径。
        </Text>
      </Card>

      <Alert
        color="teal"
        variant="light"
        icon={<ShieldCheckIcon size={16} />}
        title="数据边界"
      >
        所有查询与缓存只存在你的电脑里（<Code>chaininsight.db</Code>）。开发者不上传、
        不收集、不留存任何用户数据，也没有任何遥测。唯一的出网流量是你主动发起的
        数据源查询与 AI 调用。
      </Alert>

      <Card withBorder padding="lg" radius="md">
        <Title order={4} mb="xs">
          版本
        </Title>
        <Text size="sm" c="dimmed">
          数据源：Helius（Solana）· Etherscan（EVM）· 以及你在设置里选择的 AI 供应商。
          价格与估值来自数据源，为估算值、非实时行情。
        </Text>
      </Card>

      <div>
        <Title order={4} mb="xs">
          免责声明
        </Title>
        {/* 与全局页脚、AI 报告尾部同源；改动会让 hash 测试失败（§9.1） */}
        <DisclaimerFooter />
      </div>
    </Stack>
  );
}
