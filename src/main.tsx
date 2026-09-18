import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./index.css";
import { SolanaProvider } from "./solana/SolanaProvider";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("index.html is missing the #root container");
}

createRoot(container).render(
  <StrictMode>
    <SolanaProvider>
      <App />
    </SolanaProvider>
  </StrictMode>,
);
