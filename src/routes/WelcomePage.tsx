import { Button, Card, Group, List, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";

import { APP_NAME, COPY } from "@/lib/strings";

/**
 * 首次启动引导（§8.4）。
 *
 * 这一页存在的**唯一目的**是消除「要注册吗 / 要连钱包吗」的误解。所以它的内容
 * 不是产品特性介绍，而是三条否定式承诺 + 一句「你要注册的是别人的账号」。
 *
 * 只显示一次（完成时写 `setting.welcome_done`）；用户之后可在 `/settings/about`
 * 重看同样的内容。
 */
export function WelcomePage() {
  return (
    <Stack align="center" justify="center" mih="70svh" gap="lg">
      <Card w="100%" maw={640} withBorder padding="xl" radius="md">
        <Stack gap="md">
          <div>
            <Title order={3}>{COPY.welcome.title}</Title>
            <Text size="sm" c="dimmed">
              {COPY.welcome.subtitle}
            </Text>
          </div>

          <List size="sm" spacing={6}>
            {COPY.welcome.bullets.map((item) => (
              <List.Item key={item}>{item}</List.Item>
            ))}
          </List>

          <Text size="sm" c="dimmed">
            {COPY.welcome.keyNote}
          </Text>

          <Group gap="sm">
            <Button component={Link} to="/settings/sources">
              {COPY.welcome.ctaPrimary}
            </Button>
            <Button variant="light" component={Link} to="/">
              {COPY.welcome.ctaDemo}
            </Button>
            <Button variant="subtle" component={Link} to="/settings/about">
              {COPY.welcome.ctaWhy}
            </Button>
          </Group>
        </Stack>
      </Card>

      <Text size="xs" c="dimmed">
        {APP_NAME} 是只读工具，不会有任何链上交易。
      </Text>
    </Stack>
  );
}
