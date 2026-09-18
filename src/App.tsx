import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardPage } from "@/routes/DashboardPage";
import { SettingsPage } from "@/routes/SettingsPage";
import { TransferPage } from "@/routes/TransferPage";

/**
 * `HashRouter`, not `BrowserRouter`: the packaged Tauri build serves the bundle
 * over a custom protocol where path-based deep links are not rewritten to
 * `index.html`, so any route other than `/` would 404 on reload.
 */
export function App() {
  return (
    <TooltipProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="transfer" element={<TransferPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster />
    </TooltipProvider>
  );
}
