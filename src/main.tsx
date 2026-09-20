import { createTheme, MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/charts/styles.css";
import "./index.css";

import { App } from "./App";
import { SolanaProvider } from "./solana/SolanaProvider";

/**
 * Dark by default — DeFi dashboards are read on dark backgrounds — with `teal`
 * as the accent, which sits close to Solana's brand green.
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

createRoot(container).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </MantineProvider>
  </StrictMode>,
);
