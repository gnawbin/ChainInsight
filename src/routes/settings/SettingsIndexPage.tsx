import { Badge, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { CpuIcon, DatabaseIcon, HardDriveIcon, InfoIcon, KeyRoundIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { ProviderStatus } from "@/components/layout/ProviderStatus";
import { useAppStatus } from "@/hooks/useAppStatus";

type Entry = Readonly<{
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
}>;

const ENTRIES: readonly Entry[] = [
  {
    to: "sources",
    title: "数据源",
    description: "填 Helius / Etherscan Key。它们只存在本机，本软件不需要你注册。",
    icon: <KeyRoundIcon size={18} />,
  },
  {
    to: "cache",
    title: "缓存",
    description: "总开关、各类数据的缓存时长、命中率，以及「清除缓存」。",
    icon: <HardDriveIcon size={18} />,
  },
  {
    to: "ai",
    title: "AI 模型",
    description: "供应商、轻/重两档模型、参数、用量与费用。也可以完全关闭 AI。",
    icon: <CpuIcon size={18} />,
  },
  {
    to: "data",
    title: "数据管理",
    description: "导出（默认不含密钥）、清除缓存、清除密钥、打开数据目录。",
    icon: <DatabaseIcon size={18} />,
  },
  {
    to: "about",
    title: "关于",
    description: "完整免责声明、合规说明、数据来源与隐私声明、版本。",
    icon: <InfoIcon size={18} />,
  },
];

/**
 * Settings 入口页（§8.10）。
 *
 * 它同时承担一个「状态摘要」的职责：用户打开设置最先想知道的是
 * **「还差什么没配」**，所以数据源状态直接摆在第一张卡上。
 */
export function SettingsIndexPage() {
  const { providers } = useAppStatus();

  return (
    <Stack gap="md">
      <Card withBorder padding="md" radius="md">
        <Group justify="space-between" wrap="nowrap">
          <div>
            <Text size="sm" fw={500}>
              数据源状态
            </Text>
            <Text size="xs" c="dimmed">
              未配置时功能会退化为演示数据 —— 不是坏了。
            </Text>
          </div>
          <ProviderStatus states={providers} />
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {ENTRIES.map(({ to, title, description, icon }) => (
          <Card
            key={to}
            withBorder
            padding="md"
            radius="md"
            component={Link}
            to={to}
            style={{ textDecoration: "none" }}
          >
            <Group gap="xs" mb={4} wrap="nowrap">
              {icon}
              <Text fw={500}>{title}</Text>
            </Group>
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      <Text size="xs" c="dimmed">
        <Badge size="xs" variant="light" mr={6}>
          提示
        </Badge>
        本软件是只读工具：没有钱包、没有签名、没有转账。设置页里也就不存在任何与资产相关的选项。
      </Text>
    </Stack>
  );
}
