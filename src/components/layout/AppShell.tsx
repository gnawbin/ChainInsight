import {
  Alert,
  AppShell as MantineAppShell,
  Burger,
  Group,
  NavLink,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { BoxesIcon, InfoIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";

import { DisclaimerFooter } from "@/components/compliance/DisclaimerFooter";
import { ChainBadge } from "@/components/layout/ChainBadge";
import { ProviderStatus } from "@/components/layout/ProviderStatus";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAppStatus } from "@/hooks/useAppStatus";
import { APP_NAME, COPY, NAV } from "@/lib/strings";

const NAV_ICONS = {
  "/": BoxesIcon,
  "/search": SearchIcon,
  "/settings": SettingsIcon,
} as const;

/**
 * 应用外壳。
 *
 * 与迁移前的差异：
 * - **删掉 `WalletButton`** —— 钱包连接是 PRD §8.3 的红线，永久不做
 * - **删掉 `NetworkBadge`**（devnet/local 集群概念随之消失），换成 `ChainBadge`（双链）
 * - 新增 `ProviderStatus` —— 无密钥时的「为什么没数据」必须一眼可见（§11.4）
 * - **页脚挂上免责声明** —— PRD §8.4 要求每页可见且不可关闭
 * - 新增演示数据横幅 —— §8.12 要求显眼且不可关闭
 *
 * Mantine 的 `AppShell` 自带响应式：navbar 在 `sm` 以下收进 burger，
 * 所以不需要另写一套移动端导航（这一条从迁移前沿用）。
 */
export function AppShell() {
  const [opened, { toggle, close }] = useDisclosure();
  const { pathname } = useLocation();
  const { providers, demoMode } = useAppStatus();

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <BoxesIcon size={20} />
            <Text fw={600} visibleFrom="xs">
              {APP_NAME}
            </Text>
          </Group>

          <Group gap="sm" wrap="nowrap">
            <ChainBadge />
            <ProviderStatus states={providers} compact />
            <ThemeToggle />
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="xs">
        {NAV.map(({ to, label }) => {
          const Icon = NAV_ICONS[to];
          return (
            <NavLink
              key={to}
              component={Link}
              to={to}
              label={label}
              leftSection={<Icon size={16} />}
              // 本地计算而非交给 react-router 的 NavLink：`/` 不能匹配所有路由，
              // 且 `/settings/ai` 应当让 `/settings` 保持高亮。
              active={to === "/" ? pathname === "/" : pathname.startsWith(to)}
              onClick={close}
            />
          );
        })}
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        {/*
          演示数据横幅：不接受关闭参数，因为「不误导」是硬要求 —— 样本数据被
          当成真实链上数据，会让后续所有分析建立在假前提上（§8.12）。
        */}
        {demoMode ? (
          <Alert
            color="yellow"
            variant="light"
            icon={<InfoIcon size={16} />}
            mb="md"
            title={COPY.demoBanner}
          >
            配置数据源 Key 后即可查询真实链上数据。AI 分析同样需要配置 AI Key。
          </Alert>
        ) : null}

        <Outlet />

        <DisclaimerFooter />
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}

