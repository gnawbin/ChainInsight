import { Stack, Tabs } from "@mantine/core";
import { Link, Outlet, useLocation } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";

/** Settings 的五个子页（§8.10）。`to` 用相对路径，由父路由 `/settings` 承载。 */
const SUB_PAGES = [
  { to: "sources", label: "数据源" },
  { to: "cache", label: "缓存" },
  { to: "ai", label: "AI 模型" },
  { to: "data", label: "数据管理" },
  { to: "about", label: "关于" },
] as const;

/**
 * Settings 的布局壳：标题 + 子页标签 + `<Outlet />`。
 *
 * 用 `Tabs` 而不是二级侧边导航：五个子页是**平级**的，且设置页本身很窄，
 * 再加一条侧栏会把内容宽度挤没。
 *
 * `Tabs.Tab` 通过 Mantine 的多态 `component` 属性渲染成 `<Link>`，所以每个标签
 * 都是真实的可点击链接（能被右键新开、能被页面冒烟测试按 href 找到）。
 */
export function SettingsLayout() {
  const { pathname } = useLocation();

  // `/settings`（index）本身不高亮任何标签。
  const segments = pathname.split("/").filter(Boolean);
  const active = segments.length > 1 ? (segments[1] ?? "") : "";

  return (
    <Stack gap="lg">
      <PageHeader title="设置" subtitle="密钥、缓存、AI 模型与本地数据。所有内容只存在本机。" />

      <Tabs value={active} keepMounted={false}>
        <Tabs.List>
          {SUB_PAGES.map(({ to, label }) => (
            <Tabs.Tab
              key={to}
              value={to}
              // 见 AddressPage 的同款注释：Mantine 9 的 `Tabs.Tab` 要用
              // `renderRoot` 才能渲染成链接，`component` 不透传 `to`。
              renderRoot={(props) => <Link {...props} to={to} />}
            >
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <Outlet />
    </Stack>
  );
}

