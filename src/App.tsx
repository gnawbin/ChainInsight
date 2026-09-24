import { Notifications } from "@mantine/notifications";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { AddressPage } from "@/routes/AddressPage";
import { BlockPage } from "@/routes/BlockPage";
import { ContractPage } from "@/routes/ContractPage";
import { HomePage } from "@/routes/HomePage";
import { SearchPage } from "@/routes/SearchPage";
import { TxPage } from "@/routes/TxPage";
import { WelcomePage } from "@/routes/WelcomePage";
import { AboutPage } from "@/routes/settings/AboutPage";
import { AiPage } from "@/routes/settings/AiPage";
import { CachePage } from "@/routes/settings/CachePage";
import { DataPage } from "@/routes/settings/DataPage";
import { SettingsIndexPage } from "@/routes/settings/SettingsIndexPage";
import { SettingsLayout } from "@/routes/settings/SettingsLayout";
import { SourcesPage } from "@/routes/settings/SourcesPage";

/**
 * `HashRouter`, not `BrowserRouter`: the packaged Tauri build serves the bundle
 * over a custom protocol where path-based deep links are not rewritten to
 * `index.html`, so any route other than `/` would 404 on reload.
 *
 * 路由表与设计文档 §8.1 一一对应（13 个页面）。深链格式：
 *   `/address/:chain/:id`  ·  `:chain` 用 `solana` 或 `eip155:1`（见 §4.2 的 chain 表）
 */
export function App() {
  return (
    <>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="welcome" element={<WelcomePage />} />

            <Route path="address/:chain/:id" element={<AddressPage />} />
            <Route path="tx/:chain/:hash" element={<TxPage />} />
            <Route path="contract/:chain/:addr" element={<ContractPage />} />
            <Route path="block/:chain/:ref" element={<BlockPage />} />
            <Route path="search" element={<SearchPage />} />

            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<SettingsIndexPage />} />
              <Route path="sources" element={<SourcesPage />} />
              <Route path="cache" element={<CachePage />} />
              <Route path="ai" element={<AiPage />} />
              <Route path="data" element={<DataPage />} />
              <Route path="about" element={<AboutPage />} />
            </Route>

            {/* `/about` 只是 `/settings/about` 的别名，避免两处维护同一段文案 */}
            <Route path="about" element={<Navigate to="/settings/about" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>

      <Notifications position="top-right" />
    </>
  );
}

