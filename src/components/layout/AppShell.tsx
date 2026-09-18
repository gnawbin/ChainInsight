import { ArrowLeftRightIcon, LayoutDashboardIcon, SettingsIcon, WalletIcon } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { NetworkBadge } from "@/components/layout/NetworkBadge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { WalletButton } from "@/components/wallet/WalletButton";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { to: "/transfer", label: "Transfer", icon: ArrowLeftRightIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function NavItems({ variant }: { variant: "sidebar" | "bottom" }) {
  return (
    <>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md text-sm font-medium transition-colors",
              variant === "sidebar"
                ? "px-3 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                : "flex-1 flex-col justify-center gap-1 py-2 text-xs",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground",
            )
          }
        >
          <Icon className={variant === "sidebar" ? "size-4" : "size-5"} />
          {label}
        </NavLink>
      ))}
    </>
  );
}

export function AppShell() {
  return (
    <div className="flex h-full min-h-svh bg-background">
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r bg-sidebar p-4 md:flex">
        <div className="mb-4 flex items-center gap-2 px-3 py-2">
          <WalletIcon className="size-5" />
          <span className="font-semibold">Solana DeFi</span>
        </div>
        <NavItems variant="sidebar" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2 md:hidden">
            <WalletIcon className="size-5" />
            <span className="text-sm font-semibold">Solana DeFi</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NetworkBadge />
            <WalletButton />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6">
          <Outlet />
        </main>

        <nav className="flex shrink-0 items-stretch border-t bg-sidebar px-1 md:hidden">
          <NavItems variant="bottom" />
        </nav>
      </div>
    </div>
  );
}
