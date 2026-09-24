import { Alert, Button, Card, Code, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

import { APP_NAME } from "@/lib/strings";

export type FatalErrorScreenProps = Readonly<{
  error: unknown;
  /** Re-render the tree. Provided by `ErrorBoundary`. */
  onReset: () => void;
}>;

/**
 * 渲染期异常的兜底界面。
 *
 * 与已删除的 `ClientErrorScreen` 的区别：那个是「本地密钥读不到」的**恢复路径**
 * （属于红线功能，已随签名面删除）；这个是**普通崩溃**的可见化 —— 任何未捕获的
 * 渲染错误都会到这里，而不是 React 卸载整个 root 造成**白屏**。
 *
 * 保留它的理由和原来一样：白屏既没有信息也没有出路。这里至少给出错误原文 + 重试。
 */
export function FatalErrorScreen({ error, onReset }: FatalErrorScreenProps) {
  return (
    <Stack align="center" justify="center" mih="100svh" p="md">
      <Card w="100%" maw={720} withBorder shadow="md" padding="lg">
        <Group gap="sm" mb="xs">
          <ThemeIcon color="red" variant="light" size="lg">
            <AlertTriangleIcon size={18} />
          </ThemeIcon>
          <Title order={4}>{APP_NAME} 遇到了一个错误</Title>
        </Group>

        <Text c="dimmed" size="sm" mb="md">
          界面渲染时抛出了异常。这通常是程序缺陷，重试一般无法解决，但至少能让你看到问题出在哪。
        </Text>

        <Stack gap="md">
          <Alert color="yellow" variant="light" icon={<AlertTriangleIcon size={16} />}>
            本软件是**只读**工具，不会发起任何链上交易。这个错误与你的资产无关。
          </Alert>

          <Card withBorder bg="var(--mantine-color-default-hover)" padding="sm">
            <Text size="xs" tt="uppercase" fw={500} c="dimmed" mb={4}>
              错误详情
            </Text>
            <Code block style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {describe(error)}
            </Code>
          </Card>

          <Group>
            <Button leftSection={<RefreshCwIcon size={16} />} onClick={onReset}>
              重试
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}

/** 尽力把任意抛出物渲染成可读文本，并跟随 `cause` 链。 */
function describe(error: unknown): string {
  const primary = messageOf(error);
  const cause = (error as { cause?: unknown } | null | undefined)?.cause;
  if (cause === undefined || cause === null) return primary;
  return `${primary}\n\nCaused by: ${messageOf(cause)}`;
}

function messageOf(error: unknown): string {
  if (typeof error === "string" && error.trim() !== "") return error;
  if (error instanceof Error && error.message !== "") return error.message;
  try {
    const json = JSON.stringify(error);
    if (json !== undefined) return json;
  } catch {
    // 循环引用等，落到 String()
  }
  return String(error);
}
