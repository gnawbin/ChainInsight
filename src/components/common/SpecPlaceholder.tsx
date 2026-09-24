import { Badge, Card, Code, List, Text } from "@mantine/core";

export type SpecPlaceholderProps = Readonly<{
  /** 设计文档里对应的章节号，例如 `8.5.2`。 */
  spec: string;
  /** 这一页最终要展示什么 —— 直接抄文档里的小标题，便于对照。 */
  items: readonly string[];
}>;

/**
 * 尚未实现的页面占位。
 *
 * 它**不是** TODO 注释，而是一个可渲染的界面：把「这一页该有什么」摆在屏幕上，
 * 让骨架阶段就能逐页核对设计文档，也顺便让 §12.2 第 14 项的「页面冒烟测试」
 * 有东西可断言（13 条路由都能打开且不崩）。
 *
 * 每实现一页就删掉对应的 `SpecPlaceholder`。
 */
export function SpecPlaceholder({ spec, items }: SpecPlaceholderProps) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Badge variant="light" mb="xs">
        尚未实现
      </Badge>
      <Text size="sm" c="dimmed" mb="sm">
        规格见设计文档 <Code>§{spec}</Code>。这一页最终包含：
      </Text>
      <List size="sm" spacing={4}>
        {items.map((item) => (
          <List.Item key={item}>{item}</List.Item>
        ))}
      </List>
    </Card>
  );
}
