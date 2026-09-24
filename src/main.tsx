import { createTheme, MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/charts/styles.css";
import "./index.css";

import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FatalErrorScreen } from "./components/FatalErrorScreen";

/**
 * 暗色默认 —— DeFi 数据在深色背景上更好读；`teal` 作为强调色。
 */
const theme = createTheme({
  primaryColor: "teal",
  defaultRadius: "md",
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
});

const container = document.getElementById("root");
if (container === null) {
  throw new Error("index.html is missing the #root container");
}

/**
 * 没有 Solana Kit 客户端、没有 Provider、没有 Suspense。
 *
 * 原来这里包着 `<SolanaProvider>`（它按 cluster + 签名后端重建 Kit 客户端并
 * 在渲染期 await）。整个签名面已按 PRD §8.3 删除，所以这层依赖一起消失了 ——
 * 应用现在只是一棵普通的 React 树。
 *
 * `ErrorBoundary` 仍然保留（上提到最外层）：它挡住的是**任何**渲染期异常导致
 * 的白屏，与具体数据源无关。
 */
createRoot(container).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ErrorBoundary fallback={(error, reset) => <FatalErrorScreen error={error} onReset={reset} />}>
        <App />
      </ErrorBoundary>
    </MantineProvider>
  </StrictMode>,
);

