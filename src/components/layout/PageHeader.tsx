import { Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

export type PageHeaderProps = Readonly<{
  title: ReactNode;
  subtitle?: ReactNode;
  /** 右侧操作区（按钮、徽章等）。 */
  actions?: ReactNode;
}>;

/**
 * 页面标题区。所有页面共用，保证标题层级与间距一致。
 *
 * 抽出来的直接收益：13 个路由壳文件里不再各写一遍 Title + Text 的排版。
 */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Title order={2}>{title}</Title>
        {subtitle === undefined ? null : (
          <Text size="sm" c="dimmed">
            {subtitle}
          </Text>
        )}
      </Stack>
      {actions === undefined ? null : <Group gap="xs">{actions}</Group>}
    </Group>
  );
}
