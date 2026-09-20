import {
  AppShell as MantineAppShell,
  Burger,
  Group,
  NavLink,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ArrowLeftRightIcon, LayoutDashboardIcon, SettingsIcon, WalletIcon } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";

import { NetworkBadge } from "@/components/layout/NetworkBadge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { WalletButton } from "@/components/wallet/WalletButton";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { to: "/transfer", label: "Transfer", icon: ArrowLeftRightIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

/**
 * Application chrome.
 *
 * Mantine's `AppShell` handles the responsive part itself: the navbar collapses
 * behind a burger below `sm`, so there is no separate mobile navigation to
 * maintain (the previous hand-written version needed a bottom nav bar).
 */
export function AppShell() {
  const [opened, { toggle, close }] = useDisclosure();
  const { pathname } = useLocation();

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
            <WalletIcon size={20} />
            <Text fw={600}>Solana DeFi</Text>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <NetworkBadge />
            <WalletButton />
            <ThemeToggle />
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="xs">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            component={Link}
            to={to}
            label={label}
            leftSection={<Icon size={16} />}
            // Computed locally rather than left to react-router's NavLink so the
            // highlight is deterministic (`/` must not match every route).
            active={pathname === to}
            onClick={close}
          />
        ))}
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <Outlet />
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
